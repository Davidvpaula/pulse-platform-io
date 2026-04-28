import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { profiles, type ProfileKey } from "./profiles";
import { defaultCapabilities, type Capability } from "./abilities";

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
  capabilities: Capability[];
  hasCapability: (c: Capability) => boolean;
  toggleCapability: (c: Capability) => void;
  patientLink: PatientLink;
  setPatientLink: (l: PatientLink) => void;
};

const Ctx = createContext<AuthCtx | null>(null);
const STORAGE_KEY = "lasmar.profile";
const CAPS_KEY = "lasmar.capabilities";
const LINK_KEY = "lasmar.patientLink";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profileKey, setProfileKeyState] = useState<ProfileKey>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return (stored as ProfileKey) || "admin";
  });

  const [capabilities, setCapabilities] = useState<Capability[]>(() => {
    if (typeof window === "undefined") return defaultCapabilities[profileKey] ?? [];
    const stored = localStorage.getItem(CAPS_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { /* ignore */ }
    }
    return defaultCapabilities[profileKey] ?? [];
  });

  const [patientLink, setPatientLinkState] = useState<PatientLink>(() => {
    if (typeof window === "undefined") return { tipo: "particular" };
    const stored = localStorage.getItem(LINK_KEY);
    if (stored) { try { return JSON.parse(stored); } catch { /* ignore */ } }
    return { tipo: "particular" };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, profileKey);
  }, [profileKey]);

  useEffect(() => {
    localStorage.setItem(CAPS_KEY, JSON.stringify(capabilities));
  }, [capabilities]);

  useEffect(() => {
    localStorage.setItem(LINK_KEY, JSON.stringify(patientLink));
  }, [patientLink]);

  const setProfileKey = (k: ProfileKey) => {
    setProfileKeyState(k);
    // ao trocar perfil, recarrega capabilities padrão
    setCapabilities(defaultCapabilities[k] ?? []);
  };

  const hasCapability = (c: Capability) => capabilities.includes(c);
  const toggleCapability = (c: Capability) =>
    setCapabilities(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const value = useMemo<AuthCtx>(() => ({
    profileKey,
    setProfileKey,
    user: profiles[profileKey].user,
    capabilities,
    hasCapability,
    toggleCapability,
    patientLink,
    setPatientLink: setPatientLinkState,
  }), [profileKey, capabilities, patientLink]);

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

import { useEffect, useState as _useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * True quando o médico logado (sessão real) ainda não foi aprovado.
 * Não bloqueia o seletor de demo — só é true se houver sessão real
 * E o usuário tiver papel "medico" cadastrado mas não aprovado.
 */
export function useMedicoAguardandoAprovacao(): boolean {
  const [aguardando, setAguardando] = _useState(false);

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
