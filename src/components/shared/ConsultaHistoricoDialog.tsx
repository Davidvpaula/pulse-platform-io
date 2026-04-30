import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Clock, User } from "lucide-react";
import {
  listConsultaStatusLog,
  type ConsultaStatusLogItem,
  type ConsultaStatus,
} from "@/lib/clinico";

const STATUS_LABEL: Record<ConsultaStatus, string> = {
  agendada: "Agendada",
  aguardando_pagamento: "Aguardando pagamento",
  confirmada: "Confirmada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
  no_show: "Não compareceu",
};

const STATUS_VARIANT: Record<
  ConsultaStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  agendada: "default",
  aguardando_pagamento: "outline",
  confirmada: "default",
  em_andamento: "secondary",
  concluida: "secondary",
  cancelada: "destructive",
  no_show: "destructive",
};

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  consultaId: string | null;
  consultaResumo?: string;
}

export function ConsultaHistoricoDialog({
  open,
  onOpenChange,
  consultaId,
  consultaResumo,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ConsultaStatusLogItem[]>([]);

  useEffect(() => {
    if (!open || !consultaId) return;
    setLoading(true);
    listConsultaStatusLog(consultaId)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [open, consultaId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico da consulta</DialogTitle>
          <DialogDescription>
            {consultaResumo ?? "Mudanças de status, cancelamentos e trocas."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum evento registrado ainda.
            </p>
          ) : (
            <ol className="relative border-l border-border ml-2 space-y-4">
              {items.map((it) => {
                const mesmoStatus = it.status_anterior === it.status_novo;
                return (
                  <li key={it.id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary border border-background" />
                    <div className="rounded-md border bg-card p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {it.status_anterior && (
                          <>
                            <Badge variant={STATUS_VARIANT[it.status_anterior]}>
                              {STATUS_LABEL[it.status_anterior]}
                            </Badge>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </>
                        )}
                        <Badge variant={STATUS_VARIANT[it.status_novo]}>
                          {STATUS_LABEL[it.status_novo]}
                        </Badge>
                        {mesmoStatus && (
                          <span className="text-xs text-muted-foreground">
                            (atualização)
                          </span>
                        )}
                      </div>
                      {it.motivo && (
                        <p className="text-sm text-foreground">{it.motivo}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {fmt(it.created_at)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {it.actor_nome ?? "Sistema"}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
