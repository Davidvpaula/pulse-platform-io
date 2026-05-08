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

      <TestePanel />

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

function TestePanel() {
  const [numero, setNumero] = useState("5511985045280");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  async function disparar() {
    setEnviando(true);
    setResultado(null);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-test-send", {
        body: { to: numero.replace(/\D/g, "") },
      });
      if (error) {
        setResultado({ ok: false, erro: error.message, contexto: (error as any).context ?? null });
        toast.error("Falha no envio: " + error.message);
      } else {
        setResultado(data);
        if (data?.ok) toast.success("Mensagem enviada — wa_message_id: " + data.wa_message_id);
        else toast.error("Meta retornou erro — veja detalhes abaixo");
      }
    } catch (e: any) {
      setResultado({ ok: false, erro: e.message });
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="border-amber-500/40">
      <CardHeader>
        <CardTitle className="text-base">🧪 Teste sandbox — envio mecânico hello_world</CardTitle>
        <CardDescription>
          Dispara template <code>hello_world</code> via Meta Cloud API v25.0 usando os secrets
          {" "}<code>META_WHATSAPP_TOKEN</code> + <code>META_PHONE_NUMBER_ID</code>. O número precisa estar autorizado no painel sandbox da Meta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="5511999999999 (DDI+DDD+número, sem +)"
          />
          <Button onClick={disparar} disabled={enviando || !numero}>
            {enviando ? "Enviando…" : "Disparar teste"}
          </Button>
        </div>
        {resultado && <ResumoMeta resultado={resultado} />}
        {resultado && (
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(resultado, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

function ResumoMeta({ resultado }: { resultado: any }) {
  if (resultado?.ok && resultado?.wa_message_id) {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm space-y-1">
        <div className="font-medium text-emerald-700 dark:text-emerald-400">✅ Mensagem aceita pela Meta</div>
        <div><strong>wa_message_id:</strong> <code className="text-xs">{resultado.wa_message_id}</code></div>
        <div><strong>meta_request_id:</strong> <code className="text-xs">{resultado.meta_request_id ?? "—"}</code></div>
        <div><strong>HTTP:</strong> {resultado.http_status}</div>
      </div>
    );
  }
  const code = resultado?.error_code;
  const dicas: Record<number, string> = {
    131030: "Número não está na lista de destinatários autorizados do sandbox Meta.",
    190: "Token expirado — gere um novo no painel Meta e atualize o secret META_WHATSAPP_TOKEN.",
    100: "Parâmetro inválido — confira phone_number_id ou payload.",
    132000: "Template hello_world não está aprovado nesse WABA.",
    133010: "Número de origem não registrado para envio.",
  };
  const dica = code && dicas[code];
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm space-y-1">
      <div className="font-medium text-destructive">❌ Falha no envio</div>
      {resultado?.http_status && <div><strong>HTTP:</strong> {resultado.http_status}</div>}
      {code != null && <div><strong>error_code:</strong> {code}{resultado.error_subcode ? ` / ${resultado.error_subcode}` : ""} ({resultado.error_type ?? "—"})</div>}
      {resultado?.error_message && <div><strong>mensagem:</strong> {resultado.error_message}</div>}
      {resultado?.fbtrace_id && <div><strong>fbtrace_id:</strong> <code className="text-xs">{resultado.fbtrace_id}</code></div>}
      {resultado?.erro && !code && <div><strong>erro:</strong> {resultado.erro}</div>}
      {dica && <div className="mt-2 text-xs text-muted-foreground">💡 {dica}</div>}
    </div>
  );
}
