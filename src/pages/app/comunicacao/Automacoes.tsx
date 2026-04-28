import { useState } from "react";
import {
  Activity, Plus, Calendar, Clock, Video, MessageSquare, Star, Wallet,
  Power, Pencil,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Automacao = {
  id: string;
  nome: string;
  gatilho: string;
  acao: string;
  template?: string;
  ativo: boolean;
  criada: string;
  icon: typeof Calendar;
  tone: string;
  execucoes: number;
};

const initial: Automacao[] = [
  {
    id: "AUT-01", nome: "Confirmar agendamento",
    gatilho: "Novo agendamento criado", acao: "Enviar mensagem WhatsApp",
    template: "Confirmação de consulta", ativo: true,
    criada: "10/Mar/2026", icon: Calendar, tone: "bg-success/10 text-success", execucoes: 1842,
  },
  {
    id: "AUT-02", nome: "Lembrete 24h antes",
    gatilho: "24h antes da consulta", acao: "Enviar mensagem WhatsApp",
    template: "Lembrete 24h antes", ativo: true,
    criada: "10/Mar/2026", icon: Clock, tone: "bg-warning/10 text-warning", execucoes: 1567,
  },
  {
    id: "AUT-03", nome: "Lembrete 1h antes",
    gatilho: "1h antes da consulta", acao: "Enviar mensagem WhatsApp",
    template: "Lembrete 1h antes", ativo: true,
    criada: "10/Mar/2026", icon: Clock, tone: "bg-warning/10 text-warning", execucoes: 1521,
  },
  {
    id: "AUT-04", nome: "Enviar link Google Meet",
    gatilho: "Consulta confirmada (telemedicina)", acao: "Enviar link de videochamada",
    template: "Link Google Meet", ativo: true,
    criada: "12/Mar/2026", icon: Video, tone: "bg-info/10 text-info", execucoes: 988,
  },
  {
    id: "AUT-05", nome: "Pós-consulta · feedback",
    gatilho: "Consulta finalizada", acao: "Enviar pesquisa de satisfação",
    template: "Pós-consulta", ativo: true,
    criada: "15/Mar/2026", icon: Star, tone: "bg-accent/10 text-accent", execucoes: 1124,
  },
  {
    id: "AUT-06", nome: "Cobrança Pix automática",
    gatilho: "Agendamento aguardando pagamento > 30min", acao: "Enviar Pix WhatsApp",
    template: "Cobrança Pix", ativo: false,
    criada: "20/Mar/2026", icon: Wallet, tone: "bg-primary-soft text-primary", execucoes: 87,
  },
];

export default function Automacoes() {
  const [items, setItems] = useState<Automacao[]>(initial);

  const toggle = (id: string) =>
    setItems(its => its.map(i => i.id === id ? { ...i, ativo: !i.ativo } : i));

  const ativas = items.filter(i => i.ativo).length;
  const totalExec = items.reduce((s, i) => s + i.execucoes, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automações"
        description="Regras inteligentes que agem sozinhas em pontos-chave da jornada do paciente."
        actions={<Button><Plus className="mr-2 h-4 w-4" />Nova automação</Button>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-elevated p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Automações ativas</p>
          <p className="mt-2 font-display text-3xl font-bold">{ativas} <span className="text-base text-muted-foreground">/ {items.length}</span></p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Execuções no mês</p>
          <p className="mt-2 font-display text-3xl font-bold">{totalExec.toLocaleString("pt-BR")}</p>
        </div>
        <div className="card-elevated p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Taxa de entrega</p>
          <p className="mt-2 font-display text-3xl font-bold text-success">98.4%</p>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Automação</th>
              <th className="p-3 text-left">Gatilho</th>
              <th className="p-3 text-left">Ação</th>
              <th className="p-3 text-left">Template</th>
              <th className="p-3 text-left">Execuções</th>
              <th className="p-3 text-left">Criada</th>
              <th className="p-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(a => (
              <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", a.tone)}>
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{a.nome}</p>
                      <p className="text-[11px] text-muted-foreground">{a.id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{a.gatilho}</td>
                <td className="p-3">{a.acao}</td>
                <td className="p-3">
                  {a.template && (
                    <span className="rounded bg-primary-soft px-2 py-0.5 text-xs text-primary">{a.template}</span>
                  )}
                </td>
                <td className="p-3 font-mono text-xs">{a.execucoes.toLocaleString("pt-BR")}</td>
                <td className="p-3 text-muted-foreground">{a.criada}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <Switch checked={a.ativo} onCheckedChange={() => toggle(a.id)} />
                    <Button size="icon" variant="ghost" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card-elevated p-5 flex items-center gap-3 border-info/30 bg-info/5">
        <Power className="h-5 w-5 shrink-0 text-info" />
        <p className="text-sm">
          <strong>Próximas integrações:</strong> WhatsApp Business API para disparo real, Webhook para Feegow,
          e gatilhos a partir de eventos de pagamento (Stripe / Pix).
        </p>
      </div>
    </div>
  );
}
