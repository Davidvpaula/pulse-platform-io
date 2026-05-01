import { Link } from "react-router-dom";
import {
  Calendar, Users, MessageCircle, Wallet, ListTodo, Plus, Send, Phone,
  RotateCcw, X, Activity, TrendingUp, ShieldCheck, AlertTriangle, Clock,
  CheckCircle2, ArrowUpRight, Filter, ExternalLink,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { filaSecretaria, inboxInterno, conversasWpp } from "@/lib/mock";
import { pendenciasFeegow } from "@/lib/feegow";
import { usePermission } from "@/lib/permissions/usePermission";
import { cn } from "@/lib/utils";
import { whatsappUrl } from "@/components/FloatingWhatsApp";
import { toast } from "sonner";

type Tone = "urgente" | "atencao" | "ok";
const toneStyles: Record<Tone, string> = {
  urgente: "border-l-destructive bg-destructive/5",
  atencao: "border-l-warning bg-warning/5",
  ok: "border-l-success bg-success/5",
};
const toneChip: Record<Tone, string> = {
  urgente: "bg-destructive/10 text-destructive",
  atencao: "bg-warning/10 text-warning",
  ok: "bg-success/10 text-success",
};

export default function SecretariaDashboard() {
  const { has } = usePermission("supervisor.fila_geral");
  const isSupervisor = has("supervisor.fila_geral");
  const [filaFiltro, setFilaFiltro] = useState<"todos" | "urgente" | "aguardando">("todos");

  const pendFeegow = pendenciasFeegow();

  // Centro do dia (inteligente)
  const indicadores: Array<{ tone: Tone; label: string; value: string; hint: string; icon: typeof Calendar; to?: string }> = [
    { tone: "urgente", label: "Urgências (≤30 min)", value: "3", hint: "consultas começando", icon: Clock, to: "#fila" },
    { tone: "atencao", label: "Pagamentos atrasados", value: "R$ 1.840", hint: "4 cobranças", icon: Wallet, to: "/app/secretaria/financeiro" },
    { tone: "atencao", label: "Pacientes sem resposta", value: "5", hint: "WhatsApp +1h", icon: MessageCircle, to: "/app/comunicacao/conversas" },
    { tone: "ok", label: "Fila ativa", value: String(filaSecretaria.length), hint: "ordenada por prioridade", icon: Users, to: "#fila" },
  ];

  // Fila inteligente — adiciona prioridade e tempo de espera ao mock
  const filaInteligente = useMemo(
    () =>
      filaSecretaria.map((f, i) => {
        const prioridade: Tone = f.status === "em_andamento" ? "urgente" : f.status === "agendamento_criado" ? "atencao" : "ok";
        const espera = i * 7 + 3;
        return { ...f, prioridade, espera };
      }),
    [],
  );

  const filaVisivel = filaInteligente.filter(f =>
    filaFiltro === "todos" ? true : filaFiltro === "urgente" ? f.prioridade === "urgente" : f.status === "agendamento_criado"
  );

  const wppPriorizado = [...conversasWpp]
    .map(c => ({
      ...c,
      tag: c.tag,
      sla: c.unread > 3 ? "urgente" : c.unread > 0 ? "atencao" : "ok" as Tone,
      slaMin: c.unread > 3 ? 62 : c.unread > 0 ? 18 : 4,
    }))
    .sort((a, b) => b.unread - a.unread)
    .slice(0, 5);

  const exec = (label: string) => toast(label, { description: "Ação registrada (mock)." });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central da Secretaria"
        description="Tudo o que precisa de ação agora — fila, WhatsApp, tarefas e pendências."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/app/secretaria/comunicacao-interna"><MessageCircle className="mr-2 h-4 w-4" />Equipe</Link>
            </Button>
            <Button asChild className="bg-gradient-primary hover:opacity-90">
              <Link to="/app/secretaria/agendamentos"><Plus className="mr-2 h-4 w-4" />Novo agendamento</Link>
            </Button>
          </>
        }
      />

      {isSupervisor && (
        <div className="card-elevated flex items-center gap-3 border-l-4 border-primary p-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Permissão de supervisão ativa</p>
            <p className="text-xs text-muted-foreground">Você vê indicadores da equipe, relatórios operacionais e aprovação de exceções.</p>
          </div>
        </div>
      )}

      {/* Centro do dia inteligente */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {indicadores.map((ind, i) => {
          const Icon = ind.icon;
          const Wrapper: any = ind.to ? (ind.to.startsWith("#") ? "a" : Link) : "div";
          const props = ind.to ? (ind.to.startsWith("#") ? { href: ind.to } : { to: ind.to }) : {};
          return (
            <Wrapper key={i} {...props} className={cn("card-elevated block border-l-4 p-4 transition hover:-translate-y-0.5", toneStyles[ind.tone])}>
              <div className="flex items-center gap-2">
                <span className={cn("grid h-9 w-9 place-items-center rounded-lg", toneChip[ind.tone])}>
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ind.label}</p>
              </div>
              <p className="mt-2 font-display text-2xl font-bold">{ind.value}</p>
              <p className="text-[11px] text-muted-foreground">{ind.hint}</p>
            </Wrapper>
          );
        })}
      </div>

      {isSupervisor && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Atendimentos hoje" value="142" icon={Activity} trend={{ value: "+12%", positive: true }} />
          <StatCard label="Tempo médio" value="3min42" icon={Phone} trend={{ value: "-18s", positive: true }} />
          <StatCard label="SLA < 5min" value="88%" icon={TrendingUp} hint="meta 90%" />
          <StatCard label="Equipe online" value="6 / 8" icon={Users} hint="2 ausentes" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Fila inteligente */}
        <div id="fila" className="card-elevated p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold">Fila inteligente</h3>
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {[
                { k: "todos", label: "Todos" },
                { k: "urgente", label: "Urgentes" },
                { k: "aguardando", label: "Aguardando" },
              ].map(o => (
                <button
                  key={o.k}
                  onClick={() => setFilaFiltro(o.k as any)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition",
                    filaFiltro === o.k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >{o.label}</button>
              ))}
            </div>
          </div>

          <div className="mt-4 divide-y divide-border">
            {filaVisivel.map(f => (
              <div key={f.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3">
                <div className={cn("grid h-12 w-14 place-items-center rounded-lg text-center", toneChip[f.prioridade])}>
                  <div>
                    <p className="font-mono text-xs font-bold">{f.hora}</p>
                    <p className="text-[9px] uppercase">{f.prioridade}</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    <Link to={`/app/secretaria/pacientes/${f.pacienteId}`} className="hover:text-primary">{f.paciente}</Link>
                    <span className="ml-2 text-xs text-muted-foreground">· {f.medico}</span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-muted px-2 py-0.5">{f.canal}</span>
                    <StatusBadge status={f.status} />
                    <span className="text-muted-foreground"><Clock className="inline h-3 w-3 mr-0.5" />{f.espera} min na fila</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  <Button size="icon" variant="ghost" title="WhatsApp" asChild>
                    <a href={whatsappUrl(`Olá ${f.paciente}, sobre a consulta ${f.id}`)} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-3.5 w-3.5 text-success" />
                    </a>
                  </Button>
                  <Button size="icon" variant="ghost" title="Ligar" onClick={() => exec("Iniciando ligação")}>
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Confirmar" onClick={() => exec("Consulta confirmada")}>
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Remarcar" onClick={() => exec("Iniciar remarcação")}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Cancelar" onClick={() => exec("Cancelamento iniciado")}>
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Enviar para Feegow" onClick={() => exec("Sincronização Feegow enviada à fila")}>
                    <ExternalLink className="h-3.5 w-3.5 text-primary" />
                  </Button>
                </div>
              </div>
            ))}
            {filaVisivel.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item para o filtro selecionado.</p>
            )}
          </div>
        </div>

        {/* WhatsApp priorizado */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-success" /> WhatsApp · prioridade
            </h3>
            <Link to="/app/comunicacao/conversas" className="text-xs text-primary hover:underline">Inbox</Link>
          </div>

          <div className="mt-4 space-y-3">
            {wppPriorizado.map(c => (
              <div key={c.id} className={cn(
                "rounded-lg border p-3",
                c.sla === "urgente" ? "border-destructive/30 bg-destructive/5" :
                c.sla === "atencao" ? "border-warning/30 bg-warning/5" :
                "border-border",
              )}>
                <div className="flex items-center gap-2">
                  <p className="flex-1 truncate text-sm font-semibold">{c.nome}</p>
                  {c.unread > 0 && (
                    <span className="rounded-full bg-destructive px-1.5 py-0 text-[10px] font-bold text-destructive-foreground">
                      {c.unread}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{c.ultima}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{c.tag}</span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    c.sla === "urgente" ? "bg-destructive/10 text-destructive" :
                    c.sla === "atencao" ? "bg-warning/10 text-warning" :
                    "bg-success/10 text-success",
                  )}>SLA {c.slaMin}m</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{c.responsavel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pendências Feegow */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Pendências Feegow
            </h3>
            <Link to="/app/secretaria/pendencias-integracao" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>
          <ul className="mt-4 space-y-3">
            {pendFeegow.slice(0, 5).map(p => (
              <li key={`${p.tipo}-${p.id}`} className="rounded-lg border border-border p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning uppercase">{p.tipo}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.titulo}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.motivo}</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => exec("Reenviado para Feegow")}>
                    <RotateCcw className="mr-1.5 h-3 w-3" /> Reenviar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exec("Status verificado")}>
                    Verificar
                  </Button>
                </div>
              </li>
            ))}
            {pendFeegow.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">Tudo sincronizado ✨</li>
            )}
          </ul>
        </div>

        {/* Tarefas rápidas */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-primary" /> Tarefas
            </h3>
            <Button asChild size="sm" variant="ghost">
              <Link to="/app/secretaria/tarefas">+ Nova</Link>
            </Button>
          </div>
          <ul className="mt-4 space-y-3">
            {[
              { t: "Confirmar 5 consultas amanhã", prio: "alta", prazo: "Hoje 18:00" },
              { t: "Cobrar pagamento João Almeida", prio: "alta", prazo: "Hoje" },
              { t: "Atualizar agenda Dr. Marcos", prio: "media", prazo: "Amanhã" },
              { t: "Cadastrar 3 novos pacientes", prio: "media", prazo: "Hoje" },
            ].map((x, i) => (
              <li key={i} className="flex items-start gap-2">
                <input type="checkbox" className="mt-1 accent-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{x.t}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className={cn("rounded-full px-1.5 py-0 text-[10px] font-semibold",
                      x.prio === "alta" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning")}>{x.prio}</span>
                    <span className="text-[10px] text-muted-foreground">{x.prazo}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/app/secretaria/tarefas">Abrir tarefas <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>

        {/* Pendências da equipe */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" /> Equipe
            </h3>
            <Link to="/app/secretaria/comunicacao-interna" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>
          <ul className="mt-4 space-y-3">
            {inboxInterno.filter(t => t.status !== "resolvida").slice(0, 4).map(t => (
              <li key={t.id}>
                <Link to="/app/secretaria/comunicacao-interna" className="block rounded-lg border border-border p-3 hover:bg-muted/40">
                  <div className="flex items-center gap-2">
                    <p className="flex-1 truncate text-sm font-semibold">{t.assunto}</p>
                    {t.nao_lidas > 0 && (
                      <span className="rounded-full bg-destructive px-1.5 py-0 text-[10px] font-bold text-destructive-foreground">
                        {t.nao_lidas}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{t.ultima}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
