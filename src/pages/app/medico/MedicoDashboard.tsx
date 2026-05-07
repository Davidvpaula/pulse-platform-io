import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, FileText, Wallet, Play, Calendar, Clock, BookOpen, Settings, Search,
  AlertTriangle, CheckCircle2, ArrowRight, Loader2, Video, ExternalLink, Lock, Eye, Stethoscope, Trophy,
  Star, Award, Crown, CreditCard, ShieldCheck, User, Briefcase,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listConsultasDoMedico,
  type ConsultaDetalhada,
} from "@/lib/clinico";
import { useMedicoAtual } from "@/lib/useMedicoAtual";
import { useSession } from "@/lib/session";
import { useAuth, useCan } from "@/lib/auth";
import { usePermission } from "@/lib/permissions/usePermission";
import { useTermsCheck } from "@/hooks/useTermsCheck";
import { TermsAcceptanceDialog } from "@/components/shared/TermsAcceptanceDialog";
import { getRankingMedico, getSaldoAtual, type MedicoRanking } from "@/lib/gamificacao";
import { checkTreinamentoObrigatorio } from "@/lib/treinamentos";

import { formatBRL } from "@/lib/format";
function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function diffMin(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}
function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

type Onboarding = {
  semSala: boolean;
  semEspecialidade: boolean;
  pendente: boolean;
  treinamentoConcluido: boolean;
  treinamentoTotal: number;
  treinamentoFeito: number;
  perfilIncompleto: boolean;
  semDadosBancarios: boolean;
  semTermos: boolean;
};

export default function MedicoDashboard() {
  const { session } = useSession();
  const { medico: medicoAtual } = useMedicoAtual();
  const { profileKey } = useAuth();
  const can = useCan();
  const { has: hasPerm } = usePermission("financeiro.ver");

  // Permissões finas
  const isMedico = profileKey === "medico";
  const isAdmin = profileKey === "admin";
  const podeAtuar = isMedico || isAdmin; // só esses iniciam/concluem consulta
  const podeIniciar = can("consulta.start", "edit"); // mutativo
  const podeVerFinanceiro = isMedico ? hasPerm("financeiro.ver") : isAdmin;
  const podeVerPacientes = isMedico || isAdmin || profileKey === "secretaria";
  const [loading, setLoading] = useState(true);
  const termsContrato = useTermsCheck("contrato_medico");
  const [medicoNome, setMedicoNome] = useState<string>("");
  const [medicoTratamento, setMedicoTratamento] = useState<string | null>(null);
  const [medicoNaoExiste, setMedicoNaoExiste] = useState(false);
  const [onb, setOnb] = useState<Onboarding>({ semSala: false, semEspecialidade: false, pendente: false, treinamentoConcluido: true, treinamentoTotal: 0, treinamentoFeito: 0, perfilIncompleto: false, semDadosBancarios: true, semTermos: false });
  const [propostasPendentes, setPropostasPendentes] = useState(0);
  const [proximas, setProximas] = useState<ConsultaDetalhada[]>([]);
  const [stats, setStats] = useState({
    hoje: 0,
    online: 0,
    semana: 0,
    pacientesUnicos: 0,
    receitaMes: 0,
    receitaParticularMes: 0,
    receitaServicosMes: 0,
    qtdServicos: 0,
    pagPendentes: 0,
    docsMes: 0,
  });
  const [iniciandoId, setIniciandoId] = useState<string | null>(null);
  const [rankingData, setRankingData] = useState<MedicoRanking | null>(null);
  const [saldoCrescimento, setSaldoCrescimento] = useState<number>(0);

  const carregar = async () => {
    if (!session || !medicoAtual) { setLoading(false); return; }
    setLoading(true);

    const medico = medicoAtual;
    setMedicoNaoExiste(false);
    setMedicoNome(medico.nome ?? "");
    setMedicoTratamento((medico as any).tratamento ?? null);

    // Gamificação: ranking + saldo (em paralelo com o resto)
    const [rankRes, saldoRes] = await Promise.all([
      getRankingMedico(medico.id),
      getSaldoAtual(medico.id),
    ]);
    setRankingData(rankRes);
    setSaldoCrescimento(saldoRes);

    // Onboarding: link de sala + ao menos 1 vínculo de especialidade ativo
    const [{ count: vinculos }, treinCheck, { count: dadosBanc }, termosCheck] = await Promise.all([
      supabase
        .from("medico_especialidades")
        .select("id", { count: "exact", head: true })
        .eq("medico_id", medico.id)
        .eq("ativo", true),
      checkTreinamentoObrigatorio(),
      supabase
        .from("medico_dados_bancarios")
        .select("id", { count: "exact", head: true })
        .eq("medico_id", medico.id)
        .eq("ativo", true),
      // Termos: reuse termsContrato hook state (already loaded separately)
      Promise.resolve(null),
    ]);

    // Perfil completo: nome, CRM, especialidade, bio
    const perfilIncompleto = !medico.nome?.trim() || !medico.crm?.trim() || !medico.especialidade?.trim() || !medico.bio?.trim();

    setOnb({
      semSala: !medico.link_sala_padrao || medico.link_sala_padrao.trim().length === 0,
      semEspecialidade: (vinculos ?? 0) === 0,
      pendente: medico.status !== "aprovado",
      treinamentoConcluido: treinCheck.concluido,
      treinamentoTotal: treinCheck.totalObrigatorias,
      treinamentoFeito: treinCheck.concluidasObrigatorias,
      perfilIncompleto,
      semDadosBancarios: (dadosBanc ?? 0) === 0,
      semTermos: termsContrato.needsAcceptance,
    });

    // Propostas pendentes
    const { count: propPend } = await supabase
      .from("propostas_empresa_medico")
      .select("id", { count: "exact", head: true })
      .eq("medico_id", medico.id)
      .eq("status", "enviada_medico");
    setPropostasPendentes(propPend ?? 0);

    // Janelas de tempo
    const agora = new Date();
    const inicioHoje = new Date(agora); inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(agora); fimHoje.setHours(23, 59, 59, 999);
    const inicioSemana = new Date(inicioHoje); inicioSemana.setDate(inicioHoje.getDate() - inicioHoje.getDay());
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);

    // Próximas consultas (a partir de agora) — agendadas/confirmadas/em_andamento
    const todasFuturas = await listConsultasDoMedico({ desde: agora });
    const ativas = todasFuturas.filter((c) =>
      ["agendada", "confirmada", "em_andamento"].includes(c.status as string),
    );
    setProximas(ativas.slice(0, 6));

    // Hoje
    const consultasHoje = todasFuturas.filter(
      (c) => new Date(c.inicio) >= inicioHoje && new Date(c.inicio) <= fimHoje,
    );
    const onlineHoje = consultasHoje.filter((c) => c.modalidade === "online").length;

    // Semana (todas, incluindo passadas desta semana)
    const semanaTodas = await listConsultasDoMedico({ desde: inicioSemana, ate: fimHoje });

    // Mês (concluídas → receita; aguardando_pagamento → pendentes)
    const mes = await listConsultasDoMedico({ desde: inicioMes, ate: fimMes });
    const concluidas = mes.filter((c) => c.status === "concluida");
    // Valor que o médico recebe (repasse) = bruto - comissão da plataforma.
    // Usa snapshot imutável quando disponível; fallback no valor_centavos.
    const valorMedico = (c: any): number => {
      const bruto = (c.valor_snapshot_centavos ?? c.valor_centavos ?? 0) as number;
      const comissao = (c.comissao_snapshot_centavos ?? 0) as number;
      return Math.max(0, bruto - comissao);
    };
    const receitaMes = concluidas.reduce((acc, c) => acc + valorMedico(c), 0);
    const receitaParticularMes = concluidas
      .filter((c: any) => !c.servico_id)
      .reduce((acc, c) => acc + valorMedico(c), 0);
    const consultasServico = concluidas.filter((c: any) => !!c.servico_id);
    const receitaServicosMes = consultasServico.reduce((acc, c) => acc + valorMedico(c), 0);
    const qtdServicos = consultasServico.length;
    const pagPendentes = mes.filter((c) => c.status === "aguardando_pagamento").length;

    // Pacientes únicos (mês)
    const pacientesUnicos = new Set(mes.map((c) => c.paciente_id)).size;

    // Documentos emitidos no mês (prescrições das suas consultas)
    let docsMes = 0;
    const consIds = mes.map((c) => c.id);
    if (consIds.length) {
      const { count } = await supabase
        .from("prescricoes")
        .select("id", { count: "exact", head: true })
        .in("consulta_id", consIds)
        .gte("emitida_em", inicioMes.toISOString());
      docsMes = count ?? 0;
    }

    setStats({
      hoje: consultasHoje.length,
      online: onlineHoje,
      semana: semanaTodas.length,
      pacientesUnicos,
      receitaMes,
      receitaParticularMes,
      receitaServicosMes,
      qtdServicos,
      pagPendentes,
      docsMes,
    });

    setLoading(false);
  };

  useEffect(() => { void carregar(); /* eslint-disable-next-line */ }, [session, medicoAtual]);

  const proxima = proximas[0];
  const minutosProx = useMemo(() => proxima ? diffMin(proxima.inicio) : null, [proxima]);

  async function iniciarConsulta(c: ConsultaDetalhada) {
    if (!podeIniciar) {
      toast.error("Você não tem permissão para iniciar consultas.");
      return;
    }
    // Já em andamento → só abre sala
    if (c.status === "em_andamento") {
      if (c.modalidade === "online" && c.link_sala) {
        window.open(c.link_sala, "_blank", "noopener,noreferrer");
      }
      return;
    }
    if (c.status !== "agendada" && c.status !== "confirmada") {
      toast.error("Esta consulta não pode ser iniciada no status atual.");
      return;
    }
    setIniciandoId(c.id);
    try {
      // State machine: agendada → confirmada → em_andamento
      if (c.status === "agendada") {
        const { error: errConfirm } = await supabase
          .from("consultas")
          .update({ status: "confirmada" })
          .eq("id", c.id);
        if (errConfirm) throw errConfirm;
      }
      const { error } = await supabase
        .from("consultas")
        .update({ status: "em_andamento" })
        .eq("id", c.id);
      if (error) throw error;
      toast.success("Consulta iniciada");
      if (c.modalidade === "online" && c.link_sala) {
        window.open(c.link_sala, "_blank", "noopener,noreferrer");
      }
      void carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível iniciar a consulta");
    } finally {
      setIniciandoId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando seu painel...
      </div>
    );
  }

  if (medicoNaoExiste && isMedico) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Cadastro não iniciado"
          description="Seu perfil médico ainda não foi criado na plataforma."
        />
        <div className="card-elevated border-l-4 border-l-warning p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="font-semibold">Nenhum registro de médico encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sua conta possui o papel de médico, mas o cadastro profissional ainda não foi preenchido.
                Complete o cadastro para começar a receber pacientes.
              </p>
              <Button asChild className="mt-4 bg-gradient-primary hover:opacity-90">
                <Link to="/cadastro/medico">
                  <User className="mr-2 h-4 w-4" /> Completar cadastro
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const checklistItems = [
    {
      ok: !onb.pendente,
      titulo: "Cadastro aprovado",
      desc: onb.pendente ? "Aguardando aprovação do administrador." : "Você já pode atender pacientes.",
      link: onb.pendente ? "/app/medico/perfil" : null,
      icon: CheckCircle2,
    },
    {
      ok: !onb.semSala,
      titulo: "Link da sala virtual configurado",
      desc: onb.semSala
        ? "Configure o link padrão (Meet, Zoom...) para receber consultas online."
        : "Sala configurada — slots online liberados.",
      link: onb.semSala ? "/app/medico/configuracoes" : null,
      icon: Video,
    },
    {
      ok: !onb.semEspecialidade,
      titulo: "Especialidade e preço definidos",
      desc: onb.semEspecialidade
        ? "Vincule ao menos uma especialidade com preço para aparecer na busca."
        : "Você está visível na busca de pacientes.",
      link: onb.semEspecialidade ? "/app/medico/configuracoes" : null,
      icon: Stethoscope,
    },
    {
      ok: onb.treinamentoConcluido,
      titulo: "Treinamento obrigatório",
      desc: onb.treinamentoConcluido
        ? "Todos os treinamentos obrigatórios concluídos."
        : `${onb.treinamentoFeito}/${onb.treinamentoTotal} aulas concluídas — assista e confirme.`,
      link: !onb.treinamentoConcluido ? "/app/medico/treinamento" : null,
      icon: BookOpen,
    },
    {
      ok: !onb.perfilIncompleto,
      titulo: "Perfil completo",
      desc: onb.perfilIncompleto
        ? "Preencha nome, CRM, especialidade principal e bio."
        : "Informações do perfil completas.",
      link: onb.perfilIncompleto ? "/app/medico/perfil" : null,
      icon: User,
    },
    {
      ok: !onb.semDadosBancarios,
      titulo: "Dados financeiros configurados",
      desc: onb.semDadosBancarios
        ? "Cadastre conta bancária ou chave PIX para receber repasses."
        : "Dados bancários configurados.",
      link: onb.semDadosBancarios ? "/app/medico/financeiro" : null,
      icon: CreditCard,
    },
    {
      ok: !onb.semTermos,
      titulo: "Termos de contrato aceitos",
      desc: onb.semTermos
        ? "Aceite os termos do contrato médico para operar na plataforma."
        : "Termos de contrato aceitos.",
      link: null, // handled by TermsAcceptanceDialog
      icon: ShieldCheck,
    },
  ];
  const pendencias = checklistItems.filter((i) => !i.ok).length;
  const concluidos = checklistItems.length - pendencias;
  const progressoPct = Math.round((concluidos / checklistItems.length) * 100);
  const todoConcluido = pendencias === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${saudacao()}${medicoNome ? `, ${medicoTratamento ?? "Dr(a)."} ${medicoNome.split(" ")[0]}` : ""}`}
        description="O que você precisa fazer agora — atendimentos, fila e alertas."
        actions={
          !podeAtuar ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <Eye className="h-3 w-3" /> Modo somente leitura ({profileKey})
            </span>
          ) : undefined
        }
      />

      {/* Aviso para perfis não-médicos visualizando o painel */}
      {!podeAtuar && (
        <div className="card-elevated flex items-start gap-3 border-l-4 border-l-muted-foreground/40 p-4">
          <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="text-sm">
            <p className="font-semibold">Você não é o profissional desta agenda</p>
            <p className="text-muted-foreground">
              Ações como <strong>iniciar consulta</strong> e <strong>abrir sala virtual</strong> ficam visíveis apenas para o médico responsável.
              {isAdmin ? " Como admin, você pode ver tudo, mas as ações ainda exigem que você seja o dono da consulta." : ""}
            </p>
          </div>
        </div>
      )}

      {/* Onboarding checklist — só aparece se há pendências */}
      {isMedico && pendencias > 0 && (
        <div className="card-elevated border-l-4 border-l-warning p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-warning/10 text-warning">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Finalize sua configuração ({pendencias} pendência{pendencias > 1 ? "s" : ""})</p>
              <p className="text-xs text-muted-foreground">
                Conclua os passos abaixo para começar a receber agendamentos.
              </p>

              {/* Progress bar */}
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full transition-all bg-gradient-primary"
                    style={{ width: `${progressoPct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{concluidos}/{checklistItems.length}</span>
              </div>

              <ul className="mt-3 space-y-2">
                {checklistItems.filter(it => !it.ok).map((it, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-warning text-[10px] font-bold text-warning">!</span>
                    <span className="flex-1">
                      <span className="font-medium text-foreground">{it.titulo}</span>
                      <span className="block text-xs text-muted-foreground">{it.desc}</span>
                    </span>
                    {it.link && (
                      <Link to={it.link} className="text-xs font-semibold text-primary hover:underline whitespace-nowrap">
                        Resolver →
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      {/* Próximo atendimento */}
      <div className="card-elevated overflow-hidden">
        <div className="gradient-soft p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Próximo atendimento</p>
              <h2 className="mt-1 truncate font-display text-2xl font-bold">
                {proxima?.paciente_nome ?? (proxima ? "Paciente" : "Sem agendamentos hoje")}
              </h2>
              {proxima ? (
                <p className="text-sm text-muted-foreground">
                  {formatHora(proxima.inicio)} · {proxima.especialidade_nome ?? "Consulta"} ·{" "}
                  <StatusBadge status={proxima.status as any} />
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sua agenda está livre. Configure horários para receber pacientes.
                </p>
              )}
            </div>
            {proxima && minutosProx !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {minutosProx <= 0 ? "Agora" : minutosProx < 60 ? `em ${minutosProx} min` : `em ${Math.round(minutosProx / 60)}h`}
              </span>
            )}
          </div>

          {proxima && (
            <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              {podeIniciar ? (
                <Button
                  size="lg"
                  className="bg-gradient-primary hover:opacity-90"
                  disabled={iniciandoId === proxima.id}
                  onClick={() => iniciarConsulta(proxima)}
                >
                  {iniciandoId === proxima.id
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <Play className="mr-2 h-4 w-4" />}
                  {proxima.status === "em_andamento" ? "Continuar consulta" : "Iniciar consulta"}
                </Button>
              ) : (
                <Button size="lg" variant="outline" asChild>
                  <Link to="/app/medico/agenda">
                    <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                  </Link>
                </Button>
              )}
              <ArrowRight className="hidden h-4 w-4 justify-self-center text-muted-foreground sm:block" />
              {proxima.modalidade === "online" && proxima.link_sala && podeAtuar ? (
                <Button size="lg" variant="outline" asChild>
                  <a href={proxima.link_sala} target="_blank" rel="noopener noreferrer">
                    <Video className="mr-2 h-4 w-4" /> Abrir sala
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              ) : (
                <Button size="lg" variant="outline" asChild>
                  <Link to="/app/medico/agenda">
                    <Calendar className="mr-2 h-4 w-4" /> Ver agenda
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas reais */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Consultas hoje"
          value={String(stats.hoje)}
          icon={Calendar}
          hint="por telemedicina"
        />
        <StatCard
          label="Pacientes (mês)"
          value={String(stats.pacientesUnicos)}
          icon={Users}
          hint={`${stats.semana} consultas na semana`}
        />
        <StatCard
          label="Documentos emitidos"
          value={String(stats.docsMes)}
          icon={FileText}
          hint="Prescrições do mês"
        />
        {podeVerFinanceiro ? (
          <StatCard
            label="Receita do mês"
            value={formatBRL(stats.receitaMes)}
            icon={Wallet}
            hint={stats.pagPendentes > 0 ? `${stats.pagPendentes} pagamento(s) pendente(s)` : "Consultas concluídas"}
          />
        ) : (
          <StatCard
            label="Receita do mês"
            value="—"
            icon={Lock}
            hint="Sem permissão financeira"
          />
        )}
      </div>

      {/* Split de receita: Particular vs Serviços da plataforma */}
      {podeVerFinanceiro && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card-elevated p-5 border-l-4 border-l-primary">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Receita particular (mês)
              </p>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold">{formatBRL(stats.receitaParticularMes)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Consultas com seu preço próprio (sem serviço da plataforma)
            </p>
          </div>
          <div className="card-elevated p-5 border-l-4 border-l-success">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Receita serviços plataforma (mês)
              </p>
              <Stethoscope className="h-4 w-4 text-success" />
            </div>
            <p className="mt-2 text-2xl font-bold">{formatBRL(stats.receitaServicosMes)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.qtdServicos} consulta{stats.qtdServicos !== 1 ? "s" : ""} via serviços da plataforma · valor de repasse
            </p>
          </div>
        </div>
      )}

      {/* Ranking & Saldo de Crescimento */}
      {isMedico && (
        <Link to="/app/medico/gamificacao" className="card-elevated p-5 transition hover:border-primary/40 block">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              <h3 className="font-display text-base font-semibold">Ranking & Crescimento</h3>
            </div>
            <span className="text-xs text-primary font-medium">Ver detalhes →</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-bold text-lg mb-1">
                {rankingData?.posicao ? `#${rankingData.posicao}` : "—"}
              </div>
              <p className="text-[11px] text-muted-foreground">Posição</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{rankingData?.ranking_score?.toFixed(1) ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground">Score</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span className="text-2xl font-bold">{rankingData?.avaliacao_media?.toFixed(1) ?? "—"}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{rankingData?.total_avaliacoes ?? 0} avaliações</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{saldoCrescimento.toFixed(0)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Saldo (pts)</p>
            </div>
          </div>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Próximas consultas reais */}
        <div className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Próximas consultas</h3>
            <Link to="/app/medico/agenda" className="text-xs text-primary hover:underline">
              Ver agenda completa
            </Link>
          </div>
          {proximas.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma consulta agendada nos próximos dias.
            </div>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {proximas.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft font-mono text-xs font-semibold text-primary">
                    {formatHora(c.inicio)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.paciente_nome ?? "Paciente"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.especialidade_nome ?? "Consulta"} · Telemedicina
                    </p>
                  </div>
                  <StatusBadge status={c.status as any} />
                  {podeIniciar ? (
                    <Button
                      size="sm"
                      variant={c.status === "em_andamento" ? "default" : "outline"}
                      className={c.status === "em_andamento" ? "bg-gradient-primary hover:opacity-90" : ""}
                      disabled={iniciandoId === c.id}
                      onClick={() => iniciarConsulta(c)}
                    >
                      {iniciandoId === c.id
                        ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        : <Play className="mr-1.5 h-3.5 w-3.5" />}
                      {c.status === "em_andamento" ? "Continuar" : "Iniciar"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/app/medico/agenda">
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Ver
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Atalhos — visíveis conforme perfil/permissões */}
        <div className="space-y-4">
          {podeVerPacientes && (
            <Link to="/app/medico/pacientes" className="card-elevated block p-5 transition hover:border-primary/40">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <p className="font-semibold">Buscar paciente</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Por nome, CPF ou ID interno</p>
            </Link>
          )}

          {isMedico && propostasPendentes > 0 && (
            <Link to="/app/medico/propostas" className="card-elevated block p-5 transition hover:border-warning/40 border-l-4 border-l-warning">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-warning" />
                <p className="font-semibold">Propostas pendentes</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {propostasPendentes} proposta{propostasPendentes > 1 ? "s" : ""} aguardando sua resposta
              </p>
            </Link>
          )}

          {isMedico && (
            <Link to="/app/medico/treinamento" className="card-elevated block p-5 transition hover:border-primary/40">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <p className="font-semibold">Treinamento</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Vídeos e boas práticas</p>
            </Link>
          )}

          {isMedico && (
            <Link to="/app/medico/configuracoes" className="card-elevated block p-5 transition hover:border-primary/40">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <p className="font-semibold">Configurações</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Perfil, agenda, sala virtual</p>
            </Link>
          )}

          {!isMedico && (
            <div className="card-elevated p-5 text-sm text-muted-foreground">
              <Lock className="mb-2 h-4 w-4" />
              Atalhos administrativos (perfil, treinamento, configurações da sala) só ficam disponíveis para o próprio médico.
            </div>
          )}
        </div>
      </div>

      {/* Contrato obrigatório no primeiro acesso */}
      {isMedico && (
        <TermsAcceptanceDialog
          tipo="contrato_medico"
          open={termsContrato.needsAcceptance && !termsContrato.loading}
          onOpenChange={termsContrato.setShowDialog}
          onAccepted={termsContrato.onAccepted}
          obrigatorio
        />
      )}
    </div>
  );
}
