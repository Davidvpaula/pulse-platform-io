import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ServicoPublico {
  id: string;
  slug: string | null;
  nome: string;
  tipo: string;
  descricao_publica: string | null;
  duracao_min: number;
  valor_paciente_centavos: number;
  prioridade: number;
  icone: string | null;
  imagem_url: string | null;
  subtitulo: string | null;
  destacar_na_home: boolean;
}

interface Options {
  destacarNaHomeOnly?: boolean;
}

export function useServicosPublicos(opts: Options = {}) {
  const [servicos, setServicos] = useState<ServicoPublico[]>([]);
  const [paServicoId, setPaServicoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data, error: e1 }, { data: paCfg }] = await Promise.all([
          (supabase as any)
            .from("servicos_publicos")
            .select("id,slug,nome,tipo,descricao_publica,duracao_min,valor_paciente_centavos,prioridade,icone,imagem_url,subtitulo,destacar_na_home")
            .order("prioridade")
            .order("nome"),
          supabase
            .from("app_settings")
            .select("value")
            .eq("key", "atendimento_imediato.servico_id")
            .maybeSingle(),
        ]);
        if (cancelled) return;
        if (e1) throw e1;
        const rows = (data ?? []) as ServicoPublico[];
        setServicos(opts.destacarNaHomeOnly ? rows.filter((r) => r.destacar_na_home) : rows);
        setPaServicoId((paCfg?.value as string | null) ?? null);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Erro ao carregar serviços");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [opts.destacarNaHomeOnly]);

  return { servicos, paServicoId, loading, error };
}
