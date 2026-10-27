import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ local: true, response: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/local-backend', () => ({ get LOCAL_BACKEND() { return mock.local; } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => { const q = { select: () => q, eq: () => q, maybeSingle: mock.response }; return q; }, rpc: mock.rpc,
} }));
import { getProviderAtual, confirmarPagamento, getPagamento } from '@/lib/pagamentos';
beforeEach(() => { mock.local = true; vi.clearAllMocks(); });
it('não substitui erro de configuração por pagamento simulado', async () => {
  mock.response.mockResolvedValue({ data: null, error: { message: 'offline' } });
  await expect(getProviderAtual()).rejects.toThrow('configuração');
  expect(mock.rpc).not.toHaveBeenCalled();
});
it('recusa configuração ausente ou inválida', async () => {
  for (const value of [undefined, 'outro']) {
    mock.response.mockResolvedValue({ data: value ? { value } : null, error: null });
    await expect(getProviderAtual()).rejects.toThrow('indisponíveis');
  }
});
it('permite simulação somente em ambiente local explícito', async () => {
  mock.response.mockResolvedValue({ data: { value: 'mock' }, error: null });
  await expect(getProviderAtual()).resolves.toBe('mock');
  mock.local = false;
  await expect(getProviderAtual()).rejects.toThrow('indisponíveis');
});
it('confirma segundo o provedor registrado na cobrança', async () => {
  mock.response.mockResolvedValue({ data: { id: 'p', provider: 'stripe' }, error: null });
  await expect(confirmarPagamento('p', 'pix')).rejects.toThrow('webhook');
  expect(mock.rpc).not.toHaveBeenCalled();
});
it('propaga falha de leitura sem fingir pagamento inexistente', async () => {
  mock.response.mockResolvedValue({ data: null, error: { message: 'rede indisponível' } });
  await expect(getPagamento('p')).rejects.toThrow('rede indisponível');
});
