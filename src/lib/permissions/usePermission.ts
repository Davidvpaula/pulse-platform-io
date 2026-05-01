import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Verifica permissões do usuário logado via has_permissions_batch (single RPC).
 * Cache com TTL de 5 min e invalidação via Realtime (compartilhada com usePermissionsBatch).
 */

type CacheEntry = { value: boolean; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedUserId: string | null | undefined;

function getCached(uid: string, key: string): boolean | undefined {
  const entry = cache.get(`${uid}:${key}`);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { cache.delete(`${uid}:${key}`); return undefined; }
  return entry.value;
}

function setCache(uid: string, key: string, value: boolean) {
  cache.set(`${uid}:${key}`, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function getUserId(): Promise<string | null> {
  if (cachedUserId !== undefined) return cachedUserId ?? null;
  const { data } = await supabase.auth.getUser();
  cachedUserId = data.user?.id ?? null;
  return cachedUserId;
}

supabase.auth.onAuthStateChange((_e, session) => {
  cachedUserId = session?.user?.id ?? null;
  cache.clear();
});

export function usePermission(keys: string | string[]) {
  const list = Array.isArray(keys) ? keys : [keys];
  const [state, setState] = useState<{ loading: boolean; allowed: Record<string, boolean> }>({
    loading: true,
    allowed: {},
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const uid = await getUserId();
      if (!uid) {
        if (active) setState({ loading: false, allowed: Object.fromEntries(list.map(k => [k, false])) });
        return;
      }

      const result: Record<string, boolean> = {};
      const toFetch: string[] = [];
      for (const k of list) {
        const cached = getCached(uid, k);
        if (cached !== undefined) result[k] = cached;
        else toFetch.push(k);
      }

      // Use batch RPC for all misses
      if (toFetch.length > 0) {
        const { data, error } = await supabase.rpc("has_permissions_batch", {
          _user_id: uid,
          _keys: toFetch,
        });
        if (!error && Array.isArray(data)) {
          for (const row of data as { permission_key: string; allowed: boolean }[]) {
            result[row.permission_key] = row.allowed;
            setCache(uid, row.permission_key, row.allowed);
          }
        } else {
          // Fallback individual
          for (const k of toFetch) {
            const { data: d } = await supabase.rpc("has_permission", { _user_id: uid, _key: k });
            const ok = !!d;
            setCache(uid, k, ok);
            result[k] = ok;
          }
        }
      }

      if (active) setState({ loading: false, allowed: result });
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.join("|")]);

  const has = (k: string) => !!state.allowed[k];
  const hasAny = list.some(has);
  const hasAll = list.every(has);

  return { ...state, has, hasAny, hasAll };
}

export function clearPermissionCache() {
  cache.clear();
}
