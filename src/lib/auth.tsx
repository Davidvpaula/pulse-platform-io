import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { profiles, type ProfileKey } from "./profiles";

type AuthCtx = {
  profileKey: ProfileKey;
  setProfileKey: (k: ProfileKey) => void;
  user: { name: string; role: string; avatarInitials: string };
};

const Ctx = createContext<AuthCtx | null>(null);
const STORAGE_KEY = "lasmar.profile";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profileKey, setProfileKeyState] = useState<ProfileKey>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return (stored as ProfileKey) || "admin";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, profileKey);
  }, [profileKey]);

  const setProfileKey = (k: ProfileKey) => setProfileKeyState(k);

  return (
    <Ctx.Provider value={{ profileKey, setProfileKey, user: profiles[profileKey].user }}>
      {children}
    </Ctx.Provider>
  );
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
