import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/lib/session';
import { toast } from 'sonner';

type Task = { id: string; titulo: string; prioridade: string; prazo: string | null; status: 'pendente' | 'andamento' | 'concluida' };
const labels = { pendente: 'Pendente', andamento: 'Em andamento', concluida: 'Concluída' };
export default function Tarefas() {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [prioridade, setPrioridade] = useState('media');
  const [prazo, setPrazo] = useState('');
  const [filter, setFilter] = useState('todas');
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const query = useQuery({
    queryKey: ['tarefas-proprias', session?.user.id, filter, page],
    enabled: !!session?.user.id,
    queryFn: async () => {
      let request = supabase.from('colaborador_tarefas').select('*', { count: 'exact' }).eq('owner_id', session!.user.id);
      if (filter !== 'todas') request = request.eq('status', filter);
      const { data, error, count } = await request.order('created_at', { ascending: false }).order('id').range(page * 50, page * 50 + 49);
      if (error) throw error;
      return { tasks: data as Task[], total: count ?? 0 };
    },
  });
  const create = async () => {
    if (!titulo.trim() || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('colaborador_tarefas').insert({
        titulo: titulo.trim(), prioridade, prazo: prazo ? new Date(prazo).toISOString() : null,
      });
      if (error) throw error;
      setTitulo(''); setPrazo(''); setPrioridade('media'); setOpen(false); setPage(0);
      await query.refetch(); toast.success('Tarefa criada');
    } catch { toast.error('Não foi possível criar a tarefa. Verifique seu acesso e tente novamente.'); }
    finally { setSaving(false); }
  };
  const advance = async (task: Task) => {
    setSaving(true);
    try {
      const status = task.status === 'pendente' ? 'andamento' : task.status === 'andamento' ? 'concluida' : 'pendente';
      const { data, error } = await supabase.from('colaborador_tarefas').update({ status }).eq('id', task.id).eq('status', task.status).select('id').maybeSingle();
      if (error || !data) throw error ?? new Error('Registro indisponível');
      await query.refetch(); toast.success('Tarefa atualizada');
    } catch { toast.error('Não foi possível atualizar. Recarregue a lista e verifique seu acesso.'); }
    finally { setSaving(false); }
  };
  return <div className="space-y-6">
    <PageHeader title="Minhas tarefas" description="Organize suas atividades, prioridades e prazos." actions={<Button onClick={() => setOpen(true)}>Nova tarefa</Button>} />
    <label className="flex items-center gap-3">Status
      <select className="rounded border bg-background p-2" value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}>
        <option value="todas">Todas</option>
        {Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </label>
    {query.isPending ? <p>Carregando tarefas…</p> : query.isError ? <div role="alert">Não foi possível carregar as tarefas. <Button onClick={() => void query.refetch()}>Tentar novamente</Button></div> :
      <div className="space-y-3">
        {!query.data.tasks.length && <p className="text-muted-foreground">Nenhuma tarefa neste filtro.</p>}
        {query.data.tasks.map(task => <article key={task.id} className="card-elevated flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <h2 className="break-words font-semibold">{task.titulo}</h2>
            <p className="text-sm text-muted-foreground">{labels[task.status]} · Prioridade {task.prioridade === 'media' ? 'média' : task.prioridade}</p>
            <p className={task.prazo && task.status !== 'concluida' && Date.parse(task.prazo) < Date.now() ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
              {task.prazo ? 'Prazo: ' + new Date(task.prazo).toLocaleString('pt-BR') : 'Sem prazo definido'}
            </p>
          </div>
          <Button variant="outline" disabled={saving} onClick={() => void advance(task)}>{task.status === 'pendente' ? 'Iniciar' : task.status === 'andamento' ? 'Concluir' : 'Reabrir'}</Button>
        </article>)}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled={!page} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span>{query.data.total} tarefas · Página {page + 1}</span>
          <Button variant="outline" disabled={(page + 1) * 50 >= query.data.total} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      </div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Criar tarefa</DialogTitle></DialogHeader>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); void create(); }}>
        <label className="block">Título<Input required maxLength={200} value={titulo} onChange={e => setTitulo(e.target.value)} /></label>
        <label className="block">Prioridade<select className="ml-3 rounded border bg-background p-2" value={prioridade} onChange={e => setPrioridade(e.target.value)}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label>
        <label className="block">Prazo (opcional)<Input type="datetime-local" value={prazo} onChange={e => setPrazo(e.target.value)} /></label>
        <Button type="submit" disabled={saving || !titulo.trim()}>{saving ? 'Salvando…' : 'Criar'}</Button>
      </form>
    </DialogContent></Dialog>
  </div>;
}
