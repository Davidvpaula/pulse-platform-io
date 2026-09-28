import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env=Object.fromEntries(fs.readFileSync('.env.localbackend.local','utf8').trim().split('\n').map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
if(env.VITE_SUPABASE_URL!=='http://127.0.0.1:54321')throw Error('Somente local');
const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY);
const {error}=await client.auth.signInWithPassword({email:env.VITE_LOCAL_ADMIN_EMAIL,password:env.VITE_LOCAL_ADMIN_PASSWORD});
if(error)throw error;
for(const table of ['pacientes','consultas','empresas','assinaturas','planos_auditoria','conversations','conversation_assignments']) {
 const {error,data}=await client.from(table).select('*').limit(1);
 console.log(table,error?.message||`OK ${data.length}`);
}
for(const [name,args] of [['relatorios_executivo',{p_inicio:'2026-09-01',p_fim:'2026-10-01'}],['relatorios_clinica',{p_inicio:'2026-09-01',p_fim:'2026-10-01'}],['relatorios_consultas_diarias',{p_inicio:'2026-09-01',p_fim:'2026-10-01'}],['admin_agendamentos_overview',{}]]) {
 const {error}=await client.rpc(name,args);console.log(name,error?.message||'OK');
}
await client.auth.signOut();
