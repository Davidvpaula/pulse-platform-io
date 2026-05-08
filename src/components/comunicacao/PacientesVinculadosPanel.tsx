import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Star, CheckCircle2, AlertTriangle, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VincularPacienteDialog } from "./VincularPacienteDialog";

export type VinculoPaciente = {
  id: string;
  conversation_id: string;
  paciente_id: string;
  parentesco: string | null;
  origem: string;
  vinculado_em: string;
  confirmado_em: string | null;
  confirmado_por: string | null;
  removido_em: string | null;
  paciente?: {
    id: string;
    nome_completo: string;
    telefone: string | null;
  } | null;
};

type Props = {
  conversationId: string;
  contactPhone: string | null;
  pacienteAtivoId: string | null;
  canResponder: boolean;
  onChange?: (vinculos: VinculoPaciente[]) => void;
};

export function PacientesVinculadosPanel({
  conversationId,
  contactPhone,
  pacienteAtivoId,
  canResponder,
  onChange,
}: Props) {
  const [vinculos, setVinculos] = useState<VinculoPaciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [vincularOpen, setVincularOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("conversation_pacientes")
      .select(
        `id, conversation_id, paciente_id, parentesco, origem, vinculado_em,
         confirmado_em, confirmado_por, removido_em,
         paciente:pacientes(id, nome_completo, telefone)`
      )
      .eq("conversation_id", conversationId)
      .is("removido_em", null)
      .order("vinculado_em", { ascending: true });
    const list = (data || []) as unknown as VinculoPaciente[];
    setVinculos(list);
    setLoading(false);
    onChange?.(list);
  }, [conversationId, onChange]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`conv-pacientes-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_pacientes",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId, load]);

  async function confirmar(v: VinculoPaciente) {
    setActionId(v.id);
    const { error } = await supabase.rpc("confirmar_vinculo_paciente", {
      p_link_id: v.id,
    });
    setActionId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Vínculo confirmado — prontuário liberado");
    load();
  }

  async function definirAtivo(v: VinculoPaciente) {
    setActionId(v.id);
    const { error } = await supabase.rpc("definir_paciente_ativo_conversa", {
      p_conversation_id: conversationId,
      p_paciente_id: v.paciente_id,
    });
    setActionId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${v.paciente?.nome_completo ?? "Paciente"} é o foco do atendimento`);
  }

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
        <Users className="h-3 w-3" /> Pacientes vinculados
      </h4>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando…
        </div>
      ) : vinculos.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Nenhum paciente vinculado ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {vinculos.map((v) => {
            const ativo = v.paciente_id === pacienteAtivoId;
            const confirmado = !!v.confirmado_em;
            return (
              <li
                key={v.id}
                className={cn(
                  "rounded-md border p-2 space-y-1.5",
                  ativo ? "border-primary/40 bg-primary/5" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-1">
                      {v.paciente?.nome_completo ?? "Paciente"}
                      {ativo && (
                        <Star className="h-3 w-3 fill-primary text-primary shrink-0" />
                      )}
                    </p>
                    {v.paciente?.telefone && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" /> {v.paciente.telefone}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {confirmado ? (
                      <Badge
                        variant="outline"
                        className="text-[9px] border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                      >
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> confirmado
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[9px] border-amber-500/40 text-amber-700 dark:text-amber-400"
                      >
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> pendente
                      </Badge>
                    )}
                    {ativo && (
                      <Badge variant="default" className="text-[9px]">
                        em foco
                      </Badge>
                    )}
                  </div>
                </div>

                {canResponder && (
                  <div className="flex flex-wrap gap-1">
                    {!confirmado && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] px-2"
                        onClick={() => confirmar(v)}
                        disabled={actionId === v.id}
                      >
                        {actionId === v.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        Confirmar
                      </Button>
                    )}
                    {confirmado && !ativo && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] px-2"
                        onClick={() => definirAtivo(v)}
                        disabled={actionId === v.id}
                      >
                        <Star className="h-3 w-3 mr-1" /> Definir ativo
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canResponder && (
        <Button
          size="sm"
          variant="outline"
          className="w-full mt-2 h-7 text-xs"
          onClick={() => setVincularOpen(true)}
        >
          <UserPlus className="h-3 w-3 mr-1" /> Vincular paciente
        </Button>
      )}

      <VincularPacienteDialog
        open={vincularOpen}
        onOpenChange={setVincularOpen}
        conversationId={conversationId}
        contactPhone={contactPhone}
        onLinked={load}
      />
    </div>
  );
}
