import { Bell, Calendar, CreditCard, XCircle, Zap, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { LucideIcon } from "lucide-react";

const tipoMeta: Record<string, { icon: LucideIcon; tone: string }> = {
  agendamento:  { icon: Calendar,   tone: "text-info bg-info/10" },
  pagamento:    { icon: CreditCard, tone: "text-success bg-success/10" },
  cancelamento: { icon: XCircle,    tone: "text-destructive bg-destructive/10" },
  integracao:   { icon: Zap,        tone: "text-primary bg-primary-soft" },
  sistema:      { icon: Info,       tone: "text-muted-foreground bg-muted" },
  pendencia:    { icon: Bell,       tone: "text-warning bg-warning/10" },
};

export function NotificationsBell() {
  const { notificacoes, unreadCount, marcarLida, marcarTodasLidas } = useNotificacoes(10);
  const navigate = useNavigate();

  const handleClick = (n: (typeof notificacoes)[0]) => {
    if (!n.lida) marcarLida(n.id);
    if (n.referencia_tipo === "consulta" && n.referencia_id) {
      navigate("/app/medico/consultas");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display font-semibold">Notificações</p>
          {unreadCount > 0 && (
            <button onClick={() => marcarTodasLidas()} className="text-xs text-primary hover:underline">
              Marcar todas
            </button>
          )}
        </div>

        {notificacoes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
            <Bell className="h-8 w-8 opacity-40" />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          <ul className="max-h-96 overflow-y-auto divide-y divide-border">
            {notificacoes.map((n) => {
              const meta = tipoMeta[n.tipo] ?? tipoMeta.sistema;
              const Icon = meta.icon;
              return (
                <li
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "flex cursor-pointer gap-3 p-3 hover:bg-muted/40 transition-colors",
                    !n.lida && "bg-primary/5"
                  )}
                >
                  <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", meta.tone)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", !n.lida ? "font-semibold" : "font-medium")}>
                      {n.titulo}
                    </p>
                    {n.descricao && (
                      <p className="truncate text-xs text-muted-foreground">{n.descricao}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { locale: ptBR, addSuffix: false })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => navigate("/app/medico/notificacoes")}
          >
            Ver todas
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
