import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { getPagamento } from '@/lib/pagamentos';
import { useSession } from '@/lib/session';
export default function PacientePagamentoCancelado() {
  const [params] = useSearchParams();
  const id = params.get('p');
  const { session } = useSession();
  const query = useQuery({ queryKey: ['pagamento-cancelado', session?.user.id, id], queryFn: () => getPagamento(id!), enabled: !!id, retry: false });
  const cancelled = query.data?.status === 'cancelado';
  return <div className="space-y-6">
    <PageHeader title={cancelled ? 'Pagamento cancelado' : 'Status do pagamento'}
      description={query.isFetching ? 'Consultando registro...' : query.error ? 'Falha ao consultar pagamento.' : cancelled
        ? 'Cancelamento registrado. Consulte seus agendamentos para verificar os horarios livres.'
        : query.data ? 'Status atual: ' + query.data.status : 'Pagamento nao encontrado ou nao informado.'} />
    {query.error && <Button onClick={() => void query.refetch()}>Tentar novamente</Button>}
    <div className="flex flex-wrap gap-2">
      <Button asChild><Link to="/app/paciente/dashboard">Voltar ao painel</Link></Button>
      <Button asChild variant="outline"><Link to="/app/paciente/financeiro">Ver pagamentos</Link></Button>
    </div>
  </div>;
}
