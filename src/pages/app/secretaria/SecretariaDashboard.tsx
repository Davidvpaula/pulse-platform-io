import { Link, useLocation } from "react-router-dom";
import {
  Calendar, Users, MessageCircle, Wallet, ListTodo, Plus, Phone,
  RotateCcw, X, Activity, TrendingUp, ShieldCheck, AlertTriangle, Clock,
  CheckCircle2, ArrowUpRight, ExternalLink, Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";

import { Button } from "@/components/ui/button";
import { usePermission } from "@/lib/permissions/usePermission";
import { cn } from "@/lib/utils";
import { whatsappUrl } from "@/components/FloatingWhatsApp";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

type ConsultaFila = {
  id: string;
  inicio: string;
  status: string;
  paciente_nome: string;
  paciente_id: string;
  medico_nome: string;
  canal_origem: string | null;
  valor_centavos: number;
};

function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState<ConsultaFila[]>([]);
  const [stats, setStats] = useState({
    total_hoje: 0,
    urgentes: 0,
    aguardando_pagamento: 0,
    valor_pendente: 0,
    concluidas_hoje: 0,
  });

  async function load() {
    setLoading(true);
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).toISOString();

    // Consultas do dia com dados de paciente e médico
    const { data: rows } = await supabase
      .from("consultas")
      .select(`
        id, inicio, status, canal_origem, valor_centavos, paciente_id, medico_id,
        pacientes!inner(user_id, profiles:profiles!inner(nome)),
        medicos!inner(nome)
      `)
      .gte("inicio", inicioHoje)
      .lt("inicio", fimHoje)
      .order("inicio", { ascending: true })
      .limit(50);

    const mapped: ConsultaFila[] = (rows ?? []).map((r: any) => ({
      id: r.id,
      inicio: r.inicio,
      status: r.status,
      paciente_nome: r.pacientes?.profiles?.nome ?? "Paciente",
      paciente_id: r.paciente_id,
      medico_nome: r.medicos?.nome ?? "Médico",
      canal_origem: r.canal_origem,
      valor_centavos: r.valor_centavos ?? 0,
    }));

    setConsultas(mapped);

    const agora = new Date();
    const em30min = new Date(agora.getTime() + 30 * 60_000).toISOString();
    const urgentes = mapped.filter(
      c => ["agendada", "confirmada"].includes(c.status) && c.inicio <= em30min && c.inicio >= agora.toISOString()
    ).length;
    const aguardando = mapped.filter(c => c.status === "aguardando_pagamento");
    const valorPendente = aguardando.reduce((s, c) => s + c.valor_centavos, 0);
    const concluidas = mapped.filter(c => c.status === "concluida").length;

    setStats({
      total_hoje: mapped.length,
      urgentes,
      aguardando_pagamento: aguardando.length,
      valor_pendente: valorPendente,
      concluidas_hoje: concluidas,
    });

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return { loading, consultas, stats, reload: load };
}

export default function SecretariaDashboard() {
  const { has } = usePermission("supervisor.fila_geral");
  const isSupervisor = has("supervisor.fila_geral");
  const [filaFiltro, setFilaFiltro] = useState<"todos" | "urgente" | "aguardando">("todos");
  const { loading, consultas, stats } = useDashboardData();
  const { pathname } = useLocation();

  // Detecta contexto (secretaria ou colaborador) para links
  const base = pathname.startsWith("/app/colaborador") ? "/app/colaborador" : "/app/secretaria";

  // Fila inteligente
  const filaInteligente = useMemo(() => {
    const agora = new Date();
    const em30min = new Date(agora.getTime() + 30 * 60_000);
    return consultas
      .filter(c => !["concluida", "cancelada", "no_show"].includes(c.status))
      .map(c => {
        const dt = new Date(c.inicio);
        const prioridade: Tone =
          dt <= em30min && dt >= agora ? "urgente" :
          c.status === "aguardando_pagamento" ? "atencao" : "ok";
        const espera = Math.max(0, Math.round((agora.getTime() - dt.getTime()) / 60_000));
        return {
          ...c,
          prioridade,
          espera,
          hora: dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        };
      })
      .sort((a, b) => {
        const ord: Record<Tone, number> = { urgente: 0, atencao: 1, ok: 2 };
        return ord[a.prioridade] - ord[b.prioridade] || a.inicio.localeCompare(b.inicio);
      });
  }, [consultas]);

  const filaVisivel = filaInteligente.filter(f =>
    filaFiltro === "todos" ? true :
    filaFiltro === "urgente" ? f.prioridade === "urgente" :
    f.status === "aguardando_pagamento"
  );

  const indicadores: Array<{ tone: Tone; label: string; value: string; hint: string; icon: typeof Calendar; to?: string }> = [
    {
      tone: stats.urgentes > 0 ? "urgente" : "ok",
      label: "Urgências (≤30 min)",
      value: String(stats.urgentes),
      hint: "consultas começando em breve",
      icon: Clock,
      to: "#fila",
    },
    {
      tone: stats.aguardando_pagamento > 0 ? "atencao" : "ok",
      label: "Pagamentos pendentes",
      value: `R$ ${(stats.valor_pendente / 100).toFixed(2).replace(".", ",")}`,
      hint: `${stats.aguardando_pagamento} cobrança${stats.aguardando_pagamento !== 1 ? "s" : ""}`,
      icon: Wallet,
      to: `${base}/financeiro`,
    },
    {
      tone: "ok",
      label: "Consultas hoje",
      value: String(stats.total_hoje),
      hint: `${stats.concluidas_hoje} concluída${stats.concluidas_hoje !== 1 ? "s" : ""}`,
      icon: Calendar,
      to: `${base}/agendamentos`,
    },
    {
      tone: filaInteligente.length > 10 ? "atencao" : "ok",
      label: "Fila ativa",
      value: String(filaInteligente.length),
      hint: "ordenada por prioridade",
      icon: Users,
      to: "#fila",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central operacional"
        description="Tudo o que precisa de ação agora — fila, tarefas e pendências do dia."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to={`${base}/comunicacao-interna`}><MessageCircle className="mr-2 h-4 w-4" />Equipe</Link>
            </Button>
            <Button asChild className="bg-gradient-primary hover:opacity-90">
              <Link to={`${base}/agendamentos`}><Plus className="mr-2 h-4 w-4" />Novo agendamento</Link>
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
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
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
      )}

      {isSupervisor && !loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Consultas hoje" value={String(stats.total_hoje)} icon={Activity} />
          <StatCard label="Concluídas" value={String(stats.concluidas_hoje)} icon={CheckCircle2} />
          <StatCard
            label="Taxa conclusão"
            value={stats.total_hoje > 0 ? `${Math.round((stats.concluidas_hoje / stats.total_hoje) * 100)}%` : "—"}
            icon={TrendingUp}
            hint="do dia"
          />
          <StatCard label="Urgentes agora" value={String(stats.urgentes)} icon={Clock} />
        </div>
      )}

      {/* Fila inteligente */}
      <div id="fila" className="card-elevated p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold">Fila inteligente</h3>
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {[
              { k: "todos", label: "Todos" },
              { k: "urgente", label: "Urgentes" },
              { k: "aguardando", label: "Pag. pendente" },
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
          {loading && (
            <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
          )}
          {!loading && filaVisivel.map(f => (
            <div key={f.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3">
              <div className={cn("grid h-12 w-14 place-items-center rounded-lg text-center", toneChip[f.prioridade])}>
                <div>
                  <p className="font-mono text-xs font-bold">{f.hora}</p>
                  <p className="text-[9px] uppercase">{f.prioridade}</p>
                </div>
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">
                  <Link to={`${base}/pacientes/${f.paciente_id}`} className="hover:text-primary">{f.paciente_nome}</Link>
                  <span className="ml-2 text-xs text-muted-foreground">· {f.medico_nome}</span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  {f.canal_origem && <span className="rounded-full bg-muted px-2 py-0.5">{f.canal_origem}</span>}
                  <StatusBadge status={f.status} />
                  {f.espera > 0 && (
                    <span className="text-muted-foreground"><Clock className="inline h-3 w-3 mr-0.5" />{f.espera} min</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 justify-end">
                <Button size="icon" variant="ghost" title="WhatsApp" asChild>
                  <a href={whatsappUrl(`Olá ${f.paciente_nome}, sobre a consulta`)} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-3.5 w-3.5 text-success" />
                  </a>
                </Button>
                <Button size="icon" variant="ghost" title="Confirmar" onClick={() => toast.success("Consulta confirmada (em breve: ação real)")}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                </Button>
                <Button size="icon" variant="ghost" title="Remarcar" onClick={() => toast("Remarcação (em breve: ação real)")}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" title="Cancelar" onClick={() => toast("Cancelamento (em breve: ação real)")}>
                  <X className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {!loading && filaVisivel.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {consultas.length === 0 ? "Nenhuma consulta agendada para hoje." : "Nenhum item para o filtro selecionado."}
            </p>
          )}
        </div>
      </div>

      {/* Atalhos rápidos */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Link to={`${base}/agendamentos`} className="card-elevated flex items-center gap-4 p-6 hover:bg-muted/40 transition">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold">Agendamentos</p>
            <p className="text-xs text-muted-foreground">Criar, remarcar e gerenciar consultas</p>
          </div>
          <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to={`${base}/pacientes`} className="card-elevated flex items-center gap-4 p-6 hover:bg-muted/40 transition">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold">Pacientes</p>
            <p className="text-xs text-muted-foreground">Buscar, cadastrar e ver histórico</p>
          </div>
          <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to={`${base}/comunicacao-interna`} className="card-elevated flex items-center gap-4 p-6 hover:bg-muted/40 transition">
          <MessageCircle className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold">Equipe</p>
            <p className="text-xs text-muted-foreground">Comunicação interna e pendências</p>
          </div>
          <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
