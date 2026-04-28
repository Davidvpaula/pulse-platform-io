import { Video, FileText, Wallet, MessageSquare, Calendar, BadgeCheck, Download, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { proximasConsultasPaciente, documentosPaciente } from "@/lib/mock";

export default function PacienteDashboard() {
  const proxima = proximasConsultasPaciente[0];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Olá, Marina 👋"
        description="Acompanhe suas consultas, documentos e plano em um só lugar."
        actions={<Button className="bg-gradient-primary hover:opacity-90"><Calendar className="mr-2 h-4 w-4" />Agendar consulta</Button>}
      />

      {/* Próxima consulta — destaque */}
      <div className="card-elevated overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center gradient-soft">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Próxima consulta</p>
            <h2 className="mt-2 font-display text-2xl font-bold">{proxima.medico}</h2>
            <p className="text-sm text-muted-foreground">{proxima.esp} · {proxima.modalidade}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 border border-border">
                <Calendar className="h-3.5 w-3.5 text-primary" /> {proxima.data} · {proxima.hora}
              </span>
              <StatusBadge status={proxima.status} />
            </div>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90">
              <Video className="mr-2 h-4 w-4" /> Entrar na consulta
            </Button>
            <Button variant="outline" size="sm">Remarcar</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Consultas no mês" value="3" icon={Calendar} hint="1 agendada" />
        <StatCard label="Documentos" value="12" icon={FileText} hint="2 novos" />
        <StatCard label="Plano ativo" value="Saúde+" icon={BadgeCheck} hint="Renova em 12 dias" />
        <StatCard label="A pagar" value="R$ 220" icon={Wallet} hint="1 fatura aberta" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agendamentos */}
        <div className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Meus agendamentos</h3>
            <Button variant="ghost" size="sm">Ver todos <ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
          <div className="mt-4 divide-y divide-border">
            {proximasConsultasPaciente.map(c => (
              <div key={c.id} className="flex items-center gap-4 py-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.medico}</p>
                  <p className="text-xs text-muted-foreground">{c.esp} · {c.data} {c.hora} · {c.modalidade}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Documentos */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Carteira documental</h3>
            <span className="text-xs text-muted-foreground">via Feegow (futuro)</span>
          </div>
          <div className="mt-4 space-y-3">
            {documentosPaciente.map(d => (
              <div key={d.id} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.titulo}</p>
                  <p className="text-xs text-muted-foreground">{d.tipo} · {d.data}</p>
                </div>
                <Button size="icon" variant="ghost"><Download className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Suporte */}
      <div className="card-elevated p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">Precisa de ajuda?</p>
            <p className="text-sm text-muted-foreground">Fale com nossa equipe pelo chat ou WhatsApp.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Abrir chat</Button>
          <Button className="bg-gradient-primary hover:opacity-90">WhatsApp</Button>
        </div>
      </div>
    </div>
  );
}
