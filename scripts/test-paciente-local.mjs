import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const raw = execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js','status','-o','json'], {encoding:'utf8'});
const status = JSON.parse(raw.slice(raw.indexOf('{')));
assert.equal(status.API_URL,'http://127.0.0.1:54321');
const fixture = JSON.parse(fs.readFileSync('.admin-fixtures.local','utf8'));
const opts = {auth:{persistSession:false,autoRefreshToken:false}};
const service = createClient(status.API_URL,status.SERVICE_ROLE_KEY,opts);
const patient = createClient(status.API_URL,status.ANON_KEY,opts), other = createClient(status.API_URL,status.ANON_KEY,opts);
const ok = async promise => { const {data,error} = await promise; if(error) throw error; return data; };
for(const [api,key] of [[patient,'paciente'],[other,'paciente2']]) await ok(api.auth.signInWithPassword({email:fixture[key].email,password:fixture[key].password}));
const p = await ok(service.from('pacientes').select('*').eq('user_id',fixture.paciente.id).single());
const p2 = await ok(service.from('pacientes').select('*').eq('user_id',fixture.paciente2.id).single());
const doctor = await ok(service.from('medicos').select('id').eq('user_id',fixture.medico.id).single());
const run = randomUUID();
const created = {slots:[],payments:[],consults:[],dependent:null,specialty:null,storage:null,doc:null,coupon:null,voucher:null};
const passed=[];
const originalProfile=await ok(service.from('profiles').select('nome,telefone').eq('id',fixture.paciente.id).single());
let extraDoc;
let browser, page;
const profileFields=['nome_completo','cpf','telefone','data_nascimento','sexo','cep'];
const cpf = () => { let s=String(Math.floor(Math.random()*900000000)+100000000); for(let n=10;n<=11;n++){let sum=0;for(let i=0;i<n-1;i++)sum+=Number(s[i])*(n-i);s+=String((sum*10%11)%10);}return s; };
const reserve = (api, slot, individualCpf) => api.rpc('reservar_slot_unificado',{
  _slot_id:slot,_tipo:'especialidade',_referencia_id:created.specialty,_nome_completo:'Paciente Teste Local',_cpf:individualCpf,
  _telefone:'11999999999',_data_nascimento:'1990-01-01',_sexo:'nao_informado',_cep:'01001000',_motivo:'Teste local automatizado',
});
const checkout = (api, slot, dependent=null) => api.rpc('paciente_checkout_local',{
  _slot_id:slot,_tipo:'especialidade',_referencia_id:created.specialty,_paciente_atendido_id:dependent,
});
try {
  assert.equal((await ok(other.from('pacientes').select('id').eq('id',p.id))).length,0);
  assert.ok((await patient.from('pacientes').update({status_conta:'banido'}).eq('id',p.id)).error);
  assert.equal((await ok(service.from('pacientes').select('status_conta').eq('id',p.id).single())).status_conta,p.status_conta);
  passed.push('Isolamento entre pacientes e proteção de status administrativo');
  created.dependent = await ok(patient.rpc('paciente_criar_dependente',{_nome:'Dependente Teste Local',_cpf:cpf(),_nascimento:'2015-01-01',_sexo:'nao_informado',_parentesco:'Filho(a)',_termo:'Consentimento fictício para teste local automatizado.'}));
  assert.equal((await ok(patient.from('dependente_consentimentos').select('id').eq('dependente_id',created.dependent))).length,1);
  assert.equal((await ok(other.from('pacientes').select('id').eq('id',created.dependent))).length,0);
  await ok(patient.from('pacientes').update({nome_completo:'Dependente Atualizado'}).eq('id',created.dependent));
  assert.ok((await patient.from('pacientes').update({user_id:fixture.paciente2.id}).eq('id',created.dependent)).error);
  const before=(await ok(patient.from('pacientes').select('id').eq('responsavel_id',p.id))).length;
  assert.ok((await patient.rpc('paciente_criar_dependente',{_nome:'Invalido Local',_cpf:'11111111111',_nascimento:'2015-01-01',_sexo:'nao_informado',_parentesco:'Filho(a)',_termo:'Consentimento fictício para teste local.'})).error);
  assert.equal((await ok(patient.from('pacientes').select('id').eq('responsavel_id',p.id))).length,before);
  passed.push('Dependente: cadastro e consentimento atômicos, edição, CPF inválido rejeitado e titularidade protegida');
  const esp=await ok(service.from('especialidades').insert({nome:`Teste paciente ${run}`,slug:`teste-${run}`,ativo:true}).select('id').single());created.specialty=esp.id;
  await ok(service.from('medico_especialidades').insert({medico_id:doctor.id,especialidade_id:esp.id,preco_centavos:12345,duracao_minutos:30,ativo:true}));
  for(let i=0;i<3;i++){
    const start=Date.now()+86400000*(5+i);
    const slot=await ok(service.from('agenda_slots').insert({medico_id:doctor.id,inicio:new Date(start).toISOString(),fim:new Date(start+1800000).toISOString(),modalidade:'presencial',status:'disponivel'}).select('id').single());created.slots.push(slot.id);
  }
  const ownCpf=cpf(), otherCpf=cpf();
  const result=await Promise.all([reserve(patient,created.slots[0],ownCpf),reserve(other,created.slots[0],otherCpf)]);
  assert.equal(result.filter(r=>r.data?.ok).length,1);
  const winner=result[0].data?.ok?patient:other;
  const loser=winner===patient?other:patient;
  assert.ok((await checkout(loser,created.slots[0])).error);
  const concurrentPayment=await ok(checkout(winner,created.slots[0]));created.payments.push(concurrentPayment);
  await ok(winner.rpc('paciente_cancelar_pagamento',{_pagamento_id:concurrentPayment}));
  passed.push('Concorrência: somente um paciente reserva o horário; outro não cria cobrança');
  assert.equal((await ok(reserve(patient,created.slots[1],ownCpf))).ok,true);
  assert.ok((await checkout(patient,created.slots[1],p2.id)).error);
  const payment=await ok(checkout(patient,created.slots[1],created.dependent));created.payments.push(payment);
  assert.equal(await ok(checkout(patient,created.slots[1],created.dependent)),payment);
  await patient.from('pagamentos').update({status:'pago',valor_centavos:1}).eq('id',payment);
  const unchanged=await ok(service.from('pagamentos').select('status,valor_centavos').eq('id',payment).single());
  assert.equal(unchanged.status,'pendente');assert.equal(unchanged.valor_centavos,12345);
  assert.equal((await ok(other.from('pagamentos').select('id').eq('id',payment))).length,0);
  assert.ok((await other.rpc('paciente_confirmar_pagamento_local',{_pagamento_id:payment})).error);
  assert.ok((await patient.rpc('criar_consulta_pos_pagamento',{_pagamento_id:payment})).error);
  const coupon=await ok(service.from('cupons').insert({codigo:run.replaceAll('-','').slice(0,12).toUpperCase(),nome:'Cupom local',tipo:'percentual',valor:10,uso_maximo:1,ativo:true}).select('id,codigo').single());created.coupon=coupon.id;
  assert.ok((await other.rpc('validar_e_aplicar_cupom',{_pagamento_id:payment,_codigo:coupon.codigo})).error);
  const discount=await ok(patient.rpc('validar_e_aplicar_cupom',{_pagamento_id:payment,_codigo:coupon.codigo}));assert.equal(discount.valor_final_centavos,11110);
  await ok(patient.rpc('remover_cupom_pagamento',{_pagamento_id:payment}));
  assert.equal((await ok(patient.from('pagamentos').select('valor_centavos').eq('id',payment).single())).valor_centavos,12345);
  await ok(patient.rpc('validar_e_aplicar_cupom',{_pagamento_id:payment,_codigo:coupon.codigo}));
  const confirmations=await Promise.all([ok(patient.rpc('paciente_confirmar_pagamento_local',{_pagamento_id:payment})),ok(patient.rpc('paciente_confirmar_pagamento_local',{_pagamento_id:payment}))]);
  assert.equal(confirmations[0].consulta_id,confirmations[1].consulta_id);created.consults.push(confirmations[0].consulta_id);
  const consult=await ok(patient.from('consultas').select('*').eq('id',created.consults[0]).single());
  assert.equal(consult.paciente_atendido_id,created.dependent);assert.equal(consult.valor_centavos,11110);
  assert.equal((await ok(service.from('cupons_uso').select('id').eq('consulta_id',consult.id))).length,1);
  assert.equal((await ok(service.from('cupons').select('uso_atual').eq('id',coupon.id).single())).uso_atual,1);
  passed.push('Cupom: aplicar, remover e confirmar com uso registrado uma unica vez');
  assert.ok((await patient.rpc('paciente_cancelar_pagamento',{_pagamento_id:payment})).error);
  passed.push('Checkout: preço calculado no servidor, dependente validado, pagamento protegido e confirmação idempotente');
  await ok(reserve(patient,created.slots[2],ownCpf));
  const expired=await ok(checkout(patient,created.slots[2]));created.payments.push(expired);
  await ok(service.from('agenda_slots').update({reserva_expira_em:new Date(Date.now()-1000).toISOString()}).eq('id',created.slots[2]));
  assert.ok((await patient.rpc('paciente_confirmar_pagamento_local',{_pagamento_id:expired})).error);
  assert.equal((await ok(service.from('pagamentos').select('status').eq('id',expired).single())).status,'pendente');
  passed.push('Reserva expirada não confirma pagamento nem cria consulta');
  const path=`${fixture.paciente.id}/${run}.pdf`;created.storage=path;
  await ok(patient.storage.from('paciente-docs').upload(path,Buffer.from('%PDF-1.4\n% Teste local\n%%EOF'),{contentType:'application/pdf'}));
  const doc=await ok(patient.from('documentos_paciente').insert({paciente_id:p.id,user_id:fixture.paciente.id,tipo:'exame',titulo:`Documento teste ${run}`,storage_path:path,mime_type:'application/pdf'}).select('id').single());created.doc=doc.id;
  assert.ok((await ok(patient.storage.from('paciente-docs').createSignedUrl(path,60))).signedUrl);
  assert.ok((await other.storage.from('paciente-docs').createSignedUrl(path,60)).error);
  assert.equal((await ok(other.from('documentos_paciente').select('id').eq('id',doc.id))).length,0);
  passed.push('Documentos: upload, leitura assinada e bloqueio de outro paciente');
  if(process.argv.includes('--browser')){
    const {chromium,expect}=await import('@playwright/test');browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext();await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
    page=await context.newPage();await page.goto('http://127.0.0.1:8082/auth');
    await page.getByRole('button',{name:'Entrar como paciente',exact:true}).click();await page.waitForURL('**/app/paciente/dashboard');
    await page.goto('http://127.0.0.1:8082/app/paciente/dependentes');await expect(page.getByText('Dependente Atualizado',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Editar',exact:true}).first().click();
    await page.getByRole('dialog').getByPlaceholder('Nome completo',{exact:true}).fill('Dependente Interface');
    await page.getByRole('dialog').getByRole('button',{name:/Salvar/}).click();
    await expect(page.getByText('Dependente Interface',{exact:true})).toBeVisible();
    await page.goto('http://127.0.0.1:8082/app/paciente/documentos');await expect(page.getByText(`Documento teste ${run}`,{exact:true}).first()).toBeVisible();
    await page.getByRole('button',{name:'Anexar documento',exact:true}).click();
    const upload=page.getByRole('dialog');
    await upload.getByRole('combobox',{name:'Paciente do documento'}).click();
    await page.getByRole('option',{name:'Dependente Interface',exact:true}).click();
    await upload.locator('input[type=file]').setInputFiles({name:'dependente-'+run+'.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n% Teste\n%%EOF')});
    await upload.getByRole('button',{name:'Enviar',exact:true}).click();
    await expect(upload).toBeHidden();
    extraDoc=await ok(service.from('documentos_paciente').select('id,storage_path,paciente_id').eq('titulo','dependente-'+run).single());
    assert.equal(extraDoc.paciente_id,created.dependent);
    await page.getByRole('button',{name:'Eu mesmo',exact:true}).click();
    await expect(page.getByText('dependente-'+run,{exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:/Dependente Interface/}).click();
    await expect(page.getByText('dependente-'+run,{exact:true})).toBeVisible();
    await page.goto(`http://127.0.0.1:8082/app/paciente/checkout/${expired}`);await expect(page.getByText('Finalizar pagamento',{exact:true})).toBeVisible();
    await page.goto(`http://127.0.0.1:8082/app/agendamento/confirmar/${created.slots[0]}?tipo=especialidade&ref=${created.specialty}`);
    await expect(page.getByRole('button',{name:'Reservar e ir para pagamento',exact:true})).toBeVisible();
    for(const checkbox of await page.getByRole('checkbox').all()) await checkbox.check();
    await page.getByRole('button',{name:'Reservar e ir para pagamento',exact:true}).click();
    await page.waitForURL('**/app/paciente/checkout/*');
    const browserPayment=page.url().split('/').pop();created.payments.push(browserPayment);
    await page.getByRole('button',{name:/^Pagar /}).click();await page.waitForURL('**/app/paciente/pagamento/sucesso?*');
    await expect(page.getByText('Pagamento aprovado',{exact:true})).toBeVisible();
    created.consults.push((await ok(service.from('pagamentos').select('consulta_id').eq('id',browserPayment).single())).consulta_id);
    await page.goto(`http://127.0.0.1:8082/app/paciente/pagamento/sucesso?p=${payment}`);await expect(page.getByText('Pagamento aprovado',{exact:true})).toBeVisible();
    await page.goto('http://127.0.0.1:8082/app/paciente/perfil');await page.getByPlaceholder('Seu nome completo').fill('Paciente Interface Local');
    await page.getByRole('button',{name:/Salvar/}).click();
    await expect.poll(async()=> (await ok(patient.from('pacientes').select('nome_completo').eq('id',p.id).single())).nome_completo).toBe('Paciente Interface Local');
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Perfil responsivo');
    passed.push('Navegador: login por card, dependentes, documento, checkout, recibo e perfil em celular');
  }
  assert.ok((await other.rpc('paciente_cancelar_consulta',{_consulta_id:consult.id})).error);
  await ok(patient.rpc('paciente_cancelar_consulta',{_consulta_id:consult.id}));
  assert.equal((await ok(service.from('agenda_slots').select('status').eq('id',created.slots[1]).single())).status,'disponivel');
  passed.push('Cancelamento autorizado libera o horário e rejeita outro paciente');
  const original=await ok(service.from('consultas').insert({paciente_id:p.id,paciente_atendido_id:created.dependent,medico_id:doctor.id,inicio:new Date(Date.now()-7200000).toISOString(),fim:new Date(Date.now()-3600000).toISOString(),modalidade:'presencial',status:'concluida',valor_centavos:0}).select('id').single());created.consults.push(original.id);
  const voucher=await ok(service.from('retornos_gratuitos').insert({paciente_id:p.id,medico_id:doctor.id,consulta_origem_id:original.id,valido_ate:new Date(Date.now()+30*86400000).toISOString(),status:'disponivel',created_by:fixture.medico.id}).select('id').single());created.voucher=voucher.id;
  assert.ok((await other.rpc('agendar_retorno_gratuito',{_slot_id:created.slots[1],_voucher_id:voucher.id})).error);
  const ret=await ok(patient.rpc('agendar_retorno_gratuito',{_slot_id:created.slots[1],_voucher_id:voucher.id}));created.consults.push(ret.consulta_id);
  assert.equal((await ok(patient.from('consultas').select('paciente_atendido_id').eq('id',ret.consulta_id).single())).paciente_atendido_id,created.dependent);
  assert.ok((await patient.rpc('agendar_retorno_gratuito',{_slot_id:created.slots[1],_voucher_id:voucher.id})).error);
  assert.ok((await other.rpc('dispensar_avaliacao_consulta',{p_consulta_id:original.id})).error);
  await ok(patient.rpc('dispensar_avaliacao_consulta',{p_consulta_id:original.id}));
  passed.push('Retorno preserva o dependente, impede reutilizacao e avaliacao respeita o titular');
  fs.mkdirSync('docs/paciente-funcional',{recursive:true});
  fs.writeFileSync('docs/paciente-funcional/testes-local.json',JSON.stringify({executadoEm:new Date().toISOString(),passed},null,2));
  console.log(passed.join('\n'));
} catch (error) {
  if(page) { fs.mkdirSync('logs',{recursive:true});fs.writeFileSync('logs/paciente-failure.txt',await page.locator('body').innerText()); }
  throw error;
} finally {
  await browser?.close();
  if(extraDoc){ await ok(service.storage.from('paciente-docs').remove([extraDoc.storage_path]));await ok(service.from('documentos_paciente').delete().eq('id',extraDoc.id)); }
  await ok(service.from('profiles').update(originalProfile).eq('id',fixture.paciente.id));
  if(created.storage) await ok(service.storage.from('paciente-docs').remove([created.storage]));
  if(created.doc) await ok(service.from('documentos_paciente').delete().eq('id',created.doc));
  if(created.voucher) await ok(service.from('retornos_gratuitos').delete().eq('id',created.voucher));
  if(created.coupon){await ok(service.from('cupons_uso').delete().eq('cupom_id',created.coupon));await ok(service.from('cupons').delete().eq('id',created.coupon));}
  if(created.payments.length) await ok(service.from('pagamentos').delete().in('id',created.payments));
  if(created.consults.length) await ok(service.from('consultas').delete().in('id',created.consults));
  if(created.slots.length) await ok(service.from('agenda_slots').delete().in('id',created.slots));
  if(created.specialty){await ok(service.from('medico_especialidades').delete().eq('especialidade_id',created.specialty));await ok(service.from('especialidades').delete().eq('id',created.specialty));}
  if(created.dependent){await ok(service.from('dependente_consentimentos').delete().eq('dependente_id',created.dependent));await ok(service.from('pacientes').delete().eq('id',created.dependent));}
  for(const original of [p,p2]) await ok(service.from('pacientes').update(Object.fromEntries(profileFields.map(k=>[k,original[k]]))).eq('id',original.id));
}
