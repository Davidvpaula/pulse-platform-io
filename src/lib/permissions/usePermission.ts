import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Verifica permissões do usuário logado contra a função has_permission do banco.
 * Cache simples por sessão para evitar round-trip a cada render.
 */
const cache = new Map<string, boolean>();
let cachedUserId: string | null | undefined;

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
        const cacheKey = `${uid}:${k}`;
        if (cache.has(cacheKey)) result[k] = cache.get(cacheKey)!;
        else toFetch.push(k);
      }

      await Promise.all(
        toFetch.map(async k => {
          const { data } = await supabase.rpc("has_permission", { _user_id: uid, _key: k });
          const ok = !!data;
          cache.set(`${uid}:${k}`, ok);
          result[k] = ok;
        }),
      );

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
