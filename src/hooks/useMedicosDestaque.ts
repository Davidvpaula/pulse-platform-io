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
  ranking_score: number;
};

/**
 * Busca médicos aprovados via VIEW medicos_publicos (segura, sem dados sensíveis).
 * Ordena: com sala online primeiro, depois por ranking_score desc.
 */
export function useMedicosDestaque(limit = 6) {
  const [medicos, setMedicos] = useState<MedicoDestaque[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("medicos_publicos")
        .select("id, nome, especialidade, crm, avaliacao_media, total_avaliacoes, online, ranking_score")
        .order("online", { ascending: false })
        .order("ranking_score", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("useMedicosDestaque error:", error);
        setMedicos([]);
        setLoading(false);
        return;
      }

      setMedicos((data ?? []) as MedicoDestaque[]);
      setLoading(false);
    })();
  }, [limit]);

  return { medicos, loading };
}
