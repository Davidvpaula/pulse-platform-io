import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { profiles, type ProfileKey } from "./profiles";
import { useSession } from "./session";
import { useImpersonation } from "./impersonation";

/**
 * Vínculo do paciente — não é um perfil separado, apenas metadado exibido
 * dentro do dashboard único de Paciente.
 */
export type PatientLink = {
  tipo: "particular" | "empresarial";
  empresa?: string;
  plano?: string;
};

type AuthCtx = {
  profileKey: ProfileKey;
  setProfileKey: (k: ProfileKey) => void;
  user: { name: string; role: string; avatarInitials: string };
  patientLink: PatientLink;
  setPatientLink: (l: PatientLink) => void;
};

const Ctx = createContext<AuthCtx | null>(null);
const LINK_KEY = "nova-saude.patientLink";

// Prioridade quando o usuário tem múltiplos papéis no banco.
// Roles "secretaria" e "supervisor" mapeiam para o perfil "colaborador" (menu dinâmico).
const ROLE_PRIORITY: ProfileKey[] = ["admin", "medico", "colaborador", "empresa", "paciente"];

function rolesToProfileKey(roles: string[]): ProfileKey | null {
  const normalized = roles.map(r => (r === "secretaria" || r === "supervisor" ? "colaborador" : r));
  for (const p of ROLE_PRIORITY) {
    if (normalized.includes(p)) return p;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { session, roles } = useSession();

  const [profileKey, setProfileKeyState] = useState<ProfileKey>("paciente");

  const [patientLink, setPatientLinkState] = useState<PatientLink>(() => {
    if (typeof window === "undefined") return { tipo: "particular" };
    const stored = localStorage.getItem(LINK_KEY);
    if (stored) { try { return JSON.parse(stored); } catch { /* ignore */ } }
    return { tipo: "particular" };
  });

  // O papel ativo vem do banco (sessão é a fonte da verdade).
  useEffect(() => {
    if (!session) return;
    const fromRoles = rolesToProfileKey(roles);
    if (fromRoles && fromRoles !== profileKey) {
      setProfileKeyState(fromRoles);
    }
  }, [session, roles]);

  useEffect(() => {
    localStorage.setItem(LINK_KEY, JSON.stringify(patientLink));
  }, [patientLink]);

  // Troca manual de perfil bloqueada — banco é a fonte da verdade.
  const setProfileKey = (_k: ProfileKey) => {};

  const { active: impersonation } = useImpersonation();

  // Quando há impersonação ativa, a UI usa o perfil do alvo (read-only).
  const effectiveProfileKey: ProfileKey = impersonation?.profileKey ?? profileKey;

  const displayUser = useMemo(() => {
    if (impersonation) {
      const name = impersonation.target.nome || impersonation.target.email;
      const initials = name.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase() || "U";
      return { name, role: profiles[impersonation.profileKey].user.role, avatarInitials: initials };
    }
    if (session?.user) {
      const email = session.user.email ?? "";
      const meta = (session.user.user_metadata ?? {}) as { nome?: string; full_name?: string };
      const name = meta.nome || meta.full_name || email.split("@")[0] || "Usuário";
      const initials = name.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase() || "U";
      return { name, role: profiles[profileKey].user.role, avatarInitials: initials };
    }
    return profiles[profileKey].user;
  }, [session, profileKey, impersonation]);

  const value = useMemo<AuthCtx>(() => ({
    profileKey: effectiveProfileKey,
    setProfileKey,
    user: displayUser,
    patientLink,
    setPatientLink: setPatientLinkState,
  }), [effectiveProfileKey, patientLink, displayUser, session]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fora de AuthProvider");
  return v;
}

import { can as _can, type Action, type Resource } from "./abilities";
export function useCan() {
  const { profileKey } = useAuth();
  return (resource: Resource, action: Action = "view") => _can(profileKey, resource, action);
}

import { supabase } from "@/integrations/supabase/client";

/**
 * True quando o médico logado (sessão real) ainda não foi aprovado.
 */
export function useMedicoAguardandoAprovacao(): boolean {
  const [aguardando, setAguardando] = useState(false);

  useEffect(() => {
    let active = true;
    async function check() {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) { if (active) setAguardando(false); return; }
      const { data } = await supabase
        .from("medicos")
        .select("status")
        .eq("user_id", uid)
        .maybeSingle();
      if (active) setAguardando(!!data && data.status !== "aprovado");
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return aguardando;
}
