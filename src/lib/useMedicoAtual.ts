import { useEffect, useState } from "react";
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
  const { session } = useSession();
  const [medico, setMedico] = useState<MedicoAtual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const uid = session?.user?.id;

  useEffect(() => {
    if (!uid) {
      setMedico(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    (async () => {
      const { data, error: err } = await supabase
        .from("medicos")
        .select("id, user_id, nome, email, crm, crm_estado, especialidade, status, link_sala_padrao, foto_url, telefone, bio, suspenso_ate, suspenso_indeterminado, suspensao_motivo, bloqueio_motivo, prioridade_atendimento, tipo_sala")
        .eq("user_id", uid)
        .maybeSingle();

      if (!active) return;

      if (err) {
        setError(err.message);
        setMedico(null);
      } else if (!data) {
        setError(null);
        setMedico(null);
      } else {
        setError(null);
        setMedico({
          id: data.id,
          userId: data.user_id,
          nome: data.nome,
          email: data.email,
          crm: data.crm,
          crm_estado: data.crm_estado,
          especialidade: data.especialidade,
          status: data.status as MedicoStatus,
          link_sala_padrao: data.link_sala_padrao,
          foto_url: data.foto_url,
          telefone: data.telefone,
          bio: data.bio,
          suspenso_ate: data.suspenso_ate,
          suspenso_indeterminado: data.suspenso_indeterminado,
          suspensao_motivo: data.suspensao_motivo,
          bloqueio_motivo: data.bloqueio_motivo,
          prioridade_atendimento: data.prioridade_atendimento,
          tipo_sala: data.tipo_sala,
        });
      }
      setLoading(false);
    })();

    return () => { active = false; };
  }, [uid, tick]);

  const situacao: UseMedicoAtualReturn["situacao"] = loading
    ? null
    : !medico
      ? "nao_encontrado"
      : medico.status;

  return { medico, loading, error, situacao, refetch: () => setTick(t => t + 1) };
}
