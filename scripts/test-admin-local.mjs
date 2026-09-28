import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(fs.readFileSync('.env.localbackend.local', 'utf8').trim().split('\n').map(line => {
  const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).trim()];
}));
assert.equal(env.VITE_SUPABASE_URL, 'http://127.0.0.1:54321', 'Teste exclusivo do banco local');
const fixtures = JSON.parse(fs.readFileSync('.admin-fixtures.local', 'utf8'));
const statusText = execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'json'], { encoding: 'utf8' });
const status = JSON.parse(statusText.slice(statusText.indexOf('{')));
assert.equal(status.API_URL, env.VITE_SUPABASE_URL);
const service = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const createdUsers = [];
const results = [];
const client = () => createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = client(), staff = client();
async function ok(promise) { const { data, error } = await promise; if (error) throw error; return data; }
for (const [api, fixture] of [[admin, fixtures.admin], [staff, fixtures.colaborador]]) {
  await ok(api.auth.signInWithPassword({ email: fixture.email, password: fixture.password }));
}
const target = fixtures.colaborador.id;
const key = 'pacientes.ver';
const previous = await ok(admin.from('permissoes_colaborador').select('efeito').eq('user_id', target).eq('permission_key', key).maybeSingle());
const set = efeito => ok(admin.rpc('colaborador_set_permissao', { _user_id: target, _key: key, _efeito: efeito, _motivo: 'Teste automatizado local' }));
const allowed = () => ok(staff.rpc('has_permission', { _user_id: target, _key: key }));
let faqId, logId;
try {
  const faq = await ok(admin.from('faqs').insert({ pergunta: 'Teste automatizado local', resposta: 'Dados fictícios', ordem: 99999, ativo: false }).select('id').single());
  faqId = faq.id;
  await ok(admin.from('faqs').update({ resposta: 'Resposta atualizada' }).eq('id', faqId));
  assert.equal((await ok(admin.from('faqs').select('resposta').eq('id', faqId).single())).resposta, 'Resposta atualizada');
  const anon = client();
  assert.equal((await ok(anon.from('faqs').select('id').eq('id', faqId))).length, 0);
  await ok(admin.from('faqs').update({ ativo: true }).eq('id', faqId));
  assert.equal((await ok(anon.from('faqs').select('id').eq('id', faqId))).length, 1);
  results.push('FAQ: criar, editar, publicar e ocultar para visitante');
  await set('grant'); assert.equal(await allowed(), true);
  await set('revoke'); assert.equal(await allowed(), false);
  await ok(admin.rpc('colaborador_permissoes_lote', { _user_id: target, _modo: 'template', _keys: [key], _motivo: 'Teste preservação de bloqueio' }));
  assert.equal(await allowed(), false);
  const denied = await staff.rpc('colaborador_permissoes_lote', { _user_id: target, _modo: 'template', _keys: [key], _motivo: 'Teste acesso negado' });
  assert.ok(denied.error, 'Colaborador não pode conceder permissões a si mesmo');
  results.push('Permissões: conceder/revogar, preservar bloqueios e negar autoelevação');
  logId = await ok(admin.rpc('impersonation_iniciar', { _target_id: target, _motivo: 'Teste automatizado de inspeção local', _user_agent: 'test-admin-local' }));
  assert.ok(await ok(admin.rpc('admin_inspecionar_usuario', { _log_id: logId })));
  assert.ok((await staff.rpc('admin_inspecionar_usuario', { _log_id: logId })).error);
  await ok(admin.rpc('impersonation_finalizar', { _log_id: logId }));
  assert.ok((await admin.rpc('admin_inspecionar_usuario', { _log_id: logId })).error);
  logId = null;
  results.push('Inspeção: iniciar, ler, restringir a administrador e encerrar');
  // Requisições inválidas não criam cadastros nem enviam convites.
  for (const name of ['admin-criar-paciente', 'admin-invite-colaborador']) {
    const response = await admin.functions.invoke(name, { body: {} });
    assert.equal(response.error?.context?.status, 400, `${name}: validação autenticada deve responder 400`);
    results.push(`${name}: autenticação e validação de entrada`);
  }
  for (const [name, table, extra] of [
    ['admin-criar-paciente', 'pacientes', {}],
    ['admin-invite-colaborador', 'colaboradores', { role: 'secretaria', funcao_interna: 'secretaria' }],
  ]) {
    const email = `teste-${table}-${Date.now()}@pulse.local`;
    // Mailpit local captura os convites. Somente usuários criados aqui são removidos.
    const response = await admin.functions.invoke(name, { body: { email, nome_completo: 'Teste automático descartável', ...extra } });
    const users = await ok(service.auth.admin.listUsers({ perPage: 1000 }));
    const created = users.users.find(user => user.email === email);
    if (created) createdUsers.push(created.id);
    if (response.error) throw new Error(`${name}: ${await response.error.context?.text()}`);
    assert.ok(response.data.ok);
    assert.equal((await ok(admin.from(table).select('user_id').eq('user_id', response.data.user_id).single())).user_id, created.id);
    results.push(`${name}: convite local e cadastro persistido`);
  }
} finally {
  for (const id of createdUsers) await ok(service.auth.admin.deleteUser(id));
  if (faqId) await ok(admin.from('faqs').delete().eq('id', faqId));
  if (logId) await ok(admin.rpc('impersonation_finalizar', { _log_id: logId }));
  if (previous) await set(previous.efeito);
  else await ok(admin.rpc('colaborador_remover_permissao', { _user_id: target, _key: key, _motivo: 'Restaurar fixture local' }));
  await admin.auth.signOut(); await staff.auth.signOut();
  fs.mkdirSync('docs/admin-funcional', { recursive: true });
  fs.writeFileSync('docs/admin-funcional/operacoes-local.json', JSON.stringify({ testedAt: new Date().toISOString(), passed: results }, null, 2) + '\n');
}
console.log(results.join('\n'));
