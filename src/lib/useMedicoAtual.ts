import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./session";


export type MedicoStatus = "pendente" | "em_analise" | "aprovado" | "reprovado" | "suspenso" | "bloqueado";

export interface MedicoAtual {
  /** medicos.id (PK da tabela medicos) */
  id: string;
  /** auth.users.id */
  userId: string;
  nome: string;
  email: string;
  crm: string;
  crm_estado: string;
  especialidade: string;
  status: MedicoStatus;
  link_sala_padrao: string | null;
  foto_url: string | null;
  telefone: string | null;
  bio: string | null;
  suspenso_ate: string | null;
  suspenso_indeterminado: boolean;
  suspensao_motivo: string | null;
  bloqueio_motivo: string | null;
  prioridade_atendimento: number;
  tipo_sala: string;
}

interface UseMedicoAtualReturn {
  medico: MedicoAtual | null;
  /** true enquanto carrega pela primeira vez */
  loading: boolean;
  /** null = sem erro; string = mensagem */
  error: string | null;
  /** "nao_encontrado" | "pendente" | "em_analise" | "reprovado" | "suspenso" | "bloqueado" | "aprovado" | null (loading) */
  situacao: "nao_encontrado" | MedicoStatus | null;
  refetch: () => void;
}

export function useMedicoAtual(): UseMedicoAtualReturn {
  const { session, loading: sessionLoading } = useSession();
  const uid = session?.user.id;
  const query = useQuery({
    queryKey: ['medico-atual', uid], enabled: !!uid && !sessionLoading,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('medicos')
        .select('id, user_id, nome, email, crm, crm_estado, especialidade, status, link_sala_padrao, foto_url, telefone, bio, suspenso_ate, suspenso_indeterminado, suspensao_motivo, bloqueio_motivo, prioridade_atendimento, tipo_sala')
        .eq('user_id', uid!).abortSignal(signal).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? { ...data, userId: data.user_id, status: data.status as MedicoStatus } : null;
    },
    staleTime: 10_000, refetchInterval: 30_000, refetchOnWindowFocus: true, retry: false,
  });
  const loading = sessionLoading || (!!uid && query.isPending);
  const medico = !sessionLoading && uid && !query.isError ? query.data ?? null : null;
  return { medico, loading, error: query.error?.message ?? null,
    situacao: loading ? null : medico?.status ?? 'nao_encontrado', refetch: () => { void query.refetch(); } };
}

/**
 * Convenience: inside MedicoGuard, medico is guaranteed to exist and be approved.
 * Throws if used outside guard context (medico is null).
 */
export function useMedicoId(): string {
  const { medico } = useMedicoAtual();
  if (!medico) throw new Error("useMedicoId must be used inside MedicoGuard (medico is null)");
  return medico.id;
}
