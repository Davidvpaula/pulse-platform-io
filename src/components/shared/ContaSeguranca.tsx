import { useEffect, useState } from "react";
import { Mail, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validatePassword } from "@/lib/passwordValidation";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

interface Props {
  emailAtual: string;
  onEmailChange?: (v: string) => void;
}

export default function ContaSeguranca({ emailAtual, onEmailChange }: Props) {
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
    onEmailChange?.(novoEmail);
  };

  const trocarSenha = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (novaSenha.length < 8) { toast.error("Nova senha precisa de no mínimo 8 caracteres."); return; }
    if (novaSenha !== confSenha) { toast.error("Confirmação de senha não confere."); return; }
    setTrocandoSenha(true);
    const validation = await validatePassword(novaSenha);
    if (!validation.valid) {
      setTrocandoSenha(false);
      toast.error("Senha: " + validation.errors.join(", "));
      return;
    }
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
            <PasswordStrengthIndicator password={novaSenha} />
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
