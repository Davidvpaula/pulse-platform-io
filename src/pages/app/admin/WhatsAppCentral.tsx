import { Phone, Send, Bot, Activity, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";

export default function WhatsAppCentral() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Business API"
        description="Conexões oficiais e estado das duas caixas."
        actions={<Button className="bg-gradient-primary hover:opacity-90">Conectar nova caixa</Button>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Mensagens enviadas" value="12.4k" icon={Send} hint="Últimos 30 dias" />
        <StatCard label="Taxa de resposta" value="94%" icon={Activity} trend={{ value: "+2%", positive: true }} />
        <StatCard label="Bot resolveu" value="64%" icon={Bot} hint="Sem humano" />
        <StatCard label="Tempo médio" value="2m 14s" icon={MessageSquare} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { n: "Comercial", num: "+55 31 9000-0001", status: "Conectado", cor: "success" },
          { n: "Operacional / Suporte", num: "+55 31 9000-0002", status: "Conectado", cor: "success" },
        ].map(b => (
          <div key={b.n} className="card-elevated p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-success/10 text-success">
                <Phone className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="font-semibold">WhatsApp {b.n}</p>
                <p className="text-xs font-mono text-muted-foreground">{b.num}</p>
              </div>
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">{b.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Conversas</p><p className="font-semibold">128</p></div>
              <div><p className="text-muted-foreground text-xs">Resolvidas</p><p className="font-semibold">96</p></div>
              <div><p className="text-muted-foreground text-xs">Pendentes</p><p className="font-semibold">7</p></div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">Templates</Button>
              <Button size="sm" variant="outline" className="flex-1">Métricas</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
