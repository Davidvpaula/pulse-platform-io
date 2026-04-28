/**
 * Sessão real do Supabase (independente do AuthProvider de demo).
 * Permite que o app continue funcionando com seletor de perfil mock,
 * mas as áreas que precisam de identidade real (cadastro/aprovação de
 * médicos, etc.) usam este hook.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "paciente" | "medico" | "secretaria" | "empresa" | "admin";

type SessionCtx = {
  session: Session | null;
  user: User | null;
  roles: Role[];
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) listener primeiro (evita race)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        // adiar chamada à tabela pra fora do callback (boas práticas Supabase)
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
      }
    });

    // 2) sessão existente
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadRoles(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadRoles(uid: string) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    const newRoles = (data ?? []).map((r) => r.role as Role);
    setRoles(newRoles);

    // Auto-cria registro em `pacientes` quando o usuário tem esse papel
    if (newRoles.includes("paciente")) {
      const { ensurePaciente } = await import("@/lib/clinico");
      ensurePaciente().catch((e) => console.error("[session] ensurePaciente", e));
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, roles, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession fora de SessionProvider");
  return v;
}
