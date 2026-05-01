import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

/**
 * Consulta várias permissões de uma vez, contra a função has_permission do banco.
 * - Bypass automático para usuários com role "admin" (não vai ao banco).
 * - Cache compartilhado por sessão (in-memory).
 * - Estável entre re-renders: só refaz fetch quando o conjunto de chaves muda.
 *
 * Uso:
 *   const { loading, has } = usePermissionsBatch(["financeiro.ver", "auditoria.ver"]);
 *   if (loading) return <Skeleton />;
 *   if (has("financeiro.ver")) ...
 */

const cache = new Map<string, boolean>(); // chave: `${uid}:${permKey}`
let cachedAdmin: { uid: string | null; isAdmin: boolean } | null = null;

supabase.auth.onAuthStateChange((_e, session) => {
  cache.clear();
  cachedAdmin = null;
  void session;
});

async function checkAdmin(uid: string): Promise<boolean> {
  if (cachedAdmin && cachedAdmin.uid === uid) return cachedAdmin.isAdmin;
  const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
  const isAdmin = !!data;
  cachedAdmin = { uid, isAdmin };
  return isAdmin;
}

export function usePermissionsBatch(keys: string[]) {
  const { session, roles, loading: sessionLoading } = useSession();
  const uid = session?.user?.id ?? null;

  // Estabiliza a "identidade" do array de chaves para o effect.
  const keySignature = useMemo(() => [...new Set(keys)].sort().join("|"), [keys]);
  const stableKeys = useMemo(() => keySignature ? keySignature.split("|") : [], [keySignature]);

  const [state, setState] = useState<{ loading: boolean; allowed: Record<string, boolean> }>(() => ({
    loading: true,
    allowed: {},
  }));

  useEffect(() => {
    let active = true;

    // Sem sessão: tudo negado, mas não fica preso em loading.
    if (!sessionLoading && !uid) {
      setState({ loading: false, allowed: Object.fromEntries(stableKeys.map(k => [k, false])) });
      return () => { active = false; };
    }

    if (sessionLoading || !uid || stableKeys.length === 0) {
      // Aguarda sessão materializar; se não há chaves, já libera.
      if (stableKeys.length === 0) setState({ loading: false, allowed: {} });
      return () => { active = false; };
    }

    (async () => {
      // 1) Bypass admin via roles do hook (rápido) ou via has_role como fallback.
      let isAdmin = roles.includes("admin");
      if (!isAdmin) isAdmin = await checkAdmin(uid);

      if (isAdmin) {
        const all = Object.fromEntries(stableKeys.map(k => [k, true]));
        if (active) setState({ loading: false, allowed: all });
        return;
      }

      // 2) Não-admin: consulta cada chave (cache primeiro).
      const result: Record<string, boolean> = {};
      const toFetch: string[] = [];
      for (const k of stableKeys) {
        const ck = `${uid}:${k}`;
        if (cache.has(ck)) result[k] = cache.get(ck)!;
        else toFetch.push(k);
      }

      await Promise.all(toFetch.map(async k => {
        const { data } = await supabase.rpc("has_permission", { _user_id: uid, _key: k });
        const ok = !!data;
        cache.set(`${uid}:${k}`, ok);
        result[k] = ok;
      }));

      if (active) setState({ loading: false, allowed: result });
    })();

    return () => { active = false; };
  }, [uid, sessionLoading, roles.join(","), keySignature]);

  const has = (k: string) => !!state.allowed[k];
  return { loading: state.loading, has, allowed: state.allowed };
}

export function clearPermissionsBatchCache() {
  cache.clear();
  cachedAdmin = null;
}
