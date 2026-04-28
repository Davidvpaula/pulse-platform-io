import { Bell, Calendar, MessageSquare, AlertTriangle, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

const notifs = [
  { icon: Calendar, tone: "text-info bg-info/10", title: "Novo agendamento", desc: "Marina Costa · Cardiologia · 14:30", time: "agora" },
  { icon: MessageSquare, tone: "text-primary bg-primary-soft", title: "Mensagem WhatsApp", desc: "Construtora Horizonte enviou um documento", time: "5 min" },
  { icon: AlertTriangle, tone: "text-warning bg-warning/10", title: "Pendência", desc: "12 cobranças aguardando confirmação", time: "1h" },
  { icon: CheckCheck, tone: "text-success bg-success/10", title: "Integração", desc: "Sincronização com Feegow concluída", time: "2h" },
];

export function NotificationsBell() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display font-semibold">Notificações</p>
          <button className="text-xs text-primary hover:underline">Marcar todas</button>
        </div>
        <ul className="max-h-96 overflow-y-auto divide-y divide-border">
          {notifs.map((n, i) => (
            <li key={i} className="flex gap-3 p-3 hover:bg-muted/40">
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${n.tone}`}>
                <n.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="truncate text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{n.time}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-border p-2">
          <Button variant="ghost" className="w-full text-sm">Ver todas</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
