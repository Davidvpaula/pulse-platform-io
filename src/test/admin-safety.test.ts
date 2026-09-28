import { afterEach, expect, it, vi } from 'vitest';
import { createBackendFetch } from '@/lib/backend-fetch';
import { INSPECTION_KEY } from '@/lib/inspection-state';
import { requireSuccess } from '@/lib/supabase-result';
import { serializeCSV } from '@/lib/relatorios/utils';
import { localBackendAllowed } from '@/lib/local-backend';
afterEach(() => sessionStorage.clear());
it('não trata um erro retornado pelo banco como sucesso', async () => {
  await expect(requireSuccess(Promise.resolve({data:null,error:{message:'Acesso negado'}}))).rejects.toThrow('Acesso negado');
});
it('bloqueia gravações e RPCs mutativas durante inspeção', async () => {
  sessionStorage.setItem(INSPECTION_KEY,'{}');
  const base=vi.fn(); const request=createBackendFetch(base,false);
  for(const [path,method] of [['/rest/v1/empresas','PATCH'],['/rest/v1/rpc/financeiro_pagamento_confirmar','POST'],['/storage/v1/object/arquivo','POST']]) {
    expect((await request('http://localhost:54321'+path,{method})).status).toBe(403);
  }
  expect(base).not.toHaveBeenCalled();
});
it('impede chamadas externas e permite cadastro interno no modo local', async () => {
  const base=vi.fn().mockResolvedValue(new Response('{}')); const request=createBackendFetch(base,true);
  expect((await request('http://localhost:54321/functions/v1/whatsapp-test-send',{method:'POST'})).status).toBe(503);
  await request('http://localhost:54321/functions/v1/admin-criar-paciente',{method:'POST'});
  expect(base).toHaveBeenCalledTimes(1);
});
it('o login por card exige build de desenvolvimento e backend local', () => {
  expect(localBackendAllowed(false,'true','localhost','http://localhost:54321')).toBe(false);
  expect(localBackendAllowed(true,'true','localhost','https://remote.supabase.co')).toBe(false);
  expect(localBackendAllowed(true,'true','localhost','http://127.0.0.1:54321')).toBe(true);
});
it('CSV preserva aspas/quebras de linha e neutraliza fórmulas', () => {
  expect(serializeCSV([['=1+1','a"b','linha\nnova',-5]])).toBe('"\'=1+1";"a""b";"linha\nnova";"-5"');
});
