import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function MedicoGoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Conectando ao Google Calendar…");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(error === "access_denied" ? "Acesso negado. Tente novamente." : `Erro: ${error}`);
      setTimeout(() => navigate("/app/medico/configuracoes"), 3000);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("Código de autorização não encontrado.");
      setTimeout(() => navigate("/app/medico/configuracoes"), 3000);
      return;
    }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus("error");
          setMessage("Sessão expirada. Faça login novamente.");
          setTimeout(() => navigate("/auth"), 3000);
          return;
        }

        const redirectUri = `${window.location.origin}/app/medico/google-callback`;

        const { data, error: fnError } = await supabase.functions.invoke("google-oauth", {
          body: { action: "exchange-code", code, redirect_uri: redirectUri },
        });

        if (fnError || data?.error) {
          throw new Error(data?.error || fnError?.message || "Erro desconhecido");
        }

        setStatus("success");
        setMessage(`Google Calendar conectado! (${data.google_email || ""})`);
        setTimeout(() => navigate("/app/medico/configuracoes"), 2000);
      } catch (err: any) {
        console.error("Google callback error:", err);
        setStatus("error");
        setMessage(err.message || "Falha ao conectar.");
        setTimeout(() => navigate("/app/medico/configuracoes"), 4000);
      }
    })();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card-elevated mx-auto max-w-md p-8 text-center">
        {status === "loading" && (
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
        )}
        {status === "success" && (
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-success" />
        )}
        {status === "error" && (
          <XCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
        )}
        <h2 className="font-display text-lg font-semibold">{message}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Redirecionando para configurações…
        </p>
      </div>
    </div>
  );
}
