/**
 * Inspeção administrativa: mantém a identidade do Admin e mostra um
 * cadastro somente leitura. Não emula uma sessão autenticada do alvo.
 * O transporte do cliente bloqueia gravações durante a inspeção;
 * a RPC verifica administrador, titularidade do log e prazo no servidor.
 *
 * Persistência: sessionStorage (some ao fechar a aba) + expira em 60min.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileKey } from "./profiles";
import { useSession } from './session';
import { useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = "nova-saude.impersonation";
const MAX_DURATION_MS = 60 * 60 * 1000; // 60 min

type Target = {
  user_id: string;
  nome: string;
  email: string;
  role: string; // string crua do banco — mapeada p/ ProfileKey
};

export type ImpersonationState = {
  admin_id: string;
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
    if (!s.admin_id || !s.log_id || !s.target?.user_id || !Number.isFinite(s.expira_em)
      || s.expira_em > Date.now() + MAX_DURATION_MS || Date.now() > s.expira_em) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return s;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { session, loading, roles } = useSession();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ImpersonationState | null>(() => loadFromStorage());
  useEffect(() => {
    if (!loading && (!session || !roles.includes('admin') || (active && active.admin_id !== session.user.id))) {
      sessionStorage.removeItem(STORAGE_KEY);
      setActive(null);
    }
  }, [loading, session?.user.id, roles.join(','), active?.admin_id]);

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

  // O servidor também expira o log em 60 minutos. Recarregar a aba não o encerra.

  const start = useCallback(async (target: Target, motivo: string) => {
    if (!session || !roles.includes('admin')) throw new Error('Apenas administrador');
    if (active) throw new Error('Encerre a inspeção atual');
    const { data, error } = await supabase.rpc("impersonation_iniciar", {
      _target_id: target.user_id,
      _motivo: motivo,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    if (error) throw error;
    const log_id = data as unknown as string;
    const profileKey: ProfileKey = ROLE_TO_PROFILE[target.role] ?? "paciente";
    const state: ImpersonationState = {
      admin_id: session.user.id,
      log_id,
      iniciado_em: Date.now(),
      expira_em: Date.now() + MAX_DURATION_MS,
      motivo,
      target,
      profileKey,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    await queryClient.cancelQueries();
    setActive(state);
  }, [roles, active, queryClient, session]);

  const stop = useCallback(async () => {
    if (!active) return;
    await stopInternal(active.log_id);
    sessionStorage.removeItem(STORAGE_KEY);
    setActive(null);
    queryClient.removeQueries({ queryKey: ['inspection'] });
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
