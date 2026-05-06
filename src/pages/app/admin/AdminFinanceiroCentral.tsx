import React, { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLoading, AdminError } from "@/components/admin/AdminStates";
import { FinanceiroKpis } from "@/components/admin/financeiro/FinanceiroKpis";
import { FinanceiroStatusBadge } from "@/components/admin/financeiro/FinanceiroStatusBadge";
import { PagamentosTable, type PagamentoRow } from "@/components/admin/financeiro/PagamentosTable";
import { ReembolsosTable, type ReembolsoRow } from "@/components/admin/financeiro/ReembolsosTable";
import { RepassesTable, type RepasseRow } from "@/components/admin/financeiro/RepassesTable";
import { CobrancasLinksTable, type LinkRow } from "@/components/admin/financeiro/CobrancasLinksTable";
import { RefreshCw, Loader2, Download } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { brl, downloadCSV } from "@/lib/relatorios/utils";
import { NovaCobrancaDialog } from "@/components/financeiro/NovaCobrancaDialog";

const fmtData = (s?: string | null) => s ? new Date(s).toLocaleString("pt-BR") : "—";

function useFinanceiroData(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["admin", "financeiro-full", inicio, fim],
    queryFn: async () => {
      const [dashRes, pagRes, reembRes, linksRes, repassesRes] = await Promise.all([
        supabase.rpc("financeiro_central_dashboard" as never, { _inicio: inicio, _fim: fim } as never),
        supabase.from("pagamentos").select("*, paciente:pacientes(id,nome_completo), medico:medicos(id,nome), empresa:empresas(id,razao_social,nome_fantasia)").order("created_at", { ascending: false }).limit(500),
        supabase.from("reembolsos")
          .select("*, consulta:consultas!inner(inicio, paciente:pacientes!inner(nome_completo), medico:medicos!inner(nome)), pagamento:pagamentos!pagamento_id(provider_payment_id, gateway_ref), solicitante:profiles!actor_id(nome), analisador:profiles!analisado_por(nome)")
          .order("created_at", { ascending: false }).limit(200),
        supabase.from("cobrancas_links").select("*, paciente:pacientes(id,nome_completo)").order("created_at", { ascending: false }).limit(500),
        supabase.from("fechamentos_mensais").select("*, medicos(nome)").order("created_at", { ascending: false }).limit(100),
      ]);
      if (dashRes.error) throw dashRes.error;

      const reembolsos: ReembolsoRow[] = (reembRes.data || []).map((x: Record<string, unknown>) => {
        const consulta = x.consulta as Record<string, unknown> | null;
        const pagamento = x.pagamento as Record<string, unknown> | null;
        const solicitante = x.solicitante as Record<string, string> | null;
        const analisador = x.analisador as Record<string, string> | null;
        return {
          ...x,
          paciente_nome: (consulta?.paciente as Record<string, string> | null)?.nome_completo ?? "—",
          medico_nome: (consulta?.medico as Record<string, string> | null)?.nome ?? "—",
          consulta_data: consulta?.inicio as string | null,
          payment_ref: (pagamento?.provider_payment_id || pagamento?.gateway_ref || null) as string | null,
          solicitante_nome: solicitante?.nome ?? null,
          analisador_nome: analisador?.nome ?? null,
        } as ReembolsoRow;
      });

      return {
        dash: dashRes.data as Record<string, number> | null,
        pagamentos: (pagRes.data || []) as PagamentoRow[],
        reembolsos,
        links: (linksRes.data || []) as LinkRow[],
        repasses: (repassesRes.data || []) as RepasseRow[],
      };
    },
    staleTime: 60_000,
    retry: 2,
  });
}

export default function AdminFinanceiroCentral() {
  const hoje = new Date();
  const [inicio, setInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10));
  const [fim, setFim] = useState(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10));
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useFinanceiroData(inicio, fim);

  // UI state
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reembolsoModal, setReembolsoModal] = useState<{ id: string; motivo: string; observacao: string; aprovar: boolean } | null>(null);
  const [detalhe, setDetalhe] = useState<PagamentoRow | null>(null);
  const [detalheReembolsos, setDetalheReembolsos] = useState<Array<Record<string, unknown>>>([]);
  const [detalheSnapshot, setDetalheSnapshot] = useState<Record<string, unknown> | null>(null);
  const [novaCobrancaOpen, setNovaCobrancaOpen] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [loteCancelOpen, setLoteCancelOpen] = useState(false);
  const [loteCancelMotivo, setLoteCancelMotivo] = useState("");
  const [loteRunning, setLoteRunning] = useState(false);
  const [pgBusca, setPgBusca] = useState("");
  const [pgStatus, setPgStatus] = useState("todos");
  const [pgPage, setPgPage] = useState(1);
  const [lkBusca, setLkBusca] = useState("");
  const [lkStatus, setLkStatus] = useState("todos");
  const [lkPage, setLkPage] = useState(1);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin", "financeiro-full"] });
  }, [queryClient]);

  const pagamentos = data?.pagamentos ?? [];
  const reembolsos = data?.reembolsos ?? [];
  const pendentes = pagamentos.filter(p => p.status === "pendente");
  const todosPendentesSelecionados = pendentes.length > 0 && pendentes.every(p => selecionados.has(p.id));
  const selecionadosPendentes = pagamentos.filter(p => selecionados.has(p.id) && p.status === "pendente");

  const togglePagamento = (id: string) => setSelecionados(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleTodos = () => setSelecionados(s => {
    if (todosPendentesSelecionados) { const n = new Set(s); pendentes.forEach(p => n.delete(p.id)); return n; }
    const n = new Set(s); pendentes.forEach(p => n.add(p.id)); return n;
  });

  async function aprovarLote() {
    if (!selecionadosPendentes.length) return;
    setLoteRunning(true);
    let ok = 0, fail = 0;
    for (const p of selecionadosPendentes) {
      try { await supabase.rpc("financeiro_pagamento_confirmar" as never, { _pagamento_id: p.id } as never); ok++; }
      catch { fail++; }
    }
    setLoteRunning(false); setSelecionados(new Set());
    toast.success(`${ok} aprovados${fail ? `, ${fail} com erro` : ""}`);
    invalidate();
  }

  async function cancelarLote() {
    if (!selecionadosPendentes.length || !loteCancelMotivo.trim()) return;
    setLoteRunning(true);
    let ok = 0, fail = 0;
    for (const p of selecionadosPendentes) {
      try { await supabase.rpc("financeiro_pagamento_cancelar" as never, { _pagamento_id: p.id, _motivo: loteCancelMotivo } as never); ok++; }
      catch { fail++; }
    }
    setLoteRunning(false); setLoteCancelOpen(false); setLoteCancelMotivo(""); setSelecionados(new Set());
    toast.success(`${ok} cancelados${fail ? `, ${fail} com erro` : ""}`);
    invalidate();
  }

  async function abrirDetalhe(p: PagamentoRow) {
    setDetalhe(p); setDetalheReembolsos([]); setDetalheSnapshot(null);
    try {
      if (p.consulta_id) {
        const { data: snap } = await supabase.from("consultas_financeiro").select("*").eq("consulta_id", p.consulta_id).maybeSingle();
        setDetalheSnapshot(snap);
      }
      const { data: r } = await supabase.from("reembolsos").select("*").eq("pagamento_id", p.id).order("created_at", { ascending: false });
      setDetalheReembolsos(r || []);
    } catch {}
  }

  async function confirmarPagamento(id: string) {
    try { await supabase.rpc("financeiro_pagamento_confirmar" as never, { _pagamento_id: id } as never); toast.success("Pagamento confirmado"); invalidate(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
  }

  async function cancelarPagamento() {
    if (!cancelId || !cancelMotivo.trim()) return;
    try { await supabase.rpc("financeiro_pagamento_cancelar" as never, { _pagamento_id: cancelId, _motivo: cancelMotivo } as never); toast.success("Cobrança cancelada"); setCancelId(null); setCancelMotivo(""); invalidate(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
  }

  async function decidirReembolso() {
    if (!reembolsoModal) return;
    try {
      if (reembolsoModal.aprovar) {
        await supabase.rpc("financeiro_reembolso_aprovar" as never, { _reembolso_id: reembolsoModal.id, _observacao: reembolsoModal.observacao || null } as never);
        supabase.functions.invoke("notificar-reembolso", { body: { reembolso_id: reembolsoModal.id, evento: "aprovado" } }).catch(() => {});
        toast.success("Reembolso aprovado");
      } else {
        await supabase.rpc("financeiro_reembolso_recusar" as never, { _reembolso_id: reembolsoModal.id, _motivo: reembolsoModal.motivo || "Recusado" } as never);
        supabase.functions.invoke("notificar-reembolso", { body: { reembolso_id: reembolsoModal.id, evento: "recusado" } }).catch(() => {});
        toast.success("Reembolso recusado");
      }
      setReembolsoModal(null); invalidate();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
  }

  async function marcarPagoRepasse(id: string) {
    try { await supabase.rpc("financeiro_repasse_marcar_pago" as never, { _fechamento_id: id } as never); toast.success("Repasse pago"); invalidate(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
  }

  async function bloquearRepasse(id: string) {
    const motivo = prompt("Motivo do bloqueio:");
    if (!motivo) return;
    try { await supabase.rpc("financeiro_repasse_bloquear" as never, { _fechamento_id: id, _motivo: motivo } as never); toast.success("Repasse bloqueado"); invalidate(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
  }

  const dentroPeriodo = (iso?: string | null) => {
    if (!iso) return false;
    const d = iso.slice(0, 10);
    return d >= inicio && d <= fim;
  };
  const exportarPagamentos = () => {
    const rows: (string | number)[][] = [["ID", "Status", "Valor", "Forma", "Data Pagamento", "Criado em"]];
    pagamentos.filter(p => dentroPeriodo(p.created_at)).forEach(p => rows.push([p.id, p.status, brl((p.valor_bruto_centavos || p.valor_centavos) ?? 0), p.metodo || p.forma || "", fmtData(p.data_pagamento || p.paid_at), fmtData(p.created_at)]));
    downloadCSV(`pagamentos_${inicio}_${fim}.csv`, rows);
  };
  const exportarReembolsos = () => {
    const rows: (string | number)[][] = [["ID", "Tipo", "Valor", "Status", "Motivo", "Criado em"]];
    reembolsos.filter(r => dentroPeriodo(r.created_at)).forEach(r => rows.push([r.id, r.tipo, brl(r.valor_centavos), r.status, r.motivo || "", fmtData(r.created_at)]));
    downloadCSV(`reembolsos_${inicio}_${fim}.csv`, rows);
  };
  const exportarLinks = () => {
    const rows: (string | number)[][] = [["ID", "Descrição", "Valor", "Vencimento", "Status", "Criado em"]];
    (data?.links ?? []).filter(l => dentroPeriodo(l.created_at)).forEach(l => rows.push([l.id, l.descricao || "", brl(l.valor_centavos), l.vencimento || "", l.status, fmtData(l.created_at)]));
    downloadCSV(`links_${inicio}_${fim}.csv`, rows);
  };

  if (error) return <AdminError message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Central Financeira" description="Pagamentos, reembolsos, links, faturas, repasses e relatórios" />

      <div className="flex flex-wrap gap-3 items-end">
        <div><Label>Início</Label><Input type="date" value={inicio} onChange={e => setInicio(e.target.value)} /></div>
        <div><Label>Fim</Label><Input type="date" value={fim} onChange={e => setFim(e.target.value)} /></div>
        <Button onClick={() => refetch()} disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4 mr-2" />}Atualizar</Button>
        <Button variant="outline" onClick={exportarPagamentos}><Download className="h-4 w-4 mr-2" />Pagamentos</Button>
        <Button variant="outline" onClick={exportarReembolsos}><Download className="h-4 w-4 mr-2" />Reembolsos</Button>
        <Button variant="outline" onClick={exportarLinks}><Download className="h-4 w-4 mr-2" />Links</Button>
      </div>

      {isLoading ? <AdminLoading cards={8} rows={4} /> : (
        <>
          <FinanceiroKpis dash={data?.dash ?? null} />

          <Tabs defaultValue="pagamentos">
            <TabsList>
              <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
              <TabsTrigger value="reembolsos">Reembolsos</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="repasses">Repasses</TabsTrigger>
            </TabsList>

            <TabsContent value="pagamentos">
              <PagamentosTable
                pagamentos={pagamentos}
                pgBusca={pgBusca} setPgBusca={setPgBusca}
                pgStatus={pgStatus} setPgStatus={setPgStatus}
                pgPage={pgPage} setPgPage={setPgPage}
                selecionados={selecionados} togglePagamento={togglePagamento}
                todosPendentesSelecionados={todosPendentesSelecionados} toggleTodos={toggleTodos}
                selecionadosPendentes={selecionadosPendentes}
                loteRunning={loteRunning}
                onAprovarLote={aprovarLote}
                onCancelLoteOpen={() => setLoteCancelOpen(true)}
                onLimparSelecao={() => setSelecionados(new Set())}
                onConfirmar={confirmarPagamento}
                onCancelar={(id) => { setCancelId(id); setCancelMotivo(""); }}
                onDetalhe={abrirDetalhe}
              />
            </TabsContent>

            <TabsContent value="reembolsos">
              <ReembolsosTable
                reembolsos={reembolsos}
                onAprovar={(id) => setReembolsoModal({ id, motivo: "", observacao: "", aprovar: true })}
                onRecusar={(id) => setReembolsoModal({ id, motivo: "", observacao: "", aprovar: false })}
              />
            </TabsContent>

            <TabsContent value="links">
              <CobrancasLinksTable
                links={data?.links ?? []}
                lkBusca={lkBusca} setLkBusca={setLkBusca}
                lkStatus={lkStatus} setLkStatus={setLkStatus}
                lkPage={lkPage} setLkPage={setLkPage}
                onNovaCobranca={() => setNovaCobrancaOpen(true)}
              />
            </TabsContent>

            <TabsContent value="repasses">
              <RepassesTable
                repasses={data?.repasses ?? []}
                onMarcarPago={marcarPagoRepasse}
                onBloquear={bloquearRepasse}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

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

      {/* Modal cancelar individual */}
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
                <div><span className="text-muted-foreground">Status</span><div><FinanceiroStatusBadge s={detalhe.status} /></div></div>
                <div><span className="text-muted-foreground">Forma de pagamento</span><div>{detalhe.metodo || detalhe.forma || "—"}</div></div>
                <div><span className="text-muted-foreground">Pago em</span><div>{fmtData(detalhe.data_pagamento || detalhe.paid_at)}</div></div>
                <div><span className="text-muted-foreground">Valor bruto</span><div className="font-semibold">{brl((detalhe.valor_bruto_centavos || detalhe.valor_centavos) ?? 0)}</div></div>
                <div><span className="text-muted-foreground">Valor líquido</span><div className="font-semibold">{brl((detalhe.valor_bruto_centavos || detalhe.valor_centavos || 0) - ((detalhe as unknown as Record<string, number>).valor_taxa_centavos || 0))}</div></div>
                {detalheSnapshot && <>
                  <div><span className="text-muted-foreground">Repasse médico</span><div>{brl(detalheSnapshot.valor_medico_centavos as number)}</div></div>
                  <div><span className="text-muted-foreground">Plataforma</span><div>{brl(detalheSnapshot.valor_plataforma_centavos as number)} ({detalheSnapshot.comissao_pct_aplicada as number}%)</div></div>
                  <div><span className="text-muted-foreground">Snapshot</span><div><FinanceiroStatusBadge s={detalheSnapshot.status as string} /></div></div>
                </>}
                {detalhe.consulta_id && <div className="col-span-2"><span className="text-muted-foreground">Consulta</span><div className="font-mono text-xs">{detalhe.consulta_id}</div></div>}
              </div>
              <div>
                <div className="font-semibold mb-1">Histórico de estornos</div>
                {detalheReembolsos.length ? (
                  <ul className="space-y-1">
                    {detalheReembolsos.map(r => (
                      <li key={r.id as string} className="rounded border p-2 flex justify-between items-center">
                        <div>
                          <div className="text-xs text-muted-foreground">{fmtData(r.created_at as string)} · {r.tipo as string}</div>
                          <div>{r.motivo as string}</div>
                        </div>
                        <div className="text-right"><div className="font-semibold">{brl(r.valor_centavos as number)}</div><FinanceiroStatusBadge s={r.status as string} /></div>
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

      <NovaCobrancaDialog open={novaCobrancaOpen} onOpenChange={setNovaCobrancaOpen} onCreated={invalidate} title="Nova cobrança manual" />
    </div>
  );
}
