import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import MedicoGuard from '@/components/MedicoGuard';

const mock = vi.hoisted(() => ({ uid: 'medico-a', response: vi.fn() }));
vi.mock('@/lib/session', () => ({ useSession: () => ({ session: { user: { id: mock.uid } }, loading: false }) }));
vi.mock('@/lib/local-preview', () => ({ previewProfile: () => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => { const builder = { select: () => builder, eq: () => builder, abortSignal: () => builder, maybeSingle: mock.response }; return builder; },
} }));
let client: QueryClient;
beforeEach(() => {
  mock.uid = 'medico-a';
  mock.response.mockResolvedValue({ data: { id: 'a', user_id: 'medico-a', status: 'aprovado' }, error: null });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); vi.clearAllMocks(); });
const tree = () => <QueryClientProvider client={client}><MemoryRouter><MedicoGuard><p>Atendimento liberado</p></MedicoGuard></MemoryRouter></QueryClientProvider>;
it('não mantém o acesso médico ao trocar de identidade', async () => {
  const view = render(tree());
  await screen.findByText('Atendimento liberado');
  mock.uid = 'sem-cadastro'; mock.response.mockResolvedValue({ data: null, error: null });
  view.rerender(tree());
  expect(screen.queryByText('Atendimento liberado')).toBeNull();
  await screen.findByText('Acesso restrito');
});
it('interrompe acesso quando o cadastro passa a suspenso', async () => {
  render(tree()); await screen.findByText('Atendimento liberado');
  mock.response.mockResolvedValue({ data: { id: 'a', user_id: mock.uid, status: 'suspenso' }, error: null });
  await act(async () => { await client.invalidateQueries({ queryKey: ['medico-atual'] }); });
  await screen.findByText('Conta suspensa');
  expect(screen.queryByText('Atendimento liberado')).toBeNull();
});
it('falha de rede apresenta recuperação e não libera a tela', async () => {
  mock.response.mockRejectedValue(new Error('Conexão indisponível'));
  render(tree());
  await screen.findByText('Não foi possível verificar o cadastro');
  expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  expect(screen.queryByText('Atendimento liberado')).toBeNull();
});
