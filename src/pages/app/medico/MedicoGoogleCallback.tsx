import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { LOCAL_BACKEND } from '@/lib/local-backend';

export default function MedicoGoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Conectando ao Google Calendar…");

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const redirect = (url: string, ms: number) => { if (active) timer = setTimeout(() => navigate(url), ms); };
    const cleanup = () => { active = false; clearTimeout(timer); };
    if (LOCAL_BACKEND) {
      setStatus('error'); setMessage('Integração Google desativada no ambiente local.');
      redirect('/app/medico/configuracoes', 3000); return cleanup;
    }
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(error === "access_denied" ? "Acesso negado. Tente novamente." : `Erro: ${error}`);
      redirect("/app/medico/configuracoes", 3000);
      return cleanup;
    }

    if (!code) {
      setStatus("error");
      setMessage("Código de autorização não encontrado.");
      redirect("/app/medico/configuracoes", 3000);
      return cleanup;
    }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (!session) {
          setStatus("error");
          setMessage("Sessão expirada. Faça login novamente.");
          redirect("/auth", 3000);
          return;
        }

        const redirectUri = `${window.location.origin}/app/medico/google-callback`;

        const { data, error: fnError } = await supabase.functions.invoke("google-oauth", {
          body: { action: "exchange-code", code, redirect_uri: redirectUri },
        });
        if (!active) return;

        if (fnError || data?.error) {
          throw new Error(data?.error || fnError?.message || "Erro desconhecido");
        }

        setStatus("success");
        setMessage(`Google Calendar conectado! (${data.google_email || ""})`);
        redirect("/app/medico/configuracoes", 2000);
      } catch (err: any) {
        if (!active) return;
        console.error("Google callback error:", err);
        setStatus("error");
        setMessage(err.message || "Falha ao conectar.");
        redirect("/app/medico/configuracoes", 4000);
      }
    })();
    return cleanup;
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
