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
 * Busca especialidades ativas com contagem de médicos aprovados.
 * Agora funciona para visitantes (anon) graças à policy pública em medicos.
 */
export function useEspecialidadesPublicas() {
  const [especialidades, setEspecialidades] = useState<EspecialidadePublica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
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

      // Contar médicos aprovados por especialidade usando a view pública
      const { data: vinculos } = await supabase
        .from("medico_especialidades")
        .select("especialidade_id")
        .eq("ativo", true);

      const countMap = new Map<string, Set<string>>();
      for (const v of (vinculos ?? []) as any[]) {
        const eid = v.especialidade_id;
        if (!countMap.has(eid)) countMap.set(eid, new Set());
        countMap.get(eid)!.add(v.especialidade_id);
      }

      // Verificar quais especialidades têm médicos aprovados (via medicos_publicos)
      const { data: medicosPublicos } = await (supabase as any)
        .from("medicos_publicos")
        .select("id");
      
      const medicoIds = new Set((medicosPublicos ?? []).map((m: any) => m.id));

      // Recount using medico_especialidades filtered by approved medicos
      const { data: vinculosComMedico } = await supabase
        .from("medico_especialidades")
        .select("especialidade_id, medico_id")
        .eq("ativo", true);

      const countMapReal = new Map<string, number>();
      for (const v of (vinculosComMedico ?? []) as any[]) {
        if (medicoIds.has(v.medico_id)) {
          countMapReal.set(v.especialidade_id, (countMapReal.get(v.especialidade_id) ?? 0) + 1);
        }
      }

      setEspecialidades(
        esps.map((e) => ({
          ...e,
          total_medicos: countMapReal.get(e.id) ?? 0,
        }))
      );
      setLoading(false);
    })();
  }, []);

  return { especialidades, loading };
}
