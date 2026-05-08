import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OperacaoMetrics = {
  abertas: number;
  semResponsavel: number;
  slaVencido: number;
  resolvidasHoje: number;
  atendentesOnline: number;
  tempoMedioPrimeiraResposta: number | null; // minutos
  tempoMedioResolucao: number | null; // minutos
};

export function useOperacaoMetricas() {
  const [data, setData] = useState<OperacaoMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const nowIso = new Date().toISOString();
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);

    const [abertas, sem, sla, resolvHoje, online, conv] = await Promise.all([
      supabase.from("conversations").select("id", { count: "exact", head: true }).neq("status", "fechada").neq("status", "arquivada"),
      supabase.from("conversations").select("id", { count: "exact", head: true }).is("assigned_to", null).neq("status", "fechada"),
      supabase.from("conversations").select("id", { count: "exact", head: true }).lt("sla_due_at", nowIso).is("resolved_at", null),
      supabase.from("conversations").select("id", { count: "exact", head: true }).gte("resolved_at", startToday.toISOString()),
      supabase.from("attendant_presence").select("user_id", { count: "exact", head: true })
        .eq("status", "online")
        .gte("last_seen_at", new Date(Date.now() - 90_000).toISOString()),
      supabase.from("conversations").select("created_at, first_response_at, resolved_at").not("first_response_at", "is", null).limit(500),
    ]);

    // tempos médios
    let primeira = 0, primeiraN = 0, resolucao = 0, resolucaoN = 0;
    (conv.data || []).forEach((c: any) => {
      if (c.created_at && c.first_response_at) {
        primeira += (new Date(c.first_response_at).getTime() - new Date(c.created_at).getTime()) / 60_000;
        primeiraN++;
      }
      if (c.created_at && c.resolved_at) {
        resolucao += (new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime()) / 60_000;
        resolucaoN++;
      }
    });

    setData({
      abertas: abertas.count || 0,
      semResponsavel: sem.count || 0,
      slaVencido: sla.count || 0,
      resolvidasHoje: resolvHoje.count || 0,
      atendentesOnline: online.count || 0,
      tempoMedioPrimeiraResposta: primeiraN ? Math.round(primeira / primeiraN) : null,
      tempoMedioResolucao: resolucaoN ? Math.round(resolucao / resolucaoN) : null,
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  return { data, loading, reload: load };
}
