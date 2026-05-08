import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ConversationSlaBadge } from "./ConversationSlaBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Layers, Flag } from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/lib/permissions/usePermission";

type Conv = {
  id: string;
  department_id: string | null;
  queue_id: string | null;
  priority: string;
  sla_due_at: string | null;
  resolved_at: string | null;
};

type Props = { conversation: Conv; onChanged?: () => void };

export function ConversationQueuePanel({ conversation, onChanged }: Props) {
  const [departments, setDepartments] = useState<{ id: string; nome: string }[]>([]);
  const [queues, setQueues] = useState<{ id: string; nome: string; department_id: string | null }[]>([]);
  const podePrioridade = usePermission("comunicacao.inbox.alterar_prioridade");
  const podeResponder = usePermission("comunicacao.responder");

  useEffect(() => {
    supabase.from("communication_departments").select("id, nome").eq("ativo", true).order("ordem")
      .then(({ data }) => setDepartments((data || []) as any));
    supabase.from("communication_queues").select("id, nome, department_id").eq("ativo", true).order("nome")
      .then(({ data }) => setQueues((data || []) as any));
  }, []);

  const filteredQueues = conversation.department_id
    ? queues.filter(q => !q.department_id || q.department_id === conversation.department_id)
    : queues;

  async function setQueue(queueId: string) {
    const { error } = await supabase.rpc("set_conversation_queue" as any, {
      p_conversation_id: conversation.id, p_queue_id: queueId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Fila atualizada");
    onChanged?.();
  }

  async function setPriority(p: string) {
    const { error } = await supabase.rpc("update_conversation_priority" as any, {
      p_conversation_id: conversation.id, p_priority: p,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Prioridade atualizada");
    onChanged?.();
  }

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
        <Layers className="h-3 w-3" /> Operação
      </h4>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground w-12">Setor</span>
          <span className="flex-1 truncate">
            {departments.find(d => d.id === conversation.department_id)?.nome || "—"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground w-12">Fila</span>
          <Select
            value={conversation.queue_id || ""}
            onValueChange={setQueue}
            disabled={!podeResponder}
          >
            <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Sem fila" /></SelectTrigger>
            <SelectContent>
              {filteredQueues.map(q => <SelectItem key={q.id} value={q.id}>{q.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Flag className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground w-12">Prior.</span>
          <Select
            value={conversation.priority}
            onValueChange={setPriority}
            disabled={!podePrioridade}
          >
            <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-1">
          <ConversationSlaBadge slaDueAt={conversation.sla_due_at} resolvedAt={conversation.resolved_at} />
        </div>
      </div>
    </div>
  );
}
