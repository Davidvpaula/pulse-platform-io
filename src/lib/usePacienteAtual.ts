import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./session";

export type PacienteStatus = "ativo" | "suspenso" | "bloqueado" | "banido" | "pendente";

export interface PacienteAtual {
  id: string;
  userId: string;
  nome_completo: string | null;
  cpf: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  sexo: string;
  status_conta: PacienteStatus;
  status_motivo: string | null;
  empresa_id: string | null;
  bloqueado_ate: string | null;
  whatsapp_opt_in: boolean | null;
  tags: string[];
}

export type PacienteSituacao =
  | "nao_encontrado"
  | PacienteStatus
  | null; // null = loading

interface UsePacienteAtualReturn {
  paciente: PacienteAtual | null;
  loading: boolean;
  error: string | null;
  situacao: PacienteSituacao;
  refetch: () => void;
}

export function usePacienteAtual(): UsePacienteAtualReturn {
  const { session, loading: sessionLoading } = useSession();
  const uid = session?.user.id;
  const query = useQuery({
    queryKey: ['paciente-atual', uid], enabled: !!uid && !sessionLoading,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('pacientes')
        .select('id, user_id, nome_completo, cpf, telefone, data_nascimento, sexo, status_conta, status_motivo, empresa_id, bloqueado_ate, whatsapp_opt_in, tags')
        .eq('user_id', uid!).abortSignal(signal).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? { ...data, userId: data.user_id, status_conta: data.status_conta as PacienteStatus, tags: data.tags ?? [] } : null;
    },
    staleTime: 10_000, refetchInterval: 30_000, refetchOnWindowFocus: true, retry: false,
  });
  const loading = sessionLoading || (!!uid && query.isPending);
  const paciente = !sessionLoading && uid && !query.isError ? query.data ?? null : null;
  return { paciente, loading, error: query.error?.message ?? null,
    situacao: loading ? null : paciente?.status_conta ?? 'nao_encontrado', refetch: () => { void query.refetch(); } };

}

export function usePacienteId(): string {
  const { paciente } = usePacienteAtual();
  if (!paciente) throw new Error("usePacienteId requires an active patient");
  return paciente.id;
}
