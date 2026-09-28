import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const cli = 'node_modules/supabase/dist/supabase.js';
if (!fs.existsSync(cli)) throw new Error('Instale as dependências com npm install antes de iniciar.');
try { execFileSync('docker', ['info'], { stdio: 'ignore' }); }
catch { throw new Error('Abra o Docker Desktop e aguarde o motor iniciar. Depois execute novamente.'); }
const run = args => execFileSync(process.execPath, args, { stdio: 'inherit' });
console.log('Preparando os serviços Docker locais…');
// A saída normal de start contém chaves locais; não as reproduzir no terminal.
execFileSync(process.execPath, [cli, 'start', '-x', 'studio,postgres-meta,edge-runtime,logflare,vector,supavisor,imgproxy'], { stdio: ['inherit', 'ignore', 'inherit'] });
run([cli, 'migration', 'up', '--local']);
run(['scripts/setup-local-admin.mjs']);
fs.mkdirSync('logs', { recursive: true });
const children = [];
function start(args, name) {
  const log = fs.openSync(`logs/${name}.log`, 'a');
  const child = spawn(process.execPath, args, { windowsHide: true, stdio: ['ignore', log, log] });
  fs.closeSync(log);
  child.on('error', error => console.error(`${name}: ${error.message}`));
  children.push(child);
}
const reachable = async url => { try { await fetch(url, { signal: AbortSignal.timeout(1500) }); return true; } catch { return false; } };
// Serviços existentes são reutilizados. Não encerra outros projetos Docker.
if (!await reachable('http://127.0.0.1:54321/functions/v1/admin-criar-paciente')) {
  start([cli, 'functions', 'serve', '--env-file', 'supabase/local-functions.env'], 'admin-functions');
} else {
  const response = await fetch('http://127.0.0.1:54321/functions/v1/admin-criar-paciente');
  if (response.status >= 500 || response.status === 404) start([cli, 'functions', 'serve', '--env-file', 'supabase/local-functions.env'], 'admin-functions');
}
if (!await reachable('http://127.0.0.1:8082/auth')) {
  start(['node_modules/vite/bin/vite.js', '--mode', 'localbackend', '--port', '8082', '--strictPort', '--host', '127.0.0.1'], 'admin-frontend');
}
console.log('\nAdmin: http://127.0.0.1:8082/auth\nConvites locais: http://127.0.0.1:54324\nLogs: pasta logs. Mantenha este terminal aberto.');
function stop() { for (const child of children) child.kill(); process.exit(0); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
