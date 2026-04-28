import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Video, FileText, Wallet, MessageSquare, Calendar, BadgeCheck, Download,
  ChevronRight, Building2, User, MessageCircle, RefreshCw, Bell, AlertTriangle,
  CheckCircle2, Info, Repeat, Stethoscope, Database as DbIcon,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { proximasConsultasPaciente, documentosPaciente, timelinePaciente, type Status } from "@/lib/mock";
import { CategorizedTimeline } from "@/components/CategorizedTimeline";
import { FloatingWhatsApp, whatsappUrl } from "@/components/FloatingWhatsApp";
import { useAuth } from "@/lib/auth";
import { useSession } from "@/lib/session";
import { listConsultasDoPaciente, formatDataBR, formatHora, toStatusBadge } from "@/lib/clinico";
import { cn } from "@/lib/utils";

type AlertTone = "urgente" | "atencao" | "ok";
type AlertItem = { tone: AlertTone; titulo: string; desc: string; cta?: { label: string; to: string } };

const alerts: AlertItem[] = [
  { tone: "urgente", titulo: "Consulta hoje às 14:30", desc: "Dr. Rafael Lasmar · Telemedicina", cta: { label: "Entrar", to: "#consulta" } },
  { tone: "atencao", titulo: "Pagamento pendente", desc: "1 fatura aberta · R$ 220", cta: { label: "Pagar", to: "/app/paciente/financeiro" } },
  { tone: "ok", titulo: "Novo documento disponível", desc: "Receita emitida hoje", cta: { label: "Abrir", to: "/app/paciente/documentos" } },
  { tone: "ok", titulo: "Retorno disponível", desc: "Cardiologia · até 15 dias sem custo", cta: { label: "Agendar", to: "/agendar" } },
];

const toneStyles: Record<AlertTone, { wrap: string; icon: typeof Bell; iconClass: string; label: string }> = {
  urgente:  { wrap: "border-destructive/30 bg-destructive/5", icon: AlertTriangle, iconClass: "text-destructive", label: "Urgente" },
  atencao:  { wrap: "border-warning/30 bg-warning/5",          icon: Bell,           iconClass: "text-warning",     label: "Atenção" },
  ok:       { wrap: "border-success/30 bg-success/5",          icon: CheckCircle2,   iconClass: "text-success",     label: "Tudo certo" },
};

const messages = [
  { id: 1, kind: "lembrete",     icon: Bell,           titulo: "Lembrete de consulta",  texto: "Sua consulta começa em 1h. Prepare seu ambiente.", data: "agora" },
  { id: 2, kind: "sistema",      icon: Info,           titulo: "Documento novo",        texto: "Receita Losartana 50mg disponível.",                data: "há 30 min" },
  { id: 3, kind: "automacao",    icon: MessageSquare,  titulo: "Confirmação WhatsApp",  texto: "Sua consulta de amanhã foi confirmada.",            data: "há 2h" },
  { id: 4, kind: "financeiro",   icon: Wallet,         titulo: "Cobrança gerada",       texto: "Fatura C-1031 disponível para pagamento.",          data: "ontem" },
];

export default function PacienteDashboard() {
  const proxima = proximasConsultasPaciente[0];
  const { patientLink, setPatientLink } = useAuth();
  const empresarial = patientLink.tipo === "empresarial";

  const msgConsulta = `Olá, preciso de ajuda com minha consulta ${proxima?.id ?? ""}`.trim();

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Olá, Marina 👋"
        description="Sua central de saúde — ações rápidas, próximas consultas e suporte direto."
        actions={
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/agendar"><Calendar className="mr-2 h-4 w-4" />Agendar consulta</Link>
          </Button>
        }
      />

      {/* Vínculo do paciente */}
      <div className="card-elevated flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 place-items-center rounded-xl", empresarial ? "bg-accent/15 text-accent" : "bg-primary-soft text-primary")}>
            {empresarial ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de vínculo</p>
            <p className="font-semibold">
              {empresarial ? "Empresarial" : "Particular"}
              {empresarial && patientLink.empresa && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  · {patientLink.empresa}{patientLink.plano && <> · plano {patientLink.plano}</>}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant={empresarial ? "outline" : "default"} size="sm"
            className={!empresarial ? "bg-gradient-primary hover:opacity-90" : ""}
            onClick={() => setPatientLink({ tipo: "particular" })}>Particular</Button>
          <Button variant={empresarial ? "default" : "outline"} size="sm"
            className={empresarial ? "bg-gradient-primary hover:opacity-90" : ""}
            onClick={() => setPatientLink({ tipo: "empresarial", empresa: "Construtora Horizonte", plano: "Saúde Empresa" })}>Empresarial</Button>
        </div>
      </div>

      {/* Próxima consulta — destaque + ações */}
      <div id="consulta" className="card-elevated overflow-hidden">
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
          <div className="grid gap-2 md:justify-items-end">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 w-full md:w-auto">
              <Video className="mr-2 h-4 w-4" /> Entrar na consulta
            </Button>
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" size="sm" className="flex-1">
                <Repeat className="mr-2 h-3.5 w-3.5" /> Remarcar
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1">
                <a href={whatsappUrl(msgConsulta)} target="_blank" rel="noreferrer noopener">
                  <MessageCircle className="mr-2 h-3.5 w-3.5 text-success" /> WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas inteligentes */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Alertas</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {alerts.map((a, i) => {
            const t = toneStyles[a.tone];
            const Icon = t.icon;
            return (
              <div key={i} className={cn("card-elevated p-4 border", t.wrap)}>
                <div className="flex items-start gap-3">
                  <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", t.iconClass)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{a.titulo}</p>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase", t.iconClass, "bg-background/60")}>
                        {t.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{a.desc}</p>
                  </div>
                  {a.cta && (
                    <Button asChild size="sm" variant="ghost">
                      {a.cta.to.startsWith("#")
                        ? <a href={a.cta.to}>{a.cta.label}</a>
                        : <Link to={a.cta.to}>{a.cta.label}</Link>}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumo — agora clicável */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link to="/app/paciente/agendamentos" className="block transition hover:-translate-y-0.5">
          <StatCard label="Consultas no mês" value="3" icon={Calendar} hint="1 agendada" />
        </Link>
        <Link to="/app/paciente/documentos" className="block transition hover:-translate-y-0.5">
          <StatCard label="Documentos" value="12" icon={FileText} hint="2 novos" />
        </Link>
        <Link to="/app/paciente/plano" className="block transition hover:-translate-y-0.5">
          <StatCard label="Plano ativo" value="Saúde+" icon={BadgeCheck} hint="Renova em 12 dias" />
        </Link>
        <Link to="/app/paciente/financeiro" className="block transition hover:-translate-y-0.5">
          <StatCard label="A pagar" value="R$ 220" icon={Wallet} hint="1 fatura aberta" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Próximos agendamentos */}
        <div className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Próximos agendamentos</h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/paciente/agendamentos">Ver todos <ChevronRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border">
            {proximasConsultasPaciente.map(c => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.medico}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.esp} · {c.data} {c.hora} · {c.modalidade}</p>
                </div>
                <StatusBadge status={c.status} />
                <div className="flex gap-2">
                  <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                    <Video className="mr-1.5 h-3.5 w-3.5" /> Entrar
                  </Button>
                  <Button size="sm" variant="outline">
                    <Repeat className="mr-1.5 h-3.5 w-3.5" /> Remarcar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Últimos documentos */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Últimos documentos</h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/paciente/documentos">Ver todos</Link>
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {documentosPaciente.slice(0, 4).map(d => (
              <div key={d.id} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.titulo}</p>
                  <p className="text-xs text-muted-foreground">{d.tipo} · {d.data}</p>
                </div>
                <Button size="sm" variant="ghost"><Download className="mr-1.5 h-3.5 w-3.5" /> Baixar</Button>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <RefreshCw className="h-3 w-3" /> Sincroniza futuramente com Feegow
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mensagens & Suporte */}
        <div className="card-elevated p-6 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Mensagens</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {messages.length} novas
            </span>
          </div>
          <div className="mt-4 divide-y divide-border">
            {messages.map(m => {
              const Icon = m.icon;
              return (
                <div key={m.id} className="flex items-start gap-3 py-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.titulo}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.texto}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{m.data}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/app/paciente/mensagens">Abrir mensagens</Link>
            </Button>
            <Button asChild size="sm" className="bg-success text-success-foreground hover:opacity-90">
              <a href={whatsappUrl()} target="_blank" rel="noreferrer noopener">
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
              </a>
            </Button>
          </div>
        </div>

        {/* Linha do tempo categorizada */}
        <div className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Minha linha do tempo</h3>
            <span className="text-xs text-muted-foreground">Cronologia de eventos</span>
          </div>
          <div className="mt-5">
            <CategorizedTimeline events={timelinePaciente("P-1001")} />
          </div>
        </div>
      </div>

      <FloatingWhatsApp />
    </div>
  );
}
