import { usePermission } from '@/lib/permissions/usePermission';
import { useSession } from '@/lib/session';
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { fmtHora } from "@/lib/format";
import { useParams, Link, useLocation, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Calendar, MessageSquareText, Wallet, FileText, Building2, User,
  Stethoscope, Phone, ExternalLink, Loader2, History, Shield, Clock,
  Send, Eye, RefreshCw, AlertCircle, Ban, Play, Pause, ShieldOff,
  MessageCircle, Tag, StickyNote, CreditCard, Gift, Undo2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RequirePermission } from "@/components/permissions/RequirePermission";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { brl } from "@/lib/relatorios/utils";
import { cn } from "@/lib/utils";

/* ── types ── */
type Paciente = {
  id: string;
  nome_completo: string | null;
  cpf: string | null;
  telefone: string | null;
  telefone_secundario: string | null;
  empresa_id: string | null;
  status_conta: string;
  status_motivo: string | null;
  bloqueado_ate: string | null;
  feegow_status: string;
  feegow_paciente_id: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  created_at: string;
  observacoes_internas: string | null;
  tags: string[];
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  rg: string | null;
  estado_civil: string | null;
  nacionalidade: string | null;
  alergias: string | null;
  condicoes_cronicas: string | null;
  medicamentos_uso: string | null;
  contato_emergencia_nome: string | null;
  contato_emergencia_telefone: string | null;
};

type Consulta = {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  modalidade: string | null;
  valor_centavos: number;
  medico_id: string;
  medico_nome?: string;
  link_sala: string | null;
  link_enviado_em: string | null;
};

type Pagamento = {
  id: string;
  consulta_id: string | null;
  valor_centavos: number;
  status: string;
  metodo: string;
  created_at: string;
  paid_at: string | null;
  valor_reembolsado_centavos: number;
};

type Reembolso = {
  id: string;
  consulta_id: string | null;
  valor_centavos: number;
  status: string;
  motivo: string | null;
  created_at: string;
};

type Assinatura = {
  id: string;
  plano_id: string;
  status: string;
  ciclo: string;
  valor_cobrado_centavos: number;
  data_inicio: string;
  proxima_cobranca: string | null;
  plano_nome?: string;
};

type Conversa = {
  id: string;
  contact_phone: string | null;
  contact_name: string | null;
  status: string;
  channel: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  tags: string[];
};

type AuditLog = {
  id: string;
  acao: string;
  status_anterior: string | null;
  status_novo: string | null;
  motivo: string | null;
  observacao: string | null;
  payload: any;
  created_at: string;
  actor_id: string;
};

/* ── helpers ── */
function fmtData(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDataHora(d: string) {
  return `${fmtData(d)} ${fmtHora(d)}`;
}

function statusContaBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    ativo:     { label: "Ativo",     cls: "border-success/40 text-success" },
    pendente:  { label: "Pendente",  cls: "border-muted-foreground/40 text-muted-foreground" },
    suspenso:  { label: "Suspenso",  cls: "border-warning/40 text-warning" },
    bloqueado: { label: "Bloqueado", cls: "border-destructive/40 text-destructive" },
    banido:    { label: "Banido",    cls: "border-destructive/60 text-destructive font-semibold" },
  };
  const v = map[s] ?? { label: s, cls: "border-muted-foreground/40 text-muted-foreground" };
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}

/* ══════════════════════════════════════════════════════════ */
export default function PacientePerfil() {
  const { id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { roles } = useSession();
  const { has, loading: permissionsLoading } = usePermission(['agenda.ver_todas','financeiro.ver','comunicacao.ver_inbox','auditoria.ver','pacientes.editar']);
  const verAgenda = has('agenda.ver_todas') || roles.includes('medico');
  const verFinanceiro = has('financeiro.ver');
  const verComunicacao = has('comunicacao.ver_inbox');
  const verAuditoria = has('auditoria.ver');
  const editar = has('pacientes.editar');
  const [loadError, setLoadError] = useState(false);
  const requestVersion = useRef(0);
  const [loading, setLoading] = useState(true);
  const [pac, setPac] = useState<Paciente | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // Data
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [reembolsos, setReembolsos] = useState<Reembolso[]>([]);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Observações
  const [obsEdit, setObsEdit] = useState("");
  const [obsSalvando, setObsSalvando] = useState(false);

  // Reembolso dialog
  const [reembolsoOpen, setReembolsoOpen] = useState(false);
  const [reembolsoForm, setReembolsoForm] = useState({ pagamento_id: "", tipo: "total" as "total" | "parcial", valor: "", motivo: "" });
  const [reembolsoCriando, setReembolsoCriando] = useState(false);

  // Status action dialog
  const [statusActionOpen, setStatusActionOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<{ novoStatus: string; label: string }>({ novoStatus: "", label: "" });
  const [statusMotivo, setStatusMotivo] = useState("");
  const [statusObs, setStatusObs] = useState("");
  const [statusBloqueadoAte, setStatusBloqueadoAte] = useState("");
  const [statusSalvando, setStatusSalvando] = useState(false);

  const requestedTab = searchParams.get("tab") || "visao-geral";
  const tabAllowed: Record<string, boolean> = { 'visao-geral': true, observacoes: true, consultas: verAgenda, financeiro: verFinanceiro, planos: verFinanceiro, comunicacao: verComunicacao, auditoria: verAuditoria };
  const defaultTab = tabAllowed[requestedTab] ? requestedTab : 'visao-geral';

  const voltarTo = location.pathname.startsWith("/app/admin")
    ? "/app/admin/pacientes"
    : location.pathname.startsWith("/app/medico")
    ? "/app/medico/pacientes"
    : "/app/colaborador/pacientes";

  const carregar = useCallback(async () => {
    if (!id || permissionsLoading) return;
    const version = ++requestVersion.current;
    setLoading(true); setLoadError(false); setPac(null); setEmail(null);
    setConsultas([]); setPagamentos([]); setReembolsos([]); setAssinaturas([]); setConversas([]); setAuditLogs([]);
    const empty = Promise.resolve({ data: [], error: null });
    try {
      const { data: p, error } = await supabase.from("pacientes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!p || version !== requestVersion.current) return;
      const [prof, cons, pags, refunds, plans, chats, audits] = await Promise.all([
        p.user_id ? supabase.from("profiles").select("email").eq("id",p.user_id).maybeSingle() : Promise.resolve({data:null,error:null}),
        verAgenda ? supabase.from("consultas").select("id,inicio,fim,status,modalidade,valor_centavos,medico_id,link_sala,link_enviado_em,medicos:medico_id(nome)")
          .or('paciente_id.eq.'+id+',paciente_atendido_id.eq.'+id).order("inicio",{ascending:false}).limit(100) : empty,
        verFinanceiro ? supabase.from("pagamentos").select("id,consulta_id,valor_centavos,status,metodo,created_at,paid_at,valor_reembolsado_centavos").eq("paciente_id",id).order("created_at",{ascending:false}).limit(100) : empty,
        verFinanceiro ? supabase.rpc("paciente_reembolsos_recentes", { _paciente_id: id }) : empty,
        verFinanceiro ? supabase.from("assinaturas").select("id,plano_id,status,ciclo,valor_cobrado_centavos,data_inicio,proxima_cobranca,planos:plano_id(nome)").eq("paciente_id",id).order("created_at",{ascending:false}).limit(20) : empty,
        verComunicacao ? supabase.from("conversations").select("id,contact_phone,contact_name,status,channel,last_message_at,last_message_preview,unread_count,tags").eq("patient_id",id).order("last_message_at",{ascending:false}).limit(30) : empty,
        verAuditoria ? supabase.from("pacientes_auditoria").select("*").eq("paciente_id",id).order("created_at",{ascending:false}).limit(50) : empty,
      ]);
      for (const result of [prof,cons,pags,refunds,plans,chats,audits]) if (result.error) throw result.error;
      if (version !== requestVersion.current) return;
      setPac(p); setObsEdit(p.observacoes_internas ?? ""); setEmail(prof.data?.email ?? null);
      setConsultas((cons.data ?? []).map((c: any) => ({...c,medico_nome:c.medicos?.nome ?? "—"})));
      setPagamentos(pags.data ?? []); setReembolsos((refunds.data ?? []) as Reembolso[]);
      setAssinaturas((plans.data ?? []).map((plan: any) => ({...plan,plano_nome:plan.planos?.nome ?? "—"})));
      setConversas(chats.data ?? []); setAuditLogs(audits.data ?? []);
    } catch {
      if (version === requestVersion.current) setLoadError(true);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [id, permissionsLoading, verAgenda, verFinanceiro, verComunicacao, verAuditoria]);
  useEffect(() => { void carregar(); return () => { requestVersion.current++; }; }, [carregar]);

  // KPIs financeiros
  const finKpis = useMemo(() => {
    const pagos = pagamentos.filter(p => p.status === "pago");
    const totalGasto = pagos.reduce((s, p) => s + p.valor_centavos, 0);
    const pendentes = pagamentos.filter(p => ["pendente", "processando"].includes(p.status));
    const falhos = pagamentos.filter(p => p.status === "falhou");
    const totalReembolsado = reembolsos.filter(r => r.status === "aprovado").reduce((s, r) => s + r.valor_centavos, 0);
    return { totalGasto, pendentes: pendentes.length, falhos: falhos.length, totalReembolsado };
  }, [pagamentos, reembolsos]);

  async function salvarObservacoes() {
    if (!pac || !editar || obsSalvando) return;
    setObsSalvando(true);
    try {
      const { error } = await supabase.rpc("paciente_salvar_observacoes", { _paciente_id: pac.id, _texto: obsEdit });
      if (error) throw error;
      toast({ title: "Observações salvas e auditadas" });
      await carregar();
    } catch {
      toast({ title: "Não foi possível salvar as observações", description: "Verifique seu acesso e tente novamente.", variant: "destructive" });
    } finally { setObsSalvando(false); }
  }

  // ── Solicitar reembolso ──
  async function criarReembolso() {
    if (!pac || !reembolsoForm.pagamento_id || !reembolsoForm.motivo.trim()) {
      toast({ title: "Preencha pagamento e motivo", variant: "destructive" });
      return;
    }
    const pag = pagamentos.find(p => p.id === reembolsoForm.pagamento_id);
    if (!pag) return;
    const valorCentavos = reembolsoForm.tipo === "total"
      ? pag.valor_centavos
      : Math.round(parseFloat(reembolsoForm.valor || "0") * 100);
    if (valorCentavos <= 0 || valorCentavos > pag.valor_centavos) {
      toast({ title: "Valor inválido", description: "O valor deve ser maior que 0 e menor ou igual ao pagamento.", variant: "destructive" });
      return;
    }
    setReembolsoCriando(true);
    // Find consulta_id from pagamento
    const consultaId = pag.consulta_id;
    const { data: inserted, error } = await supabase.from("reembolsos").insert({
      consulta_id: consultaId,
      pagamento_id: pag.id,
      valor_centavos: valorCentavos,
      motivo: reembolsoForm.motivo.trim(),
      tipo: reembolsoForm.tipo,
      status: "solicitado",
      actor_id: (await supabase.auth.getUser()).data.user?.id,
    }).select("id").single();
    setReembolsoCriando(false);
    if (error) {
      toast({ title: "Erro ao solicitar reembolso", description: error.message, variant: "destructive" });
    } else {
      // Notificar paciente e médico
      if (inserted?.id) {
        supabase.functions.invoke("notificar-reembolso", {
          body: { reembolso_id: inserted.id, evento: "solicitado" },
        }).catch(() => {});
      }
      toast({ title: "Reembolso solicitado", description: "O reembolso entrará na fila para aprovação." });
      setReembolsoOpen(false);
      setReembolsoForm({ pagamento_id: "", tipo: "total", valor: "", motivo: "" });
      carregar();
    }
  }

  // ── Ação de status ──
  function openStatusAction(novoStatus: string, label: string) {
    setStatusAction({ novoStatus, label });
    setStatusMotivo("");
    setStatusObs("");
    setStatusBloqueadoAte("");
    setStatusActionOpen(true);
  }

  async function executarStatusAction() {
    if (!pac || !statusMotivo.trim()) {
      toast({ title: "Informe o motivo", variant: "destructive" });
      return;
    }
    setStatusSalvando(true);
    const { error } = await supabase.rpc("alterar_status_conta_paciente", {
      _paciente_id: pac.id,
      _novo_status: statusAction.novoStatus as "ativo" | "banido" | "bloqueado" | "pendente" | "suspenso",
      _motivo: statusMotivo.trim(),
      _observacao: statusObs.trim() || null,
      _bloqueado_ate: statusAction.novoStatus === "bloqueado" && statusBloqueadoAte ? statusBloqueadoAte : null,
    });
    setStatusSalvando(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Status alterado para "${statusAction.label}"` });
      setStatusActionOpen(false);
      carregar();
    }
  }

  if (loading || permissionsLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) return <div role="alert" className="space-y-4 p-8">Não foi possível carregar o paciente. <Button onClick={() => void carregar()}>Tentar novamente</Button></div>;
  if (!pac) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">Paciente não encontrado.</p>
        <Button asChild variant="outline"><Link to={voltarTo}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Link></Button>
      </div>
    );
  }

  const empresarial = !!pac.empresa_id;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={voltarTo}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Link>
      </Button>

      <PageHeader
        title={pac.nome_completo ?? "Sem nome"}
        description={`${empresarial ? "Empresarial" : "Particular"} · Cadastrado em ${fmtData(pac.created_at)}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={carregar}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
            {verAgenda && <Button className="bg-gradient-primary hover:opacity-90" asChild>
              <Link to="/app/colaborador/agenda">
                <Calendar className="mr-2 h-4 w-4" />Abrir agenda
              </Link>
            </Button>}
          </div>
        }
      />

      {/* Status bar */}
      <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
        {statusContaBadge(pac.status_conta)}
        {pac.bloqueado_ate && (
          <Badge variant="outline" className="border-warning/40 text-warning">
            <Clock className="h-3 w-3 mr-1" /> Bloqueio até {fmtData(pac.bloqueado_ate)}
          </Badge>
        )}
        <Badge variant="outline" className={pac.feegow_status === "liberado" ? "border-success/40 text-success" : "border-muted-foreground/30 text-muted-foreground"}>
          Feegow: {pac.feegow_status}
        </Badge>
        {pac.status_motivo && (
          <span className="text-xs text-muted-foreground">Motivo: {pac.status_motivo}</span>
        )}
        {pac.tags?.length > 0 && (
          <div className="flex gap-1">
            {pac.tags.map(t => (
              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
          </div>
        )}
        <div className="ml-auto flex gap-2">
          {pac.status_conta !== "suspenso" && pac.status_conta !== "banido" && (
            <RequirePermission perm="pacientes.suspender">
              <Button size="sm" variant="outline" className="border-warning/40 text-warning" onClick={() => openStatusAction("suspenso", "Suspenso")}>
                <Pause className="h-3.5 w-3.5 mr-1" />Suspender
              </Button>
            </RequirePermission>
          )}
          {pac.status_conta !== "bloqueado" && pac.status_conta !== "banido" && (
            <RequirePermission perm="pacientes.suspender">
              <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" onClick={() => openStatusAction("bloqueado", "Bloqueado")}>
                <ShieldOff className="h-3.5 w-3.5 mr-1" />Bloquear
              </Button>
            </RequirePermission>
          )}
          {pac.status_conta !== "banido" && (
            <RequirePermission perm="pacientes.bloquear">
              <Button size="sm" variant="destructive" onClick={() => openStatusAction("banido", "Banido")}>
                <Ban className="h-3.5 w-3.5 mr-1" />Banir
              </Button>
            </RequirePermission>
          )}
          {["suspenso", "bloqueado", "banido"].includes(pac.status_conta) && (
            <RequirePermission perm="pacientes.suspender">
              <Button size="sm" variant="outline" className="border-success/40 text-success" onClick={() => openStatusAction("ativo", "Ativo")}>
                <Play className="h-3.5 w-3.5 mr-1" />Reativar
              </Button>
            </RequirePermission>
          )}
        </div>
      </div>

      {/* TABS */}
      <Tabs key={id + String(verAgenda) + String(verFinanceiro) + String(verComunicacao) + String(verAuditoria)} defaultValue={defaultTab} className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="visao-geral"><User className="h-3.5 w-3.5 mr-1" />Visão geral</TabsTrigger>
          {verAgenda && <TabsTrigger value="consultas"><Stethoscope className="h-3.5 w-3.5 mr-1" />Consultas ({consultas.length})</TabsTrigger>}
          {verFinanceiro && <TabsTrigger value="financeiro"><Wallet className="h-3.5 w-3.5 mr-1" />Financeiro</TabsTrigger>}
          {verComunicacao && <TabsTrigger value="comunicacao"><MessageCircle className="h-3.5 w-3.5 mr-1" />Comunicação ({conversas.length})</TabsTrigger>}
          {verFinanceiro && <TabsTrigger value="planos"><Gift className="h-3.5 w-3.5 mr-1" />Planos ({assinaturas.length})</TabsTrigger>}
          {verAuditoria && <TabsTrigger value="auditoria"><Shield className="h-3.5 w-3.5 mr-1" />Auditoria</TabsTrigger>}
          <TabsTrigger value="observacoes"><StickyNote className="h-3.5 w-3.5 mr-1" />Observações</TabsTrigger>
        </TabsList>

        {/* ── VISÃO GERAL ── */}
        <TabsContent value="visao-geral">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <div className="card-elevated p-6">
                <h3 className="font-display text-lg font-semibold">Dados pessoais</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Info label="CPF" icon={FileText}>{pac.cpf ?? "—"}</Info>
                  <Info label="RG" icon={FileText}>{pac.rg ?? "—"}</Info>
                  <Info label="Telefone" icon={Phone}>{pac.telefone ?? "—"}</Info>
                  <Info label="Telefone 2" icon={Phone}>{pac.telefone_secundario ?? "—"}</Info>
                  <Info label="E-mail" icon={MessageSquareText}>{email ?? "—"}</Info>
                  <Info label="Data nasc." icon={Calendar}>{pac.data_nascimento ? fmtData(pac.data_nascimento) : "—"}</Info>
                  <Info label="Sexo" icon={User}>{pac.sexo ?? "—"}</Info>
                  <Info label="Estado civil" icon={User}>{pac.estado_civil ?? "—"}</Info>
                  <Info label="Nacionalidade" icon={User}>{pac.nacionalidade ?? "—"}</Info>
                  <Info label="Vínculo" icon={empresarial ? Building2 : User}>
                    {empresarial ? "Empresarial" : "Particular"}
                  </Info>
                  <Info label="Feegow ID" icon={ExternalLink}>{pac.feegow_paciente_id ?? "—"}</Info>
                </div>
              </div>

              {(pac.logradouro || pac.cep) && (
                <div className="card-elevated p-6">
                  <h3 className="font-display text-lg font-semibold">Endereço</h3>
                  <p className="mt-2 text-sm">
                    {[pac.logradouro, pac.numero, pac.complemento, pac.bairro].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {[pac.cidade, pac.uf, pac.cep].filter(Boolean).join(" · ")}
                  </p>
                </div>
              )}

              {(pac.alergias || pac.condicoes_cronicas || pac.medicamentos_uso) && (
                <div className="card-elevated p-6">
                  <h3 className="font-display text-lg font-semibold">Saúde</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    {pac.alergias && <p><strong>Alergias:</strong> {pac.alergias}</p>}
                    {pac.condicoes_cronicas && <p><strong>Condições crônicas:</strong> {pac.condicoes_cronicas}</p>}
                    {pac.medicamentos_uso && <p><strong>Medicamentos em uso:</strong> {pac.medicamentos_uso}</p>}
                    {pac.contato_emergencia_nome && (
                      <p><strong>Contato de emergência:</strong> {pac.contato_emergencia_nome} — {pac.contato_emergencia_telefone}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="card-elevated p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações rápidas</p>
                <div className="mt-3 grid gap-2">
                  {verAgenda && <Button size="sm" className="bg-gradient-primary hover:opacity-90 justify-start" asChild>
                    <Link to="/app/colaborador/agenda">
                      <Calendar className="mr-2 h-4 w-4" />Abrir agenda
                    </Link>
                  </Button>}
                  {verComunicacao && <Button size="sm" variant="outline" className="justify-start" asChild>
                    <Link to="/app/comunicacao/inbox">
                      <Phone className="mr-2 h-4 w-4" />Abrir comunicação
                    </Link>
                  </Button>}
                </div>
              </div>

              {verFinanceiro && <div className="card-elevated p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo financeiro (até 100 pagamentos e 50 reembolsos recentes)</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p>Total gasto: <strong>{brl(finKpis.totalGasto)}</strong></p>
                  <p>Pagtos pendentes: <strong>{finKpis.pendentes}</strong></p>
                  <p>Pagtos falhos: <strong>{finKpis.falhos}</strong></p>
                  <p>Reembolsado: <strong>{brl(finKpis.totalReembolsado)}</strong></p>
                </div>
              </div>}

              {verAgenda && <div className="card-elevated p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Consultas (até 100 recentes)</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p>Total: <strong>{consultas.length}</strong></p>
                  <p>Concluídas: <strong>{consultas.filter(c => c.status === "concluida").length}</strong></p>
                  <p>Canceladas: <strong>{consultas.filter(c => c.status === "cancelada").length}</strong></p>
                  <p>No-show: <strong>{consultas.filter(c => c.status === "no_show").length}</strong></p>
                </div>
              </div>}
            </aside>
          </div>
        </TabsContent>

        {/* ── CONSULTAS ── */}
        {verAgenda && <TabsContent value="consultas"><p className="mb-3 text-sm text-muted-foreground">Até 100 consultas recentes como titular ou paciente atendido.</p>
          <div className="card-elevated p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Histórico de consultas</h3>
            {consultas.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Sem consultas registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="pb-2 text-left pr-3">Data</th>
                      <th className="pb-2 text-left pr-3">Médico</th>
                      <th className="pb-2 text-left pr-3">Modalidade</th>
                      <th className="pb-2 text-right pr-3">Valor</th>
                      <th className="pb-2 text-left pr-3">Status</th>
                      <th className="pb-2 text-left">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {consultas.map(c => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="py-2.5 pr-3">{fmtDataHora(c.inicio)}</td>
                        <td className="py-2.5 pr-3">{c.medico_nome}</td>
                        <td className="py-2.5 pr-3 capitalize">{c.modalidade ?? "online"}</td>
                        <td className="py-2.5 pr-3 text-right">{brl(c.valor_centavos)}</td>
                        <td className="py-2.5 pr-3"><StatusBadge status={c.status as any} /></td>
                        <td className="py-2.5">
                          {c.link_enviado_em ? (
                            <Badge variant="outline" className="border-success/40 text-success text-[10px]">Enviado</Badge>
                          ) : c.modalidade === "online" && !["cancelada", "concluida", "no_show"].includes(c.status) ? (
                            <Badge variant="outline" className="border-warning/40 text-warning text-[10px]">Pendente</Badge>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>}

        {/* ── FINANCEIRO ── */}
        {verFinanceiro && <TabsContent value="financeiro"><p className="mb-3 text-sm text-muted-foreground">Resumo dos até 100 pagamentos e 50 reembolsos recentes carregados; não representa o saldo histórico completo.</p>
          <div className="flex justify-end mb-4">
            <RequirePermission perm="pacientes.reembolsar">
              <Button variant="outline" onClick={() => setReembolsoOpen(true)} disabled={pagamentos.filter(p => p.status === "pago").length === 0}>
                <Undo2 className="h-4 w-4 mr-2" />Solicitar reembolso
              </Button>
            </RequirePermission>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Kpi label="Total gasto" value={brl(finKpis.totalGasto)} icon={CreditCard} cls="text-primary" />
            <Kpi label="Pendentes" value={String(finKpis.pendentes)} icon={Clock} cls="text-warning" />
            <Kpi label="Falhos" value={String(finKpis.falhos)} icon={AlertCircle} cls="text-destructive" />
            <Kpi label="Reembolsado" value={brl(finKpis.totalReembolsado)} icon={RefreshCw} cls="text-accent" />
          </div>

          <div className="card-elevated p-6 mb-4">
            <h3 className="font-display text-lg font-semibold mb-4">Pagamentos</h3>
            {pagamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pagamento.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="pb-2 text-left pr-3">Data</th>
                      <th className="pb-2 text-right pr-3">Valor</th>
                      <th className="pb-2 text-left pr-3">Método</th>
                      <th className="pb-2 text-left pr-3">Status</th>
                      <th className="pb-2 text-right">Reembolsado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagamentos.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="py-2.5 pr-3">{fmtDataHora(p.created_at)}</td>
                        <td className="py-2.5 pr-3 text-right font-medium">{brl(p.valor_centavos)}</td>
                        <td className="py-2.5 pr-3 capitalize">{p.metodo}</td>
                        <td className="py-2.5 pr-3">
                          <Badge variant="outline" className={cn(
                            p.status === "pago" ? "border-success/40 text-success" :
                            p.status === "pendente" ? "border-warning/40 text-warning" :
                            "border-destructive/40 text-destructive",
                          )}>{p.status}</Badge>
                        </td>
                        <td className="py-2.5 text-right">
                          {p.valor_reembolsado_centavos > 0 ? brl(p.valor_reembolsado_centavos) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {reembolsos.length > 0 && (
            <div className="card-elevated p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Reembolsos</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="pb-2 text-left pr-3">Data</th>
                      <th className="pb-2 text-right pr-3">Valor</th>
                      <th className="pb-2 text-left pr-3">Status</th>
                      <th className="pb-2 text-left">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reembolsos.map(r => (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="py-2.5 pr-3">{fmtDataHora(r.created_at)}</td>
                        <td className="py-2.5 pr-3 text-right font-medium">{brl(r.valor_centavos)}</td>
                        <td className="py-2.5 pr-3">
                          <Badge variant="outline" className={cn(
                            r.status === "aprovado" ? "border-success/40 text-success" :
                            r.status === "pendente" ? "border-warning/40 text-warning" :
                            "border-destructive/40 text-destructive",
                          )}>{r.status}</Badge>
                        </td>
                        <td className="py-2.5 text-muted-foreground">{r.motivo ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>}

        {/* ── COMUNICAÇÃO ── */}
        {verComunicacao && <TabsContent value="comunicacao"><p className="mb-3 text-sm text-muted-foreground">Até 30 conversas recentes permitidas para sua conta.</p>
          <div className="card-elevated p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Conversas vinculadas</h3>
            {conversas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada para este paciente.</p>
            ) : (
              <div className="space-y-2">
                {conversas.map(c => (
                  <Link
                    key={c.id}
                    to={`/app/comunicacao/inbox?conversa=${c.id}`}
                    className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors"
                  >
                    <MessageCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{c.contact_name || c.contact_phone || "—"}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{c.status}</Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">{c.channel}</Badge>
                        {c.unread_count > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-[10px]">{c.unread_count}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.last_message_preview || "Sem mensagens"}</p>
                      {c.last_message_at && (
                        <p className="text-[10px] text-muted-foreground">{fmtDataHora(c.last_message_at)}</p>
                      )}
                      {c.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {c.tags.map(t => <Badge key={t} variant="secondary" className="text-[9px]">{t}</Badge>)}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TabsContent>}

        {/* ── PLANOS ── */}
        {verFinanceiro && <TabsContent value="planos"><p className="mb-3 text-sm text-muted-foreground">Até 20 assinaturas recentes.</p>
          <div className="card-elevated p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Planos e assinaturas</h3>
            {assinaturas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum plano vinculado.</p>
            ) : (
              <div className="space-y-3">
                {assinaturas.map(a => (
                  <div key={a.id} className="rounded-lg border p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{a.plano_nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.ciclo} · Início {fmtData(a.data_inicio)}
                        {a.proxima_cobranca && ` · Próx. cobrança ${fmtData(a.proxima_cobranca)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{brl(a.valor_cobrado_centavos)}</span>
                      <Badge variant="outline" className={cn(
                        a.status === "ativo" ? "border-success/40 text-success" :
                        a.status === "cancelado" ? "border-destructive/40 text-destructive" :
                        "border-muted-foreground/40 text-muted-foreground",
                      )}>{a.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>}

        {/* ── AUDITORIA ── */}
        {verAuditoria && <TabsContent value="auditoria"><p className="mb-3 text-sm text-muted-foreground">Até 50 eventos recentes.</p>
          <div className="card-elevated p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Timeline de auditoria</h3>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem registros de auditoria.</p>
            ) : (
              <div className="relative border-l-2 border-border ml-4 space-y-4">
                {auditLogs.map(log => (
                  <div key={log.id} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-primary/20 border-2 border-primary" />
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {fmtDataHora(log.created_at)}
                      </div>
                      <p className="text-sm font-medium mt-1">{log.acao}</p>
                      {(log.status_anterior || log.status_novo) && (
                        <p className="text-xs text-muted-foreground">
                          {log.status_anterior} → {log.status_novo}
                        </p>
                      )}
                      {log.motivo && <p className="text-xs mt-1"><strong>Motivo:</strong> {log.motivo}</p>}
                      {log.observacao && <p className="text-xs text-muted-foreground">{log.observacao}</p>}
                      {log.payload && (
                        <pre className="text-[10px] text-muted-foreground mt-1 bg-muted/40 p-1 rounded overflow-x-auto">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>}

        {/* ── OBSERVAÇÕES ── */}
        <TabsContent value="observacoes">
          <div className="card-elevated p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Observações internas</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Estas notas são visíveis apenas para a equipe administrativa. Cada edição é registrada na auditoria.
            </p>
            <Textarea
              readOnly={!editar}
              maxLength={10000}
              value={obsEdit}
              onChange={e => setObsEdit(e.target.value)}
              rows={8}
              placeholder="Notas internas sobre o paciente..."
            />
            <div className="mt-3 flex justify-end">
              <Button onClick={salvarObservacoes} disabled={obsSalvando || !editar}>
                {obsSalvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar observações
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Solicitar Reembolso ── */}
      <Dialog open={reembolsoOpen} onOpenChange={setReembolsoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar reembolso</DialogTitle>
            <DialogDescription>Selecione o pagamento e informe os detalhes do reembolso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pagamento</Label>
              <Select value={reembolsoForm.pagamento_id} onValueChange={v => setReembolsoForm(f => ({ ...f, pagamento_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {pagamentos.filter(p => p.status === "pago").map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {fmtData(p.created_at)} — {brl(p.valor_centavos)} ({p.metodo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={reembolsoForm.tipo} onValueChange={v => setReembolsoForm(f => ({ ...f, tipo: v as "total" | "parcial" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reembolsoForm.tipo === "parcial" && (
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" min="0.01" placeholder="0,00" value={reembolsoForm.valor} onChange={e => setReembolsoForm(f => ({ ...f, valor: e.target.value }))} />
              </div>
            )}
            <div>
              <Label>Motivo *</Label>
              <Textarea rows={3} placeholder="Descreva o motivo do reembolso..." value={reembolsoForm.motivo} onChange={e => setReembolsoForm(f => ({ ...f, motivo: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReembolsoOpen(false)} disabled={reembolsoCriando}>Cancelar</Button>
            <Button onClick={criarReembolso} disabled={reembolsoCriando}>
              {reembolsoCriando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Solicitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Ação de Status ── */}
      <Dialog open={statusActionOpen} onOpenChange={setStatusActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar status para "{statusAction.label}"</DialogTitle>
            <DialogDescription>Esta ação será registrada na auditoria do paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo *</Label>
              <Textarea rows={3} placeholder="Motivo obrigatório..." value={statusMotivo} onChange={e => setStatusMotivo(e.target.value)} />
            </div>
            <div>
              <Label>Observação adicional</Label>
              <Textarea rows={2} placeholder="Opcional..." value={statusObs} onChange={e => setStatusObs(e.target.value)} />
            </div>
            {statusAction.novoStatus === "bloqueado" && (
              <div>
                <Label>Bloqueio até (temporário)</Label>
                <Input type="datetime-local" value={statusBloqueadoAte} onChange={e => setStatusBloqueadoAte(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Deixe vazio para bloqueio permanente.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusActionOpen(false)} disabled={statusSalvando}>Cancelar</Button>
            <Button variant={statusAction.novoStatus === "ativo" ? "default" : "destructive"} onClick={executarStatusAction} disabled={statusSalvando}>
              {statusSalvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── small components ── */
function Info({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {children}
      </p>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, cls }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; cls: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", cls)} />
      </div>
      <div className="text-xl font-display font-semibold mt-1">{value}</div>
    </div>
  );
}
