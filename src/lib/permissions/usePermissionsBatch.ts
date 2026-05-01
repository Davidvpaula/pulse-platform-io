import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

/**
 * Consulta várias permissões de uma vez via RPC has_permissions_batch (1 round-trip).
 * - Bypass automático para admin.
 * - Cache in-memory com TTL (5 min) e invalidação via Realtime.
 * - Expõe `refresh()` para forçar recarga (útil após admin alterar permissões).
 */

type CacheEntry = { value: boolean; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
let cachedAdmin: { uid: string | null; isAdmin: boolean; expiresAt: number } | null = null;

function getCached(uid: string, key: string): boolean | undefined {
  const entry = cache.get(`${uid}:${key}`);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { cache.delete(`${uid}:${key}`); return undefined; }
  return entry.value;
}

function setCache(uid: string, key: string, value: boolean) {
  cache.set(`${uid}:${key}`, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Limpa cache quando a sessão muda
supabase.auth.onAuthStateChange(() => {
  cache.clear();
  cachedAdmin = null;
});

// Realtime: invalida cache quando permissões mudam no banco
const realtimeChannel = supabase
  .channel("permissions-invalidate")
  .on("postgres_changes", { event: "*", schema: "public", table: "permissoes_colaborador" }, () => {
    cache.clear();
  })
  .on("postgres_changes", { event: "*", schema: "public", table: "function_permissions" }, () => {
    cache.clear();
  })
  .on("postgres_changes", { event: "*", schema: "public", table: "permissoes_perfil" }, () => {
    cache.clear();
  })
  .subscribe();

// Cleanup (módulo unload) — defensive
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => realtimeChannel.unsubscribe());
}

async function checkAdmin(uid: string): Promise<boolean> {
  if (cachedAdmin && cachedAdmin.uid === uid && Date.now() < cachedAdmin.expiresAt) return cachedAdmin.isAdmin;
  const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
  const isAdmin = !!data;
  cachedAdmin = { uid, isAdmin, expiresAt: Date.now() + CACHE_TTL_MS };
  return isAdmin;
}

export function usePermissionsBatch(keys: string[]) {
  const { session, roles, loading: sessionLoading } = useSession();
  const uid = session?.user?.id ?? null;

  const keySignature = useMemo(() => [...new Set(keys)].sort().join("|"), [keys]);
  const stableKeys = useMemo(() => keySignature ? keySignature.split("|") : [], [keySignature]);

  const [state, setState] = useState<{ loading: boolean; allowed: Record<string, boolean> }>(() => ({
    loading: true,
    allowed: {},
  }));

  const [refreshCounter, setRefreshCounter] = useState(0);

  const fetchPermissions = useCallback(async (currentUid: string, currentKeys: string[], currentRoles: string[]) => {
    // 1) Admin bypass
    let isAdmin = currentRoles.includes("admin");
    if (!isAdmin) isAdmin = await checkAdmin(currentUid);

    if (isAdmin) {
      return Object.fromEntries(currentKeys.map(k => [k, true]));
    }

    // 2) Check cache, collect misses
    const result: Record<string, boolean> = {};
    const toFetch: string[] = [];
    for (const k of currentKeys) {
      const cached = getCached(currentUid, k);
      if (cached !== undefined) result[k] = cached;
      else toFetch.push(k);
    }

    // 3) Batch RPC for misses
    if (toFetch.length > 0) {
      const { data, error } = await supabase.rpc("has_permissions_batch", {
        _user_id: currentUid,
        _keys: toFetch,
      });
      if (!error && Array.isArray(data)) {
        for (const row of data as { permission_key: string; allowed: boolean }[]) {
          result[row.permission_key] = row.allowed;
          setCache(currentUid, row.permission_key, row.allowed);
        }
      } else {
        // Fallback: treat as denied
        for (const k of toFetch) result[k] = false;
      }
    }

    return result;
  }, []);

  useEffect(() => {
    let active = true;

    if (!sessionLoading && !uid) {
      setState({ loading: false, allowed: Object.fromEntries(stableKeys.map(k => [k, false])) });
      return () => { active = false; };
    }

    if (sessionLoading || !uid || stableKeys.length === 0) {
      if (stableKeys.length === 0) setState({ loading: false, allowed: {} });
      return () => { active = false; };
    }

    setState(prev => ({ ...prev, loading: true }));

    fetchPermissions(uid, stableKeys, roles).then(allowed => {
      if (active) setState({ loading: false, allowed });
    });

    return () => { active = false; };
  }, [uid, sessionLoading, roles.join(","), keySignature, refreshCounter, fetchPermissions]);

  const has = useCallback((k: string) => !!state.allowed[k], [state.allowed]);

  /** Força re-consulta ao banco (ignora cache). Útil após admin alterar permissões. */
  const refresh = useCallback(() => {
    cache.clear();
    cachedAdmin = null;
    setRefreshCounter(c => c + 1);
  }, []);

  return { loading: state.loading, has, allowed: state.allowed, refresh };
}

/** Limpa todo o cache de permissões (chamada manual). */
export function clearPermissionsBatchCache() {
  cache.clear();
  cachedAdmin = null;
}
