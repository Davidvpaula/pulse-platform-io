import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "aberta", label: "Aberta" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "aguardando_paciente", label: "Aguardando paciente" },
  { value: "pendente", label: "Pendente" },
  { value: "fechada", label: "Resolvida / Encerrada" },
];

type Props = {
  conversationId: string;
  status: string;
  disabled?: boolean;
  onChanged?: () => void;
};

export function StatusOperacionalSelect({ conversationId, status, disabled, onChanged }: Props) {
  async function change(s: string) {
    const { error } = await supabase.rpc("update_conversation_status" as any, {
      p_conversation_id: conversationId, p_status: s,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Status atualizado");
    onChanged?.();
  }
  return (
    <Select value={status} onValueChange={change} disabled={disabled}>
      <SelectTrigger className="h-7 text-xs w-[170px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
