import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ShieldAlert } from "lucide-react";

const schema = z.object({
  senha: z.string().min(8, "Mínimo 8 caracteres"),
  confirmacao: z.string(),
}).refine((d) => d.senha === d.confirmacao, {
  message: "As senhas não conferem",
  path: ["confirmacao"],
});

export default function TrocarSenha() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<{ min_length: number; expiration_days: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate("/auth", { replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    supabase.from("password_policy").select("min_length,expiration_days").maybeSingle()
      .then(({ data }) => data && setPolicy(data as any));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      senha: fd.get("senha"),
      confirmacao: fd.get("confirmacao"),
    });
    if (!parsed.success) {
      toast({ title: "Verifique os dados", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.senha });
    if (error) {
      setSubmitting(false);
      toast({ title: "Não foi possível atualizar", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.rpc("password_mark_changed");
    setSubmitting(false);
    toast({ title: "Senha atualizada com sucesso" });
    navigate("/app", { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            <CardTitle>Defina uma nova senha</CardTitle>
          </div>
          <CardDescription>
            Sua senha expirou ou um administrador exigiu a troca.
            {policy && ` Mínimo ${policy.min_length} caracteres. Próxima expiração em ${policy.expiration_days} dias.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha">Nova senha</Label>
              <Input id="senha" name="senha" type="password" required minLength={policy?.min_length ?? 8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmacao">Confirme a senha</Label>
              <Input id="confirmacao" name="confirmacao" type="password" required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Salvando..." : "Atualizar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
