import { useEffect, useState, useMemo } from "react";
import {
  Plus, Loader2, Send, Building2, Stethoscope, Clock,
  CheckCircle2, XCircle, ArrowRight, FileText, Search,
  Target, DollarSign, MessageSquareText,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import type { Database } from "@/integrations/supabase/types";

type PropostaRow = Database["public"]["Tables"]["propostas_empresa_medico"]["Row"];
type PropostaStatus = Database["public"]["Enums"]["proposta_empresa_status"];
type TipoContrato = Database["public"]["Enums"]["proposta_tipo_contrato"];

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const STATUS_CONFIG: Record<PropostaStatus, { label: string; color: string; icon: typeof Clock }> = {
  criada: { label: "Criada", color: "bg-muted text-muted-foreground", icon: Clock },
  em_analise: { label: "Em análise", color: "bg-warning/10 text-warning", icon: Clock },
  aprovada_admin: { label: "Aprovada", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
  enviada_medico: { label: "Enviada ao médico", color: "bg-info/10 text-info", icon: Send },
  aceita: { label: "Aceita", color: "bg-success/10 text-success", icon: CheckCircle2 },
  recusada: { label: "Recusada", color: "bg-destructive/10 text-destructive", icon: XCircle },
  convertida: { label: "Convertida em plano", color: "bg-success/10 text-success", icon: FileText },
  cancelada: { label: "Cancelada", color: "bg-muted text-muted-foreground", icon: XCircle },
};

const TIPO_CONTRATO_LABELS: Record<TipoContrato, string> = {
  mensal: "Mensal",
  pacote: "Pacote",
  recorrente: "Recorrente",
};

const PIPELINE_ORDER: PropostaStatus[] = [
  "criada", "em_analise", "aprovada_admin", "enviada_medico", "aceita", "convertida",
];

export default function EmpresaPropostas() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [propostas, setPropostas] = useState<(PropostaRow & { medico_nome?: string; especialidade_nome?: string })[]>([]);
  const [medicos, setMedicos] = useState<{ id: string; nome: string }[]>([]);
  const [especialidades, setEspecialidades] = useState<{ id: string; nome: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [busca, setBusca] = useState("");

  // Form state
  const [formMedicoId, setFormMedicoId] = useState("");
  const [formEspecialidadeId, setFormEspecialidadeId] = useState("");
  const [formTipoContrato, setFormTipoContrato] = useState<TipoContrato>("mensal");
  const [formValor, setFormValor] = useState("");
  const [formQtd, setFormQtd] = useState("");
  const [formMensagem, setFormMensagem] = useState("");
  const [formTermoAceito, setFormTermoAceito] = useState(false);

  // Termo
  const [termoConteudo, setTermoConteudo] = useState<string | null>(null);
  const [termoVersao, setTermoVersao] = useState<number | null>(null);

  // Empresa id from user's profile link
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, [session]);

  async function carregarDados() {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data: empFunc } = await supabase
        .from("empresas_funcionarios")
        .select("empresa_id")
        .eq("paciente_id", session.user.id)
        .limit(1)
        .maybeSingle();

      const eid = empFunc?.empresa_id;
      if (!eid) {
        const { data: pac } = await supabase
          .from("pacientes")
          .select("empresa_id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (pac?.empresa_id) setEmpresaId(pac.empresa_id);
      } else {
        setEmpresaId(eid);
      }

      const finalEid = eid || empresaId;
      if (!finalEid) {
        setLoading(false);
        return;
      }

      const [{ data: props }, { data: meds }, { data: esps }, { data: termo }] = await Promise.all([
        supabase
          .from("propostas_empresa_medico")
          .select("*, medico:profiles!propostas_empresa_medico_medico_id_fkey(nome), especialidade:especialidades(nome)")
          .eq("empresa_id", finalEid)
          .order("created_at", { ascending: false }),
        supabase
          .from("medicos")
          .select("user_id, nome")
          .eq("status", "aprovado")
          .order("nome"),
        supabase
          .from("especialidades")
          .select("id, nome")
          .eq("ativo", true)
          .order("nome"),
        supabase
          .from("termos_condicoes")
          .select("conteudo, versao")
          .eq("tipo", "proposta_empresa")
          .eq("status", "publicado")
          .order("versao", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setPropostas(
        (props ?? []).map((p: any) => ({
          ...p,
          medico_nome: p.medico?.nome ?? "—",
          especialidade_nome: p.especialidade?.nome ?? null,
        }))
      );
      setMedicos((meds ?? []).map((m: any) => ({ id: m.user_id, nome: m.nome })));
      setEspecialidades(esps ?? []);
      setTermoConteudo(termo?.conteudo ?? null);
      setTermoVersao(termo?.versao ?? null);
    } catch (e: any) {
      toast.error("Erro ao carregar propostas", { description: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function enviarProposta() {
    if (!empresaId || !formMedicoId) {
      toast.error("Selecione um médico");
      return;
    }
    const valorCentavos = Math.round(parseFloat(formValor.replace(",", ".")) * 100);
    if (!valorCentavos || valorCentavos <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!formMensagem.trim()) {
      toast.error("Descreva seus interesses e objetivos");
      return;
    }
    if (!formTermoAceito) {
      toast.error("Aceite os termos para continuar");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from("propostas_empresa_medico").insert({
        empresa_id: empresaId,
        medico_id: formMedicoId,
        especialidade_id: formEspecialidadeId || null,
        tipo_contrato: formTipoContrato,
        valor_mensal_centavos: valorCentavos,
        qtd_atendimentos: formQtd ? parseInt(formQtd) : null,
        mensagem_empresa: formMensagem.trim(),
        termo_empresa_aceito: true,
        termo_empresa_versao: termoVersao,
      });
      if (error) throw error;
      toast.success("Proposta enviada com sucesso! Será analisada pela Lasmar Telemed.");
      setShowForm(false);
      resetForm();
      carregarDados();
    } catch (e: any) {
      toast.error("Erro ao enviar proposta", { description: e.message });
    } finally {
      setSending(false);
    }
  }

  function resetForm() {
    setFormMedicoId("");
    setFormEspecialidadeId("");
    setFormTipoContrato("mensal");
    setFormValor("");
    setFormQtd("");
    setFormMensagem("");
    setFormTermoAceito(false);
  }

  const filtradas = useMemo(() => {
    if (!busca.trim()) return propostas;
    const q = busca.toLowerCase();
    return propostas.filter(p =>
      (p.medico_nome ?? "").toLowerCase().includes(q) ||
      (p.especialidade_nome ?? "").toLowerCase().includes(q)
    );
  }, [propostas, busca]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── NEW PROPOSAL FORM (card-based, inline) ───
  if (showForm) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <PageHeader
          title="Nova Proposta Personalizada"
          description="Descreva seus interesses e objetivos, selecione o médico e faça sua oferta."
          actions={
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
              Cancelar
            </Button>
          }
        />

        {/* Step 1: Select doctor */}
        <Card className="card-elevated border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Médico e Especialidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Médico *</Label>
              <Select value={formMedicoId} onValueChange={setFormMedicoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um médico" />
                </SelectTrigger>
                <SelectContent>
                  {medicos.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Especialidade (opcional)</Label>
              <Select value={formEspecialidadeId} onValueChange={setFormEspecialidadeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer especialidade" />
                </SelectTrigger>
                <SelectContent>
                  {especialidades.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Interests & Objectives */}
        <Card className="card-elevated border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Interesses e Objetivos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Descreva sua proposta *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Explique o que sua empresa busca, tipo de atendimento desejado, público-alvo dos colaboradores, frequência esperada e qualquer detalhe relevante.
              </p>
              <Textarea
                placeholder="Ex: Buscamos atendimento de saúde ocupacional para nossos 200 colaboradores, com foco em consultas preventivas mensais e acompanhamento de casos crônicos..."
                value={formMensagem}
                onChange={e => setFormMensagem(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
            <div>
              <Label>Qtd. de atendimentos estimada (opcional)</Label>
              <Input
                type="number"
                placeholder="Ex: 20 atendimentos/mês"
                value={formQtd}
                onChange={e => setFormQtd(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Offer */}
        <Card className="card-elevated border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Sua Oferta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de contrato *</Label>
                <Select value={formTipoContrato} onValueChange={v => setFormTipoContrato(v as TipoContrato)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="pacote">Pacote</SelectItem>
                    <SelectItem value="recorrente">Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor ofertado (R$) *</Label>
                <Input
                  type="text"
                  placeholder="1.500,00"
                  value={formValor}
                  onChange={e => setFormValor(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Este valor será analisado pela Lasmar Telemed antes de ser encaminhado ao médico.
            </p>
          </CardContent>
        </Card>

        {/* Step 4: Terms */}
        <Card className="card-elevated border-border">
          <CardContent className="pt-6 space-y-3">
            {termoConteudo && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 max-h-40 overflow-auto text-xs leading-relaxed">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Termos e Condições — Lasmar Telemed
                </p>
                {termoConteudo}
              </div>
            )}
            {!termoConteudo && (
              <p className="text-xs text-muted-foreground italic">
                Os termos de proposta comercial serão disponibilizados em breve.
              </p>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="termo-empresa"
                checked={formTermoAceito}
                onCheckedChange={v => setFormTermoAceito(v === true)}
              />
              <Label htmlFor="termo-empresa" className="text-xs">
                Li e aceito os termos de proposta comercial da Lasmar Telemed
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
            Cancelar
          </Button>
          <Button
            size="lg"
            onClick={enviarProposta}
            disabled={sending || !formMedicoId || !formValor || !formMensagem.trim() || !formTermoAceito}
          >
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar Proposta
          </Button>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="space-y-6">
      <PageHeader
        title="Planos Personalizados"
        description="Monte propostas de atendimento diretamente para médicos da plataforma."
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova Proposta
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por médico ou especialidade…" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {/* Pipeline overview */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {PIPELINE_ORDER.map(s => {
          const count = propostas.filter(p => p.status === s).length;
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${cfg.color}`}>
              <cfg.icon className="h-3.5 w-3.5" />
              {cfg.label}: {count}
            </div>
          );
        })}
      </div>

      {/* Proposals list */}
      {filtradas.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Send className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p>Nenhuma proposta encontrada.</p>
          <p className="text-xs mt-1">Clique em "Nova Proposta" para começar.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtradas.map(p => {
            const cfg = STATUS_CONFIG[p.status as PropostaStatus] ?? STATUS_CONFIG.criada;
            const StIcon = cfg.icon;
            return (
              <Card key={p.id} className="card-elevated">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{p.medico_nome}</span>
                      </div>
                      {p.especialidade_nome && (
                        <p className="text-xs text-muted-foreground ml-6">{p.especialidade_nome}</p>
                      )}
                    </div>
                    <Badge className={cfg.color}>
                      <StIcon className="mr-1 h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor ofertado</p>
                      <p className="font-semibold">{brl(p.valor_mensal_centavos)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tipo</p>
                      <p className="capitalize">{TIPO_CONTRATO_LABELS[p.tipo_contrato as TipoContrato] ?? p.tipo_contrato}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Criada em</p>
                      <p>{fmtDate(p.created_at)}</p>
                    </div>
                  </div>

                  {p.qtd_atendimentos && (
                    <p className="text-xs text-muted-foreground">
                      {p.qtd_atendimentos} atendimentos inclusos
                    </p>
                  )}
                  {p.mensagem_empresa && (
                    <div className="border-l-2 border-primary/20 pl-3 py-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-0.5">
                        <MessageSquareText className="h-3 w-3" /> Interesses e objetivos
                      </p>
                      <p className="text-xs text-muted-foreground italic line-clamp-3">
                        {p.mensagem_empresa}
                      </p>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-2 border-t border-border">
                    {PIPELINE_ORDER.map((step, i) => {
                      const currentIdx = PIPELINE_ORDER.indexOf(p.status as PropostaStatus);
                      const isActive = i <= currentIdx;
                      const isCurrent = step === p.status;
                      return (
                        <div key={step} className="flex items-center gap-1">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              isCurrent ? "bg-primary" : isActive ? "bg-primary/40" : "bg-muted-foreground/20"
                            }`}
                          />
                          {i < PIPELINE_ORDER.length - 1 && (
                            <ArrowRight className={`h-2.5 w-2.5 ${isActive ? "text-primary/40" : "text-muted-foreground/20"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
