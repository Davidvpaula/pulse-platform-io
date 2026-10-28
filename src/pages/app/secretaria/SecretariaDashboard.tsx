import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, Wallet, Loader2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { usePermission } from '@/lib/permissions/usePermission';
import { useSession } from '@/lib/session';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/format';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

type Consulta = { id: string; inicio: string; status: string; medico_nome: string; paciente_nome: string; paciente_id: string | null };
type Dashboard = { agenda: { total: number; concluidas: number; ativas: number; urgentes: number } | null;
  financeiro: { quantidade: number; valor_centavos: number } | null; fila: Consulta[] };
const keys = ['agenda.ver_todas','agenda.criar','agenda.confirmar','agenda.cancelar','pacientes.ver','financeiro.ver','supervisor.fila_geral'];

export default function SecretariaDashboard() {
  const { session } = useSession();
  const { has, allowed, loading: permissionsLoading, error: permissionError, refresh } = usePermission(keys);
  const [offset, setOffset] = useState(0);
  const [clock, setClock] = useState(() => new Date());
  const [action, setAction] = useState<{consulta: Consulta; status: 'confirmada' | 'cancelada'} | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { const timer = setInterval(() => setClock(new Date()), 30_000); return () => clearInterval(timer); }, []);
  const inicio = new Date(clock.getFullYear(),clock.getMonth(),clock.getDate()).toISOString();
  const fim = new Date(clock.getFullYear(),clock.getMonth(),clock.getDate()+1).toISOString();
  const query = useQuery({
    queryKey: ['colaborador-dashboard', session?.user.id, inicio, offset, allowed],
    enabled: !!session && !permissionsLoading && !permissionError && (has('agenda.ver_todas') || has('financeiro.ver')),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('colaborador_dashboard' as any, { _inicio: inicio, _fim: fim, _offset: offset }).abortSignal(signal);
      if (error) throw new Error(error.message);
      return data as unknown as Dashboard;
    }, refetchInterval: 30_000, retry: false,
  });
  const data = !permissionError && !query.isError ? query.data : undefined;
  const agenda = has('agenda.ver_todas') ? data?.agenda : null;
  const financeiro = has('financeiro.ver') ? data?.financeiro : null;
  const fila = has('agenda.ver_todas') ? data?.fila ?? [] : [];
  async function execute() {
    if (!action || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('colaborador_alterar_consulta' as any, { _consulta_id: action.consulta.id, _status: action.status });
      if (error) throw new Error(error.message);
      toast.success(action.status === 'confirmada' ? 'Consulta confirmada.' : 'Consulta cancelada.');
      setAction(null);
      await query.refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao alterar consulta'); }
    finally { setSaving(false); }
  }
  return <div className="space-y-6">
    <PageHeader title="Central operacional" description="Suas áreas de trabalho são liberadas pelo administrador."
      actions={<Button variant="outline" onClick={() => { refresh(); void query.refetch(); }} disabled={query.isFetching || permissionsLoading}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>} />
    {(permissionsLoading || query.isFetching) && <Loader2 className="animate-spin" aria-label="Carregando central" />}
    {(permissionError || query.error) && <div role="alert" className="rounded-lg border border-destructive p-4">Não foi possível carregar a central. Use Atualizar para tentar novamente.</div>}
    {!permissionsLoading && !permissionError && !has('agenda.ver_todas') && !has('financeiro.ver') &&
      <p className="rounded-lg border p-6 text-muted-foreground">Nenhuma área operacional liberada. O administrador pode configurar suas permissões.</p>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {agenda && <>
        <StatCard label="Consultas hoje" value={String(agenda.total)} icon={Calendar} hint={agenda.concluidas + ' concluídas'} />
        <StatCard label="Fila ativa" value={String(agenda.ativas)} icon={Users} hint={agenda.urgentes + ' começam nos próximos 30 minutos'} />
      </>}
      {financeiro && <StatCard label="Pagamentos em aberto" value={formatBRL(financeiro.valor_centavos)} icon={Wallet} hint={financeiro.quantidade + ' cobranças pendentes ou em processamento'} />}
    </div>
    <div className="flex flex-wrap gap-3">
      {has('agenda.ver_todas') && <Button asChild variant="outline"><Link to="/app/colaborador/agendamentos">Agendamentos</Link></Button>}
      {has('pacientes.ver') && <Button asChild variant="outline"><Link to="/app/colaborador/pacientes">Pacientes</Link></Button>}
      {has('financeiro.ver') && <Button asChild variant="outline"><Link to="/app/colaborador/financeiro">Financeiro</Link></Button>}
      {has('supervisor.fila_geral') && <Button asChild variant="outline"><Link to="/app/colaborador/equipe">Supervisão</Link></Button>}
      <Button asChild variant="outline"><Link to="/app/colaborador/tarefas">Minhas tarefas</Link></Button>
      <Button asChild variant="outline"><Link to="/app/colaborador/comunicacao-interna">Equipe</Link></Button>
    </div>
    {agenda && <section className="card-elevated space-y-4 p-5">
      <h2 className="text-lg font-semibold">Fila do dia</h2>
      <p className="text-sm text-muted-foreground">Ordenada por horário. Os indicadores incluem todas as consultas do dia.</p>
      {fila.map(c => <article key={c.id} className="flex flex-wrap items-center justify-between gap-4 border-b py-4">
        <div className="min-w-0">
          <p className="font-medium">{has('pacientes.ver') && c.paciente_id ? <Link className="text-primary underline" to={'/app/colaborador/pacientes/' + c.paciente_id}>{c.paciente_nome}</Link> : c.paciente_nome}</p>
          <p className="text-sm text-muted-foreground">{new Date(c.inicio).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · {c.medico_nome}</p>
          <p className="text-xs">{c.status.replace(/_/g,' ')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.status === 'agendada' && has('agenda.confirmar') && <Button size="sm" disabled={saving} onClick={() => setAction({consulta:c,status:'confirmada'})}>Confirmar</Button>}
          {['agendada','confirmada','aguardando_pagamento'].includes(c.status) && has('agenda.cancelar') && <Button variant="outline" size="sm" disabled={saving} onClick={() => setAction({consulta:c,status:'cancelada'})}>Cancelar</Button>}
        </div>
      </article>)}
      {!fila.length && <p className="text-muted-foreground">Nenhuma consulta ativa nesta página.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" disabled={offset===0 || query.isFetching} onClick={() => setOffset(v => Math.max(0,v-50))}>Anterior</Button>
        <span className="text-sm">Página {Math.floor(offset/50)+1}</span>
        <Button variant="outline" disabled={offset+50 >= agenda.ativas || query.isFetching} onClick={() => setOffset(v => v+50)}>Próxima</Button>
      </div>
    </section>}
    <Dialog open={!!action} onOpenChange={open => { if (!open && !saving) setAction(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{action?.status === 'cancelada' ? 'Cancelar consulta' : 'Confirmar consulta'}</DialogTitle>
        <DialogDescription>{action?.consulta.paciente_nome} · {action?.consulta.medico_nome}. {action?.status === 'cancelada' ? 'O cancelamento não executa reembolso.' : 'A confirmação será registrada na agenda.'}</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setAction(null)}>Voltar</Button><Button disabled={saving} onClick={() => void execute()}>{saving ? 'Salvando…' : 'Confirmar alteração'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
