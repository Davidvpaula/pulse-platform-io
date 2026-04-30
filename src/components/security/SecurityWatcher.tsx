/**
 * Componente invisível: faz heartbeat da sessão a cada 60s,
 * desloga se sessão foi revogada e redireciona para /trocar-senha
 * se a senha estiver expirada.
 */
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { sessionHeartbeat, clearSessionToken } from "@/lib/security/sessionTracker";
import { toast } from "@/hooks/use-toast";

const HEARTBEAT_MS = 60_000;
const PASSWORD_CHECK_MS = 5 * 60_000;

export function SecurityWatcher() {
  const { session } = useSession();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function tick() {
      const r = await sessionHeartbeat();
      if (cancelled) return;
      if (r?.revoked) {
        clearSessionToken();
        await supabase.auth.signOut();
        toast({
          title: "Sessão encerrada",
          description: "Sua sessão foi revogada por um administrador.",
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
      }
    }

    tick();
    const id = window.setInterval(tick, HEARTBEAT_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [session, navigate]);

  // Verifica expiração de senha
  useEffect(() => {
    if (!session) return;
    if (loc.pathname === "/trocar-senha") return;
    let cancelled = false;

    async function check() {
      const { data, error } = await supabase.rpc("password_status");
      if (cancelled || error) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.expired || row?.must_change) {
        toast({
          title: "Senha expirada",
          description: "Por segurança, defina uma nova senha.",
        });
        navigate("/trocar-senha", { replace: true });
      }
    }

    check();
    const id = window.setInterval(check, PASSWORD_CHECK_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [session, navigate, loc.pathname]);

  return null;
}
