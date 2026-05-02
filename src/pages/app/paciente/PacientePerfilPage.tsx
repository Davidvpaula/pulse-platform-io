import { useEffect, useState } from "react";
import { z } from "zod";
import {
  User, Save, Loader2, Database as DbIcon, ShieldCheck, Heart,
  MapPin, KeyRound, Mail, FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import MeusAceites from "@/components/shared/MeusAceites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSession } from "@/lib/session";
import {
  getPacienteAtual, updatePacientePerfil, updateProfileBasico,
} from "@/lib/clinico";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const onlyDigits = (v: string) => v.replace(/\D/g, "");

const perfilSchema = z.object({
  nome_completo: z.string().trim().min(3, "Nome completo deve ter ao menos 3 caracteres").max(120, "Nome muito longo"),
  cpf: z.string().trim().refine(
    (v) => v === "" || onlyDigits(v).length === 11,
    "CPF deve ter 11 dígitos",
  ),
  telefone: z.string().trim().refine(
    (v) => v === "" || onlyDigits(v).length >= 10,
    "Telefone inválido (mín. 10 dígitos)",
  ),
  data_nascimento: z.string().refine(
    (v) => v === "" || (!isNaN(Date.parse(v)) && new Date(v) <= new Date()),
    "Data de nascimento inválida",
  ),
  cep: z.string().trim().refine(
    (v) => v === "" || onlyDigits(v).length === 8,
    "CEP deve ter 8 dígitos",
  ),
  uf: z.string().refine((v) => v === "" || /^[A-Z]{2}$/.test(v), "UF inválida"),
  contato_emergencia_telefone: z.string().trim().refine(
    (v) => v === "" || onlyDigits(v).length >= 10,
    "Telefone de emergência inválido",
  ),
  logradouro: z.string().max(200).optional(),
  numero: z.string().max(20).optional(),
  complemento: z.string().max(120).optional(),
  bairro: z.string().max(120).optional(),
  cidade: z.string().max(120).optional(),
  alergias: z.string().max(1000).optional(),
  condicoes_cronicas: z.string().max(1000).optional(),
  medicamentos_uso: z.string().max(1000).optional(),
  contato_emergencia_nome: z.string().max(120).optional(),
});

type Sexo = "masculino" | "feminino" | "intersexo" | "nao_informado";

type FormState = {
  nome_completo: string;
  cpf: string;
  telefone: string;
  data_nascimento: string;
  sexo: Sexo;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  alergias: string;
  condicoes_cronicas: string;
  medicamentos_uso: string;
  contato_emergencia_nome: string;
  contato_emergencia_telefone: string;
};

const empty: FormState = {
  nome_completo: "", cpf: "", telefone: "", data_nascimento: "",
  sexo: "nao_informado", cep: "",
  logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  alergias: "", condicoes_cronicas: "",
  medicamentos_uso: "", contato_emergencia_nome: "", contato_emergencia_telefone: "",
};

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

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
      const p: any = paciente ?? {};
      setForm({
        nome_completo: p.nome_completo ?? prof?.nome ?? "",
        cpf: p.cpf ?? "",
        telefone: p.telefone ?? prof?.telefone ?? "",
        data_nascimento: p.data_nascimento ?? "",
        sexo: (p.sexo as Sexo) ?? "nao_informado",
        cep: p.cep ?? "",
        logradouro: p.logradouro ?? "",
        numero: p.numero ?? "",
        complemento: p.complemento ?? "",
        bairro: p.bairro ?? "",
        cidade: p.cidade ?? "",
        uf: p.uf ?? "",
        alergias: p.alergias ?? "",
        condicoes_cronicas: p.condicoes_cronicas ?? "",
        medicamentos_uso: p.medicamentos_uso ?? "",
        contato_emergencia_nome: p.contato_emergencia_nome ?? "",
        contato_emergencia_telefone: p.contato_emergencia_telefone ?? "",
      });
      setLoading(false);
    })();
  }, [session]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Auto-preenche endereço por CEP (ViaCEP)
  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) { toast.error("Informe um CEP de 8 dígitos."); return; }
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (j.erro) { toast.error("CEP não encontrado."); return; }
      setForm((f) => ({
        ...f,
        logradouro: j.logradouro || f.logradouro,
        bairro: j.bairro || f.bairro,
        cidade: j.localidade || f.cidade,
        uf: j.uf || f.uf,
      }));
      toast.success("Endereço preenchido pelo CEP.");
    } catch {
      toast.error("Não foi possível consultar o CEP.");
    }
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) { toast.error("Faça login para salvar seu perfil."); return; }
    const parsed = perfilSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
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
      logradouro: form.logradouro || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      uf: form.uf || null,
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
        description="Mantenha seus dados atualizados — eles são usados nos agendamentos, prescrições e comunicação."
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
        <Tabs defaultValue="dados" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="endereco">Endereço</TabsTrigger>
            <TabsTrigger value="saude">Saúde</TabsTrigger>
            <TabsTrigger value="conta">Conta & senha</TabsTrigger>
            <TabsTrigger value="termos">Termos</TabsTrigger>
          </TabsList>

          <form onSubmit={salvar} className="space-y-6">
            <TabsContent value="dados" className="space-y-6">
              {/* Identificação */}
              <section className="card-elevated p-6">
                <header className="mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-lg font-semibold">Identificação</h3>
                </header>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome completo *">
                    <Input required value={form.nome_completo}
                      onChange={(e) => set("nome_completo", e.target.value)}
                      placeholder="Seu nome completo" />
                  </Field>
                  <Field label="E-mail (somente leitura)">
                    <Input value={email} disabled />
                  </Field>
                  <Field label="CPF">
                    <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)}
                      placeholder="000.000.000-00" inputMode="numeric" />
                  </Field>
                  <Field label="Telefone">
                    <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)}
                      placeholder="(11) 99999-0000" />
                  </Field>
                  <Field label="Data de nascimento">
                    <Input type="date" value={form.data_nascimento}
                      onChange={(e) => set("data_nascimento", e.target.value)} />
                  </Field>
                  <Field label="Sexo biológico">
                    <Select value={form.sexo} onValueChange={(v) => set("sexo", v as Sexo)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="intersexo">Intersexo</SelectItem>
                        <SelectItem value="nao_informado">Não informado</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Input value={form.contato_emergencia_nome}
                      onChange={(e) => set("contato_emergencia_nome", e.target.value)} />
                  </Field>
                  <Field label="Telefone">
                    <Input value={form.contato_emergencia_telefone}
                      onChange={(e) => set("contato_emergencia_telefone", e.target.value)} />
                  </Field>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="endereco" className="space-y-6">
              <section className="card-elevated p-6">
                <header className="mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-lg font-semibold">Endereço</h3>
                </header>
                <div className="grid gap-4 md:grid-cols-6">
                  <div className="md:col-span-2">
                    <Field label="CEP">
                      <div className="flex gap-2">
                        <Input value={form.cep} onChange={(e) => set("cep", e.target.value)}
                          placeholder="00000-000" inputMode="numeric" />
                        <Button type="button" variant="outline" onClick={buscarCep}>Buscar</Button>
                      </div>
                    </Field>
                  </div>
                  <div className="md:col-span-4">
                    <Field label="Logradouro"><Input value={form.logradouro}
                      onChange={(e) => set("logradouro", e.target.value)} /></Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Número"><Input value={form.numero}
                      onChange={(e) => set("numero", e.target.value)} /></Field>
                  </div>
                  <div className="md:col-span-4">
                    <Field label="Complemento"><Input value={form.complemento}
                      onChange={(e) => set("complemento", e.target.value)} /></Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Bairro"><Input value={form.bairro}
                      onChange={(e) => set("bairro", e.target.value)} /></Field>
                  </div>
                  <div className="md:col-span-3">
                    <Field label="Cidade"><Input value={form.cidade}
                      onChange={(e) => set("cidade", e.target.value)} /></Field>
                  </div>
                  <div className="md:col-span-1">
                    <Field label="UF">
                      <Select value={form.uf} onValueChange={(v) => set("uf", v)}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="saude" className="space-y-6">
              <section className="card-elevated p-6">
                <header className="mb-4 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-lg font-semibold">Informações de saúde</h3>
                </header>
                <div className="grid gap-4">
                  <Field label="Alergias">
                    <Textarea rows={2} value={form.alergias}
                      onChange={(e) => set("alergias", e.target.value)}
                      placeholder="Ex: penicilina, dipirona…" />
                  </Field>
                  <Field label="Condições crônicas">
                    <Textarea rows={2} value={form.condicoes_cronicas}
                      onChange={(e) => set("condicoes_cronicas", e.target.value)}
                      placeholder="Ex: hipertensão, diabetes…" />
                  </Field>
                  <Field label="Medicamentos em uso">
                    <Textarea rows={2} value={form.medicamentos_uso}
                      onChange={(e) => set("medicamentos_uso", e.target.value)}
                      placeholder="Ex: Losartana 50mg 1x/dia" />
                  </Field>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Quer anexar exames, laudos ou cartão do plano?</span>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/app/paciente/documentos">Ir para Documentos</Link>
                  </Button>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="conta" className="space-y-6">
              <ContaSeguranca emailAtual={email} onEmailChange={setEmail} />
            </TabsContent>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="bg-gradient-primary hover:opacity-90">
                {saving
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…</>
                  : <><Save className="mr-2 h-4 w-4" /> Salvar alterações</>}
              </Button>
            </div>
          </form>
        </Tabs>
      )}
    </div>
  );
}

function ContaSeguranca({ emailAtual, onEmailChange }: { emailAtual: string; onEmailChange: (v: string) => void }) {
  const [novoEmail, setNovoEmail] = useState(emailAtual);
  const [trocandoEmail, setTrocandoEmail] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confSenha, setConfSenha] = useState("");
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  useEffect(() => { setNovoEmail(emailAtual); }, [emailAtual]);

  const trocarEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!novoEmail || novoEmail === emailAtual) { toast.error("Informe um novo e-mail."); return; }
    setTrocandoEmail(true);
    const { error } = await supabase.auth.updateUser({ email: novoEmail });
    setTrocandoEmail(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Confirme o novo e-mail no link enviado para a caixa atual e nova.");
    onEmailChange(novoEmail);
  };

  const trocarSenha = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (novaSenha.length < 8) { toast.error("Nova senha precisa de no mínimo 8 caracteres."); return; }
    if (novaSenha !== confSenha) { toast.error("Confirmação de senha não confere."); return; }
    setTrocandoSenha(true);
    // Re-autentica para validar a senha atual
    const reauth = await supabase.auth.signInWithPassword({ email: emailAtual, password: senhaAtual });
    if (reauth.error) {
      setTrocandoSenha(false);
      toast.error("Senha atual incorreta.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setTrocandoSenha(false);
    if (error) { toast.error(error.message); return; }
    setSenhaAtual(""); setNovaSenha(""); setConfSenha("");
    toast.success("Senha atualizada com sucesso.");
  };

  return (
    <>
      <section className="card-elevated p-6">
        <header className="mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">E-mail de acesso</h3>
        </header>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Novo e-mail">
            <Input type="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} />
          </Field>
          <Button type="button" variant="outline" onClick={trocarEmail} disabled={trocandoEmail}>
            {trocandoEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar e-mail"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Você receberá um link de confirmação no e-mail atual e no novo. A troca só é efetivada após confirmar.
        </p>
      </section>

      <section className="card-elevated p-6">
        <header className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Trocar senha</h3>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Senha atual">
            <Input type="password" autoComplete="current-password"
              value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
          </Field>
          <Field label="Nova senha">
            <Input type="password" autoComplete="new-password" minLength={8}
              value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
          </Field>
          <Field label="Confirmar nova senha">
            <Input type="password" autoComplete="new-password" minLength={8}
              value={confSenha} onChange={(e) => setConfSenha(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="outline" onClick={trocarSenha} disabled={trocandoSenha}>
            {trocandoSenha ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar senha"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Mínimo de 8 caracteres. Use uma senha exclusiva.</p>
      </section>
    </>
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
