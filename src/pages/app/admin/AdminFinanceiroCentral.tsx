import React, { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FinanceiroCentralDashboard } from "@/lib/admin/types";
import { AdminLoading, AdminError } from "@/components/admin/AdminStates";
import { DollarSign, RefreshCw, Loader2, Download, AlertTriangle, CheckCircle2, XCircle, Link2, FileText, Wallet, ChevronDown, ChevronRight, Clock, User, Shield } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { brl, downloadCSV } from "@/lib/relatorios/utils";
import { NovaCobrancaDialog } from "@/components/financeiro/NovaCobrancaDialog";

const fmtData = (s?: string | null) => s ? new Date(s).toLocaleString("pt-BR") : "—";

export default function AdminFinanceiroCentral() {
  const hoje = new Date();
  const [inicio, setInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10));
  const [fim, setFim] = useState(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10));
  const [dash, setDash] = useState<FinanceiroCentralDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagamentos, setPagamentos] = useState<Record<string, unknown>[]>([]);
  const [reembolsos, setReembolsos] = useState<Record<string, unknown>[]>([]);
  const [expandedReembolso, setExpandedReembolso] = useState<string | null>(null);
  const [reembolsoAudit, setReembolsoAudit] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [links, setLinks] = useState<any[]>([]);
  const [repasses, setRepasses] = useState<any[]>([]);

  // Modais
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reembolsoModal, setReembolsoModal] = useState<{ id: string; motivo: string; observacao: string; aprovar: boolean } | null>(null);
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [detalheReembolsos, setDetalheReembolsos] = useState<any[]>([]);
  const [detalheSnapshot, setDetalheSnapshot] = useState<any | null>(null);
  const [novaCobrancaOpen, setNovaCobrancaOpen] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [loteCancelOpen, setLoteCancelOpen] = useState(false);
  const [loteCancelMotivo, setLoteCancelMotivo] = useState("");
  const [loteRunning, setLoteRunning] = useState(false);

  // Filtros / busca / paginação
  const PAGE_SIZE = 20;
  const [pgBusca, setPgBusca] = useState("");
  const [pgStatus, setPgStatus] = useState<string>("todos");
  const [pgPage, setPgPage] = useState(1);
  const [lkBusca, setLkBusca] = useState("");
  const [lkStatus, setLkStatus] = useState<string>("todos");
  const [lkPage, setLkPage] = useState(1);

  const nomePaciente = (p: any) => p?.paciente?.nome_completo || p?.paciente?.nome || "";
  const nomeMedico = (p: any) => p?.medico?.nome || "";
  const nomeEmpresa = (p: any) => p?.empresa?.nome_fantasia || p?.empresa?.razao_social || "";
  const matchBusca = (q: string, ...campos: string[]) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return campos.some(c => (c || "").toLowerCase().includes(t));
  };

  const pagamentosFiltrados = pagamentos.filter(p =>
    (pgStatus === "todos" || p.status === pgStatus) &&
    matchBusca(pgBusca, nomePaciente(p), nomeMedico(p), nomeEmpresa(p), p.id)
  );
  const pgTotalPages = Math.max(1, Math.ceil(pagamentosFiltrados.length / PAGE_SIZE));
  const pgPageSafe = Math.min(pgPage, pgTotalPages);
  const pagamentosPagina = pagamentosFiltrados.slice((pgPageSafe - 1) * PAGE_SIZE, pgPageSafe * PAGE_SIZE);

  const linksFiltrados = links.filter(l =>
    (lkStatus === "todos" || l.status === lkStatus) &&
    matchBusca(lkBusca, nomePaciente(l), l.descricao, l.id)
  );
  const lkTotalPages = Math.max(1, Math.ceil(linksFiltrados.length / PAGE_SIZE));
  const lkPageSafe = Math.min(lkPage, lkTotalPages);
  const linksPagina = linksFiltrados.slice((lkPageSafe - 1) * PAGE_SIZE, lkPageSafe * PAGE_SIZE);

  const togglePagamento = (id: string) => setSelecionados(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const pendentes = pagamentos.filter(p => p.status === "pendente");
  const todosPendentesSelecionados = pendentes.length > 0 && pendentes.every(p => selecionados.has(p.id));
  const toggleTodos = () => setSelecionados(s => {
    if (todosPendentesSelecionados) { const n = new Set(s); pendentes.forEach(p => n.delete(p.id)); return n; }
    const n = new Set(s); pendentes.forEach(p => n.add(p.id)); return n;
  });
  const selecionadosPendentes = pagamentos.filter(p => selecionados.has(p.id) && p.status === "pendente");

  async function aprovarLote() {
    if (!selecionadosPendentes.length) return;
    setLoteRunning(true);
    let ok = 0, fail = 0;
    for (const p of selecionadosPendentes) {
      try { await supabase.rpc("financeiro_pagamento_confirmar" as any, { _pagamento_id: p.id }); ok++; }
      catch { fail++; }
    }
    setLoteRunning(false);
    setSelecionados(new Set());
    toast.success(`${ok} aprovados${fail ? `, ${fail} com erro` : ""}`);
    carregar();
  }

  async function cancelarLote() {
    if (!selecionadosPendentes.length || !loteCancelMotivo.trim()) return;
    setLoteRunning(true);
    let ok = 0, fail = 0;
    for (const p of selecionadosPendentes) {
      try { await supabase.rpc("financeiro_pagamento_cancelar" as any, { _pagamento_id: p.id, _motivo: loteCancelMotivo }); ok++; }
      catch { fail++; }
    }
    setLoteRunning(false);
    setLoteCancelOpen(false);
    setLoteCancelMotivo("");
    setSelecionados(new Set());
    toast.success(`${ok} cancelados${fail ? `, ${fail} com erro` : ""}`);
    carregar();
  }

  async function abrirDetalhe(p: any) {
    setDetalhe(p);
    setDetalheReembolsos([]);
    setDetalheSnapshot(null);
    try {
      if (p.consulta_id) {
        const { data: snap } = await supabase.from("consultas_financeiro").select("*").eq("consulta_id", p.consulta_id).maybeSingle();
        setDetalheSnapshot(snap);
      }
      const { data: r } = await supabase.from("reembolsos").select("*").eq("pagamento_id", p.id).order("created_at", { ascending: false });
      setDetalheReembolsos(r || []);
    } catch {}
  }



  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await supabase.rpc("financeiro_central_dashboard" as any, { _inicio: inicio, _fim: fim });
      setDash(d);
      const { data: p } = await supabase.from("pagamentos").select("*, paciente:pacientes(id,nome_completo), medico:medicos(id,nome), empresa:empresas(id,razao_social,nome_fantasia)").order("created_at", { ascending: false }).limit(500);
      setPagamentos(p || []);
      const { data: r } = await supabase.from("reembolsos")
        .select("*, consulta:consultas!inner(inicio, paciente:pacientes!inner(nome_completo), medico:medicos!inner(nome)), pagamento:pagamentos!pagamento_id(provider_payment_id, gateway_ref), solicitante:profiles!actor_id(nome), analisador:profiles!analisado_por(nome)")
        .order("created_at", { ascending: false }).limit(200);
      setReembolsos((r || []).map((x: any) => ({
        ...x,
        paciente_nome: x.consulta?.paciente?.nome_completo ?? "—",
        medico_nome: x.consulta?.medico?.nome ?? "—",
        consulta_data: x.consulta?.inicio,
        payment_ref: x.pagamento?.provider_payment_id || x.pagamento?.gateway_ref || null,
        solicitante_nome: x.solicitante?.nome ?? null,
        analisador_nome: x.analisador?.nome ?? null,
      })));
      const { data: l } = await supabase.from("cobrancas_links").select("*, paciente:pacientes(id,nome_completo)").order("created_at", { ascending: false }).limit(500);
      setLinks(l || []);
      const { data: f } = await supabase.from("fechamentos_mensais").select("*, medicos(nome)").order("created_at", { ascending: false }).limit(100);
      setRepasses(f || []);
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar dados");
    } finally { setLoading(false); }
  }, [inicio, fim]);

  useEffect(() => { carregar(); }, [carregar]);

  async function confirmarPagamento(id: string) {
    try { await supabase.rpc("financeiro_pagamento_confirmar" as any, { _pagamento_id: id }); toast.success("Pagamento confirmado"); carregar(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function cancelarPagamento() {
    if (!cancelId || !cancelMotivo.trim()) return;
    try { await supabase.rpc("financeiro_pagamento_cancelar" as any, { _pagamento_id: cancelId, _motivo: cancelMotivo }); toast.success("Cobrança cancelada"); setCancelId(null); setCancelMotivo(""); carregar(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function decidirReembolso() {
    if (!reembolsoModal) return;
    try {
      if (reembolsoModal.aprovar) {
        await supabase.rpc("financeiro_reembolso_aprovar" as any, { _reembolso_id: reembolsoModal.id, _observacao: reembolsoModal.observacao || null });
        supabase.functions.invoke("notificar-reembolso", {
          body: { reembolso_id: reembolsoModal.id, evento: "aprovado" },
        }).catch(() => {});
        toast.success("Reembolso aprovado");
      } else {
        await supabase.rpc("financeiro_reembolso_recusar" as any, { _reembolso_id: reembolsoModal.id, _motivo: reembolsoModal.motivo || "Recusado" });
        supabase.functions.invoke("notificar-reembolso", {
          body: { reembolso_id: reembolsoModal.id, evento: "recusado" },
        }).catch(() => {});
        toast.success("Reembolso recusado");
      }
      setReembolsoModal(null); carregar();
    } catch (e: any) { toast.error(e.message); }
  }
  async function toggleReembolsoAudit(id: string) {
    if (expandedReembolso === id) { setExpandedReembolso(null); return; }
    setExpandedReembolso(id);
    setAuditLoading(true);
    try {
      const { data } = await supabase
        .from("financeiro_auditoria")
        .select("*, actor:profiles!actor_id(nome)")
        .eq("entidade", "reembolso")
        .eq("entidade_id", id)
        .order("created_at", { ascending: true });
      setReembolsoAudit(data || []);
    } catch { setReembolsoAudit([]); }
    setAuditLoading(false);
  }
  async function marcarPagoRepasse(id: string) {
    try { await supabase.rpc("financeiro_repasse_marcar_pago" as any, { _fechamento_id: id }); toast.success("Repasse pago"); carregar(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function bloquearRepasse(id: string) {
    const motivo = prompt("Motivo do bloqueio:");
    if (!motivo) return;
    try { await supabase.rpc("financeiro_repasse_bloquear" as any, { _fechamento_id: id, _motivo: motivo }); toast.success("Repasse bloqueado"); carregar(); }
    catch (e: any) { toast.error(e.message); }
  }

  const dentroPeriodo = (iso?: string | null) => {
    if (!iso) return false;
    const d = iso.slice(0, 10);
    return d >= inicio && d <= fim;
  };
  const exportarPagamentos = () => {
    const rows: (string | number)[][] = [["ID", "Status", "Valor", "Forma", "Data Pagamento", "Criado em"]];
    pagamentos.filter(p => dentroPeriodo(p.created_at)).forEach(p => rows.push([p.id, p.status, brl(p.valor_bruto_centavos || p.valor_centavos), p.metodo || p.forma || "", fmtData(p.data_pagamento || p.paid_at), fmtData(p.created_at)]));
    downloadCSV(`pagamentos_${inicio}_${fim}.csv`, rows);
  };
  const exportarReembolsos = () => {
    const rows: (string | number)[][] = [["ID", "Tipo", "Valor", "Status", "Motivo", "Criado em"]];
    reembolsos.filter(r => dentroPeriodo(r.created_at)).forEach(r => rows.push([r.id, r.tipo, brl(r.valor_centavos), r.status, r.motivo || "", fmtData(r.created_at)]));
    downloadCSV(`reembolsos_${inicio}_${fim}.csv`, rows);
  };
  const exportarLinks = () => {
    const rows: (string | number)[][] = [["ID", "Descrição", "Valor", "Vencimento", "Status", "Criado em"]];
    links.filter(l => dentroPeriodo(l.created_at)).forEach(l => rows.push([l.id, l.descricao, brl(l.valor_centavos), l.vencimento || "", l.status, fmtData(l.created_at)]));
    downloadCSV(`links_${inicio}_${fim}.csv`, rows);
  };

  const StatusBadge = ({ s }: { s: string }) => {
    const map: Record<string, string> = {
      pago: "bg-success/10 text-success", aprovado: "bg-success/10 text-success",
      pendente: "bg-warning/10 text-warning", processando: "bg-primary/10 text-primary",
      recusado: "bg-destructive/10 text-destructive", falhou: "bg-destructive/10 text-destructive",
      cancelado: "bg-muted text-muted-foreground", reembolsado: "bg-muted text-muted-foreground",
      reembolsado_parcial: "bg-muted text-muted-foreground", expirado: "bg-muted text-muted-foreground",
      solicitado: "bg-warning/10 text-warning", em_analise: "bg-primary/10 text-primary",
      em_aberto: "bg-warning/10 text-warning", em_processamento: "bg-primary/10 text-primary",
      bloqueado: "bg-destructive/10 text-destructive", contestado: "bg-warning/10 text-warning",
      ativo: "bg-primary/10 text-primary", concluido: "bg-success/10 text-success",
    };
    return <Badge className={map[s] || "bg-muted"}>{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Central Financeira" description="Pagamentos, reembolsos, links, faturas, repasses e relatórios" />

      <div className="flex flex-wrap gap-3 items-end">
        <div><Label>Início</Label><Input type="date" value={inicio} onChange={e => setInicio(e.target.value)} /></div>
        <div><Label>Fim</Label><Input type="date" value={fim} onChange={e => setFim(e.target.value)} /></div>
        <Button onClick={carregar} disabled={loading}>{loading ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4 mr-2" />}Atualizar</Button>
        <Button variant="outline" onClick={exportarPagamentos}><Download className="h-4 w-4 mr-2" />Pagamentos</Button>
        <Button variant="outline" onClick={exportarReembolsos}><Download className="h-4 w-4 mr-2" />Reembolsos</Button>
        <Button variant="outline" onClick={exportarLinks}><Download className="h-4 w-4 mr-2" />Links</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Faturamento", v: dash?.faturamento_total, icon: DollarSign, cls: "text-success" },
          { label: "Pendentes", v: dash?.pendentes, icon: AlertTriangle, cls: "text-warning" },
          { label: "Reembolsos", v: dash?.reembolsos_valor, icon: RefreshCw, cls: "text-muted-foreground" },
          { label: "A repassar", v: dash?.valor_repassar, icon: Wallet, cls: "text-primary" },
          { label: "Receita empresas", v: dash?.receita_empresas, icon: FileText, cls: "text-primary" },
          { label: "Receita particular", v: dash?.receita_particular, icon: DollarSign, cls: "text-success" },
          { label: "Em aberto", v: dash?.valor_em_aberto, icon: AlertTriangle, cls: "text-warning" },
          { label: "Recusados", v: dash?.recusados, icon: XCircle, cls: "text-destructive" },
        ].map(k => (
          <div key={k.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">{k.label}</span><k.icon className={`h-4 w-4 ${k.cls}`} /></div>
            <div className="text-2xl font-bold">{brl(k.v || 0)}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="pagamentos">
        <TabsList>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="reembolsos">Reembolsos</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="repasses">Repasses</TabsTrigger>
        </TabsList>

        <TabsContent value="pagamentos" className="space-y-2">
          {selecionadosPendentes.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-2">
              <span className="text-sm">{selecionadosPendentes.length} pagamento(s) pendente(s) selecionado(s)</span>
              <div className="space-x-2">
                <Button size="sm" variant="outline" onClick={() => setSelecionados(new Set())} disabled={loteRunning}>Limpar</Button>
                <Button size="sm" onClick={aprovarLote} disabled={loteRunning}>
                  {loteRunning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}Aprovar selecionados
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setLoteCancelOpen(true)} disabled={loteRunning}>
                  <XCircle className="h-3 w-3 mr-1" />Cancelar selecionados
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[220px]"><Label>Buscar</Label><Input placeholder="Paciente, médico, empresa ou ID" value={pgBusca} onChange={e => { setPgBusca(e.target.value); setPgPage(1); }} /></div>
            <div className="min-w-[180px]"><Label>Status</Label>
              <Select value={pgStatus} onValueChange={v => { setPgStatus(v); setPgPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="recusado">Recusado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="reembolsado">Estornado</SelectItem>
                  <SelectItem value="reembolsado_parcial">Estornado parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr>
                <th className="p-2 w-8"><Checkbox checked={todosPendentesSelecionados} onCheckedChange={toggleTodos} aria-label="Selecionar todos pendentes" disabled={!pendentes.length} /></th>
                <th className="text-left p-2">ID</th><th className="text-left p-2">Paciente / Médico / Empresa</th><th className="text-left p-2">Valor</th><th className="text-left p-2">Forma</th><th className="text-left p-2">Status</th><th className="text-left p-2">Pago em</th><th className="text-right p-2">Ações</th>
              </tr></thead>
              <tbody>
                {pagamentosPagina.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">
                      {p.status === "pendente" && (
                        <Checkbox checked={selecionados.has(p.id)} onCheckedChange={() => togglePagamento(p.id)} aria-label={`Selecionar ${p.id}`} />
                      )}
                    </td>
                    <td className="p-2 font-mono text-xs">{p.id.slice(0, 8)}</td>
                    <td className="p-2">
                      <div className="leading-tight">
                        <div>{nomePaciente(p) || <span className="text-muted-foreground">—</span>}</div>
                        <div className="text-xs text-muted-foreground">{[nomeMedico(p), nomeEmpresa(p)].filter(Boolean).join(" · ") || ""}</div>
                      </div>
                    </td>
                    <td className="p-2">{brl(p.valor_bruto_centavos || p.valor_centavos)}</td>
                    <td className="p-2">{p.metodo || p.forma || "—"}</td>
                    <td className="p-2"><StatusBadge s={p.status} /></td>
                    <td className="p-2">{fmtData(p.data_pagamento || p.paid_at)}</td>
                    <td className="p-2 text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => abrirDetalhe(p)}>Ver</Button>
                      {p.status === "pendente" && <>
                        <Button size="sm" variant="outline" onClick={() => confirmarPagamento(p.id)}><CheckCircle2 className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => { setCancelId(p.id); setCancelMotivo(""); }}><XCircle className="h-3 w-3" /></Button>
                      </>}
                    </td>
                  </tr>
                ))}
                {!pagamentosFiltrados.length && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Sem pagamentos</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{pagamentosFiltrados.length} resultado(s) · página {pgPageSafe}/{pgTotalPages}</span>
            <div className="space-x-2">
              <Button size="sm" variant="outline" disabled={pgPageSafe <= 1} onClick={() => setPgPage(p => Math.max(1, p - 1))}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={pgPageSafe >= pgTotalPages} onClick={() => setPgPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reembolsos" className="space-y-2">
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="w-8 p-2" />
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Paciente</th>
                  <th className="text-left p-2">Médico</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Valor</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Data</th>
                  <th className="text-right p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {reembolsos.map(r => {
                  const isExpanded = expandedReembolso === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <tr className="border-t cursor-pointer hover:bg-muted/30" onClick={() => toggleReembolsoAudit(r.id)}>
                        <td className="p-2 text-muted-foreground">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </td>
                        <td className="p-2 font-mono text-xs">{r.id.slice(0, 8)}</td>
                        <td className="p-2">{r.paciente_nome}</td>
                        <td className="p-2">{r.medico_nome}</td>
                        <td className="p-2"><Badge variant="outline">{r.tipo}</Badge></td>
                        <td className="p-2 font-semibold">{brl(r.valor_centavos)}</td>
                        <td className="p-2"><StatusBadge s={r.status} /></td>
                        <td className="p-2 text-xs text-muted-foreground">{fmtData(r.created_at)}</td>
                        <td className="p-2 text-right space-x-1" onClick={e => e.stopPropagation()}>
                          {(r.status === "solicitado" || r.status === "em_analise") && <>
                            <Button size="sm" variant="outline" onClick={() => setReembolsoModal({ id: r.id, motivo: "", observacao: "", aprovar: true })}><CheckCircle2 className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" onClick={() => setReembolsoModal({ id: r.id, motivo: "", observacao: "", aprovar: false })}><XCircle className="h-3 w-3" /></Button>
                          </>}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/20">
                          <td colSpan={9} className="p-4">
                            {auditLoading ? (
                              <div className="flex items-center gap-2 text-muted-foreground py-4"><Loader2 className="h-4 w-4 animate-spin" /> Carregando auditoria…</div>
                            ) : (
                              <div className="grid gap-4 md:grid-cols-2">
                                {/* Detalhes */}
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-sm flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /> Detalhes do Reembolso</h4>
                                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                                    <dt className="text-muted-foreground">Motivo:</dt>
                                    <dd>{r.motivo}</dd>
                                    {r.observacao && <><dt className="text-muted-foreground">Observação:</dt><dd>{r.observacao}</dd></>}
                                    <dt className="text-muted-foreground">Solicitado por:</dt>
                                    <dd className="flex items-center gap-1"><User className="h-3 w-3" /> {r.solicitante_nome ?? "—"}</dd>
                                    <dt className="text-muted-foreground">Solicitado em:</dt>
                                    <dd>{fmtData(r.created_at)}</dd>
                                    {r.analisador_nome && <>
                                      <dt className="text-muted-foreground">Analisado por:</dt>
                                      <dd className="flex items-center gap-1"><User className="h-3 w-3" /> {r.analisador_nome}</dd>
                                    </>}
                                    {r.decidido_em && <>
                                      <dt className="text-muted-foreground">Decidido em:</dt>
                                      <dd>{fmtData(r.decidido_em)}</dd>
                                    </>}
                                    <dt className="text-muted-foreground">Consulta:</dt>
                                    <dd>{r.consulta_data ? fmtData(r.consulta_data) : "—"}</dd>
                                    <dt className="text-muted-foreground">Payment Ref:</dt>
                                    <dd className="font-mono text-xs">{r.payment_ref ?? "—"}</dd>
                                    <dt className="text-muted-foreground">Estorno processado:</dt>
                                    <dd>{r.snapshot_estornado ? "Sim ✓" : "Não"}</dd>
                                  </dl>
                                </div>

                                {/* Timeline de auditoria */}
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-sm flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> Histórico de Auditoria</h4>
                                  {reembolsoAudit.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">Sem registros de auditoria.</p>
                                  ) : (
                                    <div className="relative border-l-2 border-border pl-4 space-y-3">
                                      {reembolsoAudit.map((a: any) => (
                                        <div key={a.id} className="relative">
                                          <div className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                                          <p className="text-xs font-medium">{a.acao}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {a.actor?.nome ?? "Sistema"} · {fmtData(a.created_at)}
                                          </p>
                                          {(a.valor_anterior || a.valor_novo) && (
                                            <p className="text-xs mt-0.5">
                                              <span className="text-muted-foreground">{a.valor_anterior ?? "—"}</span>
                                              <span className="mx-1">→</span>
                                              <span className="font-medium">{a.valor_novo ?? "—"}</span>
                                            </p>
                                          )}
                                          {a.motivo && <p className="text-xs text-muted-foreground italic">{a.motivo}</p>}
                                          {a.observacao && <p className="text-xs text-muted-foreground">{a.observacao}</p>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {!reembolsos.length && <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">Sem reembolsos</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="links" className="space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[220px]"><Label>Buscar</Label><Input placeholder="Paciente, descrição ou ID" value={lkBusca} onChange={e => { setLkBusca(e.target.value); setLkPage(1); }} /></div>
            <div className="min-w-[180px]"><Label>Status</Label>
              <Select value={lkStatus} onValueChange={v => { setLkStatus(v); setLkPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="expirado">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => setNovaCobrancaOpen(true)}><Link2 className="h-4 w-4 mr-2" />Nova cobrança</Button>
          </div>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr><th className="text-left p-2">Descrição</th><th className="text-left p-2">Paciente</th><th className="text-left p-2">Valor</th><th className="text-left p-2">Vencimento</th><th className="text-left p-2">Status</th></tr></thead>
              <tbody>
                {linksPagina.map(l => (
                  <tr key={l.id} className="border-t">
                    <td className="p-2">{l.descricao}</td>
                    <td className="p-2">{nomePaciente(l) || <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-2">{brl(l.valor_centavos)}</td>
                    <td className="p-2">{l.vencimento || "—"}</td>
                    <td className="p-2"><StatusBadge s={l.status} /></td>
                  </tr>
                ))}
                {!linksFiltrados.length && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhum link de cobrança ainda</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{linksFiltrados.length} resultado(s) · página {lkPageSafe}/{lkTotalPages}</span>
            <div className="space-x-2">
              <Button size="sm" variant="outline" disabled={lkPageSafe <= 1} onClick={() => setLkPage(p => Math.max(1, p - 1))}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={lkPageSafe >= lkTotalPages} onClick={() => setLkPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="repasses" className="space-y-2">
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr><th className="text-left p-2">Médico</th><th className="text-left p-2">Competência</th><th className="text-left p-2">Bruto</th><th className="text-left p-2">Médico</th><th className="text-left p-2">Status</th><th className="text-right p-2">Ações</th></tr></thead>
              <tbody>
                {repasses.map(f => (
                  <tr key={f.id} className="border-t">
                    <td className="p-2">{f.medicos?.nome || f.medico_id?.slice(0, 8)}</td>
                    <td className="p-2">{String(f.competencia_mes).padStart(2, "0")}/{f.competencia_ano}</td>
                    <td className="p-2">{brl(f.valor_bruto_centavos)}</td>
                    <td className="p-2">{brl(f.valor_medico_centavos)}</td>
                    <td className="p-2"><StatusBadge s={f.status} /></td>
                    <td className="p-2 text-right space-x-1">
                      {f.status === "em_aberto" && <>
                        <Button size="sm" variant="outline" onClick={() => marcarPagoRepasse(f.id)}><CheckCircle2 className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => bloquearRepasse(f.id)}><XCircle className="h-3 w-3" /></Button>
                      </>}
                    </td>
                  </tr>
                ))}
                {!repasses.length && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Sem repasses</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal cancelamento em lote */}
      <Dialog open={loteCancelOpen} onOpenChange={o => { if (!loteRunning) { setLoteCancelOpen(o); if (!o) setLoteCancelMotivo(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar {selecionadosPendentes.length} cobranças</DialogTitle></DialogHeader>
          <Label>Motivo (aplicado a todas)</Label>
          <Textarea value={loteCancelMotivo} onChange={e => setLoteCancelMotivo(e.target.value)} placeholder="Informe o motivo do cancelamento em lote" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoteCancelOpen(false)} disabled={loteRunning}>Voltar</Button>
            <Button variant="destructive" onClick={cancelarLote} disabled={loteRunning || !loteCancelMotivo.trim()}>
              {loteRunning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Cancelar todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal cancelar */}
      <Dialog open={!!cancelId} onOpenChange={o => !o && setCancelId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar cobrança</DialogTitle></DialogHeader>
          <Label>Motivo</Label>
          <Textarea value={cancelMotivo} onChange={e => setCancelMotivo(e.target.value)} placeholder="Informe o motivo" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>Voltar</Button>
            <Button variant="destructive" onClick={cancelarPagamento} disabled={!cancelMotivo.trim()}>Cancelar cobrança</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal reembolso */}
      <Dialog open={!!reembolsoModal} onOpenChange={o => !o && setReembolsoModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{reembolsoModal?.aprovar ? "Aprovar reembolso" : "Recusar reembolso"}</DialogTitle></DialogHeader>
          {reembolsoModal?.aprovar ? (
            <><Label>Observação (opcional)</Label><Textarea value={reembolsoModal?.observacao || ""} onChange={e => setReembolsoModal(m => m ? { ...m, observacao: e.target.value } : m)} /></>
          ) : (
            <><Label>Motivo da recusa</Label><Textarea value={reembolsoModal?.motivo || ""} onChange={e => setReembolsoModal(m => m ? { ...m, motivo: e.target.value } : m)} /></>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReembolsoModal(null)}>Voltar</Button>
            <Button onClick={decidirReembolso}>{reembolsoModal?.aprovar ? "Aprovar" : "Recusar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhe do pagamento */}
      <Dialog open={!!detalhe} onOpenChange={o => !o && setDetalhe(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detalhe do pagamento</DialogTitle></DialogHeader>
          {detalhe && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">ID</span><div className="font-mono text-xs break-all">{detalhe.id}</div></div>
                <div><span className="text-muted-foreground">Status</span><div><StatusBadge s={detalhe.status} /></div></div>
                <div><span className="text-muted-foreground">Forma de pagamento</span><div>{detalhe.metodo || detalhe.forma || "—"}</div></div>
                <div><span className="text-muted-foreground">Pago em</span><div>{fmtData(detalhe.data_pagamento || detalhe.paid_at)}</div></div>
                <div><span className="text-muted-foreground">Valor bruto</span><div className="font-semibold">{brl(detalhe.valor_bruto_centavos || detalhe.valor_centavos)}</div></div>
                <div><span className="text-muted-foreground">Valor líquido</span><div className="font-semibold">{brl((detalhe.valor_bruto_centavos || detalhe.valor_centavos || 0) - (detalhe.valor_taxa_centavos || 0))}</div></div>
                {detalheSnapshot && <>
                  <div><span className="text-muted-foreground">Repasse médico</span><div>{brl(detalheSnapshot.valor_medico_centavos)}</div></div>
                  <div><span className="text-muted-foreground">Plataforma</span><div>{brl(detalheSnapshot.valor_plataforma_centavos)} ({detalheSnapshot.comissao_pct_aplicada}%)</div></div>
                  <div><span className="text-muted-foreground">Snapshot</span><div><StatusBadge s={detalheSnapshot.status} /></div></div>
                </>}
                {detalhe.consulta_id && <div className="col-span-2"><span className="text-muted-foreground">Consulta</span><div className="font-mono text-xs">{detalhe.consulta_id}</div></div>}
              </div>
              <div>
                <div className="font-semibold mb-1">Histórico de estornos</div>
                {detalheReembolsos.length ? (
                  <ul className="space-y-1">
                    {detalheReembolsos.map(r => (
                      <li key={r.id} className="rounded border p-2 flex justify-between items-center">
                        <div>
                          <div className="text-xs text-muted-foreground">{fmtData(r.created_at)} · {r.tipo}</div>
                          <div>{r.motivo}</div>
                        </div>
                        <div className="text-right"><div className="font-semibold">{brl(r.valor_centavos)}</div><StatusBadge s={r.status} /></div>
                      </li>
                    ))}
                  </ul>
                ) : <div className="text-muted-foreground text-xs">Sem estornos.</div>}
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDetalhe(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova cobrança manual */}
      <NovaCobrancaDialog
        open={novaCobrancaOpen}
        onOpenChange={setNovaCobrancaOpen}
        onCreated={carregar}
        title="Nova cobrança manual"
      />
    </div>
  );
}
