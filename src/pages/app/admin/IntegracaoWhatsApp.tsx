import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, RefreshCw, Webhook, Phone, Settings2 } from "lucide-react";
import { toast } from "sonner";

type Instance = {
  id: string;
  nome: string;
  tipo: "comercial" | "operacional" | "suporte";
  numero: string | null;
  phone_number_id: string | null;
  business_account_id: string | null;
  status: "conectado" | "desconectado" | "pendente" | "erro";
  webhook_status: string | null;
  ultima_sincronizacao: string | null;
  ativo: boolean;
};

const STATUS_VARIANT: Record<Instance["status"], "default" | "secondary" | "destructive" | "outline"> = {
  conectado: "default",
  desconectado: "secondary",
  pendente: "outline",
  erro: "destructive",
};

export default function IntegracaoWhatsApp() {
  const [items, setItems] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Instance>>({ tipo: "comercial", status: "pendente" });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar caixas");
    setItems((data || []) as Instance[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function salvar() {
    if (!form.nome) { toast.error("Informe um nome"); return; }
    const { error } = await supabase.from("whatsapp_instances").insert({
      nome: form.nome,
      tipo: form.tipo || "comercial",
      numero: form.numero,
      phone_number_id: form.phone_number_id,
      business_account_id: form.business_account_id,
      status: "pendente",
      webhook_status: "aguardando configuração",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Caixa adicionada");
    setOpen(false);
    setForm({ tipo: "comercial", status: "pendente" });
    load();
  }

  async function testar(id: string) {
    toast.info("Teste de conexão simulado — ativação real virá quando configurarmos as credenciais Meta.");
    await supabase.from("whatsapp_instances").update({
      ultima_sincronizacao: new Date().toISOString(),
    }).eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Business API"
        description="Caixas conectadas via Meta Cloud API. Configuração final acontece quando ativarmos a integração com a Meta."
      />

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Conectar nova caixa</Button>
          </SheetTrigger>
          <SheetContent className="w-[480px] sm:max-w-[480px]">
            <SheetHeader><SheetTitle>Nova caixa WhatsApp</SheetTitle></SheetHeader>
            <div className="mt-6 space-y-4">
              <div>
                <Label>Nome interno *</Label>
                <Input value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Comercial Lasmar" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v: any) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="suporte">Suporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Número WhatsApp</Label>
                <Input value={form.numero || ""} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="+55 11 90000-0000" />
              </div>
              <div>
                <Label>phone_number_id (Meta)</Label>
                <Input value={form.phone_number_id || ""} onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })} placeholder="Será preenchido na ativação Meta" />
              </div>
              <div>
                <Label>business_account_id (Meta)</Label>
                <Input value={form.business_account_id || ""} onChange={(e) => setForm({ ...form, business_account_id: e.target.value })} placeholder="WABA ID" />
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Tokens da Meta nunca ficam no frontend. Eles serão armazenados como secrets do backend quando ativarmos a integração.
              </p>
              <Button className="w-full" onClick={salvar}>Salvar caixa</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Caixas configuradas</CardDescription><CardTitle className="text-3xl">{items.length}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Conectadas</CardDescription><CardTitle className="text-3xl text-emerald-600">{items.filter(i => i.status === "conectado").length}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Pendentes / erro</CardDescription><CardTitle className="text-3xl text-amber-600">{items.filter(i => i.status !== "conectado").length}</CardTitle></CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Phone className="h-4 w-4" /> Caixas conectadas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Webhook</TableHead>
                <TableHead>Última sincronização</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">Nenhuma caixa conectada ainda.</TableCell></TableRow>
              )}
              {items.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell><Badge variant="outline">{i.tipo}</Badge></TableCell>
                  <TableCell className="text-sm">{i.numero || "—"}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[i.status]}>{i.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground"><Webhook className="inline h-3 w-3 mr-1" />{i.webhook_status || "—"}</TableCell>
                  <TableCell className="text-xs">{i.ultima_sincronizacao ? new Date(i.ultima_sincronizacao).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => testar(i.id)}>
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status da integração com a Meta</CardTitle>
          <CardDescription>Estrutura técnica preparada · pendente apenas das credenciais oficiais da Meta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>✅ Tabelas e RLS de conversations / messages criadas</p>
          <p>✅ Edge functions planejadas: <code className="text-foreground">whatsapp-webhook</code>, <code className="text-foreground">whatsapp-send</code></p>
          <p>✅ Realtime ativo no Inbox (conversations + messages)</p>
          <p>⏳ Aguardando: token permanente do Sistema, App ID, App Secret, verify token do webhook</p>
        </CardContent>
      </Card>
    </div>
  );
}
