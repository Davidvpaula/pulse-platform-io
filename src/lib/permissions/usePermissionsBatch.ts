import { useEffect, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/lib/session';
import { previewProfile } from '@/lib/local-preview';

let revision = 0;
const listeners = new Set<() => void>();
export function clearPermissionsBatchCache() {
  revision++;
  listeners.forEach(listener => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
let subscriptions = 0;
let channel: ReturnType<typeof supabase.channel> | null = null;
function watchPermissions() {
  subscriptions++;
  if (!channel) {
    channel = supabase.channel('permissions-reactive');
    for (const table of ['permissoes_colaborador', 'function_permissions', 'permissoes_perfil', 'user_roles', 'colaboradores']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, clearPermissionsBatchCache);
    }
    channel.subscribe();
  }
  return () => {
    subscriptions--;
    if (!subscriptions && channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  };
}

export function usePermissionsBatch(keys: string[]) {
  const { session, loading: sessionLoading } = useSession();
  const uid = session?.user.id;
  const preview = !!previewProfile();
  const version = useSyncExternalStore(subscribe, () => revision);
  const signature = [...new Set(keys)].sort().join('|');
  const list = signature ? signature.split('|') : [];
  useEffect(() => {
    if (uid && !preview) return watchPermissions();
  }, [uid, preview]);
  const query = useQuery({
    queryKey: ['permissions', uid, signature, version],
    enabled: !!uid && !sessionLoading && !preview && list.length > 0,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('has_permissions_batch', { _user_id: uid!, _keys: list })
        .abortSignal(AbortSignal.any([signal, AbortSignal.timeout(12_000)]));
      if (error) throw new Error(error.message);
      if (!Array.isArray(data)) throw new Error('Resposta de permissões inválida');
      const result: Record<string, boolean> = Object.fromEntries(list.map(key => [key, false]));
      for (const row of data) result[row.permission_key] = row.allowed === true;
      return result;
    },
    staleTime: 15_000,
    gcTime: 60_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  // Erro, troca de identidade e invalidação não reutilizam autorização anterior.
  const allowed: Record<string, boolean> = preview ? Object.fromEntries(list.map(key => [key, true]))
    : uid && !sessionLoading && !query.isError ? query.data ?? {} : {};
  const has = (key: string) => allowed[key] === true;
  return { loading: !preview && (sessionLoading || (!!uid && list.length > 0 && query.isPending)),
    allowed, has, error: query.error, refresh: clearPermissionsBatchCache };
}
