import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/lib/impersonation';
import { requireSuccess } from '@/lib/supabase-result';
import { Button } from '@/components/ui/button';

type Snapshot = { nome: string; email: string; papeis: string[]; colaborador: Record<string,string> | null;
  medico: Record<string,string> | null; paciente: Record<string,string> | null;
  permissoes: { chave: string; descricao: string; permitido: boolean }[] };
export default function UserInspection() {
  const { active, stop } = useImpersonation();
  const query = useQuery({ queryKey: ['inspection', active?.log_id], enabled: !!active,
    queryFn: async () => await requireSuccess(supabase.rpc('admin_inspecionar_usuario' as never, { _log_id: active!.log_id } as never)) as unknown as Snapshot,
    retry: false });
  return <section className="space-y-5">
    <h1 className="text-2xl font-bold">Inspeção do usuário</h1>
    <p>Cadastro e permissões efetivas do usuário selecionado. Esta tela é somente leitura.</p>
    {query.isPending && <p>Carregando cadastro…</p>}
    {query.error && <p role="alert">{query.error.message}</p>}
    {query.data && <>
      <div className="rounded-lg border p-4"><h2 className="text-xl font-semibold">{query.data.nome}</h2>
        <p>{query.data.email}</p><p>{query.data.papeis.join(', ')}</p>
        {[query.data.colaborador, query.data.medico, query.data.paciente].filter(Boolean).map((record,i) =>
          <dl key={i} className="my-3">{Object.entries(record!).map(([key,value]) => <div key={key}><dt className="inline font-medium">{key}: </dt><dd className="inline">{value || '—'}</dd></div>)}</dl>)}
      </div>
      <h2 className="text-xl font-semibold">Permissões efetivas</h2>
      <ul className="divide-y">{query.data.permissoes.map(p => <li key={p.chave} className="py-2">{p.permitido ? 'Liberado' : 'Bloqueado'} · {p.descricao} <code className="text-xs">{p.chave}</code></li>)}</ul>
    </>}
    <Button onClick={() => void stop()}>Encerrar inspeção</Button>
  </section>;
}
