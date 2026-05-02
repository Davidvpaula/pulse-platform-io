import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Calendar, Clock, Stethoscope, User, AlertCircle, Loader2, ShieldCheck, ArrowLeft,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  criarConsultaComReserva,
  formatDataBR,
  formatHora,
  getPacienteAtual,
  getSlotDisponivel,
  type SlotDisponivel,
} from "@/lib/clinico";
import { abrirCheckout, criarCheckoutSession } from "@/lib/pagamentos";
import { useSession } from "@/lib/session";
import { cpfSchema, maskCpf } from "@/lib/validation/cpf";
import { useTermsCheck } from "@/hooks/useTermsCheck";
import { TermsAcceptanceDialog } from "@/components/shared/TermsAcceptanceDialog";

/* ─────────── Validação ─────────── */

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const schema = z.object({
  nome_completo: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo")
    .max(120, "Máx. 120 caracteres")
    .refine((s) => s.split(/\s+/).length >= 2, "Informe nome e sobrenome"),
  cpf: cpfSchema(),
  telefone: z
    .string()
    .transform(onlyDigits)
    .refine((s) => s.length >= 10 && s.length <= 11, "Telefone inválido (DDD + número)"),
  data_nascimento: z
    .string()
    .min(1, "Informe sua data de nascimento")
    .refine((s) => {
      const d = new Date(s);
      return !isNaN(d.getTime()) && d < new Date() && d.getFullYear() > 1900;
    }, "Data inválida"),
  sexo: z.enum(["masculino", "feminino", "intersexo", "nao_informado"]),
  cep: z
    .string()
    .transform(onlyDigits)
    .refine((s) => s.length === 8, "CEP deve ter 8 dígitos"),
  motivo: z.string().trim().max(500, "Máx. 500 caracteres").optional(),
});

type FormData = z.infer<typeof schema>;

/* ─────────── Máscaras simples ─────────── */
const maskCPF = maskCpf;

const maskFone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
};

const maskCEP = (v: string) =>
  onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

const formatBRL = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ─────────── Tela ─────────── */

export default function PacienteAgendarConfirmar() {
  const { slotId = "" } = useParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const [slot, setSlot] = useState<SlotDisponivel | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome_completo: "",
      cpf: "",
      telefone: "",
      data_nascimento: "",
      sexo: "nao_informado",
      cep: "",
      motivo: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    (async () => {
      if (!session) {
        toast.error("Faça login para continuar.");
        navigate(`/auth?redirect=/app/paciente/agendar/confirmar/${slotId}`);
        return;
      }
      const [s, p] = await Promise.all([getSlotDisponivel(slotId), getPacienteAtual()]);
      setSlot(s);
      if (p) {
        form.reset({
          nome_completo: p.nome_completo ?? "",
          cpf: p.cpf ? maskCPF(p.cpf) : "",
          telefone: p.telefone ? maskFone(p.telefone) : "",
          data_nascimento: p.data_nascimento ?? "",
          sexo: p.sexo ?? "nao_informado",
          cep: p.cep ? maskCEP(p.cep) : "",
          motivo: "",
        });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId, session]);

  const onSubmit = async (values: FormData) => {
    if (!slot) return;
    setSubmitting(true);
    try {
      const res = await criarConsultaComReserva({
        slot_id: slot.id,
        especialidade_id: slot.especialidade_id,
        motivo: values.motivo,
        nome_completo: values.nome_completo,
        cpf: values.cpf,
        telefone: values.telefone,
        data_nascimento: values.data_nascimento,
        sexo: values.sexo,
        cep: values.cep,
      });

      // Dispara checkout — Stripe (hosted) ou mock conforme app_settings
      const session = await criarCheckoutSession({
        consultaId: res.consulta_id,
        valorCentavos: res.valor_centavos,
        descricao: `${slot.especialidade_nome} · ${slot.medico_nome}`,
      });

      toast.success("Horário reservado por 15 minutos. Conclua o pagamento.");
      abrirCheckout(session, navigate);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível concluir o agendamento.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Horário indisponível"
          description="Este horário não está mais disponível para reserva."
        />
        <Button asChild>
          <Link to="/agendar"><ArrowLeft className="mr-2 h-4 w-4" /> Escolher outro horário</Link>
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
        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="card-elevated p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <User className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Seus dados</h2>
          </div>

          <div>
            <Label htmlFor="nome_completo">Nome completo *</Label>
            <Input
              id="nome_completo"
              {...form.register("nome_completo")}
              placeholder="Como aparece nos documentos"
              autoComplete="name"
              maxLength={120}
            />
            {form.formState.errors.nome_completo && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.nome_completo.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={form.watch("cpf")}
                onChange={(e) => form.setValue("cpf", maskCPF(e.target.value), { shouldValidate: true })}
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="off"
              />
              {form.formState.errors.cpf && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.cpf.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="telefone">Telefone (com DDD) *</Label>
              <Input
                id="telefone"
                value={form.watch("telefone")}
                onChange={(e) => form.setValue("telefone", maskFone(e.target.value), { shouldValidate: true })}
                placeholder="(11) 91234-5678"
                inputMode="tel"
                autoComplete="tel"
              />
              {form.formState.errors.telefone && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.telefone.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="data_nascimento">Nascimento *</Label>
              <Input
                id="data_nascimento"
                type="date"
                {...form.register("data_nascimento")}
                max={new Date().toISOString().slice(0, 10)}
              />
              {form.formState.errors.data_nascimento && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.data_nascimento.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="sexo">Sexo biológico *</Label>
              <Select
                value={form.watch("sexo")}
                onValueChange={(v) => form.setValue("sexo", v as FormData["sexo"], { shouldValidate: true })}
              >
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
              <Input
                id="cep"
                value={form.watch("cep")}
                onChange={(e) => form.setValue("cep", maskCEP(e.target.value), { shouldValidate: true })}
                placeholder="00000-000"
                inputMode="numeric"
                autoComplete="postal-code"
              />
              {form.formState.errors.cep && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.cep.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="motivo">Motivo da consulta (opcional)</Label>
            <Textarea
              id="motivo"
              {...form.register("motivo")}
              placeholder="Conte resumidamente o que motiva a consulta. O médico verá antes do atendimento."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info/5 p-3 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <span>
              Seus dados ficam salvos no seu cadastro e serão pré-preenchidos nas próximas consultas.
              A reserva expira em 15 minutos se o pagamento não for concluído.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button type="button" variant="ghost" asChild>
              <Link to="/agendar"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link>
            </Button>
            <Button type="submit" disabled={submitting} className="bg-gradient-primary hover:opacity-90">
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reservando…</>
              ) : (
                <><ShieldCheck className="mr-2 h-4 w-4" /> Reservar e ir para pagamento</>
              )}
            </Button>
          </div>
        </form>

        {/* Resumo do agendamento */}
        <aside className="card-elevated h-fit p-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Resumo</p>
            <h3 className="mt-1 font-display text-lg font-semibold">{slot.especialidade_nome}</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
              <span>{slot.medico_nome}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDataBR(slot.inicio)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formatHora(slot.inicio)} · {slot.duracao_minutos} min</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                Telemedicina
              </span>
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-bold">{formatBRL(slot.preco_centavos)}</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Após reservar, você terá <strong>15 minutos</strong> para concluir o pagamento.
            Caso contrário, o horário volta a ficar disponível.
          </p>
        </aside>
      </div>
    </div>
  );
}
