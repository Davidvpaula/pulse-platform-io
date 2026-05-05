/**
 * Componente unificado de confirmação de agendamento.
 *
 * Rota: /app/agendamento/confirmar/:slotId?tipo=especialidade|servico|pa|retorno|empresa|plano&ref=UUID
 *
 * Fluxo: Formulário do paciente → Reserva slot → Checkout → Pagamento → Consulta criada
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Calendar, Clock, Stethoscope, User, AlertCircle, Loader2, ShieldCheck, ArrowLeft, FileText,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { reservarSlotUnificado, getPacienteAtual, formatDataBR, formatHora } from "@/lib/clinico";
import { abrirCheckout, criarCheckoutSession } from "@/lib/pagamentos";
import { useSession } from "@/lib/session";
import { cpfSchema, maskCpf } from "@/lib/validation/cpf";
import { buscarTermoAtivo, registrarAceite, verificarAceite, type TermoRow } from "@/lib/termos";
import { TermsAcceptanceDialog } from "@/components/shared/TermsAcceptanceDialog";
import { trackEvent, trackConversion } from "@/lib/analytics/tracker";

/* ─── Tipos de agendamento suportados ─── */
export type TipoAgendamento = "especialidade" | "servico" | "pa" | "retorno" | "empresa" | "plano";

/* ─── Info do slot carregada para exibição ─── */
type SlotInfo = {
  id: string;
  medico_id: string;
  medico_nome: string;
  inicio: string;
  fim: string;
  modalidade: string;
  referencia_nome: string; // nome da especialidade ou serviço
  preco_centavos: number;
  duracao_minutos: number;
};

/* ─── Validação ─── */
const onlyDigits = (s: string) => s.replace(/\D/g, "");

const schema = z.object({
  nome_completo: z.string().trim().min(3, "Informe seu nome completo").max(120, "Máx. 120 caracteres")
    .refine((s) => s.split(/\s+/).length >= 2, "Informe nome e sobrenome"),
  cpf: cpfSchema(),
  telefone: z.string().transform(onlyDigits)
    .refine((s) => s.length >= 10 && s.length <= 11, "Telefone inválido (DDD + número)"),
  data_nascimento: z.string().min(1, "Informe sua data de nascimento")
    .refine((s) => { const d = new Date(s); return !isNaN(d.getTime()) && d < new Date() && d.getFullYear() > 1900; }, "Data inválida"),
  sexo: z.enum(["masculino", "feminino", "intersexo", "nao_informado"]),
  cep: z.string().transform(onlyDigits).refine((s) => s.length === 8, "CEP deve ter 8 dígitos"),
  motivo: z.string().trim().max(500, "Máx. 500 caracteres").optional(),
});
type FormData = z.infer<typeof schema>;

/* ─── Máscaras ─── */
const maskCPF = maskCpf;
const maskFone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
};
const maskCEP = (v: string) => onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
const formatBRL = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ─── Loader de info do slot + contexto ─── */
async function carregarSlotInfo(slotId: string, tipo: TipoAgendamento, ref: string): Promise<SlotInfo | null> {
  // 1. Buscar slot base
  const { data: slot } = await supabase
    .from("agenda_slots")
    .select("id, medico_id, inicio, fim, modalidade, status")
    .eq("id", slotId)
    .maybeSingle();
  if (!slot || (slot.status !== "disponivel" && slot.status !== "reservado")) return null;

  // 2. Nome do médico
  const { data: medico } = await supabase.from("medicos").select("id, nome").eq("id", slot.medico_id).maybeSingle();

  // 3. Dados da referência (preço, nome, duração) dependem do tipo
  let referencia_nome = "—";
  let preco_centavos = 0;
  let duracao_minutos = 30;

  if (tipo === "especialidade") {
    const { data: vinc } = await supabase
      .from("medico_especialidades")
      .select("preco_centavos, duracao_minutos, especialidade_id")
      .eq("medico_id", slot.medico_id)
      .eq("especialidade_id", ref)
      .eq("ativo", true)
      .maybeSingle();
    if (vinc) {
      preco_centavos = vinc.preco_centavos;
      duracao_minutos = vinc.duracao_minutos;
      const { data: esp } = await supabase.from("especialidades").select("nome").eq("id", ref).maybeSingle();
      referencia_nome = esp?.nome ?? "—";
    }
  } else if (tipo === "servico" || tipo === "pa") {
    const { data: srv } = await supabase
      .from("servicos_financeiros")
      .select("nome, valor_paciente_centavos, duracao_min")
      .eq("id", ref)
      .eq("ativo", true)
      .maybeSingle();
    if (srv) {
      referencia_nome = srv.nome;
      preco_centavos = srv.valor_paciente_centavos ?? 0;
      duracao_minutos = srv.duracao_min ?? 30;
    }
  } else if (tipo === "retorno") {
    // Retorno gratuito — preço 0
    referencia_nome = "Retorno";
    preco_centavos = 0;
    // Tenta pegar especialidade da consulta original
    const { data: cOrig } = await supabase.from("consultas").select("especialidade_id").eq("id", ref).maybeSingle();
    if (cOrig?.especialidade_id) {
      const { data: esp } = await supabase.from("especialidades").select("nome").eq("id", cOrig.especialidade_id).maybeSingle();
      referencia_nome = `Retorno – ${esp?.nome ?? ""}`;
    }
  } else {
    // empresa, plano, etc. — fallback genérico por especialidade do médico
    const { data: vinculos } = await supabase
      .from("medico_especialidades")
      .select("preco_centavos, duracao_minutos, especialidade_id")
      .eq("medico_id", slot.medico_id)
      .eq("ativo", true)
      .limit(1);
    const v = vinculos?.[0];
    if (v) {
      preco_centavos = v.preco_centavos;
      duracao_minutos = v.duracao_minutos;
      const { data: esp } = await supabase.from("especialidades").select("nome").eq("id", v.especialidade_id).maybeSingle();
      referencia_nome = esp?.nome ?? "—";
    }
  }

  return {
    id: slot.id,
    medico_id: slot.medico_id,
    medico_nome: medico?.nome ?? "Médico",
    inicio: slot.inicio,
    fim: slot.fim,
    modalidade: slot.modalidade,
    referencia_nome,
    preco_centavos,
    duracao_minutos,
  };
}

/* ─── Componente ─── */
export default function AgendamentoConfirmar() {
  const { slotId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useSession();

  const tipo = (searchParams.get("tipo") || "especialidade") as TipoAgendamento;
  const ref = searchParams.get("ref") || "";

  const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Terms acceptance state
  const [termoConsulta, setTermoConsulta] = useState<TermoRow | null>(null);
  const [termoPrivacidade, setTermoPrivacidade] = useState<TermoRow | null>(null);
  const [aceitouConsulta, setAceitouConsulta] = useState(false);
  const [aceitouPrivacidade, setAceitouPrivacidade] = useState(false);
  const [previewTermo, setPreviewTermo] = useState<TermoRow | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome_completo: "", cpf: "", telefone: "", data_nascimento: "",
      sexo: "nao_informado", cep: "", motivo: "",
    },
    mode: "onSubmit",
  });

  // Back URL baseado no tipo
  const backUrl = useMemo(() => {
    switch (tipo) {
      case "servico": return "/servicos";
      case "pa": return "/atendimento-imediato";
      case "especialidade": return "/agendar";
      default: return "/agendar";
    }
  }, [tipo]);

  useEffect(() => {
    (async () => {
      if (!session) {
        toast.error("Faça login para continuar.");
        navigate(`/auth?redirect=/app/agendamento/confirmar/${slotId}?tipo=${tipo}&ref=${ref}`);
        return;
      }
      const [info, paciente, tConsulta, tPriv] = await Promise.all([
        carregarSlotInfo(slotId, tipo, ref),
        getPacienteAtual(),
        buscarTermoAtivo("consulta_paciente"),
        buscarTermoAtivo("privacidade"),
      ]);
      setSlotInfo(info);
      setTermoConsulta(tConsulta);
      setTermoPrivacidade(tPriv);

      // Check if user already accepted these terms
      if (session.user) {
        const [accC, accP] = await Promise.all([
          tConsulta ? verificarAceite("consulta_paciente", session.user.id) : true,
          tPriv ? verificarAceite("privacidade", session.user.id) : true,
        ]);
        setAceitouConsulta(accC);
        setAceitouPrivacidade(accP);
      }

      if (info) {
        trackEvent("inicio_agendamento", {
          slot_id: slotId, tipo, ref, nome: info.referencia_nome, medico: info.medico_nome,
        }).catch(() => {});
      }

      if (paciente) {
        form.reset({
          nome_completo: paciente.nome_completo ?? "",
          cpf: paciente.cpf ? maskCPF(paciente.cpf) : "",
          telefone: paciente.telefone ? maskFone(paciente.telefone) : "",
          data_nascimento: paciente.data_nascimento ?? "",
          sexo: paciente.sexo ?? "nao_informado",
          cep: paciente.cep ? maskCEP(paciente.cep) : "",
          motivo: "",
        });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId, session]);

  const doSubmit = useCallback(async (values: FormData) => {
    if (!slotInfo) return;
    setSubmitting(true);
    try {
      // 1) Reserva o slot SEM criar consulta
      const reserva = await reservarSlotUnificado({
        slot_id: slotInfo.id,
        tipo: tipo as "especialidade" | "servico" | "pa",
        referencia_id: ref,
        motivo: values.motivo,
        nome_completo: values.nome_completo,
        cpf: values.cpf,
        telefone: values.telefone,
        data_nascimento: values.data_nascimento,
        sexo: values.sexo,
        cep: values.cep,
      });

      // 2) Cria checkout (sem consulta_id) com snapshot financeiro imutável
      const checkoutSession = await criarCheckoutSession({
        valorCentavos: reserva.valor_centavos,
        descricao: `${slotInfo.referencia_nome} · ${slotInfo.medico_nome}`,
        reserva: {
          slot_id: reserva.slot_id,
          tipo: reserva.tipo,
          referencia_id: reserva.referencia_id,
          motivo: reserva.motivo,
          paciente_id: reserva.paciente_id,
          medico_id: reserva.medico_id,
        },
        snapshot: {
          valor_bruto_centavos: reserva.valor_centavos,
          referencia_nome: slotInfo.referencia_nome,
          medico_nome: slotInfo.medico_nome,
          duracao_minutos: slotInfo.duracao_minutos,
          inicio: slotInfo.inicio,
          fim: slotInfo.fim,
          modalidade: slotInfo.modalidade,
        },
      });

      // Analytics
      trackConversion({
        tipo: "agendamento",
        valor: reserva.valor_centavos / 100,
        servico: slotInfo.referencia_nome,
        medico_id: slotInfo.medico_id,
      }).catch(() => {});

      toast.success("Horário reservado por 15 minutos. Conclua o pagamento.");
      abrirCheckout(checkoutSession, navigate);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível concluir o agendamento.");
    } finally {
      setSubmitting(false);
    }
  }, [slotInfo, navigate, tipo, ref]);

  // Determine if terms need acceptance
  const needsConsulta = !!termoConsulta && !aceitouConsulta;
  const needsPrivacidade = !!termoPrivacidade && !aceitouPrivacidade;
  const termsBlocked = needsConsulta || needsPrivacidade;

  const onSubmit = async (values: FormData) => {
    if (termsBlocked) {
      toast.error("Você precisa aceitar todos os termos para continuar.");
      return;
    }
    // Register acceptance for terms not yet registered
    try {
      const promises: Promise<void>[] = [];
      if (termoConsulta) promises.push(registrarAceite(termoConsulta.id).catch(() => {}));
      if (termoPrivacidade) promises.push(registrarAceite(termoPrivacidade.id).catch(() => {}));
      await Promise.all(promises);
    } catch { /* non-blocking */ }
    await doSubmit(values);
  };

  /* ─── Renders ─── */

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!slotInfo) {
    return (
      <div className="space-y-4">
        <PageHeader title="Horário indisponível" description="Este horário não está mais disponível para reserva." />
        <Button asChild>
          <Link to={backUrl}><ArrowLeft className="mr-2 h-4 w-4" /> Escolher outro horário</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Confirmar dados e agendar"
        description="Preencha seus dados para reservar o horário. A reserva fica garantida por 15 minutos para você concluir o pagamento."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Formulário */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="card-elevated p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <User className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Seus dados</h2>
          </div>

          <div>
            <Label htmlFor="nome_completo">Nome completo *</Label>
            <Input id="nome_completo" {...form.register("nome_completo")} placeholder="Como aparece nos documentos" autoComplete="name" maxLength={120} />
            {form.formState.errors.nome_completo && <p className="mt-1 text-xs text-destructive">{form.formState.errors.nome_completo.message}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input id="cpf" value={form.watch("cpf")} onChange={(e) => form.setValue("cpf", maskCPF(e.target.value), { shouldValidate: true })} placeholder="000.000.000-00" inputMode="numeric" autoComplete="off" />
              {form.formState.errors.cpf && <p className="mt-1 text-xs text-destructive">{form.formState.errors.cpf.message}</p>}
            </div>
            <div>
              <Label htmlFor="telefone">Telefone (com DDD) *</Label>
              <Input id="telefone" value={form.watch("telefone")} onChange={(e) => form.setValue("telefone", maskFone(e.target.value), { shouldValidate: true })} placeholder="(11) 91234-5678" inputMode="tel" autoComplete="tel" />
              {form.formState.errors.telefone && <p className="mt-1 text-xs text-destructive">{form.formState.errors.telefone.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="data_nascimento">Nascimento *</Label>
              <Input id="data_nascimento" type="date" {...form.register("data_nascimento")} max={new Date().toISOString().slice(0, 10)} />
              {form.formState.errors.data_nascimento && <p className="mt-1 text-xs text-destructive">{form.formState.errors.data_nascimento.message}</p>}
            </div>
            <div>
              <Label htmlFor="sexo">Sexo biológico *</Label>
              <Select value={form.watch("sexo")} onValueChange={(v) => form.setValue("sexo", v as FormData["sexo"], { shouldValidate: true })}>
                <SelectTrigger id="sexo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="intersexo">Intersexo</SelectItem>
                  <SelectItem value="nao_informado">Prefiro não informar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cep">CEP *</Label>
              <Input id="cep" value={form.watch("cep")} onChange={(e) => form.setValue("cep", maskCEP(e.target.value), { shouldValidate: true })} placeholder="00000-000" inputMode="numeric" autoComplete="postal-code" />
              {form.formState.errors.cep && <p className="mt-1 text-xs text-destructive">{form.formState.errors.cep.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="motivo">Motivo da consulta (opcional)</Label>
            <Textarea id="motivo" {...form.register("motivo")} placeholder="Conte resumidamente o que motiva a consulta. O médico verá antes do atendimento." rows={3} maxLength={500} />
          </div>

          {/* Termos de aceite */}
          {(termoConsulta || termoPrivacidade) && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Termos obrigatórios
              </p>
              {termoConsulta && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="aceite-consulta"
                    checked={aceitouConsulta}
                    onCheckedChange={(v) => setAceitouConsulta(!!v)}
                  />
                  <label htmlFor="aceite-consulta" className="text-xs leading-relaxed cursor-pointer select-none">
                    Li e concordo com os{" "}
                    <button
                      type="button"
                      className="text-primary underline hover:text-primary/80"
                      onClick={() => setPreviewTermo(termoConsulta)}
                    >
                      Termos de compra de consulta
                    </button>
                  </label>
                </div>
              )}
              {termoPrivacidade && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="aceite-privacidade"
                    checked={aceitouPrivacidade}
                    onCheckedChange={(v) => setAceitouPrivacidade(!!v)}
                  />
                  <label htmlFor="aceite-privacidade" className="text-xs leading-relaxed cursor-pointer select-none">
                    Li e concordo com a{" "}
                    <button
                      type="button"
                      className="text-primary underline hover:text-primary/80"
                      onClick={() => setPreviewTermo(termoPrivacidade)}
                    >
                      Política de Privacidade
                    </button>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info/5 p-3 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <span>
              Seus dados ficam salvos no seu cadastro e serão pré-preenchidos nas próximas consultas.
              A reserva expira em 15 minutos se o pagamento não for concluído.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button type="button" variant="ghost" asChild>
              <Link to={backUrl}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link>
            </Button>
            <Button type="submit" disabled={submitting || termsBlocked} className="bg-gradient-primary hover:opacity-90">
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reservando…</>
              ) : (
                <><ShieldCheck className="mr-2 h-4 w-4" /> Reservar e ir para pagamento</>
              )}
            </Button>
          </div>
        </form>

        {/* Resumo lateral */}
        <aside className="card-elevated h-fit p-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Resumo</p>
            <h3 className="mt-1 font-display text-lg font-semibold">{slotInfo.referencia_nome}</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
              <span>{slotInfo.medico_nome}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDataBR(slotInfo.inicio)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formatHora(slotInfo.inicio)} · {slotInfo.duracao_minutos} min</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {slotInfo.modalidade === "presencial" ? "Presencial" : "Telemedicina"}
              </span>
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-bold">{formatBRL(slotInfo.preco_centavos)}</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Após reservar, você terá <strong>15 minutos</strong> para concluir o pagamento.
            Caso contrário, o horário volta a ficar disponível.
          </p>
        </aside>
      </div>

      {/* Dialog de preview de termo */}
      {previewTermo && (
        <Dialog open={!!previewTermo} onOpenChange={() => setPreviewTermo(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{previewTermo.titulo} (v{previewTermo.versao})</DialogTitle>
            </DialogHeader>
            <div
              className="flex-1 overflow-y-auto border rounded-md p-4 prose prose-sm dark:prose-invert max-w-none"
              style={{ maxHeight: "60vh" }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewTermo.conteudo) }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
