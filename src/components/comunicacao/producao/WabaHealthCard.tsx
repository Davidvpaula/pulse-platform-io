import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Health = {
  id: string;
  status: string;
  display_phone_number: string | null;
  quality_rating: string | null;
  error_message: string | null;
  last_check_at: string;
};

const STATUS_LABEL: Record<string, { label: string; cls: string; Icon: any }> = {
  ok: { label: "Saudável", cls: "bg-emerald-600 text-white", Icon: CheckCircle2 },
  error: { label: "Erro", cls: "bg-destructive text-destructive-foreground", Icon: AlertCircle },
  pending_credentials: { label: "Aguardando credenciais", cls: "bg-muted text-muted-foreground", Icon: Clock },
  unknown: { label: "Desconhecido", cls: "bg-muted text-muted-foreground", Icon: Activity },
};

export function WabaHealthCard() {
  const [last, setLast] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("meta_waba_health")
      .select("id,status,display_phone_number,quality_rating,error_message,last_check_at")
      .order("last_check_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setLast(data as Health);
  }

  async function ping() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-health-check", { body: {} });
      if (error) throw error;
      toast.success(`Health: ${data?.status ?? "—"}`);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Falha no health-check");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const meta = STATUS_LABEL[last?.status ?? "unknown"] ?? STATUS_LABEL.unknown;
  const Icon = meta.Icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">Saúde Meta WhatsApp</CardTitle>
        <Button size="sm" variant="outline" onClick={ping} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Verificar agora
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <Badge className={meta.cls}>{meta.label}</Badge>
          {last?.quality_rating && (
            <Badge variant="outline">Qualidade: {last.quality_rating}</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          {last?.display_phone_number && <div>Número: {last.display_phone_number}</div>}
          {last?.error_message && (
            <div className="text-destructive">{last.error_message}</div>
          )}
          {last?.last_check_at && (
            <div>
              Última verificação:{" "}
              {formatDistanceToNow(new Date(last.last_check_at), { addSuffix: true, locale: ptBR })}
            </div>
          )}
          {!last && <div>Nenhuma verificação registrada.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
