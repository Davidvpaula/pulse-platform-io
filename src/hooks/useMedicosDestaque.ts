import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MedicoDestaque = {
  id: string;
  nome: string;
  especialidade: string | null;
  crm: string;
  avaliacao_media: number;
  total_avaliacoes: number;
  online: boolean;
};

/**
 * Busca até 6 médicos aprovados com melhor ranking para exibir no site público.
 */
export function useMedicosDestaque(limit = 6) {
  const [medicos, setMedicos] = useState<MedicoDestaque[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("medicos")
        .select("id, nome, especialidade, crm, link_sala_padrao")
        .eq("status", "aprovado")
        .order("nome", { ascending: true })
        .limit(limit);

      if (!data?.length) {
        setMedicos([]);
        setLoading(false);
        return;
      }

      // Buscar ranking data
      const ids = data.map((m) => m.id);
      const { data: rankings } = await supabase
        .from("medico_ranking" as any)
        .select("medico_id, avaliacao_media, total_avaliacoes, ranking_score")
        .in("medico_id", ids);

      const rankMap = new Map(
        ((rankings ?? []) as any[]).map((r: any) => [r.medico_id, r])
      );

      const result: MedicoDestaque[] = data.map((m) => {
        const r = rankMap.get(m.id);
        return {
          id: m.id,
          nome: m.nome,
          especialidade: m.especialidade,
          crm: m.crm,
          avaliacao_media: r?.avaliacao_media ?? 0,
          total_avaliacoes: r?.total_avaliacoes ?? 0,
          online: !!m.link_sala_padrao,
        };
      });

      // Sort by ranking score descending
      result.sort((a, b) => (b.avaliacao_media - a.avaliacao_media) || (b.total_avaliacoes - a.total_avaliacoes));

      setMedicos(result.slice(0, limit));
      setLoading(false);
    })();
  }, [limit]);

  return { medicos, loading };
}
