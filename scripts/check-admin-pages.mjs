import fs from 'node:fs';
import { chromium } from '@playwright/test';
const inventory=JSON.parse(fs.readFileSync('docs/auditoria-dashboards/inventario.json','utf8'));
const role = process.argv.includes('--medico') ? 'medico' : 'admin';
const directory = `docs/${role}-funcional`;
const excluded=/\/(feegow|integracoes|whatsapp|ia-medicos|comunicacao\/producao|pendencias-integracao)/;
const routes=inventory.routes.filter(r=>r.path.startsWith(`/app/${role}/`)&&!r.redirect&&!r.path.includes(':')&&!excluded.test(r.path));
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext();
// Nunca permitir rede externa durante a homologação.
await context.route('**/*',route=>{
 const u=new URL(route.request().url());
 return ['127.0.0.1','localhost'].includes(u.hostname)?route.continue():route.abort();
});
const page=await context.newPage();
await page.goto('http://127.0.0.1:8082/auth');
await page.getByRole('button',{name:role === 'admin' ? 'Entrar como administrador' : 'Entrar como médico'}).click();
await page.waitForURL(`**/app/${role}/dashboard`);
await page.waitForTimeout(1500);
const results=[];
for(const route of routes) {
 const errors=[];
 const onError=e=>errors.push({type:'pageerror',message:e.message});
 const onResponse=async r=>{if(r.url().includes(':54321/')&&r.status()>=400)errors.push({type:'http',status:r.status(),url:r.url().replace(/\?.*/,''),body:(await r.text().catch(()=>'' )).slice(0,900)});};
 page.on('pageerror',onError);page.on('response',onResponse);
 try {
  await page.goto(`http://127.0.0.1:8082${route.path}`);
  await page.waitForTimeout(1800);
  results.push({route:route.path,errors,text:(await page.locator('main').innerText().catch(()=>page.locator('body').innerText())).slice(0,1300)});
 }catch(e){results.push({route:route.path,errors:[...errors,{message:e.message}]});}
 page.off('pageerror',onError);page.off('response',onResponse);
 console.log(`${route.path}: ${errors.length} erros`);
 fs.mkdirSync(directory,{recursive:true});
 fs.writeFileSync(`${directory}/rotas-local.json`,JSON.stringify(results,null,2));
}
fs.mkdirSync(directory,{recursive:true});
fs.writeFileSync(`${directory}/rotas-local.json`,JSON.stringify(results,null,2));
await browser.close();
