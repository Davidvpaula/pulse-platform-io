import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, Send } from "lucide-react";

type LogRow = {
  id: string;
  to_number: string;
  message: string;
  http_status: number | null;
  wa_message_id: string | null;
  meta_request_id: string | null;
  error_code: number | null;
  error_message: string | null;
  created_at: string;
};

const DEFAULT_MSG = "Teste real da API WhatsApp Cloud - Lasmar";

export default function AdminWhatsappCloudTest() {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState(DEFAULT_MSG);
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  async function loadLogs() {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_cloud_test_log" as any)
        .select("id,to_number,message,http_status,wa_message_id,meta_request_id,error_code,error_message,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setLogs((data ?? []) as unknown as LogRow[]);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao carregar logs");
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  async function enviar() {
    const cleanTo = to.replace(/\D/g, "");
    if (cleanTo.length < 10 || cleanTo.length > 15) {
      toast.error("Número inválido (use E.164 sem '+', ex.: 5531999999999)");
      return;
    }
    if (!message.trim()) {
      toast.error("Mensagem obrigatória");
      return;
    }
    setBusy(true);
    setResponse(null);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-cloud-test", {
        body: { to: cleanTo, message: message.trim() },
      });
      if (error) throw error;
      setResponse(data);
      if (data?.ok) {
        toast.success(`Enviado — wa_message_id: ${data.wa_message_id ?? "(sem id)"}`);
      } else {
        toast.error(`Falha Meta — ${data?.error_message ?? data?.http_status ?? "erro"}`);
      }
      await loadLogs();
    } catch (e: any) {
      toast.error(e.message ?? "Falha no envio");
      setResponse({ error: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Cloud — Teste real (isolado)"
        description="Envio direto à Cloud API da Meta usando v21.0. Não toca em sandbox, produção, webhook ou Inbox."
      />

      <Alert variant="default" className="border-warning bg-warning/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Ambiente de teste</AlertTitle>
        <AlertDescription>
          Use apenas o número secundário de testes da Fase 9. Esta tela não altera o modo
          atual da plataforma e não cria conversas no Inbox.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Enviar mensagem de teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="to">Número destino (E.164 sem "+")</Label>
              <Input
                id="to"
                placeholder="5531999999999"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="msg">Mensagem</Label>
              <Textarea
                id="msg"
                rows={3}
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={busy}
              />
            </div>
            <Button onClick={enviar} disabled={busy}>
              <Send className="h-4 w-4 mr-1.5" />
              {busy ? "Enviando..." : "Enviar teste real"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resposta da Meta</CardTitle>
          </CardHeader>
          <CardContent>
            {response ? (
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-96 whitespace-pre-wrap break-all">
                {JSON.stringify(response, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum envio ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">Últimos 20 envios</CardTitle>
          <Button size="sm" variant="outline" onClick={loadLogs} disabled={loadingLogs}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loadingLogs ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum log ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3">Quando</th>
                    <th className="py-2 pr-3">Para</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">wa_message_id</th>
                    <th className="py-2 pr-3">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2 pr-3">{l.to_number}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={l.http_status === 200 ? "default" : "destructive"}>
                          {l.http_status ?? "—"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 font-mono text-[10px] break-all">
                        {l.wa_message_id ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-destructive">
                        {l.error_code ? `[${l.error_code}] ${l.error_message ?? ""}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
