import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Calendar, Search, Filter, MoreHorizontal, AlertTriangle, Loader2,
  CheckCircle2, XCircle, Clock, Send, RefreshCw, UserCog, Sparkles,
  History, Video, Eye, ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Status =
  | "agendada" | "aguardando_pagamento" | "confirmada"
  | "em_andamento" | "concluida" | "cancelada" | "no_show";

type Canal = "app" | "empresa" | "manual_admin" | "manual_secretaria" | "retorno" | "api";

type ConsultaRow = {
  id: string;
  inicio: string;
  fim: string;
  status: Status;
  modalidade: string;
  valor_centavos: number;
  link_sala: string | null;
  link_enviado_em: string | null;
  confirmada_em: string | null;
  canal_origem: Canal;
  empresa_id: string | null;
  paciente_id: string;
  medico_id: string;
  paciente_nome?: string;
  medico_nome?: string;
  empresa_nome?: string;
};

type Insight = {
  tipo: string;
  severidade: "baixa" | "media" | "alta";
  titulo: string;
  descricao: string;
};

const filtrosStatus: { key: Status | "todos" | "ativos"; label: string }[] = [
  { key: "ativos", label: "Ativos" },
  { key: "todos", label: "Todos" },
  { key: "agendada", label: "Agendadas" },
  { key: "confirmada", label: "Confirmadas" },
  { key: "em_andamento", label: "Em atendimento" },
  { key: "concluida", label: "Finalizadas" },
  { key: "cancelada", label: "Canceladas" },
  { key: "no_show", label: "No-show" },
  { key: "aguardando_pagamento", label: "Aguardando pgto" },
];

const motivosCancelamento = [
  "Solicitação do paciente",
  "Solicitação do médico",
  "Indisponibilidade técnica",
  "Erro de agendamento",
  "Pagamento não confirmado",
  "Outro",
];

function statusBadge(s: Status) {
  const map: Record<Status, { label: string; cls: string }> = {
    agendada: { label: "Agendada", cls: "border-primary/40 text-primary" },
    aguardando_pagamento: { label: "Aguard. pgto", cls: "border-warning/40 text-warning" },
    confirmada: { label: "Confirmada", cls: "border-success/40 text-success" },
    em_andamento: { label: "Em atendimento", cls: "border-accent/40 text-accent" },
    concluida: { label: "Finalizada", cls: "border-muted-foreground/40 text-muted-foreground" },
    cancelada: { label: "Cancelada", cls: "border-destructive/40 text-destructive" },
    no_show: { label: "No-show", cls: "border-destructive/40 text-destructive" },
  };
  const v = map[s];
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}

function canalBadge(c: Canal) {
  const map: Record<Canal, string> = {
    app: "App", empresa: "Empresa", manual_admin: "Admin",
    manual_secretaria: "Secretaria", retorno: "Retorno", api: "API",
  };
  return <span className="text-xs text-muted-foreground">{map[c] || c}</span>;
}

function brl(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminAgendamentos() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConsultaRow[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("ativos");
  const [filtroData, setFiltroData] = useState<"hoje" | "7d" | "30d" | "todos">("7d");
  const [filtroCanal, setFiltroCanal] = useState<string>("todos");

  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Camada de inteligência (RPC admin_agendamentos_overview)
  const [overview, setOverview] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const carregarOverview = useCallback(async () => {
    setOverviewLoading(true);
    const hojeStr = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.rpc("admin_agendamentos_overview", {
      _data: hojeStr, _periodo: "dia",
    });
    setOverviewLoading(false);
    if (error) {
      // silencioso — usuário pode não ter permissão
      console.warn("overview indisponível", error.message);
      return;
    }
    setOverview(data);
  }, []);

  // Modais
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; consulta?: ConsultaRow; novoStatus?: Status }>({ open: false });
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; consulta?: ConsultaRow }>({ open: false });
  const [motivoCancel, setMotivoCancel] = useState(motivosCancelamento[0]);
  const [obsCancel, setObsCancel] = useState("");
  const [motivoStatus, setMotivoStatus] = useState("");
  const [acting, setActing] = useState(false);

  // Auditoria drawer
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditConsulta, setAuditConsulta] = useState<ConsultaRow | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    const agora = new Date();
    let from = new Date(agora); from.setHours(0, 0, 0, 0);
    let to = new Date(agora); to.setDate(to.getDate() + 30); to.setHours(23, 59, 59, 999);
    if (filtroData === "hoje") { to = new Date(agora); to.setHours(23, 59, 59, 999); }
    if (filtroData === "7d") { to = new Date(agora); to.setDate(to.getDate() + 7); to.setHours(23, 59, 59, 999); }
    if (filtroData === "todos") { from = new Date("2020-01-01"); }

    let q = supabase
      .from("consultas")
      .select(`
        id, inicio, fim, status, modalidade, valor_centavos,
        link_sala, link_enviado_em, confirmada_em, canal_origem,
        empresa_id, paciente_id, medico_id,
        pacientes:pacientes!consultas_paciente_id_fkey ( nome_completo ),
        medicos:medicos!consultas_medico_id_fkey ( nome ),
        empresas:empresas ( razao_social, nome_fantasia )
      `)
      .gte("inicio", from.toISOString())
      .lte("inicio", to.toISOString())
      .order("inicio", { ascending: true })
      .limit(500);

    const { data, error } = await q;
    if (error) {
      // Fallback sem joins por nome (caso FKs não estejam declaradas)
      const { data: data2, error: e2 } = await supabase
        .from("consultas")
        .select("id, inicio, fim, status, modalidade, valor_centavos, link_sala, link_enviado_em, confirmada_em, canal_origem, empresa_id, paciente_id, medico_id")
        .gte("inicio", from.toISOString())
        .lte("inicio", to.toISOString())
        .order("inicio", { ascending: true })
        .limit(500);
      if (e2) {
        toast({ title: "Erro", description: e2.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      const ids = Array.from(new Set([
        ...(data2 || []).map((r: any) => r.paciente_id),
        ...(data2 || []).map((r: any) => r.medico_id),
      ]));
      const [{ data: pacs }, { data: meds }] = await Promise.all([
        supabase.from("pacientes").select("id, nome_completo").in("id", ids),
        supabase.from("medicos").select("id, nome").in("id", ids),
      ]);
      const mapPac = Object.fromEntries((pacs || []).map((p: any) => [p.id, p.nome_completo]));
      const mapMed = Object.fromEntries((meds || []).map((m: any) => [m.id, m.nome]));
      setRows((data2 || []).map((r: any) => ({
        ...r,
        paciente_nome: mapPac[r.paciente_id] || "—",
        medico_nome: mapMed[r.medico_id] || "—",
      })));
    } else {
      setRows((data || []).map((r: any) => ({
        ...r,
        paciente_nome: r.pacientes?.nome_completo || "—",
        medico_nome: r.medicos?.nome || "—",
        empresa_nome: r.empresas?.nome_fantasia || r.empresas?.razao_social,
      })));
    }
    setLoading(false);
  }, [filtroData, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const carregarInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("consulta-insights", { body: {} });
      if (error) throw error;
      setInsights((data as any)?.insights || []);
    } catch (e: any) {
      toast({ title: "IA indisponível", description: e?.message || "Falha ao gerar insights", variant: "destructive" });
    } finally {
      setInsightsLoading(false);
    }
  }, [toast]);

  // KPIs do dia
  const kpis = useMemo(() => {
    const hojeStr = new Date().toDateString();
    const hoje = rows.filter(r => new Date(r.inicio).toDateString() === hojeStr);
    return {
      total: hoje.length,
      confirmadas: hoje.filter(r => r.status === "confirmada").length,
      naoConfirmadas: hoje.filter(r => r.status === "agendada").length,
      emAtendimento: hoje.filter(r => r.status === "em_andamento").length,
      finalizadas: hoje.filter(r => r.status === "concluida").length,
      canceladas: hoje.filter(r => r.status === "cancelada").length,
      noShow: hoje.filter(r => r.status === "no_show").length,
    };
  }, [rows]);

  // Alertas operacionais derivados dos dados
  const alertas = useMemo(() => {
    const out: { tipo: string; severidade: "alta" | "media" | "baixa"; titulo: string; descricao: string; consulta_id?: string }[] = [];
    const agora = Date.now();
    rows.forEach(r => {
      const inicio = new Date(r.inicio).getTime();
      const diff = inicio - agora;
      if (r.modalidade === "online" && r.status !== "cancelada" && !r.link_enviado_em) {
        out.push({
          tipo: "link", severidade: "media",
          titulo: "Link não enviado",
          descricao: `${r.paciente_nome} • ${fmtDate(r.inicio)} (${r.medico_nome})`,
          consulta_id: r.id,
        });
      }
      if (r.status === "agendada" && diff > 0 && diff < 24 * 3600 * 1000 && !r.confirmada_em) {
        out.push({
          tipo: "confirmacao", severidade: "alta",
          titulo: "Sem confirmação <24h",
          descricao: `${r.paciente_nome} • ${fmtDate(r.inicio)}`,
          consulta_id: r.id,
        });
      }
      if (r.status === "agendada" && diff < -10 * 60 * 1000 && diff > -60 * 60 * 1000) {
        out.push({
          tipo: "atraso", severidade: "alta",
          titulo: "Possível atraso",
          descricao: `${r.medico_nome} ainda não iniciou • ${fmtDate(r.inicio)}`,
          consulta_id: r.id,
        });
      }
    });
    return out.slice(0, 12);
  }, [rows]);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return rows.filter(r => {
      if (filtroStatus === "ativos") {
        if (["concluida", "cancelada", "no_show"].includes(r.status)) return false;
      } else if (filtroStatus !== "todos" && r.status !== filtroStatus) return false;
      if (filtroCanal !== "todos" && (r.canal_origem || "app") !== filtroCanal) return false;
      if (!t) return true;
      return (
        (r.paciente_nome || "").toLowerCase().includes(t) ||
        (r.medico_nome || "").toLowerCase().includes(t) ||
        (r.empresa_nome || "").toLowerCase().includes(t) ||
        r.id.toLowerCase().includes(t)
      );
    });
  }, [rows, busca, filtroStatus, filtroCanal]);

  // Ações — RPCs dedicadas (admin_consulta_*)
  async function forcarStatus() {
    if (!statusDialog.consulta || !statusDialog.novoStatus) return;
    if (motivoStatus.trim().length < 3) {
      toast({ title: "Motivo obrigatório", description: "Descreva o motivo da alteração.", variant: "destructive" });
      return;
    }
    setActing(true);
    let error: any = null;
    const consultaId = statusDialog.consulta.id;
    const motivo = motivoStatus.trim();

    if (statusDialog.novoStatus === "confirmada") {
      ({ error } = await supabase.rpc("admin_consulta_forcar_confirmacao", {
        _consulta_id: consultaId, _motivo: motivo,
      }));
    } else if (statusDialog.novoStatus === "concluida") {
      ({ error } = await supabase.rpc("admin_consulta_marcar_realizada", {
        _consulta_id: consultaId, _observacao: motivo,
      }));
    } else {
      // no_show ou outros — usa RPC antiga genérica como fallback
      ({ error } = await supabase.rpc("forcar_status_consulta", {
        _consulta_id: consultaId,
        _novo_status: statusDialog.novoStatus,
        _motivo: motivo,
      }));
    }

    setActing(false);
    if (error) {
      toast({ title: "Não foi possível alterar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Status atualizado" });
    setStatusDialog({ open: false });
    setMotivoStatus("");
    carregar();
    carregarOverview();
  }

  async function cancelarConsulta() {
    if (!cancelDialog.consulta) return;
    setActing(true);
    const { error } = await supabase.rpc("admin_consulta_cancelar", {
      _consulta_id: cancelDialog.consulta.id,
      _motivo: `${motivoCancel}${obsCancel ? " — " + obsCancel : ""}`,
    });
    setActing(false);
    if (error) {
      toast({ title: "Erro ao cancelar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Consulta cancelada", description: "Slot liberado e auditoria registrada." });
    setCancelDialog({ open: false });
    setObsCancel("");
    carregar();
    carregarOverview();
  }

  async function reenviarLink(c: ConsultaRow) {
    const { error } = await supabase.rpc("admin_consulta_reenviar_link", {
      _consulta_id: c.id,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Link reenviado", description: "Registrado na auditoria. Entrega via WhatsApp será disparada quando integração estiver ativa." });
    carregar();
  }

  async function abrirAuditoria(c: ConsultaRow) {
    setAuditConsulta(c);
    setAuditOpen(true);
    const [{ data: aud }, { data: stat }] = await Promise.all([
      supabase.from("consultas_auditoria").select("*").eq("consulta_id", c.id).order("created_at", { ascending: false }),
      supabase.from("consulta_status_log").select("*").eq("consulta_id", c.id).order("created_at", { ascending: false }),
    ]);
    const merged = [
      ...(aud || []).map((a: any) => ({ tipo: "auditoria", ...a })),
      ...(stat || []).map((s: any) => ({ tipo: "status", ...s })),
    ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setAuditLogs(merged);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Agendamentos"
        description="Monitoramento, auditoria e otimização — não é uma agenda manual."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={carregar}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
            <Button onClick={carregarInsights} disabled={insightsLoading}>
              {insightsLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar insights IA
            </Button>
          </div>
        }
      />

      {/* KPIs do dia */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Hoje", value: kpis.total, icon: Calendar, cls: "text-primary" },
          { label: "Confirmadas", value: kpis.confirmadas, icon: CheckCircle2, cls: "text-success" },
          { label: "Não confirm.", value: kpis.naoConfirmadas, icon: Clock, cls: "text-warning" },
          { label: "Em atendimento", value: kpis.emAtendimento, icon: Video, cls: "text-accent" },
          { label: "Finalizadas", value: kpis.finalizadas, icon: CheckCircle2, cls: "text-muted-foreground" },
          { label: "Canceladas", value: kpis.canceladas, icon: XCircle, cls: "text-destructive" },
          { label: "No-show", value: kpis.noShow, icon: AlertTriangle, cls: "text-destructive" },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{k.label}</span>
              <k.icon className={cn("h-4 w-4", k.cls)} />
            </div>
            <div className="text-2xl font-display font-semibold mt-1">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Alertas + Insights IA */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Alertas operacionais
            </h3>
            <Badge variant="outline">{alertas.length}</Badge>
          </div>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {alertas.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem alertas críticos no momento.</p>
            )}
            {alertas.map((a, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                <Badge variant="outline" className={cn(
                  a.severidade === "alta" ? "border-destructive/40 text-destructive" :
                  a.severidade === "media" ? "border-warning/40 text-warning" :
                  "border-muted-foreground/40 text-muted-foreground",
                )}>{a.severidade}</Badge>
                <div className="flex-1">
                  <div className="font-medium">{a.titulo}</div>
                  <div className="text-xs text-muted-foreground">{a.descricao}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Insights da IA
            </h3>
            <Badge variant="outline">{insights.length}</Badge>
          </div>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {insights.length === 0 && !insightsLoading && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Clique em "Gerar insights IA" para análise dos próximos 7 dias.
              </p>
            )}
            {insightsLoading && (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            )}
            {insights.map((ins, i) => (
              <div key={i} className="rounded-md border p-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(
                    ins.severidade === "alta" ? "border-destructive/40 text-destructive" :
                    ins.severidade === "media" ? "border-warning/40 text-warning" :
                    "border-success/40 text-success",
                  )}>{ins.severidade}</Badge>
                  <span className="font-medium">{ins.titulo}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{ins.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar paciente, médico, empresa ou ID…"
              className="pl-9"
            />
          </div>
          <Select value={filtroData} onValueChange={(v: any) => setFiltroData(v)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="7d">Próx. 7 dias</SelectItem>
              <SelectItem value="30d">Próx. 30 dias</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroCanal} onValueChange={setFiltroCanal}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Canal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os canais</SelectItem>
              <SelectItem value="app">App</SelectItem>
              <SelectItem value="empresa">Empresa</SelectItem>
              <SelectItem value="manual_admin">Admin</SelectItem>
              <SelectItem value="manual_secretaria">Secretaria</SelectItem>
              <SelectItem value="retorno">Retorno</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          {filtrosStatus.map(f => (
            <Button
              key={f.key}
              size="sm"
              variant={filtroStatus === f.key ? "default" : "outline"}
              onClick={() => setFiltroStatus(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Horário</th>
                <th className="text-left px-3 py-2">Paciente</th>
                <th className="text-left px-3 py-2">Médico</th>
                <th className="text-left px-3 py-2">Empresa</th>
                <th className="text-left px-3 py-2">Canal</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Valor</th>
                <th className="text-center px-3 py-2">Link</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Carregando…
                </td></tr>
              )}
              {!loading && filtradas.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">
                  Nenhum agendamento encontrado.
                </td></tr>
              )}
              {filtradas.map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.inicio)}</td>
                  <td className="px-3 py-2">
                    <Link to={`/app/admin/pacientes/${r.paciente_id}`} className="hover:underline">
                      {r.paciente_nome}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.medico_nome}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.empresa_nome || "—"}</td>
                  <td className="px-3 py-2">{canalBadge(r.canal_origem || "app")}</td>
                  <td className="px-3 py-2">{statusBadge(r.status)}</td>
                  <td className="px-3 py-2 text-right">{brl(r.valor_centavos)}</td>
                  <td className="px-3 py-2 text-center">
                    {r.link_enviado_em
                      ? <Badge variant="outline" className="border-success/40 text-success">Enviado</Badge>
                      : r.link_sala
                        ? <Badge variant="outline" className="border-warning/40 text-warning">Pendente</Badge>
                        : <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">—</Badge>
                    }
                  </td>
                  <td className="px-3 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => abrirAuditoria(r)}>
                          <History className="h-4 w-4 mr-2" /> Ver auditoria
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => reenviarLink(r)} disabled={r.modalidade !== "online"}>
                          <Send className="h-4 w-4 mr-2" /> Reenviar link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setStatusDialog({ open: true, consulta: r, novoStatus: "confirmada" }); }}>
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Forçar confirmação
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setStatusDialog({ open: true, consulta: r, novoStatus: "concluida" }); }}>
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como finalizada
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setStatusDialog({ open: true, consulta: r, novoStatus: "no_show" }); }}>
                          <AlertTriangle className="h-4 w-4 mr-2" /> Marcar no-show
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setCancelDialog({ open: true, consulta: r })}
                        >
                          <XCircle className="h-4 w-4 mr-2" /> Cancelar consulta
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog: forçar status */}
      <Dialog open={statusDialog.open} onOpenChange={(o) => { if (!o) { setStatusDialog({ open: false }); setMotivoStatus(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar status manualmente</DialogTitle>
            <DialogDescription>
              {statusDialog.consulta && (
                <>Consulta de <b>{statusDialog.consulta.paciente_nome}</b> com <b>{statusDialog.consulta.medico_nome}</b> em {fmtDate(statusDialog.consulta.inicio)}.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Novo status</Label>
              <div className="text-sm mt-1">{statusDialog.novoStatus && statusBadge(statusDialog.novoStatus)}</div>
            </div>
            <div>
              <Label htmlFor="motivo-status">Motivo (obrigatório)</Label>
              <Textarea
                id="motivo-status"
                value={motivoStatus}
                onChange={(e) => setMotivoStatus(e.target.value)}
                placeholder="Descreva por que esta alteração está sendo feita…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog({ open: false })}>Cancelar</Button>
            <Button onClick={forcarStatus} disabled={acting}>
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: cancelar */}
      <Dialog open={cancelDialog.open} onOpenChange={(o) => { if (!o) setCancelDialog({ open: false }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar consulta</DialogTitle>
            <DialogDescription>
              Esta ação será registrada na auditoria com seu usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Motivo</Label>
              <Select value={motivoCancel} onValueChange={setMotivoCancel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {motivosCancelamento.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="obs-cancel">Observação (opcional)</Label>
              <Textarea id="obs-cancel" value={obsCancel} onChange={(e) => setObsCancel(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog({ open: false })}>Voltar</Button>
            <Button variant="destructive" onClick={cancelarConsulta} disabled={acting}>
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancelar consulta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drawer auditoria */}
      <Sheet open={auditOpen} onOpenChange={setAuditOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Auditoria da consulta</SheetTitle>
            <SheetDescription>
              {auditConsulta && <>{auditConsulta.paciente_nome} • {fmtDate(auditConsulta.inicio)}</>}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {auditLogs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Sem registros.</p>
            )}
            {auditLogs.map((l, i) => (
              <div key={i} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{l.tipo === "status" ? "Status" : (l.acao || "Auditoria")}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                {l.tipo === "status" ? (
                  <p className="mt-1">
                    {l.status_anterior || "—"} → <b>{l.status_novo}</b>
                    {l.motivo && <span className="block text-xs text-muted-foreground mt-1">{l.motivo}</span>}
                  </p>
                ) : (
                  <div className="mt-1">
                    {l.campo && <p><span className="text-muted-foreground">Campo:</span> {l.campo}</p>}
                    {(l.valor_anterior || l.valor_novo) && (
                      <p className="text-xs">
                        <span className="text-muted-foreground">{l.valor_anterior || "—"}</span> → <b>{l.valor_novo || "—"}</b>
                      </p>
                    )}
                    {l.motivo && <p className="text-xs text-muted-foreground mt-1">{l.motivo}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
