import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, UserPlus, Calendar, Stethoscope, FileText, CreditCard,
  MessageSquare, ExternalLink, Activity, AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AdminEmpty } from "@/components/admin/AdminStates";
import { cn } from "@/lib/utils";

/**
 * Fluxo operacional — visão interna da plataforma.
 *
 * IMPORTANTE: a Feegow é apenas SoR clínico EXTERNO (deep-link).
 * Não aparece como passo operacional, fila ou dependência aqui.
 */

const fluxoOperacional = [
  { icon: UserPlus,     title: "Cadastro do paciente",    actor: "Plataforma · auto/manual" },
  { icon: Calendar,     title: "Agenda & reserva",        actor: "Paciente / Colaborador" },
  { icon: CreditCard,   title: "Pagamento",               actor: "Stripe (sandbox)" },
  { icon: Stethoscope,  title: "Atendimento",             actor: "Médico — presencial ou Meet" },
  { icon: FileText,     title: "Documentos & financeiro", actor: "Plataforma — recibo, repasse" },
  { icon: MessageSquare,title: "Comunicação & follow-up", actor: "Inbox interno + notificações" },
];

type AgendaRow = {
  id: string;
  inicio: string;
  status: string;
  paciente_nome: string | null;
  medico_nome: string | null;
  modalidade: string | null;
};

export default function FluxoOperacional() {
  const [loading, setLoading] = useState(true);
  const [novosPacientesHoje, setNovosPacientesHoje] = useState(0);
  const [agendaHoje, setAgendaHoje] = useState<AgendaRow[]>([]);
  const [pendentesConfirmacao, setPendentesConfirmacao] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
      const fimDia = new Date();    fimDia.setHours(23, 59, 59, 999);

      const [{ count: cNovos }, { data: agenda }, { count: cPend }] = await Promise.all([
        supabase.from("pacientes").select("id", { count: "exact", head: true })
          .gte("created_at", inicioDia.toISOString()),
        supabase.from("consultas")
          .select("id, inicio, status, modalidade, pacientes:paciente_id(nome_completo), medicos:medico_id(nome)")
          .gte("inicio", inicioDia.toISOString())
          .lte("inicio", fimDia.toISOString())
          .order("inicio", { ascending: true })
          .limit(8),
        supabase.from("consultas").select("id", { count: "exact", head: true })
          .in("status", ["agendada", "aguardando_pagamento"]),
      ]);
      if (cancelled) return;
      setNovosPacientesHoje(cNovos ?? 0);
      setAgendaHoje((agenda ?? []).map((c: any) => ({
        id: c.id,
        inicio: c.inicio,
        status: c.status,
        modalidade: c.modalidade,
        paciente_nome: c.pacientes?.nome_completo ?? null,
        medico_nome: c.medicos?.nome ?? null,
      })));
      setPendentesConfirmacao(cPend ?? 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fluxo operacional"
        description="Visão interna da jornada: cadastro → agenda → atendimento → financeiro → comunicação."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Pacientes novos hoje" value={String(novosPacientesHoje)} icon={UserPlus} />
        <StatCard label="Agendamentos hoje" value={String(agendaHoje.length)} icon={Calendar} />
        <StatCard label="Aguardando confirmação" value={String(pendentesConfirmacao)} icon={AlertCircle} hint="agendada ou aguardando pagamento" />
        <StatCard label="Operação" value={loading ? "…" : "OK"} icon={Activity} hint="dados em tempo real" />
      </div>

      {/* Storyline interno */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">Jornada operacional padrão</h3>
            <p className="text-xs text-muted-foreground">
              Plataforma é a fonte da verdade operacional. Prontuário clínico fica no provider externo via deep-link, ao final.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {fluxoOperacional.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="relative">
                <div className="card-elevated h-full p-4">
                  <span className="inline-grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-sm font-semibold leading-tight">{step.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{step.actor}</p>
                </div>
                {i < fluxoOperacional.length - 1 && (
                  <ArrowRight className="absolute right-[-14px] top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground lg:block" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-lg border border-dashed border-border p-3">
          <ExternalLink className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Provider clínico externo (opcional)</p>
            <p>
              Após o atendimento, o médico pode abrir o prontuário no provider externo via deep-link
              direto na ficha do paciente. Não há sincronização operacional, fila, espelhamento ou dependência.
            </p>
          </div>
        </div>
      </div>

      {/* Agenda do dia */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Agenda de hoje</h3>
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/admin/agendamentos">Ver agenda completa</Link>
          </Button>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>
        ) : agendaHoje.length === 0 ? (
          <AdminEmpty title="Sem agendamentos hoje" description="Nenhuma consulta marcada para o dia atual." />
        ) : (
          <ul className="mt-4 space-y-2">
            {agendaHoje.map(a => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">
                    <Stethoscope className="mr-1 inline h-3.5 w-3.5 text-primary" />
                    {a.medico_nome ?? "—"} · {new Date(a.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.paciente_nome ?? "—"} · {a.modalidade ?? "—"}
                  </p>
                </div>
                <StatusBadge status={a.status as any} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
