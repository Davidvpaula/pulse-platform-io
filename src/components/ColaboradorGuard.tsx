import { useQuery } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';
import { Loader2, ShieldX } from 'lucide-react';
import { useSession } from '@/lib/session';
import { supabase } from '@/integrations/supabase/client';
import { previewProfile } from '@/lib/local-preview';
import { Button } from '@/components/ui/button';

export default function ColaboradorGuard() {
  const { session, roles, loading: sessionLoading } = useSession();
  const uid = session?.user.id;
  const admin = roles.includes('admin');
  const staff = roles.some(role => ['colaborador', 'secretaria', 'supervisor'].includes(role));
  const query = useQuery({
    queryKey: ['colaborador-atual', uid], enabled: !!uid && staff && !admin && !sessionLoading,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('colaboradores').select('id,status_conta,status_motivo,removido_em')
        .eq('user_id', uid!).abortSignal(signal).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }, staleTime: 0, refetchInterval: 15_000, refetchOnWindowFocus: true, retry: false,
  });
  if (previewProfile()) return <Outlet />;
  if (sessionLoading || (staff && !admin && query.isPending)) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" aria-label="Verificando acesso" /></div>;
  if (admin || staff && !query.isError && query.data?.status_conta === 'ativo' && !query.data.removido_em) return <Outlet />;
  return <section className="mx-auto max-w-lg space-y-4 p-8 text-center" role="alert">
    <ShieldX className="mx-auto h-10 w-10 text-destructive" />
    <h1 className="text-xl font-semibold">{query.isError ? 'Falha ao verificar acesso' : query.data ? 'Acesso do colaborador suspenso' : 'Acesso restrito'}</h1>
    <p>{query.isError ? 'Tente consultar o cadastro novamente.' : query.data?.status_motivo || 'É necessário um cadastro ativo de colaborador. Entre em contato com o administrador.'}</p>
    {query.isError && <Button onClick={() => void query.refetch()}>Tentar novamente</Button>}
  </section>;
}
