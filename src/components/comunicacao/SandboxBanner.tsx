import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function SandboxBanner() {
  const [modo, setModo] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "whatsapp.modo")
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const v = (data as any)?.value;
        const m = typeof v === "string" ? v : v?.value ?? "sandbox";
        setModo(m);
      });
    return () => { alive = false; };
  }, []);

  if (!modo || modo === "producao") return null;

  return (
    <Alert className="border-amber-500/40 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
        <strong className="uppercase">{modo}</strong> — envios via WhatsApp são gravados como{" "}
        <code>mock_sent</code>. Nenhuma mensagem real será entregue.
      </AlertDescription>
    </Alert>
  );
}
