import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { validatePassword } from "@/lib/passwordValidation";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { cpfSchema, maskCpf } from "@/lib/validation/cpf";
import { ESPECIALIDADES } from "@/lib/medicoRegistro";

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  senha: z.string().min(1, "Informe a senha"),
});

const baseCadastro = {
  nome: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  senha: z.string().min(8, "Mínimo 8 caracteres").max(72),
  confirmarSenha: z.string(),
  telefone: z.string().trim().min(10, "Telefone inválido").max(20),
  cpf: cpfSchema(),
  sexo_biologico: z.enum(["feminino", "masculino", "nao_especificar"]).optional(),
  cep: z.string().trim().min(8, "CEP inválido").max(9),
};

const pacienteSchema = z.object({
  ...baseCadastro,
  role: z.literal("paciente"),
}).refine(d => d.senha === d.confirmarSenha, { message: "Senhas não conferem", path: ["confirmarSenha"] });

const medicoSchema = z.object({
  ...baseCadastro,
  role: z.literal("medico"),
  crm: z.string().trim().min(3, "CRM inválido").max(20),
  rqe: z.string().trim().max(20).optional().or(z.literal("")),
  especialidade: z.string().optional().or(z.literal("")),
}).refine(d => d.senha === d.confirmarSenha, { message: "Senhas não conferem", path: ["confirmarSenha"] });

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<"login" | "cadastro">(
    (params.get("modo") as "login" | "cadastro") ?? "login",
  );
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"paciente" | "medico">("paciente");
  const [signupPassword, setSignupPassword] = useState("");
  const [cpfValue, setCpfValue] = useState("");

  const redirectTo = params.get("redirect") || "/app";

  // já logado? manda pro destino padrão
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate(redirectTo, { replace: true });
    });
  }, [navigate, redirectTo]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: fd.get("email"),
      senha: fd.get("senha"),
    });
    if (!parsed.success) {
      toast({ title: "Verifique os dados", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);

    // Anti brute-force
    const { data: chk } = await supabase.rpc("login_attempt_check", {
      _email: parsed.data.email, _ip: null,
    });
    const chkRow: any = Array.isArray(chk) ? chk[0] : chk;
    if (chkRow?.blocked) {
      setLoading(false);
      const mins = Math.ceil((chkRow.retry_after_seconds ?? 0) / 60);
      toast({
        title: "Muitas tentativas",
        description: `Tente novamente em ${mins} min.`,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.senha,
    });
    await supabase.rpc("login_attempt_record", {
      _email: parsed.data.email,
      _success: !error,
      _ip: null,
      _user_agent: navigator.userAgent,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Não foi possível entrar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Bem-vindo!" });
    navigate(redirectTo);
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const raw: Record<string, unknown> = {
      nome: fd.get("nome"),
      email: fd.get("email"),
      senha: fd.get("senha"),
      confirmarSenha: fd.get("confirmarSenha"),
      telefone: fd.get("telefone"),
      cpf: cpfValue,
      sexo_biologico: (fd.get("sexo_biologico") as string) || undefined,
      cep: (fd.get("cep") as string)?.trim() || undefined,
      role,
    };

    if (role === "medico") {
      raw.crm = fd.get("crm");
      raw.rqe = (fd.get("rqe") as string)?.trim() || "";
      raw.especialidade = (fd.get("especialidade") as string) || "";
    }

    const schema = role === "medico" ? medicoSchema : pacienteSchema;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast({ title: "Verifique os dados", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }

    const validation = await validatePassword(parsed.data.senha);
    if (!validation.valid) {
      toast({
        title: "Senha não atende aos requisitos",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const metadata: Record<string, string> = {
      nome: parsed.data.nome,
      telefone: parsed.data.telefone,
      cpf: parsed.data.cpf,
      role: parsed.data.role,
    };
    if (parsed.data.sexo_biologico) metadata.sexo_biologico = parsed.data.sexo_biologico;
    if (parsed.data.cep) metadata.cep = parsed.data.cep;

    if (role === "medico") {
      const md = parsed.data as z.infer<typeof medicoSchema>;
      metadata.crm = md.crm;
      if (md.rqe) metadata.rqe = md.rqe;
      if (md.especialidade) metadata.especialidade = md.especialidade;
      metadata.crm_estado = "";
    }

    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.senha,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: metadata,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Não foi possível cadastrar", description: error.message, variant: "destructive" });
      return;
    }
    supabase.rpc("password_mark_changed").then(() => {}, () => {});
    toast({
      title: "Conta criada com sucesso!",
      description: role === "medico"
        ? "Agora envie seus documentos profissionais para análise."
        : "Você já pode acessar a plataforma.",
    });
    if (role === "medico") {
      navigate("/cadastro/medico");
    } else {
      navigate(redirectTo);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setLoading(false);
    if (result.error) {
      toast({ title: "Erro no Google", description: String(result.error), variant: "destructive" });
      return;
    }
    if (result.redirected) return;
    navigate(redirectTo);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background">
      {/* Painel esquerdo — banda Nova Saúde petrol */}
      <aside className="relative hidden overflow-hidden bg-gradient-deep text-deep-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-grid-soft opacity-40" aria-hidden />
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary-soft/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary/30 blur-3xl" aria-hidden />

        <div className="relative">
          <Logo variant="white" size="lg" />
        </div>
        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            Nova Saúde
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight">
            Saúde a distância,<br/>
            <span className="text-primary-soft">cuidado próximo.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/80">
            Acesse sua conta para agendar consultas, falar com médicos verificados e cuidar de quem você ama — em poucos cliques.
          </p>
        </div>
        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} Nova Saúde
        </p>
      </aside>

      {/* Painel direito — formulário */}
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <Logo size="lg" />
          </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "cadastro")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="cadastro">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6 space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="cadastro" className="mt-6 space-y-4">
              <form onSubmit={handleSignup} className="space-y-4">
                {/* Role selector */}
                <div className="space-y-2">
                  <Label>Eu sou</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as "paciente" | "medico")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paciente">Paciente</SelectItem>
                      <SelectItem value="medico">Médico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Campos obrigatórios comuns */}
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo <span className="text-destructive">*</span></Label>
                  <Input id="nome" name="nome" required maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-s">E-mail <span className="text-destructive">*</span></Label>
                  <Input id="email-s" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha-s">Senha <span className="text-destructive">*</span></Label>
                  <Input
                    id="senha-s" name="senha" type="password" autoComplete="new-password" minLength={8} required
                    value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)}
                  />
                  <PasswordStrengthIndicator password={signupPassword} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmar-senha">Confirmar senha <span className="text-destructive">*</span></Label>
                  <Input id="confirmar-senha" name="confirmarSenha" type="password" autoComplete="new-password" minLength={8} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone <span className="text-destructive">*</span></Label>
                  <Input id="telefone" name="telefone" type="tel" maxLength={20} required placeholder="(11) 90000-0000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF <span className="text-destructive">*</span></Label>
                  <Input
                    id="cpf" name="cpf" inputMode="numeric" maxLength={14} required
                    value={cpfValue} onChange={(e) => setCpfValue(maskCpf(e.target.value))}
                    placeholder="000.000.000-00"
                  />
                </div>

                {/* CEP — obrigatório para ambos */}
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP <span className="text-destructive">*</span></Label>
                  <Input id="cep" name="cep" required maxLength={9} placeholder="00000-000" />
                </div>

                {/* Campos obrigatórios exclusivos médico */}
                {role === "medico" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="crm">CRM <span className="text-destructive">*</span></Label>
                      <Input id="crm" name="crm" required maxLength={20} placeholder="123456" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rqe">RQE</Label>
                      <Input id="rqe" name="rqe" maxLength={20} placeholder="Registro de qualificação (opcional)" />
                    </div>
                    <div className="space-y-2">
                      <Label>Especialidade inicial</Label>
                      <Select name="especialidade">
                        <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                        <SelectContent>
                          {ESPECIALIDADES.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Campos opcionais */}
                <div className="border-t border-border pt-4 mt-2">
                  <p className="text-xs text-muted-foreground mb-3">Opcional</p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Sexo biológico</Label>
                      <Select name="sexo_biologico">
                        <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="feminino">Feminino</SelectItem>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="nao_especificar">Prefiro não especificar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .55 4.1 1.6l3-3C17.2 1.7 14.7 0 12 0 7.3 0 3.3 2.7 1.3 6.6l3.5 2.7C5.7 6.7 8.6 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.5h6.5c-.3 1.5-1.2 2.7-2.5 3.6l3.8 3c2.2-2.1 3.7-5.2 3.7-8.8z"/><path fill="#FBBC05" d="M4.8 14.4l-3.5 2.7C3.3 21.3 7.3 24 12 24c2.7 0 5.2-.9 6.9-2.4l-3.8-3c-1 .7-2.4 1.1-3.1 1.1-3.4 0-6.3-1.7-7.2-5.3z"/><path fill="#34A853" d="M12 24c2.7 0 5.2-.9 6.9-2.4l-3.8-3c-1 .7-2.4 1.1-3.1 1.1-3.4 0-6.3-1.7-7.2-5.3l-3.5 2.7C3.3 21.3 7.3 24 12 24z"/></svg>
            Continuar com Google
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao continuar, você aceita nossos termos de uso e política de privacidade.
        </p>
        </div>
      </div>
    </div>
  );
}
