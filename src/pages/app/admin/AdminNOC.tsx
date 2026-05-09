import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLoading, AdminError } from "@/components/admin/AdminStates";
import {
  Activity, RefreshCw, AlertTriangle, CheckCircle2, Users, Clock, PlayCircle,
  Bell, Sparkles, Loader2,
} from "lucide-react";
import { toast } from "sonner";

type NocSnapshot = {
  generated_at: string;
  metricas_dia: {
    total: number;
    concluidas: number;
    no_show: number;
    canceladas: number;
    cancelada_tarde: number;
    iniciadas: number;
    pontualidade_pct: number;
    atraso_medio_min: number;
    duracao_media_min: number;
  } | null;
  em_andamento: Array<Record<string, any>>;
  fila_paciente: Array<Record<string, any>>;
  atrasos_ativos: Array<Record<string, any>>;
  medicos_online: Array<Record<string, any>>;
};

type Alerta = {
  id: string;
  tipo: string;
  severidade: "info" | "aviso" | "critico";
  titulo: string;
  descricao: string | null;
  status: "aberto" | "reconhecido" | "resolvido" | "expirado";
  consulta_id: string | null;
  medico_id: string | null;
  paciente_id: string | null;
  payload: Record<string, any>;
  created_at: string;
  resolvido_em: string | null;
};

type ResumoIA = {
  id: string;
  janela_inicio: string;
  janela_fim: string;
  resumo: string;
  gargalos: Array<{ titulo: string; descricao: string }>;
  sugestoes: Array<{ titulo: string; descricao: string }>;
  risco_geral: "baixo" | "medio" | "alto";
  modelo: string | null;
  tokens_entrada: number | null;
  tokens_saida: number | null;
  created_at: string;
};

const fmtTime = (s?: string | null) =>
  s ? new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDateTime = (s?: string | null) =>
  s ? new Date(s).toLocaleString("pt-BR") : "—";

function Kpi({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "ok" | "warn" | "danger" }) {
  const toneCls =
    tone === "danger" ? "text-red-600" :
    tone === "warn" ? "text-amber-600" :
    tone === "ok" ? "text-emerald-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold mt-1 ${toneCls}`}>{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function SeveridadeBadge({ s }: { s: Alerta["severidade"] }) {
  const map = {
    info: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    aviso: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    critico: "bg-red-500/10 text-red-700 border-red-500/30",
  } as const;
  return <Badge variant="outline" className={map[s]}>{s}</Badge>;
}

function RiscoBadge({ r }: { r: ResumoIA["risco_geral"] }) {
  const map = {
    baixo: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    medio: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    alto: "bg-red-500/10 text-red-700 border-red-500/30",
  } as const;
  return <Badge variant="outline" className={map[r]}>Risco {r}</Badge>;
}

export default function AdminNOC() {
  const qc = useQueryClient();
  const [gerandoIA, setGerandoIA] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "noc-snapshot"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_noc_snapshot" as never);
      if (error) throw error;
      return data as NocSnapshot;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const { data: alertas, refetch: refetchAlertas } = useQuery({
    queryKey: ["admin", "noc-alertas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacao_alertas" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Alerta[];
    },
    refetchInterval: 30_000,
  });

  const { data: resumosIA, refetch: refetchIA } = useQuery({
    queryKey: ["admin", "noc-resumos-ia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("noc_resumos_ia" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as ResumoIA[];
    },
    refetchInterval: 60_000,
  });

  // Realtime alertas
  useEffect(() => {
    const ch = supabase
      .channel("operacao_alertas_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "operacao_alertas" },
        () => qc.invalidateQueries({ queryKey: ["admin", "noc-alertas"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  if (isLoading) return <AdminLoading />;
  if (error) return <AdminError message={(error as Error).message} />;

  const m = data?.metricas_dia;
  const emAndamento = data?.em_andamento ?? [];
  const fila = data?.fila_paciente ?? [];
  const atrasos = data?.atrasos_ativos ?? [];
  const online = data?.medicos_online ?? [];

  const alertasAbertos = (alertas ?? []).filter(a => a.status === "aberto");
  const ultimoResumo = resumosIA?.[0];

  async function reconhecerAlerta(id: string) {
    const { error } = await supabase
      .from("operacao_alertas" as never)
      .update({ status: "reconhecido" } as never)
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Alerta reconhecido"); refetchAlertas(); }
  }

  async function resolverAlerta(id: string) {
    const nota = window.prompt("Nota de resolução (opcional):") ?? "";
    const { error } = await supabase
      .from("operacao_alertas" as never)
      .update({
        status: "resolvido",
        resolvido_em: new Date().toISOString(),
        resolucao_nota: nota || null,
      } as never)
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Alerta resolvido"); refetchAlertas(); }
  }

  async function gerarResumoIA() {
    setGerandoIA(true);
    try {
      const { data, error } = await supabase.functions.invoke("noc-ia-auditora");
      if (error) throw error;
      const src = (data as any)?.source;
      toast.success(src === "cache" ? "Reaproveitado resumo recente (cooldown 50min)" : "Novo resumo gerado");
      refetchIA();
    } catch (e) {
      toast.error((e as Error).message ?? "Falha ao gerar resumo");
    } finally {
      setGerandoIA(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="NOC — Operação"
          description="Central de monitoramento operacional em tempo real"
        />
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Em andamento agora" value={emAndamento.length} tone={emAndamento.length > 0 ? "ok" : undefined} />
        <Kpi label="Fila (próx. 60min)" value={fila.length} />
        <Kpi label="Atrasos ativos (>10min)" value={atrasos.length} tone={atrasos.length > 0 ? "warn" : "ok"} />
        <Kpi label="Médicos online" value={online.length} />
      </div>

      <Tabs defaultValue="agora" className="w-full">
        <TabsList>
          <TabsTrigger value="agora">Agora</TabsTrigger>
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="atencao">
            Atenção {atrasos.length > 0 && <Badge variant="destructive" className="ml-2">{atrasos.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="alertas">
            Alertas {alertasAbertos.length > 0 && <Badge variant="destructive" className="ml-2">{alertasAbertos.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="ia">Resumo IA</TabsTrigger>
        </TabsList>

        {/* AGORA */}
        <TabsContent value="agora" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-emerald-600" /> Consultas em andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {emAndamento.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma consulta em andamento.</p>
              ) : (
                <div className="divide-y">
                  {emAndamento.map((c, i) => (
                    <div key={i} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{c.medico_nome ?? "Médico"} — {c.paciente_nome ?? "Paciente"}</div>
                        <div className="text-xs text-muted-foreground">
                          Início previsto {fmtTime(c.data_hora_inicio)} · Modalidade {c.modalidade ?? "—"}
                        </div>
                      </div>
                      <Badge variant="outline">{Math.round(Number(c.minutos_em_andamento ?? 0))} min</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Fila — próximos 60 minutos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fila.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem pacientes confirmados na próxima hora.</p>
              ) : (
                <div className="divide-y">
                  {fila.map((c, i) => (
                    <div key={i} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{c.paciente_nome ?? "Paciente"} → {c.medico_nome ?? "Médico"}</div>
                        <div className="text-xs text-muted-foreground">
                          {fmtTime(c.data_hora_inicio)} · {c.modalidade ?? "—"}
                        </div>
                      </div>
                      <Badge variant="outline">em {Math.round(Number(c.minutos_para_inicio ?? 0))} min</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Médicos online
              </CardTitle>
            </CardHeader>
            <CardContent>
              {online.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum médico com presença ativa registrada.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {online.map((md, i) => (
                    <Badge key={i} variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-700">
                      {md.medico_nome ?? "Médico"}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HOJE */}
        <TabsContent value="hoje" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">KPIs do dia</CardTitle>
            </CardHeader>
            <CardContent>
              {!m ? (
                <p className="text-sm text-muted-foreground">Sem dados para hoje.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Kpi label="Total" value={m.total} />
                  <Kpi label="Concluídas" value={m.concluidas} tone="ok" />
                  <Kpi label="No-show" value={m.no_show} tone={m.no_show > 0 ? "danger" : "ok"} />
                  <Kpi label="Canceladas" value={m.canceladas} />
                  <Kpi label="Cancelada tardia" value={m.cancelada_tarde} tone={m.cancelada_tarde > 0 ? "warn" : "ok"} />
                  <Kpi label="Iniciadas" value={m.iniciadas} />
                  <Kpi
                    label="Pontualidade"
                    value={`${Number(m.pontualidade_pct ?? 0).toFixed(1)}%`}
                    tone={Number(m.pontualidade_pct) >= 80 ? "ok" : "warn"}
                  />
                  <Kpi
                    label="Atraso médio"
                    value={`${Number(m.atraso_medio_min ?? 0).toFixed(1)} min`}
                    tone={Number(m.atraso_medio_min) > 10 ? "warn" : "ok"}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ATENÇÃO */}
        <TabsContent value="atencao" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Atrasos ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {atrasos.length === 0 ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Sem atrasos no momento.
                </div>
              ) : (
                <div className="divide-y">
                  {atrasos.map((c, i) => (
                    <div key={i} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{c.medico_nome ?? "Médico"} — {c.paciente_nome ?? "Paciente"}</div>
                        <div className="text-xs text-muted-foreground">
                          Previsto {fmtTime(c.data_hora_inicio)} · Status {c.status}
                        </div>
                      </div>
                      <Badge variant="destructive">{Math.round(Number(c.minutos_atraso ?? 0))} min</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALERTAS */}
        <TabsContent value="alertas" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" /> Alertas operacionais (últimos 100)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(alertas ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum alerta registrado.</p>
              ) : (
                <div className="divide-y">
                  {(alertas ?? []).map((a) => (
                    <div key={a.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <SeveridadeBadge s={a.severidade} />
                          <Badge variant="outline">{a.status}</Badge>
                          <span className="font-medium text-sm">{a.titulo}</span>
                        </div>
                        {a.descricao && (
                          <p className="text-xs text-muted-foreground mt-1">{a.descricao}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {a.tipo} · {fmtDateTime(a.created_at)}
                        </p>
                      </div>
                      {a.status === "aberto" && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => reconhecerAlerta(a.id)}>
                            Reconhecer
                          </Button>
                          <Button size="sm" onClick={() => resolverAlerta(a.id)}>
                            Resolver
                          </Button>
                        </div>
                      )}
                      {a.status === "reconhecido" && (
                        <Button size="sm" onClick={() => resolverAlerta(a.id)}>
                          Resolver
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RESUMO IA */}
        <TabsContent value="ia" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Gerado por IA observadora — não toma ações automáticas. Cooldown 50min.
            </p>
            <Button size="sm" onClick={gerarResumoIA} disabled={gerandoIA}>
              {gerandoIA ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar agora
            </Button>
          </div>

          {!ultimoResumo ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nenhum resumo gerado ainda. Clique em "Gerar agora".
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Último resumo
                  <RiscoBadge r={ultimoResumo.risco_geral} />
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {fmtDateTime(ultimoResumo.created_at)} · modelo {ultimoResumo.modelo ?? "—"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{ultimoResumo.resumo}</p>

                {ultimoResumo.gargalos?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium uppercase text-muted-foreground mb-2">Gargalos</h4>
                    <ul className="space-y-2">
                      {ultimoResumo.gargalos.map((g, i) => (
                        <li key={i} className="text-sm border-l-2 border-amber-500 pl-3">
                          <div className="font-medium">{g.titulo}</div>
                          <div className="text-xs text-muted-foreground">{g.descricao}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {ultimoResumo.sugestoes?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium uppercase text-muted-foreground mb-2">Pontos de atenção</h4>
                    <ul className="space-y-2">
                      {ultimoResumo.sugestoes.map((s, i) => (
                        <li key={i} className="text-sm border-l-2 border-blue-500 pl-3">
                          <div className="font-medium">{s.titulo}</div>
                          <div className="text-xs text-muted-foreground">{s.descricao}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(resumosIA?.length ?? 0) > 1 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Histórico (últimos {(resumosIA?.length ?? 1) - 1})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {(resumosIA ?? []).slice(1).map((r) => (
                    <div key={r.id} className="py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <RiscoBadge r={r.risco_geral} />
                        <span className="text-xs text-muted-foreground">{fmtDateTime(r.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.resumo}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Snapshot atualizado em {data?.generated_at ? new Date(data.generated_at).toLocaleString("pt-BR") : "—"} · refresh automático 30s
      </p>
    </div>
  );
}
