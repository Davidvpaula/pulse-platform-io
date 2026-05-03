import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EspecialidadePublica = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  icone: string | null;
  ativo: boolean;
  total_medicos: number;
};

/**
 * Busca especialidades ativas do banco com contagem de médicos aprovados.
 * Reutilizado em Home, /especialidades, /agendar, GlobalSearch.
 */
export function useEspecialidadesPublicas() {
  const [especialidades, setEspecialidades] = useState<EspecialidadePublica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Buscar especialidades ativas
      const { data: esps } = await supabase
        .from("especialidades")
        .select("id, nome, slug, descricao, icone, ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (!esps?.length) {
        setEspecialidades([]);
        setLoading(false);
        return;
      }

      // Buscar contagem de médicos aprovados por especialidade
      const { data: vinculos } = await supabase
        .from("medico_especialidades")
        .select("especialidade_id, medico_id, medicos!inner(status)")
        .eq("ativo", true)
        .eq("medicos.status", "aprovado" as any);

      const countMap = new Map<string, number>();
      for (const v of (vinculos ?? []) as any[]) {
        const eid = v.especialidade_id;
        countMap.set(eid, (countMap.get(eid) ?? 0) + 1);
      }

      setEspecialidades(
        esps.map((e) => ({
          ...e,
          total_medicos: countMap.get(e.id) ?? 0,
        }))
      );
      setLoading(false);
    })();
  }, []);

  return { especialidades, loading };
}
