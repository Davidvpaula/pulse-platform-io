import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const raw = execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'json'], {encoding:'utf8'});
const status = JSON.parse(raw.slice(raw.indexOf('{')));
assert.equal(status.API_URL, 'http://127.0.0.1:54321');
const fixtures = JSON.parse(fs.readFileSync('.admin-fixtures.local','utf8'));
const opts = {auth:{persistSession:false,autoRefreshToken:false}};
const service = createClient(status.API_URL,status.SERVICE_ROLE_KEY,opts);
const doctor = createClient(status.API_URL,status.ANON_KEY,opts), other = createClient(status.API_URL,status.ANON_KEY,opts);
const ok = async promise => { const {data,error} = await promise; if(error) throw error; return data; };
// Recupera somente fixtures descartáveis deste teste deixadas por uma interrupção.
const oldUsers=await ok(service.auth.admin.listUsers({perPage:1000}));
for(const user of oldUsers.users.filter(u=>/^paciente-teste-\d+@pulse\.local$/.test(u.email ?? ''))) {
  const patients=await ok(service.from('pacientes').select('id').eq('user_id',user.id));
  for(const patient of patients) {
    await ok(service.from('retornos_gratuitos').delete().eq('paciente_id',patient.id));
    await ok(service.from('documentos_paciente').delete().eq('paciente_id',patient.id));
    await ok(service.from('consultas').delete().eq('paciente_id',patient.id));
    await ok(service.from('pacientes').delete().eq('id',patient.id));
  }
  await ok(service.auth.admin.deleteUser(user.id));
}
for(const [api,key] of [[doctor,'medico'],[other,'medico2']]) await ok(api.auth.signInWithPassword({email:fixtures[key].email,password:fixtures[key].password}));
const medico = await ok(doctor.from('medicos').select('id,bio').eq('user_id',fixtures.medico.id).single());
const previousForms = await ok(service.from('medico_formacoes').select('*').eq('medico_id',medico.id));
const created = {patient:null,consult:null,slot:null,user:null,storage:null,document:null};
const passed=[];
let browser, page;
try {
  const {user} = await ok(service.auth.admin.createUser({email:`paciente-teste-${Date.now()}@pulse.local`,email_confirm:true})); created.user=user.id;
  const paciente=await ok(service.from('pacientes').insert({user_id:user.id,nome_completo:'Paciente fictício de validação'}).select('id').single()); created.patient=paciente.id;
  const consulta=await ok(service.from('consultas').insert({medico_id:medico.id,paciente_id:paciente.id,inicio:new Date().toISOString(),fim:new Date(Date.now()+1800000).toISOString(),modalidade:'presencial',status:'agendada',valor_centavos:0}).select('id').single()); created.consult=consulta.id;
  const attachments = await ok(service.from('anexos_consulta').insert(['privado-a.txt','privado-b.txt'].map(nome=>({consulta_id:consulta.id,uploader_id:fixtures.medico.id,nome_arquivo:nome,storage_path:`${consulta.id}/${nome}`}))).select('id,visibilidade_empresa'));
  await doctor.from('consultas').update({valor_centavos:99999}).eq('id',consulta.id);
  assert.equal((await ok(service.from('consultas').select('valor_centavos').eq('id',consulta.id).single())).valor_centavos,0);
  passed.push('Médico não altera valores financeiros por UPDATE direto');
  assert.equal((await ok(other.from('consultas').select('id').eq('id',consulta.id))).length,0);
  assert.equal((await ok(other.from('anexos_consulta').select('id').eq('consulta_id',consulta.id))).length,0);
  assert.ok((await other.rpc('medico_compartilhar_anexo',{_anexo_id:attachments[0].id,_compartilhar:true})).error);
  await ok(doctor.rpc('medico_compartilhar_anexo',{_anexo_id:attachments[0].id,_compartilhar:true}));
  const visible = await ok(doctor.from('anexos_consulta').select('id,visibilidade_empresa').eq('consulta_id',consulta.id));
  assert.equal(visible.find(a=>a.id===attachments[0].id).visibilidade_empresa,true);
  assert.equal(visible.find(a=>a.id===attachments[1].id).visibilidade_empresa,false);
  assert.equal((await ok(doctor.from('anexo_compartilhamento_log').select('id').eq('anexo_id',attachments[0].id))).length,1);
  passed.push('Compartilhamento individual auditado; segundo anexo permanece privado; outro médico bloqueado');
  const storagePath = `${user.id}/${consulta.id}/teste.pdf`;
  await ok(doctor.storage.from('paciente-docs').upload(storagePath, Buffer.from('%PDF-1.4\n% Documento ficticio para teste de transporte\n%%EOF'), {contentType:'application/pdf'}));
  created.storage = storagePath;
  const document = await ok(doctor.from('documentos_paciente').insert({paciente_id:paciente.id,user_id:user.id,tipo:'prescricao',titulo:'PDF fictício de transporte',storage_path:storagePath,mime_type:'application/pdf',consulta_id:consulta.id,uploaded_by:fixtures.medico.id}).select('id').single());
  created.document=document.id;
  assert.ok((await ok(doctor.storage.from('paciente-docs').createSignedUrl(storagePath,60))).signedUrl);
  assert.ok((await other.storage.from('paciente-docs').createSignedUrl(storagePath,60)).error);
  assert.equal((await ok(other.from('documentos_paciente').select('id').eq('id',document.id))).length,0);
  passed.push('PDF: envio, registro e leitura autorizada; segundo médico sem acesso');
  const transition = (api,state) => api.rpc('medico_transicionar_consulta',{_consulta_id:consulta.id,_status:state});
  assert.ok((await transition(other,'em_andamento')).error);
  assert.ok((await transition(doctor,'concluida')).error);
  if (process.argv.includes('--browser')) {
    const {chromium, expect} = await import('@playwright/test');
    browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext();
    await context.route('**/*',route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
    page=await context.newPage();
    await page.goto('http://127.0.0.1:8082/auth');
    await page.getByRole('button',{name:'Entrar como médico',exact:true}).click();
    await page.waitForURL('**/app/medico/dashboard');
    await expect(page.getByText('Sem permissão financeira',{exact:true})).toHaveCount(0);
    await page.goto('http://127.0.0.1:8082/app/medico/documentos');
    await expect(page.getByRole('button',{name:'PDF fictício de transporte',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Emitir prescrição',exact:true})).toHaveCount(0);
    page.once('dialog',dialog=>dialog.accept());
    await page.getByRole('button',{name:'privado-b.txt · Privado',exact:true}).click();
    await expect(page.getByRole('button',{name:'privado-b.txt · Compartilhado',exact:true})).toBeVisible();
    await page.goto('http://127.0.0.1:8082/app/medico/consultas');
    await page.getByRole('button',{name:'Iniciar',exact:true}).click();
    await expect(page.getByRole('button',{name:'Finalizar',exact:true})).toBeVisible();
    passed.push('Navegador: cartão médico, receita própria, documentos sem emissão simulada, compartilhamento e início de consulta');
  }
  await Promise.all([ok(transition(doctor,'em_andamento')),ok(transition(doctor,'em_andamento'))]);
  assert.equal((await ok(doctor.from('consultas').select('status').eq('id',consulta.id).single())).status,'em_andamento');
  if(page) {
    const {expect}=await import('@playwright/test');
    await page.getByRole('button',{name:'Finalizar',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Finalizar atendimento',exact:true});
    await expect(dialog.getByText(/simulado/)).toHaveCount(0);
    await dialog.getByRole('button',{name:'Finalizar atendimento',exact:true}).click();
    await expect(dialog).toBeHidden();
    const retorno=page.getByRole('dialog',{name:'Consulta concluída',exact:true});
    await retorno.getByRole('button',{name:'Concluir e liberar retorno',exact:true}).click();
    await expect(retorno).toBeHidden();
    assert.equal((await ok(doctor.from('retornos_gratuitos').select('id').eq('consulta_origem_id',consulta.id))).length,1);
    await page.goto('http://127.0.0.1:8082/app/medico/perfil');
    await page.locator('textarea').first().fill('Perfil validado no navegador local');
    await page.getByRole('button',{name:'Salvar perfil',exact:true}).click();
    await expect.poll(async()=> (await ok(doctor.from('medicos').select('bio').eq('id',medico.id).single())).bio).toBe('Perfil validado no navegador local');
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+1), 'Perfil sem rolagem horizontal em celular');
    passed.push('Navegador: finalização sem pagamento simulado, perfil persistido e layout móvel');
  }
  await ok(transition(doctor,'concluida'));
  assert.ok((await transition(doctor,'em_andamento')).error);
  assert.equal((await ok(service.from('pagamentos').select('id').eq('consulta_id',consulta.id))).length,0);
  passed.push('Consulta: início concorrente idempotente, conclusão, transições inválidas e ausência de pagamento simulado');
  await ok(doctor.from('medicos').update({bio:'Biografia de teste local'}).eq('id',medico.id).select('id').single());
  await ok(doctor.from('medicos').update({status:'bloqueado'}).eq('id',medico.id));
  assert.equal((await ok(doctor.from('medicos').select('status').eq('id',medico.id).single())).status,'aprovado');
  passed.push('Perfil: edição pessoal permitida e alteração administrativa de status negada');
  const slot=await ok(doctor.from('agenda_slots').insert({medico_id:medico.id,inicio:new Date(Date.now()+86400000).toISOString(),fim:new Date(Date.now()+88200000).toISOString(),modalidade:'presencial',status:'disponivel'}).select('id').single()); created.slot=slot.id;
  await ok(doctor.from('agenda_slots').delete().eq('id',slot.id)); created.slot=null;
  passed.push('Horário presencial: criação e exclusão pelo médico');
  const formations=[{titulo:'Formação fictícia',instituicao:'Instituição de teste',status:'concluido'}];
  await ok(doctor.rpc('medico_salvar_formacoes',{_formacoes:formations}));
  assert.ok((await doctor.rpc('medico_salvar_formacoes',{_formacoes:[{...formations[0],status:'invalido'}]})).error);
  assert.equal((await ok(doctor.from('medico_formacoes').select('titulo').eq('medico_id',medico.id).single())).titulo,formations[0].titulo);
  await ok(doctor.rpc('medico_salvar_formacoes',{_formacoes:[]}));
  assert.equal((await ok(doctor.from('medico_formacoes').select('id').eq('medico_id',medico.id))).length,0);
  passed.push('Formações: substituição atômica, erro preserva dados anteriores e remoção de todas');
} catch(error) {
  if(page) { console.error((await page.locator('body').innerText()).slice(-2200)); }
  throw error;
} finally {
  if(browser) await browser.close();
  await ok(service.from('medicos').update({bio:medico.bio}).eq('id',medico.id));
  await ok(service.from('medico_formacoes').delete().eq('medico_id',medico.id));
  if(previousForms.length) await ok(service.from('medico_formacoes').insert(previousForms));
  if(created.storage) await ok(service.storage.from('paciente-docs').remove([created.storage]));
  if(created.document) await ok(service.from('documentos_paciente').delete().eq('id',created.document));
  if(created.slot) await ok(service.from('agenda_slots').delete().eq('id',created.slot));
  if(created.consult) {
    await ok(service.from('retornos_gratuitos').delete().eq('consulta_origem_id',created.consult));
    await ok(service.from('consultas').delete().eq('id',created.consult));
  }
  if(created.patient) await ok(service.from('pacientes').delete().eq('id',created.patient));
  if(created.user) await ok(service.auth.admin.deleteUser(created.user));
  await doctor.auth.signOut(); await other.auth.signOut();
  fs.mkdirSync('docs/medico-funcional',{recursive:true});
  fs.writeFileSync('docs/medico-funcional/operacoes-local.json',JSON.stringify({testedAt:new Date().toISOString(),passed},null,2)+'\n');
}
console.log(passed.join('\n'));
