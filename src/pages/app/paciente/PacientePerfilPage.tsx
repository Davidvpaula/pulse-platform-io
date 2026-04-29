import { useEffect, useState } from "react";
import { User, Save, Loader2, Database as DbIcon, ShieldCheck, Heart } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/session";
import {
  getPacienteAtual, updatePacientePerfil, updateProfileBasico,
} from "@/lib/clinico";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Sexo = "masculino" | "feminino" | "outro" | "nao_informado";

type FormState = {
  nome_completo: string;
  cpf: string;
  telefone: string;
  data_nascimento: string;
  sexo: Sexo;
  cep: string;
  alergias: string;
  condicoes_cronicas: string;
  medicamentos_uso: string;
  contato_emergencia_nome: string;
  contato_emergencia_telefone: string;
};

const empty: FormState = {
  nome_completo: "", cpf: "", telefone: "", data_nascimento: "",
  sexo: "nao_informado", cep: "", alergias: "", condicoes_cronicas: "",
  medicamentos_uso: "", contato_emergencia_nome: "", contato_emergencia_telefone: "",
};

export default function PacientePerfilPage() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      if (!session) { setLoading(false); return; }
      setLoading(true);
      const [{ data: prof }, paciente] = await Promise.all([
        supabase.from("profiles").select("nome, telefone, email").eq("id", session.user.id).maybeSingle(),
        getPacienteAtual(),
      ]);
      setEmail(prof?.email ?? session.user.email ?? "");
      setForm({
        nome_completo: paciente?.nome_completo ?? prof?.nome ?? "",
        cpf: paciente?.cpf ?? "",
        telefone: paciente?.telefone ?? prof?.telefone ?? "",
        data_nascimento: paciente?.data_nascimento ?? "",
        sexo: (paciente?.sexo as Sexo) ?? "nao_informado",
        cep: paciente?.cep ?? "",
        alergias: paciente?.alergias ?? "",
        condicoes_cronicas: paciente?.condicoes_cronicas ?? "",
        medicamentos_uso: paciente?.medicamentos_uso ?? "",
        contato_emergencia_nome: paciente?.contato_emergencia_nome ?? "",
        contato_emergencia_telefone: paciente?.contato_emergencia_telefone ?? "",
      });
      setLoading(false);
    })();
  }, [session]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      toast.error("Faça login para salvar seu perfil.");
      return;
    }
    if (form.nome_completo.trim().length < 3) {
      toast.error("Informe seu nome completo.");
      return;
    }
    setSaving(true);
    const r1 = await updatePacientePerfil({
      nome_completo: form.nome_completo.trim(),
      cpf: form.cpf.replace(/\D/g, "") || null,
      telefone: form.telefone || null,
      data_nascimento: form.data_nascimento || null,
      sexo: form.sexo,
      cep: form.cep.replace(/\D/g, "") || null,
      alergias: form.alergias || null,
      condicoes_cronicas: form.condicoes_cronicas || null,
      medicamentos_uso: form.medicamentos_uso || null,
      contato_emergencia_nome: form.contato_emergencia_nome || null,
      contato_emergencia_telefone: form.contato_emergencia_telefone || null,
    });
    const r2 = await updateProfileBasico({
      nome: form.nome_completo.trim(),
      telefone: form.telefone || null,
    });
    setSaving(false);
    if (!r1.ok) { toast.error(r1.error ?? "Falha ao salvar."); return; }
    if (!r2.ok) { toast.error(r2.error ?? "Perfil base não atualizado."); return; }
    toast.success("Perfil atualizado com sucesso.");
  };

  if (!session) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meu perfil" description="Faça login para gerenciar seus dados." />
        <div className="card-elevated p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Você precisa estar autenticado para acessar seu perfil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu perfil"
        description="Mantenha seus dados atualizados — eles são usados nos seus agendamentos e prescrições."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
            <DbIcon className="h-3 w-3" /> Dados em tempo real
          </span>
        }
      />

      {loading ? (
        <div className="card-elevated flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <form onSubmit={salvar} className="space-y-6">
          {/* Identificação */}
          <section className="card-elevated p-6">
            <header className="mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg font-semibold">Identificação</h3>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome completo *">
                <Input
                  required
                  value={form.nome_completo}
                  onChange={(e) => set("nome_completo", e.target.value)}
                  placeholder="Seu nome completo"
                />
              </Field>
              <Field label="E-mail">
                <Input value={email} disabled />
              </Field>
              <Field label="CPF">
                <Input
                  value={form.cpf}
                  onChange={(e) => set("cpf", e.target.value)}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </Field>
              <Field label="Telefone">
                <Input
                  value={form.telefone}
                  onChange={(e) => set("telefone", e.target.value)}
                  placeholder="(11) 99999-0000"
                />
              </Field>
              <Field label="Data de nascimento">
                <Input
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) => set("data_nascimento", e.target.value)}
                />
              </Field>
              <Field label="Sexo biológico">
                <Select value={form.sexo} onValueChange={(v) => set("sexo", v as Sexo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                    <SelectItem value="nao_informado">Não informado</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="CEP">
                <Input
                  value={form.cep}
                  onChange={(e) => set("cep", e.target.value)}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
              </Field>
            </div>
          </section>

          {/* Saúde */}
          <section className="card-elevated p-6">
            <header className="mb-4 flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg font-semibold">Informações de saúde</h3>
            </header>
            <div className="grid gap-4">
              <Field label="Alergias">
                <Textarea
                  rows={2}
                  value={form.alergias}
                  onChange={(e) => set("alergias", e.target.value)}
                  placeholder="Ex: penicilina, dipirona…"
                />
              </Field>
              <Field label="Condições crônicas">
                <Textarea
                  rows={2}
                  value={form.condicoes_cronicas}
                  onChange={(e) => set("condicoes_cronicas", e.target.value)}
                  placeholder="Ex: hipertensão, diabetes…"
                />
              </Field>
              <Field label="Medicamentos em uso">
                <Textarea
                  rows={2}
                  value={form.medicamentos_uso}
                  onChange={(e) => set("medicamentos_uso", e.target.value)}
                  placeholder="Ex: Losartana 50mg 1x/dia"
                />
              </Field>
            </div>
          </section>

          {/* Contato emergência */}
          <section className="card-elevated p-6">
            <header className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg font-semibold">Contato de emergência</h3>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome">
                <Input
                  value={form.contato_emergencia_nome}
                  onChange={(e) => set("contato_emergencia_nome", e.target.value)}
                />
              </Field>
              <Field label="Telefone">
                <Input
                  value={form.contato_emergencia_telefone}
                  onChange={(e) => set("contato_emergencia_telefone", e.target.value)}
                />
              </Field>
            </div>
          </section>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="bg-gradient-primary hover:opacity-90">
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…</>
                : <><Save className="mr-2 h-4 w-4" /> Salvar alterações</>}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
