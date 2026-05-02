import { useEffect, useState, useMemo } from "react";
import {
  Loader2, Search, CheckCircle2, XCircle, Clock, Send,
  FileText, Eye, Filter, Stethoscope, Building2, Percent,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { getRepasseGlobal } from "@/lib/financeiroConfig";
import { brl } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type PropostaRow = Database["public"]["Tables"]["propostas_empresa_medico"]["Row"];
type PropostaStatus = Database["public"]["Enums"]["proposta_empresa_status"];

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const STATUS_CONFIG: Record<PropostaStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  criada: { label: "Criada", variant: "secondary" },
  em_analise: { label: "Em análise", variant: "outline" },
  aprovada_admin: { label: "Aprovada", variant: "default" },
  enviada_medico: { label: "Enviada", variant: "default" },
  aceita: { label: "Aceita", variant: "default" },
  recusada: { label: "Recusada", variant: "destructive" },
  convertida: { label: "Convertida", variant: "default" },
  cancelada: { label: "Cancelada", variant: "secondary" },
};

const TIPO_LABELS: Record<string, string> = { mensal: "Mensal", pacote: "Pacote", recorrente: "Recorrente" };

type PropostaEnriquecida = PropostaRow & {
  empresa_nome?: string;
  medico_nome?: string;
  especialidade_nome?: string;
};

function calcRepasse(p: PropostaEnriquecida) {
  const base = p.valor_ajustado_centavos || p.valor_mensal_centavos;
  const taxa = p.taxa_plataforma_pct ?? 0;
  const taxaCentavos = Math.round(base * taxa / 100);
  return { base, taxa, taxaCentavos, repasse: base - taxaCentavos };
}

export default function AdminPropostasB2B() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [propostas, setPropostas] = useState<PropostaEnriquecida[]>([]);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState<PropostaEnriquecida | null>(null);

  // Review form state
  const [taxaPct, setTaxaPct] = useState("");
  const [valorAjustado, setValorAjustado] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [defaultTaxa, setDefaultTaxa] = useState(0);

  // Quick tax popover state
  const [quickTaxId, setQuickTaxId] = useState<string | null>(null);
  const [quickTaxVal, setQuickTaxVal] = useState("");
  const [quickTaxSaving, setQuickTaxSaving] = useState(false);

  useEffect(() => { carregar(); carregarTaxaDefault(); }, []);

  async function carregarTaxaDefault() {
    try {
      const r = await getRepasseGlobal();
      setDefaultTaxa(r.plataformaPct);
    } catch { /* ignore */ }
  }

  async function carregar() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("propostas_empresa_medico")
        .select("*, empresa:empresas(razao_social), medico:profiles!propostas_empresa_medico_medico_id_fkey(nome), especialidade:especialidades(nome)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPropostas(
        (data ?? []).map((p: any) => ({
          ...p,
          empresa_nome: p.empresa?.razao_social ?? "—",
          medico_nome: p.medico?.nome ?? "—",
          especialidade_nome: p.especialidade?.nome ?? null,
        }))
      );
    } catch (e: any) {
      toast.error("Erro ao carregar propostas", { description: e.message });
    } finally {
      setLoading(false);
    }
  }

  const lista = useMemo(() => {
    let arr = propostas;
    if (filtroStatus !== "todos") arr = arr.filter(p => p.status === filtroStatus);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      arr = arr.filter(p =>
        (p.empresa_nome ?? "").toLowerCase().includes(q) ||
        (p.medico_nome ?? "").toLowerCase().includes(q)
      );
    }
    return arr;
  }, [propostas, filtroStatus, busca]);

  function openReview(p: PropostaEnriquecida) {
    setSelected(p);
    setTaxaPct(p.taxa_plataforma_pct?.toString() ?? defaultTaxa.toString());
    setValorAjustado(p.valor_ajustado_centavos ? (p.valor_ajustado_centavos / 100).toFixed(2) : "");
    setObservacao(p.observacao_admin ?? "");
  }

  async function aprovar() {
    if (!selected || !session?.user?.id) return;
    setSaving(true);
    try {
      const taxa = parseFloat(taxaPct) || defaultTaxa;
      const valorAdj = valorAjustado ? Math.round(parseFloat(valorAjustado.replace(",", ".")) * 100) : null;

      const { error } = await supabase
        .from("propostas_empresa_medico")
        .update({
          status: "enviada_medico" as PropostaStatus,
          taxa_plataforma_pct: taxa,
          valor_ajustado_centavos: valorAdj,
          observacao_admin: observacao || null,
          admin_id: session.user.id,
          aprovado_em: new Date().toISOString(),
        })
        .eq("id", selected.id);

      if (error) throw error;

      await supabase.from("planos_auditoria").insert({
        plano_id: null as any,
        acao: "proposta_aprovada_admin",
        campo: "status",
        valor_anterior: selected.status,
        valor_novo: "enviada_medico",
        motivo: observacao || "Aprovação admin",
        payload: { proposta_id: selected.id, taxa, valor_ajustado: valorAdj },
        actor_id: session.user.id,
      });

      toast.success("Proposta aprovada e enviada ao médico");
      setSelected(null);
      carregar();
    } catch (e: any) {
      toast.error("Erro ao aprovar", { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function rejeitar() {
    if (!selected || !session?.user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("propostas_empresa_medico")
        .update({
          status: "cancelada" as PropostaStatus,
          observacao_admin: observacao || "Rejeitada pelo admin",
          admin_id: session.user.id,
        })
        .eq("id", selected.id);

      if (error) throw error;

      await supabase.from("planos_auditoria").insert({
        plano_id: null as any,
        acao: "proposta_rejeitada_admin",
        campo: "status",
        valor_anterior: selected.status,
        valor_novo: "cancelada",
        motivo: observacao || "Rejeitada pelo admin",
        payload: { proposta_id: selected.id },
        actor_id: session.user.id,
      });

      toast.success("Proposta rejeitada");
      setSelected(null);
      carregar();
    } catch (e: any) {
      toast.error("Erro ao rejeitar", { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  // Quick inline tax save
  async function salvarTaxaRapida(p: PropostaEnriquecida) {
    if (!session?.user?.id) return;
    const taxa = parseFloat(quickTaxVal);
    if (isNaN(taxa) || taxa < 0 || taxa > 100) {
      toast.error("Taxa inválida (0–100%)");
      return;
    }
    setQuickTaxSaving(true);
    try {
      const { error } = await supabase
        .from("propostas_empresa_medico")
        .update({ taxa_plataforma_pct: taxa })
        .eq("id", p.id);

      if (error) throw error;

      await supabase.from("planos_auditoria").insert({
        plano_id: null as any,
        acao: "taxa_ajustada_rapida",
        campo: "taxa_plataforma_pct",
        valor_anterior: (p.taxa_plataforma_pct ?? 0).toString(),
        valor_novo: taxa.toString(),
        motivo: "Ajuste rápido de taxa",
        payload: { proposta_id: p.id },
        actor_id: session.user.id,
      });

      toast.success(`Taxa atualizada para ${taxa}%`);
      setQuickTaxId(null);
      carregar();
    } catch (e: any) {
      toast.error("Erro ao salvar taxa", { description: e.message });
    } finally {
      setQuickTaxSaving(false);
    }
  }

  // KPIs
  const kpis = useMemo(() => ({
    total: propostas.length,
    pendentes: propostas.filter(p => p.status === "criada" || p.status === "em_analise").length,
    enviadas: propostas.filter(p => p.status === "enviada_medico").length,
    aceitas: propostas.filter(p => p.status === "aceita" || p.status === "convertida").length,
    recusadas: propostas.filter(p => p.status === "recusada" || p.status === "cancelada").length,
  }), [propostas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Propostas Empresa → Médico"
        description="Gerencie propostas comerciais com intermediação da plataforma."
      />

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-5">
        {[
          { label: "Total", value: kpis.total, icon: FileText },
          { label: "Pendentes", value: kpis.pendentes, icon: Clock },
          { label: "Enviadas", value: kpis.enviadas, icon: Send },
          { label: "Aceitas", value: kpis.aceitas, icon: CheckCircle2 },
          { label: "Recusadas", value: kpis.recusadas, icon: XCircle },
        ].map(k => (
          <div key={k.label} className="card-elevated flex items-center gap-3 p-4">
            <k.icon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-lg font-bold">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card-elevated p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar empresa ou médico…" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="criada">Criada</SelectItem>
              <SelectItem value="em_analise">Em análise</SelectItem>
              <SelectItem value="enviada_medico">Enviada</SelectItem>
              <SelectItem value="aceita">Aceita</SelectItem>
              <SelectItem value="recusada">Recusada</SelectItem>
              <SelectItem value="convertida">Convertida</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{lista.length} resultado(s)</span>
        </div>
      </div>

      {/* Table */}
      <div className="card-elevated overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Empresa</th>
              <th className="text-left px-3 py-3">Médico</th>
              <th className="text-right px-3 py-3">Valor</th>
              <th className="text-center px-3 py-3">Taxa %</th>
              <th className="text-right px-3 py-3">Repasse Médico</th>
              <th className="text-left px-3 py-3">Tipo</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-left px-3 py-3">Criada em</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={9} className="py-16 text-center text-muted-foreground">Nenhuma proposta encontrada.</td></tr>
            )}
            {lista.map(p => {
              const cfg = STATUS_CONFIG[p.status as PropostaStatus] ?? STATUS_CONFIG.criada;
              const canReview = p.status === "criada" || p.status === "em_analise";
              const canQuickTax = canReview || p.status === "aprovada_admin" || p.status === "enviada_medico";
              const r = calcRepasse(p);
              return (
                <tr key={p.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.empresa_nome}</td>
                  <td className="px-3 py-3">{p.medico_nome}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-medium">{brl(r.base)}</td>
                  <td className="px-3 py-3 text-center">
                    {canQuickTax ? (
                      <Popover
                        open={quickTaxId === p.id}
                        onOpenChange={open => {
                          if (open) {
                            setQuickTaxId(p.id);
                            setQuickTaxVal((p.taxa_plataforma_pct ?? defaultTaxa).toString());
                          } else {
                            setQuickTaxId(null);
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2 tabular-nums gap-1 text-xs font-medium">
                            <Percent className="h-3 w-3" />
                            {r.taxa > 0 ? `${r.taxa}%` : "Definir"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 space-y-3 p-3" align="center">
                          <p className="text-xs font-semibold">Ajuste rápido de taxa</p>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={quickTaxVal}
                              onChange={e => setQuickTaxVal(e.target.value)}
                              className="h-8 text-sm"
                              placeholder={`${defaultTaxa}%`}
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                          {quickTaxVal && !isNaN(parseFloat(quickTaxVal)) && (
                            <div className="text-xs space-y-0.5 text-muted-foreground">
                              <p>Repasse: {brl(Math.round(r.base * (1 - parseFloat(quickTaxVal) / 100)))}</p>
                            </div>
                          )}
                          <Button
                            size="sm"
                            className="w-full h-7 text-xs"
                            disabled={quickTaxSaving}
                            onClick={() => salvarTaxaRapida(p)}
                          >
                            {quickTaxSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Salvar
                          </Button>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <span className="tabular-nums text-xs">{r.taxa > 0 ? `${r.taxa}%` : "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-xs">
                    {r.taxa > 0 ? (
                      <span className="font-medium text-green-600 dark:text-green-400">{brl(r.repasse)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">{TIPO_LABELS[p.tipo_contrato] ?? p.tipo_contrato}</td>
                  <td className="px-3 py-3"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                  <td className="px-3 py-3 tabular-nums">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant={canReview ? "default" : "ghost"} onClick={() => openReview(p)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> {canReview ? "Analisar" : "Ver"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Review modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Análise de Proposta
            </DialogTitle>
          </DialogHeader>
          {selected && (() => {
            const sr = calcRepasse(selected);
            return (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Empresa</p>
                    <p className="font-medium flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {selected.empresa_nome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Médico</p>
                    <p className="font-medium flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" /> {selected.medico_nome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor proposto</p>
                    <p className="text-lg font-bold">{brl(selected.valor_mensal_centavos)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo de contrato</p>
                    <p className="capitalize">{TIPO_LABELS[selected.tipo_contrato] ?? selected.tipo_contrato}</p>
                  </div>
                  {selected.qtd_atendimentos && (
                    <div>
                      <p className="text-xs text-muted-foreground">Atendimentos</p>
                      <p>{selected.qtd_atendimentos}</p>
                    </div>
                  )}
                  {selected.especialidade_nome && (
                    <div>
                      <p className="text-xs text-muted-foreground">Especialidade</p>
                      <p>{selected.especialidade_nome}</p>
                    </div>
                  )}
                </div>

                {selected.mensagem_empresa && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mensagem da empresa</p>
                    <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs italic">{selected.mensagem_empresa}</p>
                  </div>
                )}

                {/* Admin fields — only editable for pending proposals */}
                {(selected.status === "criada" || selected.status === "em_analise") && (
                  <div className="space-y-3 border-t border-border pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Ajustes da plataforma</p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="flex items-center gap-1">
                          <Percent className="h-3.5 w-3.5" /> Taxa da plataforma (%)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={taxaPct}
                          onChange={e => setTaxaPct(e.target.value)}
                          placeholder={`Padrão: ${defaultTaxa}%`}
                        />
                      </div>
                      <div>
                        <Label>Valor ajustado (R$)</Label>
                        <Input
                          type="text"
                          value={valorAjustado}
                          onChange={e => setValorAjustado(e.target.value)}
                          placeholder="Opcional"
                        />
                      </div>
                    </div>

                    {/* Preview */}
                    {taxaPct && (
                      <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                        <p>Valor base: {brl(valorAjustado ? Math.round(parseFloat(valorAjustado.replace(",", ".")) * 100) : selected.valor_mensal_centavos)}</p>
                        <p>Taxa plataforma: {taxaPct}% → {brl(Math.round((valorAjustado ? parseFloat(valorAjustado.replace(",", ".")) * 100 : selected.valor_mensal_centavos) * parseFloat(taxaPct) / 100))}</p>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          Repasse médico: {brl(Math.round((valorAjustado ? parseFloat(valorAjustado.replace(",", ".")) * 100 : selected.valor_mensal_centavos) * (1 - parseFloat(taxaPct) / 100)))}
                        </p>
                      </div>
                    )}

                    <div>
                      <Label>Observação interna</Label>
                      <Textarea
                        value={observacao}
                        onChange={e => setObservacao(e.target.value)}
                        placeholder="Nota interna sobre a proposta…"
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {/* Read-only view for already-processed proposals */}
                {selected.status !== "criada" && selected.status !== "em_analise" && (
                  <div className="space-y-2 border-t border-border pt-3">
                    {sr.taxa > 0 && (
                      <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                        <p>Taxa aplicada: <span className="font-semibold">{sr.taxa}%</span> → {brl(sr.taxaCentavos)}</p>
                        <p className="font-semibold text-green-600 dark:text-green-400">Repasse médico: {brl(sr.repasse)}</p>
                      </div>
                    )}
                    {selected.valor_ajustado_centavos && (
                      <p className="text-xs">Valor ajustado: <span className="font-semibold">{brl(selected.valor_ajustado_centavos)}</span></p>
                    )}
                    {selected.observacao_admin && (
                      <p className="text-xs italic text-muted-foreground">{selected.observacao_admin}</p>
                    )}
                    {selected.mensagem_medico && (
                      <div>
                        <p className="text-xs text-muted-foreground">Resposta do médico:</p>
                        <p className="text-xs italic">{selected.mensagem_medico}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {(selected.status === "criada" || selected.status === "em_analise") && (
                  <DialogFooter className="gap-2">
                    <Button variant="destructive" onClick={rejeitar} disabled={saving}>
                      <XCircle className="mr-2 h-4 w-4" /> Rejeitar
                    </Button>
                    <Button onClick={aprovar} disabled={saving || !taxaPct}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Aprovar e Enviar ao Médico
                    </Button>
                  </DialogFooter>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
