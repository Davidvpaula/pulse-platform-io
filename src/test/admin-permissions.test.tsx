import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePermission, clearPermissionCache } from '@/lib/permissions/usePermission';
const mock = vi.hoisted(() => ({ uid: 'a', rpc: vi.fn(), response: vi.fn() }));
vi.mock('@/lib/session', () => ({ useSession: () => ({ session: { user: { id: mock.uid } }, loading: false }) }));
vi.mock('@/lib/local-preview', () => ({ previewProfile: () => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mock.rpc,
  channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
  removeChannel: vi.fn(),
} }));
let client: QueryClient;
beforeEach(() => {
  mock.uid = 'a';
  mock.rpc.mockImplementation(() => ({ abortSignal: () => mock.response() }));
  mock.response.mockResolvedValue({ data: [{ permission_key: 'pacientes.ver', allowed: true }], error: null });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); vi.clearAllMocks(); });
function Consumer() {
  const result = usePermission('pacientes.ver');
  return <output>{result.loading ? 'carregando' : result.hasAny ? 'liberado' : 'bloqueado'}</output>;
}
const tree = () => <QueryClientProvider client={client}><Consumer /></QueryClientProvider>;
it('revoga a permissão de uma tela montada ao invalidar', async () => {
  render(tree());
  await screen.findByText('liberado');
  mock.response.mockResolvedValue({ data: [{ permission_key: 'pacientes.ver', allowed: false }], error: null });
  act(() => clearPermissionCache());
  await screen.findByText('bloqueado');
});
it('não conserva a autorização de outra identidade', async () => {
  const view=render(tree());
  await screen.findByText('liberado');
  mock.uid='b';
  mock.response.mockResolvedValue({ data: [], error: null });
  view.rerender(tree());
  expect(screen.queryByText('liberado')).toBeNull();
  await screen.findByText('bloqueado');
  await waitFor(() => expect(mock.rpc).toHaveBeenLastCalledWith('has_permissions_batch',{_user_id:'b',_keys:['pacientes.ver']}));
});
it('nega em erro do banco em vez de manter o grant anterior', async () => {
  render(tree());
  await screen.findByText('liberado');
  mock.response.mockResolvedValue({ data: null, error: { message: 'banco indisponível' } });
  act(() => clearPermissionCache());
  await screen.findByText('bloqueado');
});
