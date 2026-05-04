import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MedicoDestaque = {
  id: string;
  nome: string;
  especialidade: string | null;
  crm: string;
  bio: string | null;
  foto_url: string | null;
  avaliacao_media: number;
  total_avaliacoes: number;
  online: boolean;
  ranking_score: number;
  taxa_no_show: number;
  fator_premium: number;
  created_at: string;
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
        .select("id, nome, especialidade, crm, bio, foto_url, avaliacao_media, total_avaliacoes, online, ranking_score, taxa_no_show, fator_premium, created_at")
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
