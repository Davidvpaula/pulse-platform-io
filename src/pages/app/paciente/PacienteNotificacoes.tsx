import { useState } from "react";
import {
  Bell, Calendar, CreditCard, XCircle, Zap, Info,
  CheckCheck, Loader2, Inbox,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { LucideIcon } from "lucide-react";

const tipoMeta: Record<string, { icon: LucideIcon; tone: string; label: string }> = {
  agendamento:  { icon: Calendar,   tone: "text-info bg-info/10",               label: "Agendamento" },
  pagamento:    { icon: CreditCard, tone: "text-success bg-success/10",          label: "Pagamento" },
  cancelamento: { icon: XCircle,    tone: "text-destructive bg-destructive/10",  label: "Cancelamento" },
  integracao:   { icon: Zap,        tone: "text-primary bg-primary-soft",        label: "Integração" },
  sistema:      { icon: Info,       tone: "text-muted-foreground bg-muted",      label: "Sistema" },
  pendencia:    { icon: Bell,       tone: "text-warning bg-warning/10",          label: "Pendência" },
};

const FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "agendamento", label: "Agendamentos" },
  { value: "pagamento", label: "Pagamentos" },
  { value: "cancelamento", label: "Cancelamentos" },
  { value: "sistema", label: "Sistema" },
];

export default function PacienteNotificacoes() {
  const { notificacoes, loading, unreadCount, marcarLida, marcarTodasLidas } = useNotificacoes(100);
  const [filtro, setFiltro] = useState("todos");
  const navigate = useNavigate();

  const filtered = filtro === "todos"
    ? notificacoes
    : notificacoes.filter((n) => n.tipo === filtro);

  const handleClick = (n: (typeof notificacoes)[0]) => {
    if (!n.lida) marcarLida(n.id);
    if (n.referencia_tipo === "consulta" && n.referencia_id) {
      navigate("/app/paciente/agendamentos");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificações"
        description="Eventos e alertas do sistema em tempo real"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filtro === f.value ? "default" : "outline"}
              onClick={() => setFiltro(f.value)}
              className="text-xs"
            >
              {f.label}
            </Button>
          ))}
        </div>

        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={() => marcarTodasLidas()}>
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Marcar todas como lidas ({unreadCount})
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Inbox className="h-12 w-12 opacity-30" />
          <p className="text-sm">Nenhuma notificação {filtro !== "todos" ? "neste filtro" : "ainda"}</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-1">
            {filtered.map((n) => {
              const meta = tipoMeta[n.tipo] ?? tipoMeta.sistema;
              const Icon = meta.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/40",
                    !n.lida ? "border-primary/20 bg-primary/5" : "border-border"
                  )}
                >
                  <div className={cn("mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full", meta.tone)}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm", !n.lida ? "font-semibold" : "font-medium")}>
                        {n.titulo}
                      </p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {meta.label}
                      </Badge>
                      {!n.lida && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    {n.descricao && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.descricao}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(n.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {" · "}
                      {formatDistanceToNow(new Date(n.created_at), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
