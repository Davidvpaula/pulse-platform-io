import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLoading, AdminError } from "@/components/admin/AdminStates";
import { Activity, RefreshCw, AlertTriangle, CheckCircle2, Users, Clock, PlayCircle } from "lucide-react";

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

const fmtTime = (s?: string | null) =>
  s ? new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";

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

export default function AdminNOC() {
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

  if (isLoading) return <AdminLoading />;
  if (error) return <AdminError message={(error as Error).message} />;

  const m = data?.metricas_dia;
  const emAndamento = data?.em_andamento ?? [];
  const fila = data?.fila_paciente ?? [];
  const atrasos = data?.atrasos_ativos ?? [];
  const online = data?.medicos_online ?? [];

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
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Snapshot atualizado em {data?.generated_at ? new Date(data.generated_at).toLocaleString("pt-BR") : "—"} · refresh automático 30s
      </p>
    </div>
  );
}
