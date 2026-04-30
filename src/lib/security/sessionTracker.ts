/**
 * Heartbeat de sessão — registra/atualiza a sessão atual em user_sessions.
 * Se a sessão for revogada por um admin, faz signOut local.
 */
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "lasmar.session_token";

function getOrCreateToken(): string {
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Outro";
}

export async function sessionHeartbeat(): Promise<{ revoked: boolean } | null> {
  try {
    const token = getOrCreateToken();
    const { data, error } = await supabase.rpc("session_heartbeat", {
      _session_token: token,
      _ip: null,
      _user_agent: navigator.userAgent,
      _device_label: deviceLabel(),
    });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    return { revoked: !!row?.revoked };
  } catch {
    return null;
  }
}

export function clearSessionToken() {
  localStorage.removeItem(TOKEN_KEY);
}
