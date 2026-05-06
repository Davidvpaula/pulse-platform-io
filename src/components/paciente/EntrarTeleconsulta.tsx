import { useMemo, useCallback } from "react";
import { Video, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { obs } from "@/lib/observability";
import { toast } from "sonner";

interface EntrarTeleconsultaProps {
  consultaId: string;
  linkSala: string | null | undefined;
  inicio: string; // ISO
  fim: string; // ISO
  status: string;
  modalidade: string;
  size?: "sm" | "default";
  variant?: "gradient" | "outline";
}

/** Minutos antes do horário que o paciente pode entrar */
const ANTECEDENCIA_MIN = 15;
/** Minutos depois do fim que o link ainda funciona */
const TOLERANCIA_POS_MIN = 30;

export default function EntrarTeleconsulta({
  consultaId,
  linkSala,
  inicio,
  fim,
  status,
  modalidade,
  size = "sm",
  variant = "gradient",
}: EntrarTeleconsultaProps) {
  const isOnline = modalidade === "online";
  if (!isOnline) return null;

  const statusBloqueado = ["cancelada", "concluida", "no_show"].includes(status);
  if (statusBloqueado) return null;

  const { podeEntrar, motivo } = useMemo(() => {
    if (!linkSala) return { podeEntrar: false, motivo: "Sala em preparação — o link será disponibilizado em breve." };

    const agora = Date.now();
    const inicioMs = new Date(inicio).getTime();
    const fimMs = new Date(fim).getTime();
    const aberturaMs = inicioMs - ANTECEDENCIA_MIN * 60_000;
    const fechamentoMs = fimMs + TOLERANCIA_POS_MIN * 60_000;

    if (agora < aberturaMs) {
      const minFaltam = Math.ceil((aberturaMs - agora) / 60_000);
      return {
        podeEntrar: false,
        motivo: `A sala abre ${ANTECEDENCIA_MIN} min antes. Faltam ${minFaltam} min.`,
      };
    }
    if (agora > fechamentoMs) {
      return { podeEntrar: false, motivo: "O horário da consulta já encerrou." };
    }

    return { podeEntrar: true, motivo: null };
  }, [linkSala, inicio, fim]);

  const handleEntrar = useCallback(() => {
    if (!linkSala || !podeEntrar) return;

    // Audit log async — não bloqueia a entrada
    obs.info("auth", "Paciente acessou sala de teleconsulta", {
      module: "paciente",
      meta: { consultaId },
    });

    supabase.functions.invoke("audit-log", {
      body: {
        action: "teleconsulta.paciente_entrou",
        entity_type: "consulta",
        entity_id: consultaId,
      },
    }).catch(() => {});

    window.open(linkSala, "_blank", "noopener,noreferrer");
  }, [linkSala, podeEntrar, consultaId]);

  if (podeEntrar) {
    return (
      <Button
        size={size}
        className={variant === "gradient" ? "bg-gradient-primary hover:opacity-90" : ""}
        variant={variant === "outline" ? "outline" : "default"}
        onClick={handleEntrar}
      >
        <Video className="mr-1.5 h-3.5 w-3.5" /> Entrar
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size={size} disabled variant="outline" className="opacity-60">
          {linkSala ? <Clock className="mr-1.5 h-3.5 w-3.5" /> : <Video className="mr-1.5 h-3.5 w-3.5" />}
          {linkSala ? "Aguarde" : "Sala em prep."}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[250px]">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-xs">{motivo}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
