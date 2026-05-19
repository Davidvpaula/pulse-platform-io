/**
 * "Visualizar como" — impersonação read-only no frontend.
 *
 * O Admin permanece autenticado como Admin no banco (RLS continua admin),
 * mas a UI assume o perfil/identidade do alvo. Toda escrita é bloqueada
 * pelo helper `assertNotImpersonating()` (componente Guard + helper).
 *
 * Persistência: sessionStorage (some ao fechar a aba) + expira em 60min.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileKey } from "./profiles";

const STORAGE_KEY = "nova-saude.impersonation";
const MAX_DURATION_MS = 60 * 60 * 1000; // 60 min

type Target = {
  user_id: string;
  nome: string;
  email: string;
  role: string; // string crua do banco — mapeada p/ ProfileKey
};

export type ImpersonationState = {
  log_id: string;
  iniciado_em: number;     // epoch ms
  expira_em: number;       // epoch ms
  motivo: string;
  target: Target;
  /** ProfileKey efetivo a ser usado pela UI */
  profileKey: ProfileKey;
};

type Ctx = {
  active: ImpersonationState | null;
  start: (target: Target, motivo: string) => Promise<void>;
  stop: () => Promise<void>;
  /** True se a ação atual deve ser bloqueada (escrita durante impersonação) */
  isReadOnly: boolean;
};

const C = createContext<Ctx | null>(null);

const ROLE_TO_PROFILE: Record<string, ProfileKey> = {
  paciente: "paciente",
  medico: "medico",
  secretaria: "colaborador",
  empresa: "empresa",
  colaborador: "colaborador",
};

function loadFromStorage(): ImpersonationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ImpersonationState;
    if (Date.now() > s.expira_em) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ImpersonationState | null>(() => loadFromStorage());

  // Auto-expira
  useEffect(() => {
    if (!active) return;
    const ms = Math.max(0, active.expira_em - Date.now());
    const t = setTimeout(() => {
      void stopInternal(active.log_id);
      setActive(null);
      sessionStorage.removeItem(STORAGE_KEY);
    }, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.log_id]);

  // Encerra ao fechar a aba (best-effort)
  useEffect(() => {
    if (!active) return;
    const handler = () => {
      // Não conseguimos garantir a chamada async, mas tentamos
      void stopInternal(active.log_id);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);

  const start = useCallback(async (target: Target, motivo: string) => {
    const { data, error } = await supabase.rpc("impersonation_iniciar", {
      _target_id: target.user_id,
      _motivo: motivo,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    if (error) throw error;
    const log_id = data as unknown as string;
    const profileKey: ProfileKey = ROLE_TO_PROFILE[target.role] ?? "paciente";
    const state: ImpersonationState = {
      log_id,
      iniciado_em: Date.now(),
      expira_em: Date.now() + MAX_DURATION_MS,
      motivo,
      target,
      profileKey,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setActive(state);
  }, []);

  const stop = useCallback(async () => {
    if (!active) return;
    await stopInternal(active.log_id);
    sessionStorage.removeItem(STORAGE_KEY);
    setActive(null);
  }, [active]);

  const value = useMemo<Ctx>(() => ({
    active,
    start,
    stop,
    isReadOnly: !!active,
  }), [active, start, stop]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

async function stopInternal(log_id: string) {
  try {
    await supabase.rpc("impersonation_finalizar", { _log_id: log_id });
  } catch (e) {
    console.warn("[impersonation] erro ao finalizar:", e);
  }
}

export function useImpersonation() {
  const v = useContext(C);
  if (!v) throw new Error("useImpersonation fora de ImpersonationProvider");
  return v;
}

/**
 * Bloqueia uma ação de escrita quando há impersonação ativa.
 * Use em handlers antes do submit:
 *   if (assertNotImpersonating(impersonation)) return;
 */
export function assertNotImpersonating(imp: Pick<Ctx, "isReadOnly">): boolean {
  if (imp.isReadOnly) {
    import("sonner").then(({ toast }) => {
      toast.error("Modo somente leitura: ações desabilitadas durante 'Visualizar como'.");
    });
    return true;
  }
  return false;
}
