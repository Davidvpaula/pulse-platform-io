import { useEffect, useState, useCallback } from "react";
import { DollarSign, RefreshCw, Loader2, Download, AlertTriangle, CheckCircle2, XCircle, Link2, FileText, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const brl = (c: number) => ((c || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (s?: string | null) => s ? new Date(s).toLocaleString("pt-BR") : "—";

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminFinanceiroCentral() {
  const hoje = new Date();
  const [inicio, setInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10));
  const [fim, setFim] = useState(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10));
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [reembolsos, setReembolsos] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [repasses, setRepasses] = useState<any[]>([]);

  // Modais
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reembolsoModal, setReembolsoModal] = useState<{ id: string; motivo: string; observacao: string; aprovar: boolean } | null>(null);
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [detalheReembolsos, setDetalheReembolsos] = useState<any[]>([]);
  const [detalheSnapshot, setDetalheSnapshot] = useState<any | null>(null);
  const [novaCobranca, setNovaCobranca] = useState<{ open: boolean; descricao: string; valor: string; vencimento: string; paciente_id: string; empresa_id: string; observacao: string }>({ open: false, descricao: "", valor: "", vencimento: "", paciente_id: "", empresa_id: "", observacao: "" });
  const [pacientesOpts, setPacientesOpts] = useState<any[]>([]);
  const [empresasOpts, setEmpresasOpts] = useState<any[]>([]);

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

  async function abrirNovaCobranca() {
    setNovaCobranca({ open: true, descricao: "", valor: "", vencimento: "", paciente_id: "", empresa_id: "", observacao: "" });
    if (!pacientesOpts.length) {
      const { data: pac } = await supabase.from("pacientes").select("id,nome").order("nome").limit(500);
      setPacientesOpts(pac || []);
    }
    if (!empresasOpts.length) {
      const { data: emp } = await supabase.from("empresas").select("id,razao_social,nome_fantasia").order("razao_social").limit(500);
      setEmpresasOpts(emp || []);
    }
  }

  async function criarCobranca() {
    const valorNum = Number(novaCobranca.valor.replace(",", "."));
    if (!novaCobranca.descricao.trim() || !valorNum || valorNum <= 0) {
      toast.error("Preencha descrição e valor válido"); return;
    }
    try {
      const { error } = await supabase.from("cobrancas_links").insert({
        descricao: novaCobranca.descricao,
        valor_centavos: Math.round(valorNum * 100),
        vencimento: novaCobranca.vencimento || null,
        paciente_id: novaCobranca.paciente_id || null,
        observacao: novaCobranca.observacao || null,
        status: "ativo",
      } as any);
      if (error) throw error;
      toast.success("Cobrança criada");
      setNovaCobranca(s => ({ ...s, open: false }));
      carregar();
    } catch (e: any) { toast.error(e.message || "Erro ao criar cobrança"); }
  }


  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await supabase.rpc("financeiro_central_dashboard" as any, { _inicio: inicio, _fim: fim });
      setDash(d);
      const { data: p } = await supabase.from("pagamentos").select("*").order("created_at", { ascending: false }).limit(200);
      setPagamentos(p || []);
      const { data: r } = await supabase.from("reembolsos").select("*").order("created_at", { ascending: false }).limit(100);
      setReembolsos(r || []);
      const { data: l } = await supabase.from("cobrancas_links").select("*").order("created_at", { ascending: false }).limit(100);
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
        toast.success("Reembolso aprovado");
      } else {
        await supabase.rpc("financeiro_reembolso_recusar" as any, { _reembolso_id: reembolsoModal.id, _motivo: reembolsoModal.motivo || "Recusado" });
        toast.success("Reembolso recusado");
      }
      setReembolsoModal(null); carregar();
    } catch (e: any) { toast.error(e.message); }
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
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr><th className="text-left p-2">ID</th><th className="text-left p-2">Valor</th><th className="text-left p-2">Forma</th><th className="text-left p-2">Status</th><th className="text-left p-2">Pago em</th><th className="text-right p-2">Ações</th></tr></thead>
              <tbody>
                {pagamentos.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2 font-mono text-xs">{p.id.slice(0, 8)}</td>
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
                {!pagamentos.length && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Sem pagamentos</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="reembolsos" className="space-y-2">
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr><th className="text-left p-2">ID</th><th className="text-left p-2">Tipo</th><th className="text-left p-2">Valor</th><th className="text-left p-2">Motivo</th><th className="text-left p-2">Status</th><th className="text-right p-2">Ações</th></tr></thead>
              <tbody>
                {reembolsos.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 font-mono text-xs">{r.id.slice(0, 8)}</td>
                    <td className="p-2">{r.tipo}</td>
                    <td className="p-2">{brl(r.valor_centavos)}</td>
                    <td className="p-2 max-w-xs truncate">{r.motivo}</td>
                    <td className="p-2"><StatusBadge s={r.status} /></td>
                    <td className="p-2 text-right space-x-1">
                      {(r.status === "solicitado" || r.status === "em_analise") && <>
                        <Button size="sm" variant="outline" onClick={() => setReembolsoModal({ id: r.id, motivo: "", observacao: "", aprovar: true })}><CheckCircle2 className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => setReembolsoModal({ id: r.id, motivo: "", observacao: "", aprovar: false })}><XCircle className="h-3 w-3" /></Button>
                      </>}
                    </td>
                  </tr>
                ))}
                {!reembolsos.length && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Sem reembolsos</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="links" className="space-y-2">
          <div className="flex justify-end">
            <Button size="sm" onClick={abrirNovaCobranca}><Link2 className="h-4 w-4 mr-2" />Nova cobrança</Button>
          </div>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr><th className="text-left p-2">Descrição</th><th className="text-left p-2">Valor</th><th className="text-left p-2">Vencimento</th><th className="text-left p-2">Status</th></tr></thead>
              <tbody>
                {links.map(l => (
                  <tr key={l.id} className="border-t">
                    <td className="p-2">{l.descricao}</td>
                    <td className="p-2">{brl(l.valor_centavos)}</td>
                    <td className="p-2">{l.vencimento || "—"}</td>
                    <td className="p-2"><StatusBadge s={l.status} /></td>
                  </tr>
                ))}
                {!links.length && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Nenhum link de cobrança ainda</td></tr>}
              </tbody>
            </table>
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
      <Dialog open={novaCobranca.open} onOpenChange={o => setNovaCobranca(s => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova cobrança manual</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Descrição</Label><Input value={novaCobranca.descricao} onChange={e => setNovaCobranca(s => ({ ...s, descricao: e.target.value }))} placeholder="Ex.: Consulta avulsa - Dr. Silva" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Valor (R$)</Label><Input value={novaCobranca.valor} onChange={e => setNovaCobranca(s => ({ ...s, valor: e.target.value }))} placeholder="0,00" /></div>
              <div><Label>Vencimento</Label><Input type="date" value={novaCobranca.vencimento} onChange={e => setNovaCobranca(s => ({ ...s, vencimento: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Paciente (opcional)</Label>
              <Select value={novaCobranca.paciente_id} onValueChange={v => setNovaCobranca(s => ({ ...s, paciente_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione um paciente" /></SelectTrigger>
                <SelectContent>{pacientesOpts.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Empresa (opcional)</Label>
              <Select value={novaCobranca.empresa_id} onValueChange={v => setNovaCobranca(s => ({ ...s, empresa_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
                <SelectContent>{empresasOpts.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Observação</Label><Textarea value={novaCobranca.observacao} onChange={e => setNovaCobranca(s => ({ ...s, observacao: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaCobranca(s => ({ ...s, open: false }))}>Cancelar</Button>
            <Button onClick={criarCobranca}>Criar cobrança</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
