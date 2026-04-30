import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, ShieldCheck } from "lucide-react";

type Policy = {
  id: number;
  expiration_days: number;
  min_length: number;
  hibp_enabled: boolean;
  require_complexity: boolean;
};

type Attempt = {
  id: number;
  email_norm: string;
  ip_address: string | null;
  success: boolean;
  attempted_at: string;
  user_agent: string | null;
};

export default function AdminSeguranca() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from("password_policy").select("*").eq("id", 1).maybeSingle(),
      supabase.from("login_attempts").select("*").order("attempted_at", { ascending: false }).limit(50),
    ]);
    if (p) setPolicy(p as any);
    setAttempts((a ?? []) as any);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!policy) return;
    setSaving(true);
    const { error } = await supabase
      .from("password_policy")
      .update({
        expiration_days: policy.expiration_days,
        min_length: policy.min_length,
        hibp_enabled: policy.hibp_enabled,
        require_complexity: policy.require_complexity,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Política atualizada" });
  }

  if (loading || !policy) {
    return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Segurança</h1>
          <p className="text-muted-foreground">Política de senhas e proteção contra ataques.</p>
        </div>
      </div>

      <Tabs defaultValue="senha">
        <TabsList>
          <TabsTrigger value="senha">Política de senha</TabsTrigger>
          <TabsTrigger value="tentativas">Tentativas de login</TabsTrigger>
        </TabsList>

        <TabsContent value="senha" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regras globais</CardTitle>
              <CardDescription>Aplicadas a todos os usuários.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="exp">Expiração (dias)</Label>
                  <Input
                    id="exp" type="number" min={0} max={365}
                    value={policy.expiration_days}
                    onChange={(e) => setPolicy({ ...policy, expiration_days: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">0 = nunca expira. Padrão: 90.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min">Tamanho mínimo</Label>
                  <Input
                    id="min" type="number" min={6} max={64}
                    value={policy.min_length}
                    onChange={(e) => setPolicy({ ...policy, min_length: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label className="text-base">Bloquear senhas vazadas (HIBP)</Label>
                  <p className="text-sm text-muted-foreground">Verifica contra a base Have I Been Pwned.</p>
                </div>
                <Switch
                  checked={policy.hibp_enabled}
                  onCheckedChange={(v) => setPolicy({ ...policy, hibp_enabled: v })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label className="text-base">Exigir complexidade</Label>
                  <p className="text-sm text-muted-foreground">Maiúscula, número e símbolo.</p>
                </div>
                <Switch
                  checked={policy.require_complexity}
                  onCheckedChange={(v) => setPolicy({ ...policy, require_complexity: v })}
                />
              </div>

              <Button onClick={save} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvando..." : "Salvar política"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Como funciona</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>• Após {policy.expiration_days} dias o usuário será redirecionado para definir nova senha.</p>
              <p>• HIBP: senhas conhecidas em vazamentos públicos são rejeitadas no cadastro/troca.</p>
              <p>• Bloqueio: 5 tentativas falhas em 15 min bloqueiam novas tentativas para o mesmo e-mail.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tentativas">
          <Card>
            <CardHeader>
              <CardTitle>Últimas tentativas (50)</CardTitle>
              <CardDescription>Inclui sucessos e falhas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sem registros</TableCell></TableRow>
                    ) : attempts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs">{new Date(a.attempted_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-sm">{a.email_norm}</TableCell>
                        <TableCell className="font-mono text-xs">{a.ip_address ?? "—"}</TableCell>
                        <TableCell>
                          {a.success ? <Badge>Sucesso</Badge> : <Badge variant="destructive">Falha</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
