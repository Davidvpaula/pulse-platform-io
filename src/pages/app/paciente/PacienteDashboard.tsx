import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Video, FileText, Wallet, MessageSquare, Calendar, BadgeCheck,
  ChevronRight, Building2, User, MessageCircle, Repeat, Stethoscope, Loader2, Bell, Gift,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { FloatingWhatsApp, whatsappUrl } from "@/components/FloatingWhatsApp";
import AvaliacaoPendenteBanner from "@/components/paciente/AvaliacaoPendenteBanner";
import HistoricoCancelamentos from "@/components/paciente/HistoricoCancelamentos";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { usePacienteAtual } from "@/lib/usePacienteAtual";
import { useSession } from "@/lib/session";
import { listConsultasDoPaciente, formatDataBR, formatHora, toStatusBadge, listRetornosDisponiveis, type RetornoComContexto } from "@/lib/clinico";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

/** Status type used by StatusBadge */
type BadgeStatus =
  | "paciente_criado" | "feegow_enviado" | "feegow_sincronizado"
  | "agendamento_criado" | "confirmado" | "aguardando"
  | "em_andamento" | "concluido" | "cancelado" | "no_show";

type ConsultaItem = {
  id: string; medico: string; esp: string; data: string; hora: string;
  modalidade: string; status: BadgeStatus; linkSala?: string | null;
  inicio: string; // ISO original for filtering
};

export default function PacienteDashboard() {
  const { user } = useAuth();
  const { session } = useSession();
  const { paciente: pacienteAtual } = usePacienteAtual();

  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState<ConsultaItem[]>([]);
  const [statsConsultas, setStatsConsultas] = useState(0);
  const [statsDocs, setStatsDocs] = useState(0);

  // Real stats
  const [planoNome, setPlanoNome] = useState<string | null>(null);
  const [pendenciasFinanceiras, setPendenciasFinanceiras] = useState(0);

  // Real empresa link
  const [empresaLink, setEmpresaLink] = useState<{ empresa: string; status: string } | null>(null);
  const [vouchers, setVouchers] = useState<RetornoComContexto[]>([]);

  useEffect(() => {
    if (!session || !pacienteAtual) { setLoading(false); return; }

    async function load() {
      setLoading(true);
      try {
        const rows = await listConsultasDoPaciente();
        const mapped = rows.map((c) => ({
          id: c.id,
          medico: c.medico_nome ?? "Médico",
          esp: c.especialidade_nome ?? "—",
          data: formatDataBR(c.inicio),
          hora: formatHora(c.inicio),
          modalidade: c.modalidade,
          status: toStatusBadge(c.status),
          linkSala: c.link_sala,
          inicio: c.inicio,
        }));
        setConsultas(mapped);

        // Stats: consultas neste mês
        const now = new Date();
        const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
        const consultasMes = rows.filter(c => new Date(c.inicio) >= inicioMes);
        setStatsConsultas(consultasMes.length);

        // Stats: docs (prescrições) — usa pacienteAtual do hook
        const pacienteId = pacienteAtual!.id;

        {
          // Documentos count
          const consIds = rows.map(c => c.id);
          if (consIds.length > 0) {
            const { count } = await supabase
              .from("prescricoes")
              .select("id", { count: "exact", head: true })
              .in("consulta_id", consIds);
            setStatsDocs(count ?? 0);
          }

          // Real: plano ativo
          const { data: assinatura } = await supabase
            .from("assinaturas")
            .select("plano_id, status, planos(nome)")
            .eq("paciente_id", pacienteId)
            .in("status", ["ativa", "trial"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (assinatura) {
            const nome = (assinatura as any).planos?.nome;
            setPlanoNome(nome ?? "Plano ativo");
          }

          // Real: pendências financeiras
          const { count: pendCount } = await supabase
            .from("pagamentos")
            .select("id", { count: "exact", head: true })
            .eq("paciente_id", pacienteId)
            .in("status", ["pendente", "processando"]);
          setPendenciasFinanceiras(pendCount ?? 0);

          // Real: vínculo empresarial
          const { data: funcRow } = await supabase
            .from("empresas_funcionarios")
            .select("empresa_id, status, empresas(nome_fantasia)")
            .eq("paciente_id", pacienteId)
            .eq("status", "ativo")
            .limit(1)
            .maybeSingle();
          if (funcRow) {
            setEmpresaLink({
              empresa: (funcRow as any).empresas?.nome_fantasia ?? "Empresa",
              status: funcRow.status,
            });
        }

        // Retornos gratuitos disponíveis
        const vs = await listRetornosDisponiveis();
        setVouchers(vs);
        }
      } catch (e) {
        console.error("[PacienteDashboard] load:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  // Only future consultations for hero and list
  const now = new Date();
  const futuras = useMemo(() =>
    consultas.filter(c => {
      const d = new Date(c.inicio);
      return d >= now && !["cancelado", "concluido", "no_show"].includes(c.status);
    }),
    [consultas]
  );

  const proxima = futuras[0] ?? null;
  const msgConsulta = `Olá, preciso de ajuda com minha consulta ${proxima?.id ?? ""}`.trim();
  const firstName = user.name.split(" ")[0] || "Paciente";
  const empresarial = !!empresaLink;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando seu painel...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={`Olá, ${firstName} 👋`}
        description="Sua central de saúde — ações rápidas, próximas consultas e suporte direto."
        actions={
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/agendar"><Calendar className="mr-2 h-4 w-4" />Agendar consulta</Link>
          </Button>
        }
      />

      {session && <AvaliacaoPendenteBanner />}

      {/* Banner de retorno gratuito */}
      {vouchers.length > 0 && (
        <div className="card-elevated overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-2">
            <Gift className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">
              Você tem {vouchers.length} retorno{vouchers.length > 1 ? "s" : ""} gratuito{vouchers.length > 1 ? "s" : ""} disponível{vouchers.length > 1 ? "is" : ""}!
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">
                {vouchers.length === 1
                  ? `Retorno com ${vouchers[0].medico_nome ?? "seu médico"} — válido até ${new Date(vouchers[0].valido_ate).toLocaleDateString("pt-BR")}`
                  : "Agende seus retornos gratuitos antes que expirem."}
              </p>
            </div>
            <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90">
              <Link to="/app/paciente/agendamentos">
                <Gift className="mr-1.5 h-3.5 w-3.5" /> Ver e agendar
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Vínculo do paciente — real, read-only */}
      <div className="card-elevated flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 place-items-center rounded-xl", empresarial ? "bg-accent/15 text-accent" : "bg-primary-soft text-primary")}>
            {empresarial ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de vínculo</p>
            <p className="font-semibold">
              {empresarial ? "Empresarial" : "Particular"}
              {empresarial && empresaLink && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  · {empresaLink.empresa}
                </span>
              )}
            </p>
          </div>
        </div>
        <span className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
          empresarial ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
        )}>
          {empresarial ? "Empresarial" : "Particular"}
        </span>
      </div>

      {/* Próxima consulta */}
      <div id="consulta" className="card-elevated overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center gradient-soft">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Próxima consulta</p>
            {proxima ? (
              <>
                <h2 className="mt-2 font-display text-2xl font-bold">{proxima.medico}</h2>
                <p className="text-sm text-muted-foreground">{proxima.esp} · {proxima.modalidade}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 border border-border">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> {proxima.data} · {proxima.hora}
                  </span>
                  <StatusBadge status={proxima.status} />
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-2 font-display text-2xl font-bold">Sem consultas agendadas</h2>
                <p className="text-sm text-muted-foreground">Agende uma consulta para começar.</p>
              </>
            )}
          </div>
          {proxima && (
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex-1">
                      <Button variant="outline" size="sm" disabled className="w-full opacity-60">
                        <Repeat className="mr-2 h-3.5 w-3.5" /> Remarcar
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Em breve — remarcação online</TooltipContent>
                </Tooltip>
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <a href={whatsappUrl(msgConsulta)} target="_blank" rel="noreferrer noopener">
                    <MessageCircle className="mr-2 h-3.5 w-3.5 text-success" /> WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resumo real */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link to="/app/paciente/agendamentos" className="block transition hover:-translate-y-0.5">
          <StatCard label="Consultas no mês" value={String(statsConsultas)} icon={Calendar} hint={`${futuras.length} agendada(s)`} />
        </Link>
        <Link to="/app/paciente/documentos" className="block transition hover:-translate-y-0.5">
          <StatCard label="Documentos" value={String(statsDocs)} icon={FileText} hint="Receitas e atestados" />
        </Link>
        <Link to="/app/paciente/plano" className="block transition hover:-translate-y-0.5">
          <StatCard label="Plano" value={planoNome ?? "—"} icon={BadgeCheck} hint={planoNome ? "Plano ativo" : "Nenhum plano ativo"} />
        </Link>
        <Link to="/app/paciente/financeiro" className="block transition hover:-translate-y-0.5">
          <StatCard
            label="Financeiro"
            value={pendenciasFinanceiras > 0 ? String(pendenciasFinanceiras) : "✓"}
            icon={Wallet}
            hint={pendenciasFinanceiras > 0 ? `${pendenciasFinanceiras} pendência(s)` : "Sem pendências"}
          />
        </Link>
      </div>

      {/* Próximos agendamentos — apenas futuras */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Próximos agendamentos</h3>
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/paciente/agendamentos">Ver todos <ChevronRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        {futuras.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhuma consulta agendada. Agende sua primeira consulta!</p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {futuras.slice(0, 5).map(c => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.medico}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.esp} · {c.data} {c.hora} · {c.modalidade}</p>
                </div>
                <StatusBadge status={c.status} />
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {c.linkSala ? (
                    <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90 flex-1 sm:flex-none">
                      <a href={c.linkSala} target="_blank" rel="noopener noreferrer">
                        <Video className="mr-1.5 h-3.5 w-3.5" /> Entrar
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" disabled title="Sala em preparação" className="flex-1 sm:flex-none">
                      <Video className="mr-1.5 h-3.5 w-3.5" /> Entrar
                    </Button>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-1 sm:flex-none">
                        <Button size="sm" variant="outline" disabled className="w-full opacity-60">
                          <Repeat className="mr-1.5 h-3.5 w-3.5" /> Remarcar
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Em breve</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancelamentos e Reembolsos */}
      {session && <HistoricoCancelamentos />}

      {/* Comunicação real */}
      <ComunicacaoCanais proximaConsulta={proxima} mensagemConsulta={msgConsulta} />

      <FloatingWhatsApp />
    </div>
  );
}

/* ============================================================
 * ComunicacaoCanais
 * Busca conversations reais do banco (RLS filtra pelo paciente).
 * Fallback para estado vazio quando não há dados.
 * ============================================================ */

import {
  listConversasPaciente,
  formatTempoRelativo,
  type ConversaPaciente,
} from "@/lib/pacienteConversas";

type CanalStatus = "online" | "respondido" | "aguardando" | "offline";

const canalStatusUI: Record<CanalStatus, { label: string; dot: string; pill: string }> = {
  online:      { label: "Online agora",   dot: "bg-success",          pill: "bg-success/10 text-success" },
  respondido:  { label: "Respondido",     dot: "bg-primary",          pill: "bg-primary/10 text-primary" },
  aguardando:  { label: "Aguardando você",dot: "bg-warning",          pill: "bg-warning/10 text-warning" },
  offline:     { label: "Fora do horário",dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground" },
};

function mapConvToStatus(c: ConversaPaciente): CanalStatus {
  if (c.status === "fechada" || c.status === "arquivada") return "offline";
  if (c.unread_count > 0) return "aguardando";
  if (c.last_message_at) return "respondido";
  return "online";
}

function ComunicacaoCanais({
  proximaConsulta, mensagemConsulta,
}: { proximaConsulta: ConsultaItem | null; mensagemConsulta: string }) {
  const { session } = useSession();
  const [dbConversas, setDbConversas] = useState<ConversaPaciente[] | null>(null);

  useEffect(() => {
    if (!session) { setDbConversas(null); return; }
    listConversasPaciente().then((res) => setDbConversas(res.data));
  }, [session]);

  const canais = (session && dbConversas && dbConversas.length > 0)
    ? dbConversas.map((c) => ({
        id: c.id,
        role: c.origin === "comercial" ? "Atendimento" : c.channel === "interno" ? "Suporte" : "Médico",
        nome: c.contact_name ?? "Conversa",
        sub: c.origin,
        iniciais: (c.contact_name ?? "??").split(" ").filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase(),
        status: mapConvToStatus(c),
        ultimoContato: formatTempoRelativo(c.last_message_at),
        ultimaMsg: c.last_message_preview ?? "Sem mensagens ainda.",
        naoLidas: c.unread_count,
        icon: c.medico_id ? Stethoscope : c.origin === "comercial" ? User : MessageCircle,
      }))
    : [];

  if (canais.length === 0) {
    return (
      <section className="card-elevated p-6">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Comunicação</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhuma conversa ativa. Suas mensagens com médicos e equipe aparecerão aqui.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <a href={whatsappUrl()} target="_blank" rel="noreferrer noopener">
            <MessageCircle className="mr-1.5 h-3.5 w-3.5 text-success" /> WhatsApp
          </a>
        </Button>
      </section>
    );
  }

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
        {canais.slice(0, 3).map((c) => {
          const ui = canalStatusUI[c.status];
          const Icon = c.icon;
          return (
            <article
              key={c.id}
              className="group relative flex flex-col rounded-xl border border-border bg-background/40 p-4 transition hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {c.iniciais}
                  </div>
                  <span
                    className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card", ui.dot)}
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

              <div className="mt-3 flex items-center justify-between">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium", ui.pill)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", ui.dot)} />
                  {ui.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{c.ultimoContato}</span>
              </div>

              <div className="mt-3 flex-1 rounded-lg bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                {c.ultimaMsg}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link to={`/app/paciente/mensagens?conv=${c.id}`}>Abrir</Link>
                </Button>
                <Button asChild size="sm" className="h-8 bg-success text-success-foreground hover:opacity-90 text-xs">
                  <a href={whatsappUrl(undefined, mensagemConsulta)} target="_blank" rel="noreferrer noopener">
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
