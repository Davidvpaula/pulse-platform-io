/**
 * Hook centralizado para resolver a empresa do usuário logado.
 * Fonte única de verdade — todas as páginas /empresa/* devem usar este hook.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EmpresaAtual {
  empresaId: string;
  razaoSocial: string;
  nomeFantasia: string | null;
}

interface UseEmpresaAtualReturn {
  empresa: EmpresaAtual | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEmpresaAtual(): UseEmpresaAtualReturn {
  const [empresa, setEmpresa] = useState<EmpresaAtual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolver = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Usuário não autenticado");
        setLoading(false);
        return;
      }

      // Usar RPC corrigida (SECURITY DEFINER — bypassa RLS)
      const { data: eid } = await supabase.rpc("get_empresa_id_do_usuario", {
        _user_id: user.id,
      });

      if (!eid) {
        // Usuário não está vinculado a nenhuma empresa
        setEmpresa(null);
        setLoading(false);
        return;
      }

      // Buscar dados da empresa
      const { data: emp, error: empErr } = await supabase
        .from("empresas")
        .select("id, razao_social, nome_fantasia")
        .eq("id", eid)
        .single();

      if (empErr || !emp) {
        setError("Empresa não encontrada");
        setLoading(false);
        return;
      }

      setEmpresa({
        empresaId: emp.id,
        razaoSocial: emp.razao_social,
        nomeFantasia: emp.nome_fantasia,
      });
    } catch (e: any) {
      setError(e.message ?? "Erro ao resolver empresa");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { resolver(); }, []);

  return { empresa, loading, error, refetch: resolver };
}
