import fs from 'node:fs';
import path from 'node:path';
const dir='docs/auditoria-dashboards';
const data=JSON.parse(fs.readFileSync(`${dir}/inventario.json`,'utf8'));
const errors=[];
let links=0,findings=0;
const groups={ADMIN:['admin'],PACIENTE:['paciente','agendamento'],MEDICO:['medico'],COLABORADOR:['colaborador','secretaria','supervisor'],EMPRESA:['empresa'],COMUNICACAO:['comunicacao']};
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.md'))) {
 const text=fs.readFileSync(`${dir}/${file}`,'utf8');
 findings+=(text.match(/^### (?:ADM|PAC|MED|COL|EMP|COM)-\d+/gm)||[]).length;
 for(const m of text.matchAll(/\[[^\]\n]*\]\(([^)]+)\)/g)) {
  if(/^(?:https?:|#)/.test(m[1]))continue;
  links++;
  const [target,anchor]=m[1].split('#');
  const resolved=path.resolve(dir,target);
  if(!fs.existsSync(resolved))errors.push(`${file}: link inexistente ${m[1]}`);
  else if(anchor && /^L\d+$/.test(anchor) && Number(anchor.slice(1))>fs.readFileSync(resolved,'utf8').split('\n').length)errors.push(`${file}: linha inválida ${m[1]}`);
 }
}
for(const [group,prefixes] of Object.entries(groups)) {
 const text=fs.readFileSync(`${dir}/INVENTARIO-${group}.md`,'utf8');
 const routes=data.routes.filter(r=>prefixes.some(p=>r.path.startsWith(`/app/${p}/`)));
 for(const r of routes)if(!text.includes('`'+r.path+'`'))errors.push(`${group}: rota ausente ${r.path}`);
}
const result={command:'node scripts/verify-dashboard-audit.mjs',date:'2026-09-22',linksChecked:links,findings,routes:data.routes.length,errors};
fs.writeFileSync(`${dir}/verificacao.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
