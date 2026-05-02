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
import { Loader2, Save, ShieldCheck, Search, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [filtroResultado, setFiltroResultado] = useState<string>("todos");
  const [filtroBusca, setFiltroBusca] = useState("");
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
              <CardTitle>Status de enforcement</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={policy.require_complexity ? "default" : "outline"}>
                  {policy.require_complexity ? "✓ Ativo" : "Inativo"}
                </Badge>
                <span className="text-muted-foreground">Complexidade (maiúscula, número, símbolo) — validada no cadastro e troca de senha</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={policy.hibp_enabled ? "default" : "outline"}>
                  {policy.hibp_enabled ? "✓ Ativo" : "Inativo"}
                </Badge>
                <span className="text-muted-foreground">HIBP — senhas vazadas rejeitadas pelo backend de autenticação</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={policy.expiration_days > 0 ? "default" : "outline"}>
                  {policy.expiration_days > 0 ? `✓ ${policy.expiration_days} dias` : "Desligado"}
                </Badge>
                <span className="text-muted-foreground">Expiração — redireciona para troca de senha após o período</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">✓ Ativo</Badge>
                <span className="text-muted-foreground">Rate limiting — 5 tentativas falhas em 15 min bloqueiam login</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tentativas" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email..."
                value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Select value={filtroResultado} onValueChange={setFiltroResultado}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sucesso">Sucesso</SelectItem>
                <SelectItem value="falha">Falha</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Tentativas de login</CardTitle>
              <CardDescription>Últimas 50 tentativas. Use os filtros para investigar.</CardDescription>
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
                    {(() => {
                      let list = attempts;
                      if (filtroResultado === "sucesso") list = list.filter(a => a.success);
                      if (filtroResultado === "falha") list = list.filter(a => !a.success);
                      if (filtroBusca) {
                        const b = filtroBusca.toLowerCase();
                        list = list.filter(a => a.email_norm.toLowerCase().includes(b));
                      }
                      if (list.length === 0) {
                        return <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sem registros</TableCell></TableRow>;
                      }
                      return list.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs">{new Date(a.attempted_at).toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-sm">{a.email_norm}</TableCell>
                          <TableCell className="font-mono text-xs">{a.ip_address ?? "—"}</TableCell>
                          <TableCell>
                            {a.success ? <Badge>Sucesso</Badge> : <Badge variant="destructive">Falha</Badge>}
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
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
