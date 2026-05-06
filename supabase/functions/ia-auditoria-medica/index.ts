import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: "Não autenticado" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const { medico_id, action } = body;

    if (action === "analise_completa" && medico_id) {
      return await analiseCompleta(supabase, medico_id, LOVABLE_API_KEY);
    }

    if (action === "analise_batch") {
      return await analiseBatch(supabase, LOVABLE_API_KEY);
    }

    if (action === "detectar_anomalias") {
      return await detectarAnomalias(supabase, LOVABLE_API_KEY);
    }

    return new Response(JSON.stringify({ error: "action inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ia-auditoria-medica error:", e);
    const msg = e instanceof Error ? e.message : "Erro interno";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Análise completa de um médico ──
async function analiseCompleta(supabase: any, medicoId: string, apiKey: string) {
  // 1. Coletar métricas reais via RPC
  const { data: metricas, error: metErr } = await supabase.rpc("coletar_metricas_medico", {
    p_medico_id: medicoId,
  });
  if (metErr) throw new Error("Erro ao coletar métricas: " + metErr.message);

  // 2. Buscar nome do médico
  const { data: medico } = await supabase.from("medicos").select("nome").eq("id", medicoId).single();

  // 3. Buscar restrições atuais
  const { data: restricoes } = await supabase.from("medico_restricoes").select("*").eq("medico_id", medicoId).maybeSingle();

  // 4. Buscar histórico de ações admin recentes
  const { data: acoesRecentes } = await supabase.from("admin_acoes_medico")
    .select("tipo_acao, motivo, created_at")
    .eq("medico_id", medicoId)
    .order("created_at", { ascending: false })
    .limit(10);

  // 5. Enviar para IA
  const systemPrompt = `Você é um auditor operacional interno de uma plataforma de saúde digital.
Sua função é analisar métricas operacionais de médicos e gerar um relatório completo.

REGRAS FUNDAMENTAIS:
- A IA NÃO toma decisões. Apenas analisa, sugere e alerta. Toda decisão é HUMANA.
- Premium NÃO pode apagar falhas, reclamações, atrasos ou problemas operacionais.
- Separar CLARAMENTE: crescimento pago externo vs reputação orgânica vs qualidade operacional.
- Usar linguagem profissional. Nunca "médico ruim". Usar "atenção necessária", "risco operacional", "acompanhamento recomendado".

INDICADORES A AVALIAR:
1. Pontualidade nas consultas (atrasos recorrentes)
2. Faltas ou no-show DO MÉDICO (não do paciente)
3. Reclamações de pacientes
4. Retrabalho de documentos (receitas, atestados, pedidos)
5. Erro ou demora no envio de receitas/atestados/pedidos
6. Necessidade de intervenção da equipe
7. Excesso de cancelamentos pelo médico
8. Problemas de comunicação
9. Baixa taxa de resposta
10. Conflitos operacionais
11. Reincidência de falhas já sinalizadas
12. Qualidade do atendimento conforme dados internos
13. Aderência às regras da plataforma
14. Padrões suspeitos de avaliações (possível manipulação)

IMPORTANTE: Se os dados forem insuficientes para avaliar um indicador, informe explicitamente ao invés de inventar.

Responda EXCLUSIVAMENTE no formato JSON especificado pela ferramenta.`;

  const userPrompt = `Analise as métricas do médico "${medico?.nome ?? 'Desconhecido'}" (ID: ${medicoId}):

MÉTRICAS OPERACIONAIS:
${JSON.stringify(metricas, null, 2)}

RESTRIÇÕES ATUAIS:
${JSON.stringify(restricoes ?? { nenhuma: true }, null, 2)}

AÇÕES ADMIN RECENTES:
${JSON.stringify(acoesRecentes ?? [], null, 2)}

Gere a análise completa com scores, alertas, anomalias, pontos positivos/críticos e recomendações.`;

  const aiResponse = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "audit_result",
          description: "Return the structured audit analysis",
          parameters: {
            type: "object",
            properties: {
              score_operacional: {
                type: "object",
                properties: {
                  pontualidade: { type: "number" }, cancelamento: { type: "number" },
                  no_show: { type: "number" }, resposta: { type: "number" },
                  uso_sistema: { type: "number" }, documentacao: { type: "number" },
                  total: { type: "number" },
                },
                required: ["pontualidade", "cancelamento", "no_show", "resposta", "uso_sistema", "documentacao", "total"],
              },
              score_compliance: {
                type: "object",
                properties: {
                  confianca: { type: "number" }, padrao_comportamento: { type: "number" },
                  avaliacoes_integridade: { type: "number" }, campanhas_integridade: { type: "number" },
                  total: { type: "number" },
                  nivel_risco: { type: "string", enum: ["baixo", "medio", "alto", "critico"] },
                },
                required: ["confianca", "padrao_comportamento", "avaliacoes_integridade", "campanhas_integridade", "total", "nivel_risco"],
              },
              risco_reputacional: {
                type: "number",
                description: "Score de risco reputacional de 0 (sem risco) a 100 (risco máximo)",
              },
              alertas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    tipo: { type: "string" }, severidade: { type: "string", enum: ["info", "atencao", "alerta", "critico"] },
                    titulo: { type: "string" }, descricao: { type: "string" },
                    justificativa: { type: "string" }, recomendacao_ia: { type: "string" },
                  },
                  required: ["tipo", "severidade", "titulo", "descricao", "justificativa", "recomendacao_ia"],
                },
              },
              anomalias: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    tipo_anomalia: { type: "string" }, descricao: { type: "string" },
                    severidade: { type: "string", enum: ["info", "atencao", "alerta", "critico"] },
                    score_confianca: { type: "number" },
                    dados_evidencia: { type: "object" },
                  },
                  required: ["tipo_anomalia", "descricao", "severidade", "score_confianca"],
                },
              },
              pontos_positivos: {
                type: "array",
                items: { type: "string" },
                description: "Lista de aspectos positivos do médico baseados nos dados",
              },
              pontos_criticos: {
                type: "array",
                items: { type: "string" },
                description: "Lista de problemas identificados que requerem atenção",
              },
              sugestao_acao: {
                type: "string",
                enum: ["promover", "manter", "reduzir_destaque", "acompanhar"],
                description: "Sugestão da IA para ação administrativa (NÃO é decisão final)",
              },
              evolucao_tendencia: {
                type: "string",
                enum: ["melhorando", "estavel", "piorando"],
                description: "Tendência geral do médico com base nos dados disponíveis",
              },
              recomendacoes: { type: "array", items: { type: "string" } },
              resumo: { type: "string" },
            },
            required: [
              "score_operacional", "score_compliance", "risco_reputacional",
              "alertas", "anomalias", "pontos_positivos", "pontos_criticos",
              "sugestao_acao", "evolucao_tendencia", "recomendacoes", "resumo",
            ],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "audit_result" } },
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit atingido, tente novamente em instantes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const errText = await aiResponse.text();
    console.error("AI error:", aiResponse.status, errText);
    throw new Error("Erro na análise IA");
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("IA não retornou resultado estruturado");

  const result = JSON.parse(toolCall.function.arguments);

  // 6. Persistir resultados
  // Score operacional
  await supabase.from("medico_score_operacional").upsert({
    medico_id: medicoId,
    score_pontualidade: result.score_operacional.pontualidade,
    score_cancelamento: result.score_operacional.cancelamento,
    score_no_show: result.score_operacional.no_show,
    score_resposta: result.score_operacional.resposta,
    score_uso_sistema: result.score_operacional.uso_sistema,
    score_documentacao: result.score_operacional.documentacao,
    score_total: result.score_operacional.total,
    detalhes: {
      ...metricas,
      pontos_positivos: result.pontos_positivos,
      pontos_criticos: result.pontos_criticos,
      sugestao_acao: result.sugestao_acao,
      evolucao_tendencia: result.evolucao_tendencia,
      risco_reputacional: result.risco_reputacional,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: "medico_id" });

  // Score compliance
  await supabase.from("medico_score_compliance").upsert({
    medico_id: medicoId,
    score_confianca: result.score_compliance.confianca,
    score_padrao_comportamento: result.score_compliance.padrao_comportamento,
    score_avaliacoes_integridade: result.score_compliance.avaliacoes_integridade,
    score_campanhas_integridade: result.score_compliance.campanhas_integridade,
    score_total: result.score_compliance.total,
    nivel_risco: result.score_compliance.nivel_risco,
    detalhes: {
      ...result.score_compliance,
      risco_reputacional: result.risco_reputacional,
      sugestao_acao: result.sugestao_acao,
      evolucao_tendencia: result.evolucao_tendencia,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: "medico_id" });

  // Alertas
  if (result.alertas?.length > 0) {
    const alertTypes = [
      'queda_pontualidade', 'aumento_reclamacoes', 'excesso_retrabalho',
      'correcoes_receita', 'crescimento_suspeito_avaliacoes', 'conversoes_incompativeis',
      'comportamento_fora_padrao', 'queda_atividade', 'risco_churn',
      'possivel_manipulacao', 'abuso_campanha', 'no_show_recorrente',
      'conflito_operacional', 'anomalia_generica', 'atraso_recorrente',
      'falha_comunicacao', 'baixa_resposta', 'reincidencia_falha',
      'intervencao_equipe', 'demora_documentos',
    ];
    for (const alerta of result.alertas) {
      const tipo = alertTypes.includes(alerta.tipo) ? alerta.tipo : 'anomalia_generica';
      await supabase.from("medico_alertas_ia").insert({
        medico_id: medicoId,
        tipo,
        severidade: alerta.severidade,
        titulo: alerta.titulo,
        descricao: alerta.descricao,
        justificativa: alerta.justificativa,
        dados_utilizados: metricas,
        recomendacao_ia: alerta.recomendacao_ia,
      });
    }
  }

  // Anomalias
  if (result.anomalias?.length > 0) {
    for (const a of result.anomalias) {
      await supabase.from("medico_anomalias").insert({
        medico_id: medicoId,
        tipo_anomalia: a.tipo_anomalia,
        descricao: a.descricao,
        severidade: a.severidade,
        score_confianca: a.score_confianca,
        dados_evidencia: a.dados_evidencia ?? {},
      });
    }
  }

  // Log de auditoria imutável
  await supabase.from("medico_auditoria_ia").insert({
    medico_id: medicoId,
    tipo_analise: "analise_completa_v2",
    resultado: result.resumo,
    dados_entrada: metricas,
    dados_saida: result,
    modelo_ia: "google/gemini-3-flash-preview",
    versao_prompt: "v2",
  });

  // Log de confiança
  await supabase.from("medico_logs_confianca").insert({
    medico_id: medicoId,
    evento: "analise_ia_completa_v2",
    score_depois: result.score_compliance.total,
    motivo: "Análise periódica de compliance por IA",
    detalhes: {
      nivel_risco: result.score_compliance.nivel_risco,
      risco_reputacional: result.risco_reputacional,
      sugestao_acao: result.sugestao_acao,
      evolucao_tendencia: result.evolucao_tendencia,
      pontos_positivos: result.pontos_positivos?.length ?? 0,
      pontos_criticos: result.pontos_criticos?.length ?? 0,
    },
  });

  return new Response(JSON.stringify({ success: true, result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Análise em batch de todos os médicos ativos ──
async function analiseBatch(supabase: any, apiKey: string) {
  const { data: medicos } = await supabase
    .from("medicos")
    .select("id, nome")
    .eq("ativo", true)
    .limit(100);

  const resultados: { medico_id: string; nome: string; status: string }[] = [];

  for (const m of medicos ?? []) {
    try {
      const resp = await analiseCompleta(supabase, m.id, apiKey);
      const body = await resp.json();
      resultados.push({ medico_id: m.id, nome: m.nome, status: body.success ? "ok" : "erro" });
      await new Promise((r) => setTimeout(r, 2000));
    } catch (e) {
      resultados.push({ medico_id: m.id, nome: m.nome, status: "erro" });
    }
  }

  return new Response(JSON.stringify({ success: true, total: resultados.length, resultados }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Detecção de anomalias global ──
async function detectarAnomalias(supabase: any, _apiKey: string) {
  const { data: medicos } = await supabase
    .from("medicos")
    .select("id")
    .eq("ativo", true);

  let anomaliasDetectadas = 0;

  for (const m of medicos ?? []) {
    // 1. Check: many 5-star ratings in short time
    const { data: avalRecentes } = await supabase
      .from("avaliacoes_medicas")
      .select("nota, created_at")
      .eq("medico_id", m.id)
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .order("created_at", { ascending: false });

    if (avalRecentes && avalRecentes.length >= 5) {
      const all5Stars = avalRecentes.every((a: any) => a.nota === 5);
      if (all5Stars) {
        await supabase.from("medico_anomalias").insert({
          medico_id: m.id,
          tipo_anomalia: "avaliacoes_suspeitas",
          descricao: `${avalRecentes.length} avaliações 5 estrelas consecutivas nos últimos 7 dias`,
          severidade: "atencao",
          score_confianca: 0.7,
          dados_evidencia: { count: avalRecentes.length, periodo: "7d", todas_5_estrelas: true },
        });
        anomaliasDetectadas++;
      }
    }

    // 2. Check: excessive cancellations by doctor in last 30 days
    const { count: cancelCount } = await supabase
      .from("consultas")
      .select("id", { count: "exact", head: true })
      .eq("medico_id", m.id)
      .eq("status", "cancelada")
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString());

    if (cancelCount && cancelCount >= 10) {
      await supabase.from("medico_anomalias").insert({
        medico_id: m.id,
        tipo_anomalia: "excesso_cancelamentos",
        descricao: `${cancelCount} consultas canceladas nos últimos 30 dias`,
        severidade: cancelCount >= 20 ? "critico" : "alerta",
        score_confianca: 0.8,
        dados_evidencia: { cancelamentos_30d: cancelCount },
      });
      anomaliasDetectadas++;
    }

    // 3. Check: high no-show rate by doctor
    const { count: noShowCount } = await supabase
      .from("consultas")
      .select("id", { count: "exact", head: true })
      .eq("medico_id", m.id)
      .eq("status", "no_show")
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString());

    if (noShowCount && noShowCount >= 5) {
      await supabase.from("medico_anomalias").insert({
        medico_id: m.id,
        tipo_anomalia: "no_show_recorrente_medico",
        descricao: `${noShowCount} no-shows nos últimos 30 dias`,
        severidade: "alerta",
        score_confianca: 0.75,
        dados_evidencia: { no_shows_30d: noShowCount },
      });
      anomaliasDetectadas++;
    }
  }

  return new Response(JSON.stringify({ success: true, anomalias_detectadas: anomaliasDetectadas }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
