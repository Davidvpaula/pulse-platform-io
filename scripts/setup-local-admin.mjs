import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Só aceita a stack local. Não lê .env nem credenciais do projeto remoto.
const output = execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'json'], { encoding: 'utf8' });
const status = JSON.parse(output.slice(output.indexOf('{')));
if (status.API_URL !== 'http://127.0.0.1:54321') throw new Error('Stack local esperada não encontrada');
execFileSync('docker', ['exec', 'supabase_db_pulse-platform-local', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
  "INSERT INTO pulse_private.ambiente_local (id, habilitado) VALUES (true,true) ON CONFLICT (id) DO UPDATE SET habilitado = true;"], { stdio: 'pipe' });
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { error: paymentConfigError } = await admin.from('app_settings').upsert({ key: 'pagamentos_provider', value: 'mock' }, { onConflict: 'key' });
if (paymentConfigError) throw paymentConfigError;
const filename = '.admin-fixtures.local';
const fixtures = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : {
  admin: { email: 'admin@pulse.local', password: randomBytes(24).toString('base64url') },
  colaborador: { email: 'colaborador@pulse.local', password: randomBytes(24).toString('base64url') },
};
const { data: existing, error: listError } = await admin.auth.admin.listUsers();
for (const key of ['medico', 'medico2', 'paciente', 'paciente2']) {
  fixtures[key] ??= { email: `${key}@pulse.local`, password: randomBytes(24).toString('base64url') };
}
if (listError) throw listError;
for (const [role, fixture] of Object.entries(fixtures)) {
  let user = existing.users.find(u => u.email === fixture.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email: fixture.email, password: fixture.password, email_confirm: true, user_metadata: { nome: `Teste local ${role}` } });
    if (error) throw error;
    user = data.user;
  }
  fixture.id = user.id;
  const { error } = await admin.from('user_roles').upsert({ user_id: user.id, role: role.startsWith('paciente') ? 'paciente' : role.startsWith('medico') ? 'medico' : role === 'colaborador' ? 'secretaria' : role }, { onConflict: 'user_id,role' });
  if (error) throw error;
  if (role === 'colaborador') {
    const { data: current, error: lookupError } = await admin.from('colaboradores').select('id').eq('user_id', user.id).maybeSingle();
    if (lookupError) throw lookupError;
    const { error: colError } = current ? { error: null } : await admin.from('colaboradores').upsert({ user_id: user.id, nome_completo: 'Colaborador de teste local', email: fixture.email, funcao_interna: 'secretaria', status_conta: 'ativo' }, { onConflict: 'user_id' });
    if (colError) throw colError;
  }
  if (role.startsWith('paciente')) {
    const { data: record, error: lookupError } = await admin.from('pacientes').select('id').eq('user_id', user.id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!record) {
      const { error: patientError } = await admin.from('pacientes').insert({ user_id: user.id, nome_completo: 'Paciente ficticio ' + role, status_conta: 'ativo' });
      if (patientError) throw patientError;
    }
  }
  if (role.startsWith('medico')) {
    const { data: record, error: lookupError } = await admin.from('medicos').select('id').eq('user_id', user.id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!record) {
      const { error: doctorError } = await admin.from('medicos').insert({ user_id: user.id, nome: `Médico fictício ${role}`, email: fixture.email,
        crm: role === 'medico' ? 'TESTE001' : 'TESTE002', crm_estado: 'SP', especialidade: 'Clínica Geral', status: 'aprovado', bio: 'Cadastro fictício exclusivo de testes locais.' });
      if (doctorError) throw doctorError;
    }
  }
}
fs.writeFileSync(filename, JSON.stringify(fixtures, null, 2));
fs.writeFileSync('.env.localbackend.local', [
  'VITE_LOCAL_BACKEND=true', 'VITE_LOCAL_PREVIEW=false', 'VITE_DISABLE_EXTERNAL=true',
  `VITE_SUPABASE_URL=${status.API_URL}`, `VITE_SUPABASE_PUBLISHABLE_KEY=${status.ANON_KEY}`,
  `VITE_LOCAL_ADMIN_EMAIL=${fixtures.admin.email}`, `VITE_LOCAL_ADMIN_PASSWORD=${fixtures.admin.password}`,
  `VITE_LOCAL_MEDICO_EMAIL=${fixtures.medico.email}`, `VITE_LOCAL_MEDICO_PASSWORD=${fixtures.medico.password}`,
  `VITE_LOCAL_PACIENTE_EMAIL=${fixtures.paciente.email}`, `VITE_LOCAL_PACIENTE_PASSWORD=${fixtures.paciente.password}`,
  `VITE_LOCAL_COLABORADOR_EMAIL=${fixtures.colaborador.email}`, `VITE_LOCAL_COLABORADOR_PASSWORD=${fixtures.colaborador.password}`,
].join('\n')+'\n');
console.log('Banco local preparado. Dados fictícios preservados. Acesso Admin em http://127.0.0.1:8082/auth');
