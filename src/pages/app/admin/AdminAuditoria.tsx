import { useEffect, useMemo, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Shield, AlertTriangle, DollarSign, Key, Plug, Ban, CheckCircle2, Eye, Download,
  RefreshCw, Filter, ChevronLeft, ChevronRight, Clock,
} from "lucide-react";

const PAGE = 50;

const MODULOS = [
  { value: "consultas", label: "Consultas" },
  { value: "colaboradores", label: "Colaboradores" },
  { value: "planos", label: "Planos & Assinaturas" },
  { value: "comunicacao", label: "Comunicação" },
];
const RISCOS = [
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
  { value: "critico", label: "Crítico" },
];
const ORIGENS = [
  { value: "manual", label: "Manual" },
  { value: "sistema", label: "Sistema/Automático" },
];

type Evento = {
  modulo: string;
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_nome: string | null;
  acao: string;
  entidade_tipo: string | null;
  entidade_id: string | null;
  campo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  motivo: string | null;
  observacao: string | null;
  payload: any;
  risco: "baixo" | "medio" | "alto" | "critico";
  origem: "manual" | "sistema";
  revisado: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  revisao_nota: string | null;
  total_count: number;
};

const fmtData = (s: string) => new Date(s).toLocaleString("pt-BR");

const riscoBadge = (r: string) => {
  const map: Record<string, string> = {
    critico: "bg-destructive/15 text-destructive border-destructive/30",
    alto: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    medio: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    baixo: "bg-muted text-muted-foreground",
  };
  return map[r] || map.baixo;
};

function downloadCSV(filename: string, rows: (string | number | null)[][]) {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAuditoria() {
  const [loading, setLoading] = useState(false);
  const [dash, setDash] = useState<any>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [detalhe, setDetalhe] = useState<Evento | null>(null);
  const [revisaoNota, setRevisaoNota] = useState("");
  const [salvandoRevisao, setSalvandoRevisao] = useState(false);

  // Filtros
  const hoje = new Date();
  const inicioPad = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 30).toISOString().slice(0, 10);
  const fimPad = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).toISOString().slice(0, 10);
  const [inicio, setInicio] = useState(inicioPad);
  const [fim, setFim] = useState(fimPad);
  const [modulo, setModulo] = useState<string>("todos");
  const [risco, setRisco] = useState<string>("todos");
  const [origem, setOrigem] = useState<string>("todas");
  const [revisado, setRevisado] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  const carregarDashboard = useCallback(async () => {
    const { data, error } = await supabase.rpc("auditoria_dashboard", {
      p_inicio: new Date(inicio + "T00:00:00").toISOString(),
      p_fim: new Date(fim + "T00:00:00").toISOString(),
    });
    if (error) { toast.error("Erro no painel", { description: error.message }); return; }
    setDash(data);
  }, [inicio, fim]);

  const carregarLista = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("auditoria_listar", {
        p_inicio: new Date(inicio + "T00:00:00").toISOString(),
        p_fim: new Date(fim + "T00:00:00").toISOString(),
        p_modulo: modulo === "todos" ? null : modulo,
        p_risco: risco === "todos" ? null : risco,
        p_actor: null,
        p_acao: null,
        p_entidade_id: null,
        p_origem: origem === "todas" ? null : origem,
        p_revisado: revisado === "todos" ? null : revisado,
        p_busca: busca.trim() || null,
        p_limit: PAGE,
        p_offset: (page - 1) * PAGE,
      });
      if (error) throw error;
      const lista = (data || []) as Evento[];
      setEventos(lista);
      setTotal(Number(lista[0]?.total_count || 0));
    } catch (e: any) {
      toast.error("Erro ao listar auditoria", { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [inicio, fim, modulo, risco, origem, revisado, busca, page]);

  useEffect(() => { carregarDashboard(); }, [carregarDashboard]);
  useEffect(() => { carregarLista(); }, [carregarLista]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE));

  const exportarCSV = () => {
    const linhas: any[][] = [
      ["Data", "Módulo", "Ação", "Risco", "Ator", "Entidade", "Campo", "Antes", "Depois", "Motivo", "Revisado"],
    ];
    eventos.forEach((e) =>
      linhas.push([
        fmtData(e.created_at), e.modulo, e.acao, e.risco, e.actor_nome,
        `${e.entidade_tipo || ""}:${e.entidade_id || ""}`,
        e.campo, e.valor_anterior, e.valor_novo, e.motivo,
        e.revisado ? "sim" : "não",
      ]),
    );
    downloadCSV(`auditoria-${inicio}-a-${fim}.csv`, linhas);
  };

  const marcarRevisado = async () => {
    if (!detalhe) return;
    setSalvandoRevisao(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão inválida");
      const { error } = await supabase.from("audit_revisoes").insert({
        evento_modulo: detalhe.modulo,
        evento_id: detalhe.id,
        reviewed_by: u.user.id,
        nota: revisaoNota || null,
      });
      if (error) throw error;
      toast.success("Evento marcado como revisado");
      setDetalhe(null); setRevisaoNota("");
      carregarLista(); carregarDashboard();
    } catch (e: any) {
      toast.error("Não foi possível salvar revisão", { description: e.message });
    } finally {
      setSalvandoRevisao(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Auditoria"
        description="Rastreamento de ações sensíveis na plataforma — quem, quando, o quê e por quê."
        actions={
          <Button variant="outline" size="sm" onClick={() => { carregarDashboard(); carregarLista(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        }
      />

      {/* DASHBOARD */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiAud label="Eventos hoje" value={dash?.hoje ?? "—"} icon={Clock} />
        <KpiAud label="Críticos" value={dash?.criticos ?? "—"} icon={AlertTriangle} variant="danger" />
        <KpiAud label="Financeiro" value={dash?.financeiro ?? "—"} icon={DollarSign} variant="warning" />
        <KpiAud label="Permissões" value={dash?.permissoes ?? "—"} icon={Key} variant="warning" />
        <KpiAud label="Integrações" value={dash?.integracao ?? "—"} icon={Plug} />
        <KpiAud label="Bloqueios" value={dash?.bloqueios ?? "—"} icon={Ban} variant="danger" />
      </div>

      {dash?.nao_revisados_sensiveis > 0 && (
        <Card className="p-3 border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div className="text-sm flex-1">
            <strong>{dash.nao_revisados_sensiveis}</strong> evento(s) crítico/alto sem revisão no período.
          </div>
          <Button size="sm" variant="outline" onClick={() => { setRisco("critico"); setRevisado("nao"); setPage(1); }}>
            Ver
          </Button>
        </Card>
      )}

      {/* FILTROS */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <div><Label className="text-xs">Início</Label><Input type="date" value={inicio} onChange={(e) => { setInicio(e.target.value); setPage(1); }} /></div>
          <div><Label className="text-xs">Fim</Label><Input type="date" value={fim} onChange={(e) => { setFim(e.target.value); setPage(1); }} /></div>
          <div>
            <Label className="text-xs">Módulo</Label>
            <Select value={modulo} onValueChange={(v) => { setModulo(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {MODULOS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Risco</Label>
            <Select value={risco} onValueChange={(v) => { setRisco(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {RISCOS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Origem</Label>
            <Select value={origem} onValueChange={(v) => { setOrigem(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {ORIGENS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Revisão</Label>
            <Select value={revisado} onValueChange={(v) => { setRevisado(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sim">Revisados</SelectItem>
                <SelectItem value="nao">Não revisados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Buscar</Label>
            <Input placeholder="ação, ator, motivo..." value={busca} onChange={(e) => { setBusca(e.target.value); setPage(1); }} />
          </div>
        </div>
      </Card>

      {/* TABELA */}
      <Card>
        <div className="flex items-center justify-between p-3 border-b">
          <div className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${total} evento(s)`}
          </div>
          <Button size="sm" variant="outline" onClick={exportarCSV} disabled={eventos.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Quando</TableHead>
                <TableHead>Ator</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && eventos.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6" /></TableCell></TableRow>
                ))
              ) : eventos.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Sem eventos no filtro.</TableCell></TableRow>
              ) : (
                eventos.map((e) => (
                  <TableRow key={`${e.modulo}-${e.id}`}>
                    <TableCell className="text-xs whitespace-nowrap">{fmtData(e.created_at)}</TableCell>
                    <TableCell className="text-sm">{e.actor_nome || <span className="text-muted-foreground italic">Sistema</span>}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{e.modulo}</Badge></TableCell>
                    <TableCell className="text-sm font-medium">{e.acao}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.entidade_tipo}
                      {e.entidade_id ? <div className="font-mono text-[10px]">{e.entidade_id.slice(0, 8)}…</div> : null}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={riscoBadge(e.risco)}>{e.risco}</Badge></TableCell>
                    <TableCell>
                      {e.revisado ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Revisado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setDetalhe(e); setRevisaoNota(e.revisao_nota || ""); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between p-3 border-t text-sm">
          <span className="text-muted-foreground">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* DETALHE */}
      <Sheet open={!!detalhe} onOpenChange={(o) => { if (!o) { setDetalhe(null); setRevisaoNota(""); } }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {detalhe && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Detalhe do evento
                </SheetTitle>
                <SheetDescription>{fmtData(detalhe.created_at)}</SheetDescription>
              </SheetHeader>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Módulo" value={detalhe.modulo} />
                  <Field label="Ação" value={detalhe.acao} />
                  <Field label="Risco" value={<Badge variant="outline" className={riscoBadge(detalhe.risco)}>{detalhe.risco}</Badge>} />
                  <Field label="Origem" value={detalhe.origem} />
                  <Field label="Ator" value={detalhe.actor_nome || "Sistema"} />
                  <Field label="Entidade" value={`${detalhe.entidade_tipo || "—"}`} />
                </div>

                {detalhe.entidade_id && (
                  <div className="text-xs">
                    <div className="text-muted-foreground">ID da entidade</div>
                    <div className="font-mono break-all">{detalhe.entidade_id}</div>
                  </div>
                )}

                {(detalhe.campo || detalhe.valor_anterior || detalhe.valor_novo) && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase">Alteração</div>
                    {detalhe.campo && <div className="text-sm"><span className="text-muted-foreground">Campo:</span> <code className="text-xs">{detalhe.campo}</code></div>}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded border bg-muted/30">
                        <div className="text-[10px] text-muted-foreground uppercase">Antes</div>
                        <div className="text-sm break-all">{detalhe.valor_anterior || "—"}</div>
                      </div>
                      <div className="p-2 rounded border bg-emerald-500/5">
                        <div className="text-[10px] text-muted-foreground uppercase">Depois</div>
                        <div className="text-sm break-all">{detalhe.valor_novo || "—"}</div>
                      </div>
                    </div>
                  </div>
                )}

                {detalhe.motivo && <Field label="Motivo" value={detalhe.motivo} />}
                {detalhe.observacao && <Field label="Observação" value={detalhe.observacao} />}

                {detalhe.payload && Object.keys(detalhe.payload).length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Payload</div>
                    <pre className="text-[11px] p-2 bg-muted rounded overflow-auto max-h-48">{JSON.stringify(detalhe.payload, null, 2)}</pre>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Revisão</div>
                  {detalhe.revisado ? (
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> Revisado em {fmtData(detalhe.reviewed_at!)}
                      </div>
                      {detalhe.revisao_nota && <div className="p-2 rounded bg-muted/30 text-xs">{detalhe.revisao_nota}</div>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Nota da revisão (opcional)"
                        value={revisaoNota}
                        onChange={(e) => setRevisaoNota(e.target.value)}
                        rows={3}
                      />
                      <Button onClick={marcarRevisado} disabled={salvandoRevisao} className="w-full">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {salvandoRevisao ? "Salvando..." : "Marcar como revisado"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KpiAud({ label, value, icon: Icon, variant = "default" }: any) {
  const accent = {
    default: "text-primary",
    warning: "text-amber-600",
    danger: "text-destructive",
  }[variant as string] || "text-primary";
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-2xl font-semibold mt-1 ${accent}`}>{value}</div>
        </div>
        <Icon className={`h-5 w-5 shrink-0 ${accent}`} />
      </div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
