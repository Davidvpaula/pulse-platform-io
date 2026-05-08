// Edge function interna para rodar a suite de testes da Frente 1 (ledger base).
// NÃO deve ser exposta publicamente. Usa service role para chamar funções SECURITY DEFINER.
// Invoque via: supabase functions invoke _internal-financeiro-tests --no-verify-jwt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const TEST_MEDICO = "00000000-0000-0000-0000-00000000fa11"; // médico fictício, não existe na tabela medicos

type R = { name: string; ok: boolean; detail?: unknown };
const results: R[] = [];
const log = (name: string, ok: boolean, detail?: unknown) => results.push({ name, ok, detail });

async function rpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await admin.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
}
async function sql(q: string) {
  // Usa rpc helper genérico via PostgREST? Não temos exec. Usaremos endpoints específicos.
  // Alternativa: criamos uma função utilitária mínima abaixo.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_test_exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
    body: JSON.stringify({ q }),
  });
  if (!res.ok) throw new Error(`sql(${q.slice(0, 60)}): ${res.status} ${await res.text()}`);
  return await res.json();
}

async function cleanup() {
  // Apaga movimentos e idempotency dos testes (ignora trigger via função interna)
  await sql(
    `SELECT _test_purge_medico('${TEST_MEDICO}'::uuid)`
  );
}

async function run() {
  await cleanup();

  // 1. Idempotência básica
  try {
    const k = "test:idemp:" + crypto.randomUUID();
    const r1 = await rpc("fn_registrar_movimento_idempotente", {
      p_scope: "test", p_key: k,
      p_payload: { conta: "medico", conta_ref_id: TEST_MEDICO, direcao: "credito", valor_cents: 100, ref_type: "consulta", bucket: "pendente", origem: "test" },
    });
    const r2 = await rpc("fn_registrar_movimento_idempotente", {
      p_scope: "test", p_key: k,
      p_payload: { conta: "medico", conta_ref_id: TEST_MEDICO, direcao: "credito", valor_cents: 100, ref_type: "consulta", bucket: "pendente", origem: "test" },
    });
    log("1_idempotencia_basica", r1?.idempotente === false && r2?.idempotente === true, { r1, r2 });
  } catch (e) { log("1_idempotencia_basica", false, String(e)); }

  // 2. Webhook duplicado simulado (concorrente)
  try {
    const k = "test:concurrent:" + crypto.randomUUID();
    const payload = { conta: "medico", conta_ref_id: TEST_MEDICO, direcao: "credito", valor_cents: 200, ref_type: "consulta", bucket: "pendente", origem: "test" };
    const [a, b] = await Promise.all([
      rpc("fn_registrar_movimento_idempotente", { p_scope: "test", p_key: k, p_payload: payload }),
      rpc("fn_registrar_movimento_idempotente", { p_scope: "test", p_key: k, p_payload: payload }),
    ]);
    const oneCreated = (a?.idempotente === false) !== (b?.idempotente === false);
    log("2_webhook_duplicado_concorrente", oneCreated, { a, b });
  } catch (e) { log("2_webhook_duplicado_concorrente", false, String(e)); }

  // 3. Append-only (UPDATE/DELETE devem falhar)
  try {
    const upd = await sql(`SELECT _test_try_update_movimento('${TEST_MEDICO}'::uuid) AS ok`);
    const del = await sql(`SELECT _test_try_delete_movimento('${TEST_MEDICO}'::uuid) AS ok`);
    // _test_* retorna true SE a operação foi bloqueada (esperado)
    log("3_append_only", upd?.[0]?.ok === true && del?.[0]?.ok === true, { upd, del });
  } catch (e) { log("3_append_only", false, String(e)); }

  // 4. Hash chain íntegra
  try {
    const ok = await rpc("fn_validar_hash_chain", { p_medico_id: TEST_MEDICO, p_limit: 1000 });
    log("4_hash_chain_integra", ok === true, { ok });
  } catch (e) { log("4_hash_chain_integra", false, String(e)); }

  // 5. Saldo real coerente
  try {
    const saldo = await rpc("fn_medico_saldo_real", { p_medico_id: TEST_MEDICO });
    const row = Array.isArray(saldo) ? saldo[0] : saldo;
    // Após cenários 1+2, esperamos pendente = 100 + 200 = 300
    log("5_saldo_real", Number(row?.pendente_cents) === 300, { saldo });
  } catch (e) { log("5_saldo_real", false, String(e)); }

  // 6. Race de saque (mesma key) — variação do 2
  try {
    const k = "test:saque:" + crypto.randomUUID();
    const payload = { conta: "medico", conta_ref_id: TEST_MEDICO, direcao: "debito", valor_cents: 50, ref_type: "saque", bucket: "pendente", origem: "test" };
    const calls = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        rpc("fn_registrar_movimento_idempotente", { p_scope: "test", p_key: k, p_payload: payload })
      )
    );
    const created = calls.filter((c: any) => c?.idempotente === false).length;
    log("6_race_saque", created === 1, { created, calls });
  } catch (e) { log("6_race_saque", false, String(e)); }

  // 7. Estorno (crédito + débito = saldo zero para essa ref)
  try {
    const refId = crypto.randomUUID();
    await rpc("fn_registrar_movimento_idempotente", {
      p_scope: "test", p_key: "estorno-c:" + refId,
      p_payload: { conta: "medico", conta_ref_id: TEST_MEDICO, direcao: "credito", valor_cents: 777, ref_type: "consulta", ref_id: refId, bucket: "pendente", origem: "test" },
    });
    await rpc("fn_registrar_movimento_idempotente", {
      p_scope: "test", p_key: "estorno-d:" + refId,
      p_payload: { conta: "medico", conta_ref_id: TEST_MEDICO, direcao: "debito", valor_cents: 777, ref_type: "estorno", ref_id: refId, bucket: "pendente", origem: "test" },
    });
    const r = await sql(`SELECT sum(CASE WHEN direcao='credito' THEN valor_cents ELSE -valor_cents END)::bigint AS s FROM public.financeiro_movimentos WHERE ref_id='${refId}'::uuid`);
    log("7_estorno_zera", Number(r?.[0]?.s) === 0, { r });
  } catch (e) { log("7_estorno_zera", false, String(e)); }

  // 8. Backfill dry_run idempotente (rodar duas vezes não muda nada)
  try {
    const r1 = await rpc("fn_backfill_financeiro_dry_run", { p_medico_id: null });
    const r2 = await rpc("fn_backfill_financeiro_dry_run", { p_medico_id: null });
    log("8_backfill_dry_run_idempotente", r1?.ok === true && r2?.ok === true, { r1: r1?.relatorio, r2: r2?.relatorio });
  } catch (e) { log("8_backfill_dry_run_idempotente", false, String(e)); }

  await cleanup();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await run();
    const allOk = results.every((r) => r.ok);
    return new Response(JSON.stringify({ ok: allOk, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: allOk ? 200 : 500,
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
