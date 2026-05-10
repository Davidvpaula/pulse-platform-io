// Frente F3.4 — Detector financeiro determinístico (NOC)
// Roda periodicamente (cron). Sem LLM. Apenas regras SQL + idempotência via alerta_key.
// Grava em operacao_alertas. Nunca mexe em consultas/financeiro/medicos.
// Regras detectadas:
//   1) consulta sem pagamento (consulta confirmada/concluída sem pagamento pago, há > 2h)
//   2) saldo do médico inconsistente (fechamento mensal com valor_medico_centavos < 0)
//   3) cobrança órfã (cobrancas_links pago sem consulta vinculada, há > 24h)
//   4) fechamento sem médico (fechamentos_mensais com medico_id nulo ou inexistente)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const MAX_PER_RULE = 25; // limite de alertas novos por execução, evita spam
const COOLDOWN_HOURS = 6; // mesma chave só reabre após resolução

type AlertaInsert = {
  tipo: string;
  severidade: "info" | "atencao" | "alerta" | "critico";
  titulo: string;
  descricao: string;
  alerta_key: string;
  payload: Record<string, unknown>;
  consulta_id?: string | null;
  medico_id?: string | null;
  paciente_id?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const isCronCall = (req.headers.get("x-cron-key") ?? "") !== "";

    if (!isCronCall) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return jsonResp({ error: "Unauthorized" }, 401);
      const supaUser = createClient(SUPABASE_URL, ANON, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims, error } = await supaUser.auth.getClaims(authHeader.slice(7));
      if (error || !claims?.claims) return jsonResp({ error: "Unauthorized" }, 401);
      const uid = claims.claims.sub as string;
      const { data: roleOk } = await supaUser.rpc("has_role" as never, {
        _user_id: uid, _role: "admin",
      } as never);
      const { data: supOk } = await supaUser.rpc("has_role" as never, {
        _user_id: uid, _role: "supervisor",
      } as never);
      if (!roleOk && !supOk) return jsonResp({ error: "Forbidden" }, 403);
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const novos: AlertaInsert[] = [];
    const skips: string[] = [];

    // ── R1: consulta sem pagamento ──────────────────────────────────────
    // confirmada/em_andamento/concluida há mais de 2h sem pagamento "paid"/"pago"
    {
      const corte = new Date(Date.now() - 2 * 3600_000).toISOString();
      const { data: cs, error } = await supa
        .from("consultas")
        .select("id, medico_id, paciente_id, status, inicio, valor_centavos, created_at")
        .in("status", ["confirmada", "em_andamento", "concluida"])
        .lt("created_at", corte)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) skips.push("R1:" + error.message);
      else {
        for (const c of cs ?? []) {
          const { data: pg } = await supa
            .from("pagamentos")
            .select("id, status, valor_centavos")
            .eq("consulta_id", c.id)
            .limit(5);
          const pagouOk = (pg ?? []).some((p: any) =>
            ["paid", "pago", "succeeded", "approved"].includes(String(p.status).toLowerCase()),
          );
          if (pagouOk) continue;
          if (novos.filter((n) => n.tipo === "financeiro_consulta_sem_pagamento").length >= MAX_PER_RULE) break;
          novos.push({
            tipo: "financeiro_consulta_sem_pagamento",
            severidade: "alerta",
            titulo: "Consulta sem pagamento confirmado",
            descricao: `Consulta ${c.status} sem registro de pagamento aprovado.`,
            alerta_key: `fin:sem_pagamento:${c.id}`,
            consulta_id: c.id,
            medico_id: c.medico_id,
            paciente_id: c.paciente_id,
            payload: { status_consulta: c.status, inicio: c.inicio, valor_centavos: c.valor_centavos, pagamentos_encontrados: pg?.length ?? 0 },
          });
        }
      }
    }

    // ── R2: fechamento mensal com saldo inválido ────────────────────────
    {
      const { data: fs, error } = await supa
        .from("fechamentos_mensais")
        .select("id, medico_id, competencia_ano, competencia_mes, valor_medico_centavos, status")
        .lt("valor_medico_centavos", 0)
        .limit(MAX_PER_RULE);
      if (error) skips.push("R2:" + error.message);
      else {
        for (const f of fs ?? []) {
          novos.push({
            tipo: "financeiro_saldo_invalido",
            severidade: "critico",
            titulo: "Fechamento com saldo negativo",
            descricao: `Fechamento ${f.competencia_mes}/${f.competencia_ano} apresenta valor_medico_centavos < 0.`,
            alerta_key: `fin:saldo_invalido:${f.id}`,
            medico_id: f.medico_id,
            payload: {
              fechamento_id: f.id,
              competencia: `${f.competencia_mes}/${f.competencia_ano}`,
              valor_medico_centavos: f.valor_medico_centavos,
              status: f.status,
            },
          });
        }
      }
    }

    // ── R3: cobrança órfã ───────────────────────────────────────────────
    {
      const corte = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data: cb, error } = await supa
        .from("cobrancas_links")
        .select("id, consulta_id, paciente_id, status, valor_centavos, created_at")
        .is("consulta_id", null)
        .eq("status", "pago")
        .lt("created_at", corte)
        .limit(MAX_PER_RULE);
      if (error) skips.push("R3:" + error.message);
      else {
        for (const l of cb ?? []) {
          novos.push({
            tipo: "financeiro_cobranca_orfa",
            severidade: "alerta",
            titulo: "Cobrança paga sem consulta vinculada",
            descricao: "Link de cobrança quitado sem consulta_id associada.",
            alerta_key: `fin:cobranca_orfa:${l.id}`,
            paciente_id: l.paciente_id,
            payload: {
              cobranca_id: l.id,
              valor_centavos: l.valor_centavos,
              criado_em: l.created_at,
              status: l.status,
            },
          });
        }
      }
    }

    // ── R4: fechamento sem médico ───────────────────────────────────────
    {
      const { data: fs, error } = await supa
        .from("fechamentos_mensais")
        .select("id, medico_id, competencia_ano, competencia_mes, status")
        .is("medico_id", null)
        .limit(MAX_PER_RULE);
      if (error) skips.push("R4a:" + error.message);
      else {
        for (const f of fs ?? []) {
          novos.push({
            tipo: "financeiro_fechamento_sem_medico",
            severidade: "critico",
            titulo: "Fechamento sem médico",
            descricao: "Fechamento mensal não possui medico_id.",
            alerta_key: `fin:fechamento_sem_medico:${f.id}`,
            payload: { fechamento_id: f.id, competencia: `${f.competencia_mes}/${f.competencia_ano}`, status: f.status },
          });
        }
      }
    }

    // ── Persistir com idempotência ──────────────────────────────────────
    let inseridos = 0;
    let ignorados = 0;
    const cooldownIso = new Date(Date.now() + COOLDOWN_HOURS * 3600_000).toISOString();

    for (const a of novos) {
      // verifica se já existe alerta aberto com a mesma chave (índice único parcial cobre, mas evitamos round-trip de erro)
      const { data: existente } = await supa
        .from("operacao_alertas")
        .select("id")
        .eq("alerta_key", a.alerta_key)
        .eq("status", "aberto")
        .maybeSingle();
      if (existente) { ignorados++; continue; }

      const { error: insErr } = await supa.from("operacao_alertas").insert({
        tipo: a.tipo,
        severidade: a.severidade,
        titulo: a.titulo,
        descricao: a.descricao,
        alerta_key: a.alerta_key,
        payload: a.payload,
        consulta_id: a.consulta_id ?? null,
        medico_id: a.medico_id ?? null,
        paciente_id: a.paciente_id ?? null,
        cooldown_ate: cooldownIso,
      });
      if (insErr) ignorados++;
      else inseridos++;
    }

    // log silencioso
    try {
      await supa.from("observabilidade_eventos").insert({
        modulo: "operacao",
        tipo: "noc.financeiro_detector_run",
        payload: {
          candidatos: novos.length,
          inseridos,
          ignorados,
          skips,
          regras: ["R1_sem_pagamento", "R2_saldo_invalido", "R3_cobranca_orfa", "R4_fechamento_sem_medico"],
        },
      });
    } catch (_) { /* silencioso */ }

    return jsonResp({
      ok: true,
      candidatos: novos.length,
      inseridos,
      ignorados,
      skips,
    });
  } catch (err) {
    return jsonResp({ error: (err as Error).message ?? "internal" }, 500);
  }
});

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
