/**
 * Sessão real do Supabase (independente do AuthProvider de demo).
 * Permite que o app continue funcionando com seletor de perfil mock,
 * mas as áreas que precisam de identidade real (cadastro/aprovação de
 * médicos, etc.) usam este hook.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "paciente" | "medico" | "secretaria" | "colaborador" | "supervisor" | "empresa" | "admin";

type SessionCtx = {
  session: Session | null;
  user: User | null;
  roles: Role[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionCtx | null>(null);

async function withTimeout<T>(operation: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Session timeout")), 12_000); }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const identity = useRef<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    let active = true;
    let generation = 0;
    let rolesReady = false;
    const deferred = new Set<ReturnType<typeof setTimeout>>();
    const current = (ticket: number) => active && ticket === generation;
    const fail = (ticket: number) => {
      if (!current(ticket)) return;
      rolesReady = false;
      identity.current = null;
      queryClient.clear();
      setSession(null);
      setRoles([]);
      setLoading(false);
      setError("Não foi possível verificar sua sessão. Confira a conexão e tente novamente.");
    };
    async function loadRoles(next: Session, ticket: number) {
      if (!current(ticket)) return;
      try {
        const { data, error: rolesError } = await withTimeout(supabase.from("user_roles").select("role").eq("user_id", next.user.id));
        if (!current(ticket)) return;
        if (rolesError) { fail(ticket); return; }
        const newRoles = (data ?? []).map(row => row.role as Role);
        rolesReady = true;
        setRoles(newRoles);
        setLoading(false);
        if (newRoles.includes("paciente")) {
          const { ensurePaciente } = await import("@/lib/clinico");
          if (current(ticket)) void ensurePaciente().catch(() => {});
        }
      } catch { fail(ticket); }
    }
    function accept(next: Session | null) {
      const ticket = ++generation;
      rolesReady = false;
      const nextIdentity = next?.user.id ?? null;
      if (identity.current !== nextIdentity) {
        // Cancel pending queries and discard records belonging to the previous user.
        queryClient.clear();
        identity.current = nextIdentity;
      }
      setError(null);
      setSession(next);
      setRoles([]);
      setLoading(!!next);
      if (next) {
        // Supabase queries must run outside the synchronous auth callback.
        const timer = setTimeout(() => { deferred.delete(timer); void loadRoles(next, ticket); }, 0);
        deferred.add(timer);
      }
    }
    setLoading(true);
    setError(null);
    const initialTicket = generation;
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      // A routine token renewal must not unmount forms or discard current roles.
      if (event === "TOKEN_REFRESHED" && rolesReady && next?.user.id === identity.current) {
        setSession(next);
        return;
      }
      accept(next);
    });
    void withTimeout(supabase.auth.getSession()).then(({ data, error: sessionError }) => {
      if (!current(initialTicket)) return;
      if (sessionError) { fail(initialTicket); return; }
      accept(data.session);
    }).catch(() => fail(initialTicket));
    return () => {
      active = false;
      deferred.forEach(clearTimeout);
      sub.subscription.unsubscribe();
    };
  }, [attempt, queryClient]);

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
  }

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, roles, loading, error, retry, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession fora de SessionProvider");
  return v;
}
