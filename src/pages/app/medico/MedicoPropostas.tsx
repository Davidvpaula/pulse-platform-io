import { useEffect, useState, useMemo } from "react";
import {
  Loader2, Send, CheckCircle2, XCircle, Building2,
  Stethoscope, Clock, FileText, Percent, DollarSign,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import type { Database } from "@/integrations/supabase/types";
import { useTermsCheck } from "@/hooks/useTermsCheck";
import { TermsAcceptanceDialog } from "@/components/shared/TermsAcceptanceDialog";

type PropostaRow = Database["public"]["Tables"]["propostas_empresa_medico"]["Row"];
type PropostaStatus = Database["public"]["Enums"]["proposta_empresa_status"];

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  enviada_medico: { label: "Aguardando resposta", color: "bg-warning/10 text-warning" },
  aceita: { label: "Aceita", color: "bg-success/10 text-success" },
  recusada: { label: "Recusada", color: "bg-destructive/10 text-destructive" },
  convertida: { label: "Plano ativo", color: "bg-success/10 text-success" },
};

const TIPO_LABELS: Record<string, string> = { mensal: "Mensal", pacote: "Pacote", recorrente: "Recorrente" };
const COBRANCA_MAP: Record<string, string> = { mensal: "mensal", pacote: "valor_fixo", recorrente: "mensal" };

export default function MedicoPropostas() {
  const { session } = useSession();
  const uid = session?.user?.id;
  const termsProposta = useTermsCheck("proposta_medico");
  const [loading, setLoading] = useState(true);
  const [propostas, setPropostas] = useState<(PropostaRow & { empresa_nome?: string; especialidade_nome?: string })[]>([]);
  const [selected, setSelected] = useState<(PropostaRow & { empresa_nome?: string; especialidade_nome?: string }) | null>(null);
  const [mensagemResposta, setMensagemResposta] = useState("");
  const [termoAceito, setTermoAceito] = useState(false);
  const [saving, setSaving] = useState(false);

  // Termo
  const [termoConteudo, setTermoConteudo] = useState<string | null>(null);
  const [termoVersao, setTermoVersao] = useState<number | null>(null);

  useEffect(() => { if (uid) carregar(); }, [uid]);

  async function carregar() {
    setLoading(true);
    try {
      const [{ data: props }, { data: termo }] = await Promise.all([
        supabase
          .from("propostas_empresa_medico")
          .select("*, empresa:empresas(razao_social), especialidade:especialidades(nome)")
          .eq("medico_id", uid!)
          .in("status", ["enviada_medico", "aceita", "recusada", "convertida"])
          .order("created_at", { ascending: false }),
        supabase
          .from("termos_condicoes")
          .select("conteudo, versao")
          .eq("tipo", "proposta_medico")
          .eq("status", "publicado")
          .order("versao", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setPropostas(
        (props ?? []).map((p: any) => ({
          ...p,
          empresa_nome: p.empresa?.razao_social ?? "—",
          especialidade_nome: p.especialidade?.nome ?? null,
        }))
      );
      setTermoConteudo(termo?.conteudo ?? null);
      setTermoVersao(termo?.versao ?? null);
    } catch (e: any) {
      toast.error("Erro ao carregar propostas", { description: e.message });
    } finally {
      setLoading(false);
    }
  }

  function openProposta(p: typeof propostas[0]) {
    setSelected(p);
    setMensagemResposta("");
    setTermoAceito(false);
  }

  async function aceitar() {
    if (!selected || !uid) return;
    if (termsProposta.needsAcceptance) {
      termsProposta.setShowDialog(true);
      return;
    }
    if (!termoAceito) {
      toast.error("Aceite os termos para continuar");
      return;
    }
    setSaving(true);
    try {
      // 1. Update proposal to accepted
      const { error: upErr } = await supabase
        .from("propostas_empresa_medico")
        .update({
          status: "aceita" as PropostaStatus,
          mensagem_medico: mensagemResposta || null,
          termo_medico_aceito: true,
          termo_medico_versao: termoVersao,
          respondido_em: new Date().toISOString(),
        })
        .eq("id", selected.id);

      if (upErr) throw upErr;

      // 2. Create plan automatically
      const valorFinal = selected.valor_ajustado_centavos ?? selected.valor_mensal_centavos;
      const taxa = selected.taxa_plataforma_pct ?? 0;
      const cobranca = COBRANCA_MAP[selected.tipo_contrato] ?? "mensal";

      const { data: plano, error: planoErr } = await supabase
        .from("planos")
        .insert({
          nome: `Proposta ${selected.empresa_nome} → Médico`,
          descricao: `Plano gerado automaticamente a partir de proposta comercial. ${selected.mensagem_empresa ?? ""}`.trim(),
          categoria: "empresarial",
          publico: "empresa",
          modelo_cobranca: cobranca as any,
          nivel: "admin",
          status: "ativo",
          valor_mensal_centavos: valorFinal,
          empresa_id: selected.empresa_id,
          medico_id: uid,
          especialidade_id: selected.especialidade_id,
          aprovado_admin: true,
          termos_aceitos: true,
          taxa_pagamento_pct: taxa,
          regra_acesso: "direto",
        })
        .select("id")
        .single();

      if (planoErr) throw planoErr;

      // 3. Link doctor to plan
      await supabase.from("plano_medicos").insert({
        plano_id: plano.id,
        medico_id: uid,
        aceite_medico: true,
        aceite_em: new Date().toISOString(),
      });

      // 4. Update proposal with generated plan
      await supabase
        .from("propostas_empresa_medico")
        .update({
          status: "convertida" as PropostaStatus,
          plano_gerado_id: plano.id,
        })
        .eq("id", selected.id);

      // 5. Audit
      await supabase.from("planos_auditoria").insert({
        plano_id: plano.id,
        acao: "proposta_aceita_convertida",
        campo: "status",
        valor_anterior: "enviada_medico",
        valor_novo: "convertida",
        motivo: "Proposta aceita pelo médico e convertida em plano ativo",
        payload: {
          proposta_id: selected.id,
          empresa_id: selected.empresa_id,
          valor_centavos: valorFinal,
          taxa_pct: taxa,
        },
        actor_id: uid,
      });

      toast.success("Proposta aceita! Plano ativo criado automaticamente.");
      setSelected(null);
      carregar();
    } catch (e: any) {
      toast.error("Erro ao aceitar proposta", { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function recusar() {
    if (!selected || !uid) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("propostas_empresa_medico")
        .update({
          status: "recusada" as PropostaStatus,
          mensagem_medico: mensagemResposta || null,
          respondido_em: new Date().toISOString(),
        })
        .eq("id", selected.id);

      if (error) throw error;

      await supabase.from("planos_auditoria").insert({
        plano_id: null as any,
        acao: "proposta_recusada_medico",
        campo: "status",
        valor_anterior: "enviada_medico",
        valor_novo: "recusada",
        motivo: mensagemResposta || "Recusada pelo médico",
        payload: { proposta_id: selected.id },
        actor_id: uid,
      });

      toast.success("Proposta recusada");
      setSelected(null);
      carregar();
    } catch (e: any) {
      toast.error("Erro ao recusar", { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  const pendentes = useMemo(() => propostas.filter(p => p.status === "enviada_medico"), [propostas]);
  const historico = useMemo(() => propostas.filter(p => p.status !== "enviada_medico"), [propostas]);

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
        title="Propostas Comerciais"
        description="Propostas de empresas para atendimento direto."
      />

      {pendentes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
            <Clock className="h-4 w-4" /> Pendentes ({pendentes.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pendentes.map(p => (
              <Card key={p.id} className="card-elevated border-primary/20 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openProposta(p)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{p.empresa_nome}</span>
                      </div>
                      {p.especialidade_nome && (
                        <p className="text-xs text-muted-foreground ml-6">{p.especialidade_nome}</p>
                      )}
                    </div>
                    <Badge className="bg-warning/10 text-warning">Aguardando</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor bruto</p>
                      <p className="font-semibold">{brl(p.valor_ajustado_centavos ?? p.valor_mensal_centavos)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Taxa plataforma</p>
                      <p className="font-medium">{p.taxa_plataforma_pct ?? 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor líquido</p>
                      <p className="font-bold text-success">
                        {brl(Math.round((p.valor_ajustado_centavos ?? p.valor_mensal_centavos) * (1 - (p.taxa_plataforma_pct ?? 0) / 100)))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pendentes.length === 0 && historico.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <Send className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p>Nenhuma proposta recebida ainda.</p>
        </div>
      )}

      {historico.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Histórico ({historico.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {historico.map(p => {
              const cfg = STATUS_CONFIG[p.status as string] ?? { label: p.status, color: "bg-muted text-muted-foreground" };
              return (
                <Card key={p.id} className="card-elevated opacity-80">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{p.empresa_nome}</span>
                      </div>
                      <Badge className={cfg.color}>{cfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{brl(p.valor_ajustado_centavos ?? p.valor_mensal_centavos)}</span>
                      <span>{TIPO_LABELS[p.tipo_contrato] ?? p.tipo_contrato}</span>
                      <span>{fmtDate(p.respondido_em ?? p.created_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Proposta de {selected?.empresa_nome}
            </DialogTitle>
          </DialogHeader>
          {selected && selected.status === "enviada_medico" && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de contrato</p>
                  <p className="capitalize font-medium">{TIPO_LABELS[selected.tipo_contrato] ?? selected.tipo_contrato}</p>
                </div>
                {selected.especialidade_nome && (
                  <div>
                    <p className="text-xs text-muted-foreground">Especialidade</p>
                    <p className="font-medium">{selected.especialidade_nome}</p>
                  </div>
                )}
                {selected.qtd_atendimentos && (
                  <div>
                    <p className="text-xs text-muted-foreground">Atendimentos inclusos</p>
                    <p className="font-medium">{selected.qtd_atendimentos}</p>
                  </div>
                )}
              </div>

              {/* Financial breakdown */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> Resumo financeiro
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor bruto</p>
                    <p className="text-lg font-bold">{brl(selected.valor_ajustado_centavos ?? selected.valor_mensal_centavos)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" /> Taxa plataforma</p>
                    <p className="text-lg font-bold">{selected.taxa_plataforma_pct ?? 0}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Seu repasse</p>
                    <p className="text-lg font-bold text-success">
                      {brl(Math.round((selected.valor_ajustado_centavos ?? selected.valor_mensal_centavos) * (1 - (selected.taxa_plataforma_pct ?? 0) / 100)))}
                    </p>
                  </div>
                </div>
              </div>

              {selected.mensagem_empresa && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mensagem da empresa</p>
                  <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs italic">{selected.mensagem_empresa}</p>
                </div>
              )}

              <div>
                <Label>Sua resposta (opcional)</Label>
                <Textarea
                  value={mensagemResposta}
                  onChange={e => setMensagemResposta(e.target.value)}
                  placeholder="Comentário ou contraproposta…"
                  rows={2}
                />
              </div>

              {/* Terms */}
              {termoConteudo && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 max-h-32 overflow-auto text-xs">
                  {termoConteudo}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="termo-medico"
                  checked={termoAceito}
                  onCheckedChange={v => setTermoAceito(v === true)}
                />
                <Label htmlFor="termo-medico" className="text-xs">
                  Li e aceito os termos de proposta comercial
                </Label>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="destructive" onClick={recusar} disabled={saving}>
                  <XCircle className="mr-2 h-4 w-4" /> Recusar
                </Button>
                <Button onClick={aceitar} disabled={saving || !termoAceito}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Aceitar Proposta
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Terms enforcement dialog */}
      <TermsAcceptanceDialog
        tipo="proposta_medico"
        open={termsProposta.showDialog}
        onOpenChange={termsProposta.setShowDialog}
        onAccepted={termsProposta.onAccepted}
      />
    </div>
  );
}
