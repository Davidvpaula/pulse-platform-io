import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./session";
import { obs } from "./observability";

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
  const { session } = useSession();
  const [paciente, setPaciente] = useState<PacienteAtual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const uid = session?.user?.id;

  useEffect(() => {
    if (!uid) {
      setPaciente(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    (async () => {
      const start = performance.now();
      const { data, error: err } = await supabase
        .from("pacientes")
        .select("id, user_id, nome_completo, cpf, telefone, data_nascimento, sexo, status_conta, status_motivo, empresa_id, bloqueado_ate, whatsapp_opt_in, tags")
        .eq("user_id", uid)
        .maybeSingle();
      const durationMs = Math.round(performance.now() - start);

      if (!active) return;

      if (err) {
        obs.error("auth", "usePacienteAtual — falha ao buscar paciente", { module: "paciente", durationMs, meta: { error: err.message } });
        setError(err.message);
        setPaciente(null);
      } else if (!data) {
        obs.info("auth", "usePacienteAtual — registro não encontrado", { module: "paciente", durationMs });
        setError(null);
        setPaciente(null);
      } else {
        obs.info("auth", "usePacienteAtual — carregado", { module: "paciente", durationMs, meta: { pacienteId: data.id, status: data.status_conta } });
        setError(null);
        setPaciente({
          id: data.id,
          userId: data.user_id,
          nome_completo: data.nome_completo,
          cpf: data.cpf,
          telefone: data.telefone,
          data_nascimento: data.data_nascimento,
          sexo: data.sexo,
          status_conta: data.status_conta as PacienteStatus,
          status_motivo: data.status_motivo,
          empresa_id: data.empresa_id,
          bloqueado_ate: data.bloqueado_ate,
          whatsapp_opt_in: data.whatsapp_opt_in,
          tags: data.tags ?? [],
        });
      }
      setLoading(false);
    })();

    return () => { active = false; };
  }, [uid, tick]);

  const situacao: PacienteSituacao = loading
    ? null
    : !paciente
      ? "nao_encontrado"
      : paciente.status_conta;

  return { paciente, loading, error, situacao, refetch: () => setTick(t => t + 1) };
}

/**
 * Convenience: inside PacienteGuard, paciente is guaranteed to exist and be active.
 */
export function usePacienteId(): string {
  const { paciente } = usePacienteAtual();
  if (!paciente) throw new Error("usePacienteId must be used inside PacienteGuard (paciente is null)");
  return paciente.id;
}
