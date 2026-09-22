import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Inventário estático, sem conexão com banco, sem ler .env e sem executar código da aplicação.
const out = 'docs/auditoria-dashboards';
const read = f => fs.readFileSync(f, 'utf8');
const unique = a => [...new Set(a)];
const walk = d => fs.readdirSync(d, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const files = walk('src').filter(f => /\.[jt]sx?$/.test(f));
const sources = new Map();
function resolve(from, spec) {
  const base = spec.startsWith('@/') ? `src/${spec.slice(2)}` : spec.startsWith('.') ? path.posix.normalize(`${path.posix.dirname(from)}/${spec}`) : null;
  return base && [base, `${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`].find(f => fs.existsSync(f) && fs.statSync(f).isFile());
}
for (const file of files) {
  const text = read(file), ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const info = {file, lines:text.split('\n').length, functions:[], calls:[], imports:[], titles:[], markers:[]};
  const line = n => ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1;
  function visit(n) {
    if (ts.isFunctionDeclaration(n) && n.name) info.functions.push({name:n.name.text, line:line(n)});
    if (ts.isVariableDeclaration(n) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) info.functions.push({name:n.name.getText(ast),line:line(n)});
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      const target = resolve(file,n.moduleSpecifier.text);
      if(target) info.imports.push(target);
    }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const method = n.expression.name.text;
      if (['from','rpc','invoke','insert','update','upsert','delete','upload','createSignedUrl','channel'].includes(method)) {
        const arg = n.arguments[0];
        info.calls.push({method, target: arg && ts.isStringLiteral(arg) ? arg.text : '(dinâmico)',line:line(n)});
      }
    }
    if(ts.isJsxAttribute(n) && ['title','description'].includes(n.name.getText(ast)) && n.initializer && ts.isStringLiteral(n.initializer)) info.titles.push(n.initializer.text);
    ts.forEachChild(n, visit);
  }
  visit(ast);
  text.split('\n').forEach((s,i) => {if(/em breve|simulad|TODO|FIXME|Math\.random|mock/i.test(s)) info.markers.push({line:i+1,text:s.trim()});});
  sources.set(file,info);
}
const app=read('src/App.tsx');
const ast=ts.createSourceFile('src/App.tsx',app,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const bindings=new Map([...app.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\("(@\/[^\"]+)"\)/g)].map(m=>[m[1],resolve('src/App.tsx',m[2])]));
const routes=[];
function routesVisit(n) {
 if(ts.isJsxSelfClosingElement(n) && n.tagName.getText(ast)==='Route') {
  const attrs=n.attributes.properties;
  const p=attrs.find(a=>a.name?.getText(ast)==='path');
  if(p?.initializer && ts.isStringLiteral(p.initializer)) {
   const raw=p.initializer.text, element=attrs.find(a=>a.name?.getText(ast)==='element')?.initializer?.getText(ast)||'';
   const components=[...element.matchAll(/<([A-Z]\w*)\b/g)].map(m=>m[1]);
   routes.push({path:raw.startsWith('/')||raw==='*'?raw:`/app/${raw}`,line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1,element,components,files:unique(components.map(c=>bindings.get(c)).filter(Boolean)),redirect:element.match(/<Navigate to="([^"]+)"/)?.[1]||null,guard:element.includes('<G ')?`Permissão ${element.match(/perm=(.*?)(?: all)?[>]/)?.[1]||''}${element.includes(' all>')?' (todas)':' (uma basta, se lista)'}`:components.filter(c=>/Guard/.test(c)).join(' + ')||'Somente sessão no layout /app; verificar controles internos'});
  }
 }
 ts.forEachChild(n,routesVisit);
}
routesVisit(ast);
const groups={admin:['admin'],paciente:['paciente','agendamento'],medico:['medico'],colaborador:['colaborador','secretaria','supervisor'],empresa:['empresa'],comunicacao:['comunicacao']};
const sqlFiles=walk('supabase/migrations').filter(f=>f.endsWith('.sql')).sort();
const definitions=new Map();
for(const file of sqlFiles) {
 const text=read(file);
 for(const m of text.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?"?(\w+)"?\s*\(/gi)) {
  const entries=definitions.get(m[1])||[];
  entries.push({file,line:text.slice(0,m.index).split('\n').length}); definitions.set(m[1],entries);
 }
}
const esc=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' ');
const link=(file,line)=>`[${file}${line?`:${line}`:''}](../../${file}${line?`#L${line}`:''})`;
fs.mkdirSync(out,{recursive:true});
const data={generatedAt:'2026-09-22',method:'AST TypeScript; chamadas literais e funções nomeadas; não prova execução ou autorização no servidor',routes,sources:[...sources.values()].filter(s=>s.file.startsWith('src/pages/app/'))};
fs.writeFileSync(`${out}/inventario.json`,JSON.stringify(data,null,2)+'\n');
for(const [group,prefixes] of Object.entries(groups)) {
 const rs=routes.filter(r=>prefixes.some(p=>r.path.startsWith(`/app/${p}/`)));
 const active=unique(rs.flatMap(r=>r.files));
 const own=[...sources.keys()].filter(f=>prefixes.some(p=>f.startsWith(`src/pages/app/${p}/`)));
 const all=unique([...active,...own]).sort();
 let md=`# Inventário técnico — ${group}\n\nGerado por \`node scripts/audit-dashboards.mjs\`. Consulte o relatório principal para interpretação e achados. Funções nomeadas e chamadas diretas são extraídas por AST; callbacks anônimos não são enumerados como funções independentes. Um símbolo presente não comprova funcionalidade concluída.\n\n## Rotas (${rs.length})\n\nTodas herdam autenticação do layout /app. O preview local dispensa os guards e não serve para testar permissões reais.\n\n| Rota | Página / destino | Controle adicional no roteador | Fonte |\n|---|---|---|---|\n`;
 for(const r of rs) md+=`| \`${r.path}\` | ${r.redirect?`Redireciona para \`${r.redirect}\``:r.files.map(f=>link(f)).join(', ')||esc(r.components.join(', '))} | ${esc(r.guard)} | ${link('src/App.tsx',r.line)} |\n`;
 md+='\n## Páginas e funções encontradas\n\n“Sem rota direta” significa apenas ausência de associação direta no App.tsx; o arquivo pode ser importado por outra página. As tabelas/fontes em `.from()` podem incluir buckets de Storage.\n';
 for(const f of all) {
  const s=sources.get(f); if(!s) continue;
  const use=rs.filter(r=>r.files.includes(f)).map(r=>r.path);
  md+=`\n### ${path.posix.basename(f)}\n\nFonte: ${link(f)} (${s.lines} linhas). ${use.length?`Rotas: ${use.map(x=>'`'+x+'`').join(', ')}.`:'Sem rota direta neste grupo.'}\n\n`;
  if(s.titles.length) md+=`Funções da interface, conforme títulos e descrições: ${unique(s.titles).map(esc).join('; ')}.\n\n`;
  md+=`Funções nomeadas: ${s.functions.map(x=>link(f,x.line)+' `'+x.name+'`').join('; ')||'nenhuma declaração nomeada detectada'}.\n\n`;
  const direct=s.calls.filter(c=>['from','rpc','invoke','channel'].includes(c.method));
  md+=`Dados e integrações diretas: ${direct.map(c=>'`'+c.method+'('+c.target+')` '+link(f,c.line)).join('; ')||'sem chamada direta identificada; consultar componentes/helpers importados'}.\n\n`;
  md+=`Operações diretas detectadas: ${unique(s.calls.filter(c=>!['from','rpc','invoke','channel'].includes(c.method)).map(c=>c.method)).join(', ')||'nenhuma'}.\n\n`;
  const imports=s.imports.filter(p=>!p.startsWith('src/components/ui/'));
  md+=`Dependências locais diretas: ${imports.map(p=>link(p)).join('; ')||'nenhuma'}.\n`;
  if(s.markers.length) md+='\nMarcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):\n\n'+s.markers.map(m=>`- ${link(f,m.line)}: ${esc(m.text)}`).join('\n')+'\n';
 }
 const closure=new Set();
 function expand(f) {if(closure.has(f))return;closure.add(f); for(const dep of sources.get(f)?.imports||[]) if(!dep.startsWith('src/components/ui/') && !dep.endsWith('/types.ts'))expand(dep);}
 active.forEach(expand);
 md+='\n## Integrações alcançáveis por imports locais\n\nEste mapa inclui helpers/componentes importados e pode conter funções não executadas por esta tela. Não é uma prova de fluxo em execução. Definições SQL são candidatas presentes no histórico; não certificam o schema implantado, grants nem políticas resultantes.\n\n| Tipo | Nome | Chamada | Implementação no repositório |\n|---|---|---|---|\n';
 const seen=new Set();
 for(const f of [...closure].sort())for(const c of sources.get(f)?.calls||[]) {
  if(!['rpc','invoke'].includes(c.method))continue;
  const key=`${f}:${c.method}:${c.target}`;if(seen.has(key))continue;seen.add(key);
  const defs=definitions.get(c.target)||[];
  const edge=`supabase/functions/${c.target}/index.ts`;
  md+=`| ${c.method} | \`${c.target}\` | ${link(f,c.line)} | ${c.method==='rpc'?(defs.map(d=>link(d.file,d.line)).join('; ')||'Definição não localizada pelo extrator'):(fs.existsSync(edge)?link(edge):'Implementação não localizada pelo extrator')} |\n`;
 }
 fs.writeFileSync(`${out}/INVENTARIO-${group.toUpperCase()}.md`,md);
}
console.log(JSON.stringify({routes:routes.length,groups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,routes.filter(r=>v.some(p=>r.path.startsWith(`/app/${p}/`))).length])),pages:data.sources.length},null,2));
