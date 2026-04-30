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
import { abrirCheckout, criarCheckoutSession } from "@/lib/pagamentos";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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

type ConsultaItem = {
  id: string; medico: string; esp: string; data: string; hora: string;
  modalidade: string; status: Status; linkSala?: string | null;
};

export default function PacienteDashboard() {
  const { patientLink, setPatientLink } = useAuth();
  const { session } = useSession();
  const empresarial = patientLink.tipo === "empresarial";
  const navigate = useNavigate();

  const [dbConsultas, setDbConsultas] = useState<ConsultaItem[] | null>(null);
  useEffect(() => {
    if (!session) { setDbConsultas(null); return; }
    listConsultasDoPaciente().then((rows) => {
      setDbConsultas(rows.map((c) => ({
        id: c.id,
        medico: c.medico_nome ?? "Médico",
        esp: c.especialidade_nome ?? "—",
        data: formatDataBR(c.inicio),
        hora: formatHora(c.inicio),
        modalidade: c.modalidade,
        status: toStatusBadge(c.status),
        linkSala: c.link_sala,
      })));
    });
  }, [session]);

  const consultas: ConsultaItem[] = useMemo(() => {
    if (session && dbConsultas) return dbConsultas;
    return proximasConsultasPaciente.map((c) => ({
      id: String(c.id), medico: c.medico, esp: c.esp, data: c.data,
      hora: c.hora, modalidade: c.modalidade, status: c.status as Status,
    }));
  }, [session, dbConsultas]);

  const proxima: ConsultaItem = consultas[0] ?? {
    ...proximasConsultasPaciente[0],
    id: String(proximasConsultasPaciente[0].id),
    status: proximasConsultasPaciente[0].status as Status,
    linkSala: null,
  };
  const msgConsulta = `Olá, preciso de ajuda com minha consulta ${proxima?.id ?? ""}`.trim();

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Olá, Marina 👋"
        description="Sua central de saúde — ações rápidas, próximas consultas e suporte direto."
        actions={
          <div className="flex items-center gap-2">
            {session && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
                <DbIcon className="h-3 w-3" /> Dados em tempo real
              </span>
            )}
            {session && dbConsultas && dbConsultas[0] && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const s = await criarCheckoutSession({
                      consultaId: dbConsultas[0].id,
                      valorCentavos: 22000,
                      descricao: "Consulta de teste",
                    });
                    abrirCheckout(s, navigate);
                  } catch (e: any) {
                    toast.error(e.message ?? "Falha ao iniciar checkout");
                  }
                }}
                title="Modo simulado para desenvolvimento"
              >
                <Wallet className="mr-1.5 h-3.5 w-3.5" /> Testar checkout
              </Button>
            )}
            <Button asChild className="bg-gradient-primary hover:opacity-90">
              <Link to="/agendar"><Calendar className="mr-2 h-4 w-4" />Agendar consulta</Link>
            </Button>
          </div>
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
            {proxima.linkSala ? (
              <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90 w-full md:w-auto">
                <a href={proxima.linkSala} target="_blank" rel="noopener noreferrer">
                  <Video className="mr-2 h-4 w-4" /> Entrar na consulta
                </a>
              </Button>
            ) : (
              <Button size="lg" disabled className="w-full md:w-auto" title="Sala ainda não disponível">
                <Video className="mr-2 h-4 w-4" /> Sala em preparação
              </Button>
            )}
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
            {consultas.map(c => (
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
                  {c.linkSala ? (
                    <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90">
                      <a href={c.linkSala} target="_blank" rel="noopener noreferrer">
                        <Video className="mr-1.5 h-3.5 w-3.5" /> Entrar
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" disabled title="Sala em preparação">
                      <Video className="mr-1.5 h-3.5 w-3.5" /> Entrar
                    </Button>
                  )}
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

      {/* Comunicação — conversas e status com médico, secretaria e suporte */}
      <ComunicacaoCanais proximaConsulta={proxima} mensagemConsulta={msgConsulta} />

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

/* ============================================================
 * ComunicacaoCanais
 * Visão de comunicação: conversas e status com médico, secretaria e admin.
 * Mocks visuais — pronto para plugar em uma tabela `mensagens` no futuro.
 * ============================================================ */

type CanalStatus = "online" | "respondido" | "aguardando" | "offline";

const canalStatusUI: Record<CanalStatus, { label: string; dot: string; pill: string }> = {
  online:      { label: "Online agora",   dot: "bg-success",          pill: "bg-success/10 text-success" },
  respondido:  { label: "Respondido",     dot: "bg-primary",          pill: "bg-primary/10 text-primary" },
  aguardando:  { label: "Aguardando você",dot: "bg-warning",          pill: "bg-warning/10 text-warning" },
  offline:     { label: "Fora do horário",dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground" },
};

function ComunicacaoCanais({
  proximaConsulta, mensagemConsulta,
}: { proximaConsulta: ConsultaItem; mensagemConsulta: string }) {
  const canais = [
    {
      id: "medico",
      role: "Médico",
      nome: proximaConsulta?.medico ?? "Dr. Rafael Lasmar",
      sub: proximaConsulta?.esp ?? "Cardiologia",
      iniciais: (proximaConsulta?.medico ?? "RL")
        .split(" ").filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase(),
      status: "respondido" as CanalStatus,
      ultimoContato: "há 2h",
      ultimaMsg: "Tomar a medicação após o almoço. Qualquer dúvida me chame.",
      enviadaPor: "medico" as const,
      naoLidas: 1,
      icon: Stethoscope,
      tone: "primary",
    },
    {
      id: "secretaria",
      role: "Secretaria",
      nome: "Camila — Atendimento",
      sub: "Reagendamentos · confirmações · cobranças",
      iniciais: "CA",
      status: "aguardando" as CanalStatus,
      ultimoContato: "há 25 min",
      ultimaMsg: "Pode confirmar sua presença na consulta de amanhã às 09:00?",
      enviadaPor: "secretaria" as const,
      naoLidas: 2,
      icon: User,
      tone: "warning",
    },
    {
      id: "admin",
      role: "Suporte / Admin",
      nome: "Suporte MedClin",
      sub: "Dúvidas sobre plano, conta e uso da plataforma",
      iniciais: "SM",
      status: "online" as CanalStatus,
      ultimoContato: "agora",
      ultimaMsg: "Olá! Estamos online e prontos para ajudar.",
      enviadaPor: "admin" as const,
      naoLidas: 0,
      icon: MessageCircle,
      tone: "success",
    },
  ];

  const totalNaoLidas = canais.reduce((s, c) => s + c.naoLidas, 0);

  return (
    <section className="card-elevated p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Comunicação
          </h3>
          <p className="text-xs text-muted-foreground">
            Conversas e status com sua equipe de atendimento
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalNaoLidas > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
              <Bell className="h-3 w-3" /> {totalNaoLidas} não lida{totalNaoLidas > 1 ? "s" : ""}
            </span>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to="/app/paciente/mensagens">Ver todas <ChevronRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {canais.map((c) => {
          const ui = canalStatusUI[c.status];
          const Icon = c.icon;
          return (
            <article
              key={c.id}
              className="group relative flex flex-col rounded-xl border border-border bg-background/40 p-4 transition hover:border-primary/30 hover:shadow-sm"
            >
              {/* Header: avatar + status */}
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {c.iniciais}
                  </div>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card",
                      ui.dot,
                    )}
                    title={ui.label}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.role}</span>
                  </div>
                  <p className="truncate text-sm font-semibold">{c.nome}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{c.sub}</p>
                </div>
                {c.naoLidas > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {c.naoLidas}
                  </span>
                )}
              </div>

              {/* Status pill */}
              <div className="mt-3 flex items-center justify-between">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium", ui.pill)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", ui.dot)} />
                  {ui.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{c.ultimoContato}</span>
              </div>

              {/* Última mensagem */}
              <div className="mt-3 flex-1 rounded-lg bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  {c.enviadaPor === "medico" ? "Médico:" : c.enviadaPor === "secretaria" ? "Secretaria:" : "Suporte:"}
                </span>{" "}
                {c.ultimaMsg}
              </div>

              {/* Ações */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link to="/app/paciente/mensagens">Abrir</Link>
                </Button>
                <Button asChild size="sm" className="h-8 bg-success text-success-foreground hover:opacity-90 text-xs">
                  <a
                    href={whatsappUrl(undefined, mensagemConsulta)}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <MessageCircle className="mr-1 h-3 w-3" /> WhatsApp
                  </a>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
