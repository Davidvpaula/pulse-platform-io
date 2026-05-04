import { useEffect, useState } from "react";
import { User, Save, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { toast } from "sonner";
import ContaSeguranca from "@/components/shared/ContaSeguranca";
import MeusAceites from "@/components/shared/MeusAceites";

interface Props {
  titulo?: string;
  descricao?: string;
}

/**
 * Perfil genérico reutilizável por Admin, Secretaria e Colaborador.
 * Lê/grava na tabela `profiles` + seção de Conta/Senha + Termos.
 */
export default function PerfilGenerico({
  titulo = "Meu perfil",
  descricao = "Gerencie seus dados de acesso e preferências.",
}: Props) {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("nome, telefone, email")
        .eq("id", session.user.id)
        .maybeSingle();
      setNome(data?.nome ?? "");
      setTelefone(data?.telefone ?? "");
      setEmail(data?.email ?? session.user.email ?? "");
      setLoading(false);
    })();
  }, [session]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!nome.trim()) { toast.error("Nome é obrigatório."); return; }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome: nome.trim(), telefone: telefone.trim() || null })
      .eq("id", session.user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Perfil atualizado com sucesso.");
  };

  if (!session) {
    return (
      <div className="space-y-6">
        <PageHeader title={titulo} description="Faça login para acessar seu perfil." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={titulo} description={descricao} />

      {loading ? (
        <div className="card-elevated flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <Tabs defaultValue="dados" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="conta">Conta & senha</TabsTrigger>
            <TabsTrigger value="termos">Termos</TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <form onSubmit={salvar} className="card-elevated space-y-5 p-6 max-w-2xl">
              <header className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg font-semibold">Seus dados</h3>
              </header>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome *</Label>
                  <Input required value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">E-mail (somente leitura)</Label>
                  <Input value={email} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Telefone</Label>
                  <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-0000" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="bg-gradient-primary hover:opacity-90">
                  {saving
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…</>
                    : <><Save className="mr-2 h-4 w-4" /> Salvar alterações</>}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="conta" className="space-y-6">
            <ContaSeguranca emailAtual={email} onEmailChange={setEmail} />
          </TabsContent>

          <TabsContent value="termos">
            <MeusAceites />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
