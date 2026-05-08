import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useSession } from "@/lib/session";
import { usePermission } from "@/lib/permissions/usePermission";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send, Search, Bot, Sparkles, UserCheck, Phone, FileText,
  CreditCard, Calendar, ArrowRightLeft, Pause, X, AlertCircle,
  FileEdit, Shield, Clock, Stethoscope, Headphones, Loader2, Lock,
  MessageSquarePlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LockBadge } from "@/components/comunicacao/LockBadge";
import { TransferirConversaDialog } from "@/components/comunicacao/TransferirConversaDialog";
import { Janela24hMeta } from "@/components/comunicacao/Janela24hMeta";
import { PacientesVinculadosPanel, type VinculoPaciente } from "@/components/comunicacao/PacientesVinculadosPanel";
import { LGPDGate } from "@/components/comunicacao/LGPDGate";
import { AuditLogDrawer } from "@/components/comunicacao/AuditLogDrawer";
import { EnviarTemplateDialog } from "@/components/comunicacao/EnviarTemplateDialog";
import { JanelaExpiradaBanner } from "@/components/comunicacao/JanelaExpiradaBanner";
import { ConversationSlaBadge } from "@/components/comunicacao/ConversationSlaBadge";
import { AttendantPresenceBadge } from "@/components/comunicacao/AttendantPresenceBadge";
import { ConversationQueuePanel } from "@/components/comunicacao/ConversationQueuePanel";
import { StatusOperacionalSelect } from "@/components/comunicacao/StatusOperacionalSelect";
import { TypingIndicator } from "@/components/comunicacao/TypingIndicator";
import { useAttendantPresence } from "@/hooks/useAttendantPresence";
import { useConversationTyping } from "@/hooks/useConversationTyping";
import { CheckCircle2 } from "lucide-react";
import { NovaConversaDialog } from "@/components/comunicacao/NovaConversaDialog";
import { openOrCreatePacienteConversation } from "@/lib/comunicacao/openOrCreateConversation";

type Conv = {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  status: string;
  channel: string;
  origin: string;
  priority: string;
  bot_active: boolean;
  ai_active: boolean;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  assigned_to: string | null;
  assigned_sector: string | null;
  patient_id: string | null;
  lead_id: string | null;
  consulta_id: string | null;
  medico_id: string | null;
  intent: string | null;
  tags: string[];
  locked_by: string | null;
  locked_at: string | null;
  paciente_ativo_id: string | null;
  department_id: string | null;
  queue_id: string | null;
  sla_due_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
};

type Msg = {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string | null;
  body: string | null;
  message_type: string;
  status: string;
  created_at: string;
};

type Template = { id: string; name: string; content: string; category: string };

type ConsultaJanela = {
  id: string;
  inicio: string;
  status: string;
  medico_id: string;
};

const STATUS_LABEL: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  aberta: { label: "Aberta", icon: <Headphones className="h-3 w-3" />, color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  em_atendimento: { label: "Em atendimento", icon: <UserCheck className="h-3 w-3" />, color: "bg-green-500/10 text-green-600 border-green-500/30" },
  pendente: { label: "Pendente", icon: <Clock className="h-3 w-3" />, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  fechada: { label: "Fechada", icon: <X className="h-3 w-3" />, color: "bg-muted text-muted-foreground" },
  arquivada: { label: "Arquivada", icon: <X className="h-3 w-3" />, color: "bg-muted text-muted-foreground" },
};

const INBOX_PERMISSIONS = [
  "comunicacao.ver_todas",
  "comunicacao.ver_atribuidas",
  "comunicacao.responder",
  "comunicacao.transferir",
  "comunicacao.finalizar",
  "comunicacao.inbox.assumir",
  "comunicacao.inbox.encerrar",
  "comunicacao.inbox.resolver",
  "comunicacao.inbox.alterar_prioridade",
  "comunicacao.inbox.supervisionar",
];

// Audit helper
async function registrarAuditoria(
  action: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("comunicacao_auditoria").insert({
    actor_id: user.id,
    action,
    entity_type: "conversation",
    entity_id: entityId,
    metadata: metadata as Json,
  });
}

/* ─── Helpers de janela temporal para médico ─── */
function isConvDentroJanela(
  consulta: ConsultaJanela | undefined,
  janelaPosDias: number,
): boolean {
  if (!consulta) return false;
  const now = Date.now();
  const inicio = new Date(consulta.inicio).getTime();
  const preConsultaMs = 10 * 60 * 1000; // 10 minutos antes
  const posConsultaMs = janelaPosDias * 24 * 60 * 60 * 1000;
  return now >= inicio - preConsultaMs && now <= inicio + posConsultaMs;
}

export default function ComunicacaoInbox() {
  const { user } = useSession();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const convParam = searchParams.get("conv");
  const pacienteParam = searchParams.get("paciente");
  const phoneParam = searchParams.get("phone");
  const [novaConversaOpen, setNovaConversaOpen] = useState(false);
  const { loading: permLoading, allowed: perms } = usePermission(INBOX_PERMISSIONS);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroResp, setFiltroResp] = useState<string>("todas");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroSla, setFiltroSla] = useState<string>("todos"); // todos | vencido
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>("todas");
  const [draft, setDraft] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Detail data for right panel
  const [assignedName, setAssignedName] = useState<string | null>(null);
  const [lockedByName, setLockedByName] = useState<string | null>(null);
  const [medicoName, setMedicoName] = useState<string | null>(null);
  const [consultaInfo, setConsultaInfo] = useState<{ inicio: string; status: string } | null>(null);
  const [transferirOpen, setTransferirOpen] = useState(false);
  const [vinculosPaciente, setVinculosPaciente] = useState<VinculoPaciente[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [janelaExpirada, setJanelaExpirada] = useState(false);

  // Acesso temporário dialog
  const [acessoDialog, setAcessoDialog] = useState(false);
  const [acessoMotivo, setAcessoMotivo] = useState("");
  const [acessoHoras, setAcessoHoras] = useState(24);
  const [acessoMedicoId, setAcessoMedicoId] = useState("");
  const [acessoLoading, setAcessoLoading] = useState(false);

  /* ─── MODO MÉDICO ─── */
  const [isMedico, setIsMedico] = useState(false);
  const [medicoCheckDone, setMedicoCheckDone] = useState(false);
  const [medicoUserId, setMedicoUserId] = useState<string | null>(null);
  const [consultasMap, setConsultasMap] = useState<Record<string, ConsultaJanela>>({});
  const [janelaConfig, setJanelaConfig] = useState({
    janela_pos_consulta_dias: 7,
    medico_iniciar_pos_consulta: true,
  });

  // Detect if the current user is a médico
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("medicos")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setIsMedico(true);
        setMedicoUserId(data.id);
      }
      setMedicoCheckDone(true);
    })();
  }, [user]);

  // Load inbox config for médico window
  useEffect(() => {
    if (!isMedico) return;
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["inbox.janela_pos_consulta_dias", "inbox.medico_iniciar_pos_consulta"])
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, any> = {};
        data.forEach((r: any) => { map[r.key] = r.value; });
        setJanelaConfig({
          janela_pos_consulta_dias: Number(map["inbox.janela_pos_consulta_dias"] ?? 7),
          medico_iniciar_pos_consulta:
            map["inbox.medico_iniciar_pos_consulta"] === true ||
            map["inbox.medico_iniciar_pos_consulta"] === "true",
        });
      });
  }, [isMedico]);

  // Load consultas vinculadas for temporal window (médico mode)
  const loadConsultasMedico = useCallback(async (conversations: Conv[]) => {
    if (!isMedico || !medicoUserId) return;
    const consultaIds = conversations
      .filter(c => c.consulta_id)
      .map(c => c.consulta_id!);
    if (consultaIds.length === 0) return;
    const { data } = await supabase
      .from("consultas")
      .select("id, inicio, status, medico_id")
      .in("id", consultaIds);
    if (data) {
      const m: Record<string, ConsultaJanela> = {};
      (data).forEach(c => { m[c.id] = c; });
      setConsultasMap(m);
    }
  }, [isMedico, medicoUserId]);

  const loadConvs = useCallback(async () => {
    setLoadingConvs(true);
    let query = supabase
      .from("conversations")
      .select("*")
      .neq("channel", "interno")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200);

    // Médico: filter server-side by medico_id
    if (isMedico && medicoUserId) {
      query = query.eq("medico_id", medicoUserId);
    }

    const { data } = await query;
    const conversations = (data || []) as Conv[];
    setConvs(conversations);
    setLoadingConvs(false);

    // Load consultas for temporal window
    if (isMedico) {
      await loadConsultasMedico(conversations);
    }

    // Auto-select from query param
    if (convParam && conversations.length > 0 && !activeId) {
      const match = conversations.find(
        c => c.id === convParam || c.consulta_id === convParam
      );
      if (match) setActiveId(match.id);
    }
  }, [isMedico, medicoUserId, loadConsultasMedico, convParam, activeId]);

  async function loadMsgs(id: string) {
    setLoadingMsgs(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(500);
    setMsgs((data || []) as Msg[]);
    setLoadingMsgs(false);
    await supabase.from("conversations").update({ unread_count: 0 }).eq("id", id);
  }

  async function loadTemplates() {
    if (isMedico) return; // Médico não usa templates do inbox
    const { data } = await supabase
      .from("message_templates")
      .select("id,name,content,category")
      .eq("active", true)
      .order("name");
    setTemplates((data || []) as Template[]);
  }

  // Load detail data for right panel
  async function loadDetailData(conv: Conv) {
    setAssignedName(null);
    setLockedByName(null);
    setMedicoName(null);
    setConsultaInfo(null);

    if (conv.assigned_to) {
      const { data } = await supabase
        .from("profiles")
        .select("nome, email")
        .eq("id", conv.assigned_to)
        .maybeSingle();
      setAssignedName(data?.nome || data?.email || "—");
    }

    if (conv.locked_by) {
      if (conv.locked_by === conv.assigned_to && assignedName) {
        setLockedByName(assignedName);
      } else {
        const { data } = await supabase
          .from("profiles")
          .select("nome, email")
          .eq("id", conv.locked_by)
          .maybeSingle();
        setLockedByName(data?.nome || data?.email || "—");
      }
    }

    if (conv.medico_id) {
      const { data } = await supabase
        .from("medicos")
        .select("nome")
        .eq("id", conv.medico_id)
        .maybeSingle();
      setMedicoName(data?.nome || null);
    }

    if (conv.consulta_id) {
      const { data } = await supabase
        .from("consultas")
        .select("inicio, status")
        .eq("id", conv.consulta_id)
        .maybeSingle();
      if (data) setConsultaInfo(data as ConsultaJanela);
    }
  }

  useEffect(() => {
    if (!medicoCheckDone) return;
    loadConvs();
    loadTemplates();
  }, [medicoCheckDone, loadConvs]);

  useEffect(() => {
    if (activeId) loadMsgs(activeId);
  }, [activeId]);

  // Load detail data when active changes
  const active = convs.find(c => c.id === activeId) || null;

  // Fase 5 — Presença + Typing
  useAttendantPresence(activeId);
  useConversationTyping(activeId, draft);

  // Janela 24h Meta: rastrear se está expirada para a conversa ativa
  useEffect(() => {
    if (!active || active.channel !== "whatsapp") { setJanelaExpirada(false); return; }
    let alive = true;
    const check = async () => {
      const { data } = await supabase.rpc("get_meta_window_state", { p_conversation_id: active.id } as any);
      if (!alive) return;
      const open = (data as any)?.open === true;
      setJanelaExpirada(!open);
    };
    check();
    const t = setInterval(check, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [active?.id, active?.channel]);
  useEffect(() => {
    if (active) loadDetailData(active);
  }, [activeId, active?.assigned_to, active?.medico_id, active?.consulta_id, active?.locked_by]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => loadConvs())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: any) => {
        const m = payload.new as Msg;
        if (m.conversation_id === activeId) {
          setMsgs(prev => [...prev, m]);
        }
        loadConvs();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId, loadConvs]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  /* ─── Médico: check temporal window per conversation ─── */
  const isConvAllowed = useCallback((conv: Conv): boolean => {
    if (!isMedico) return true;
    if (!conv.consulta_id) return false;
    const consulta = consultasMap[conv.consulta_id];
    return isConvDentroJanela(consulta, janelaConfig.janela_pos_consulta_dias);
  }, [isMedico, consultasMap, janelaConfig.janela_pos_consulta_dias]);

  const canMedicoRespond = useCallback((conv: Conv): boolean => {
    if (!isMedico) return true;
    if (!isConvAllowed(conv)) return false;
    return janelaConfig.medico_iniciar_pos_consulta;
  }, [isMedico, isConvAllowed, janelaConfig.medico_iniciar_pos_consulta]);

  // Filtros
  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return convs.filter(c => {
      if (filtroStatus === "resolvidas") {
        if (!c.resolved_at) return false;
      } else if (filtroStatus !== "todos") {
        if (c.status !== filtroStatus) return false;
        if (c.resolved_at) return false;
      } else {
        if (c.resolved_at) return false;
      }
      if (!isMedico) {
        if (filtroResp === "minhas" && c.assigned_to !== user?.id) return false;
        if (filtroResp === "nao_atribuidas" && c.assigned_to) return false;
        if (filtroTipo === "bot" && !c.bot_active) return false;
        if (filtroTipo === "ia" && !c.ai_active) return false;
        if (filtroTipo === "medico" && !c.medico_id) return false;
        if (filtroTipo === "suporte" && (c.bot_active || c.ai_active || c.medico_id)) return false;
        if (filtroTipo === "consulta_hoje") {
          if (!c.consulta_id) return false;
        }
        if (filtroSla === "vencido") {
          if (!c.sla_due_at || new Date(c.sla_due_at).getTime() >= Date.now()) return false;
        }
        if (filtroPrioridade !== "todas" && c.priority !== filtroPrioridade) return false;
      }
      if (q) {
        const hay = `${c.contact_name || ""} ${c.contact_phone || ""} ${c.last_message_preview || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [convs, busca, filtroStatus, filtroResp, filtroTipo, filtroSla, filtroPrioridade, user, isMedico]);

  // Actions with audit
  const canAssume = !isMedico && (perms["comunicacao.inbox.assumir"] || perms["comunicacao.responder"]);
  const canClose = !isMedico && (perms["comunicacao.inbox.encerrar"] || perms["comunicacao.finalizar"]);
  const canTransfer = !isMedico && perms["comunicacao.transferir"];
  const canRespond = isMedico ? true : perms["comunicacao.responder"];

  async function enviar() {
    if (!draft.trim() || !active || !user) return;
    if (isMedico && !canMedicoRespond(active)) {
      toast.error("Você não tem permissão para enviar mensagens nesta conversa.");
      return;
    }
    const body = draft;
    setDraft("");

    // WhatsApp: rota via edge function (Meta sandbox/produção). Realtime traz a msg de volta.
    if (active.channel === "whatsapp") {
      if (!active.contact_phone) {
        toast.error("Conversa sem telefone — não é possível enviar via WhatsApp.");
        setDraft(body);
        return;
      }
      // Janela expirada → abre modal de template direto, sem chamar a API
      if (janelaExpirada) {
        setDraft(body);
        toast.error("Janela 24h expirada — envie um template para reabrir.");
        setTemplateDialogOpen(true);
        return;
      }
      const { data, error } = await supabase.functions.invoke("whatsapp-enviar", {
        body: { to: active.contact_phone, message: body, conversation_id: active.id },
      });
      if (error) {
        toast.error(`Falha ao enviar WhatsApp: ${error.message}`);
        setDraft(body);
        return;
      }
      if (data?.not_configured) {
        toast.error("WhatsApp ainda não configurado (sandbox sem credenciais).");
        setDraft(body);
        return;
      }
      if (data?.requires_template) {
        setDraft(body);
        toast.error("Janela 24h Meta expirada — abrindo template oficial.");
        setJanelaExpirada(true);
        setTemplateDialogOpen(true);
        return;
      }
      if (data?.lgpd_block) {
        toast.error("Paciente não autoriza mensagens WhatsApp (opt-out LGPD).");
        setDraft(body);
        return;
      }
      if (data?.ok === false && data?.error) {
        toast.error(data.error);
        setDraft(body);
        return;
      }
      return;
    }

    // Outros canais (interno/email): insert direto
    const { error } = await supabase.from("messages").insert({
      conversation_id: active.id,
      sender_type: isMedico ? "medico" : "colaborador",
      sender_id: user.id,
      sender_name: user.email || null,
      body,
      message_type: "text",
      status: "sent",
    });
    if (error) { toast.error(error.message); setDraft(body); return; }
  }

  function aplicarTemplate(t: Template) {
    setDraft(t.content);
  }

  async function assumir() {
    if (!active || !user || isMedico) return;
    const { error } = await supabase.rpc("claim_conversation" as any, { p_conversation_id: active.id });
    if (error) {
      if (error.code === "55006") {
        toast.error("Conversa já está sendo atendida por outro usuário");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success(`Conversa de ${active.contact_name || "paciente"} assumida`);
    loadConvs();
  }

  async function resolver() {
    if (!active || !user || isMedico) return;
    const { error } = await supabase.rpc("resolver_conversa" as any, { p_conversation_id: active.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Conversa resolvida");
    loadConvs();
  }

  async function liberar() {
    if (!active || !user || isMedico) return;
    const { error } = await supabase.rpc("liberar_conversa", { p_conversation_id: active.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Conversa liberada");
    loadConvs();
  }

  async function fechar() {
    if (!active || !user || isMedico) return;
    const { error } = await supabase.from("conversations").update({
      status: "fechada",
      closed_at: new Date().toISOString(),
      closed_by: user.id,
    }).eq("id", active.id);
    if (error) { toast.error(error.message); return; }
    await registrarAuditoria("encerrar_conversa", active.id, {
      conversa_id: active.id,
      paciente_id: active.patient_id,
      medico_id: active.medico_id,
    });
    toast.success(`Conversa finalizada`);
  }

  async function toggleBot() {
    if (!active || isMedico) return;
    const newState = !active.bot_active;
    await supabase.from("conversations").update({ bot_active: newState, ai_active: false }).eq("id", active.id);
    await registrarAuditoria(newState ? "ativar_bot" : "desativar_bot", active.id);
  }

  async function toggleAI() {
    if (!active || isMedico) return;
    const newState = !active.ai_active;
    await supabase.from("conversations").update({ ai_active: newState, bot_active: false }).eq("id", active.id);
    await registrarAuditoria(newState ? "ativar_ia" : "desativar_ia", active.id);
  }

  // Acesso temporário
  async function concederAcessoTemporario() {
    if (!active || !acessoMedicoId || !acessoMotivo.trim()) return;
    setAcessoLoading(true);
    const expiraEm = new Date(Date.now() + acessoHoras * 3600000).toISOString();
    // TODO: inbox_acesso_temporario table pending migration
    const { error } = await (supabase as any).from("inbox_acesso_temporario").insert({
      conversa_id: active.id,
      medico_id: acessoMedicoId,
      concedido_por: user?.id,
      motivo: acessoMotivo,
      expira_em: expiraEm,
    });
    setAcessoLoading(false);
    if (error) { toast.error(error.message); return; }
    await registrarAuditoria("conceder_acesso_temporario", active.id, {
      medico_id: acessoMedicoId,
      motivo: acessoMotivo,
      expira_em: expiraEm,
    });
    toast.success("Acesso temporário concedido");
    setAcessoDialog(false);
    setAcessoMotivo("");
    setAcessoMedicoId("");
  }

  // Atendimento type badge
  function getAtendimentoBadge(c: Conv) {
    if (c.status === "fechada") return { label: "Encerrada", color: "bg-muted text-muted-foreground", icon: <X className="h-3 w-3" /> };
    if (c.medico_id) return { label: "Médico", color: "bg-purple-500/10 text-purple-600 border-purple-500/30", icon: <Stethoscope className="h-3 w-3" /> };
    if (c.ai_active) return { label: "IA", color: "bg-violet-500/10 text-violet-600 border-violet-500/30", icon: <Sparkles className="h-3 w-3" /> };
    if (c.bot_active) return { label: "Bot", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: <Bot className="h-3 w-3" /> };
    return { label: "Suporte", color: "bg-green-500/10 text-green-600 border-green-500/30", icon: <Headphones className="h-3 w-3" /> };
  }

  /* ─── Médico: blocked conversation message ─── */
  const activeBlocked = active && isMedico && !isConvAllowed(active);
  const activeCanRespond = active && (isMedico ? canMedicoRespond(active) : canRespond);

  if (permLoading || !medicoCheckDone) return <div className="p-8 text-sm text-muted-foreground">Carregando permissões…</div>;

  return (
    <div className="space-y-4">
      <PageHeader
        title={isMedico ? "Inbox — Minhas Consultas" : "Inbox"}
        description={isMedico
          ? "Conversas vinculadas aos seus pacientes e atendimentos."
          : "Atendimento de pacientes e leads via WhatsApp."
        }
      />

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-220px)] min-h-[600px]">
        {/* COLUNA ESQUERDA — Lista */}
        <Card className="col-span-12 md:col-span-4 lg:col-span-3 flex flex-col overflow-hidden">
          <div className="border-b p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar paciente..." className="pl-8" />
            </div>
            {!isMedico && (
              <div className="grid grid-cols-3 gap-1">
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Status</SelectItem>
                    <SelectItem value="aberta">Aberta</SelectItem>
                    <SelectItem value="em_atendimento">Atendimento</SelectItem>
                    <SelectItem value="aguardando_paciente">Aguardando</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="fechada">Fechada</SelectItem>
                    <SelectItem value="resolvidas">Resolvidas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroResp} onValueChange={setFiltroResp}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Responsável</SelectItem>
                    <SelectItem value="minhas">Minhas</SelectItem>
                    <SelectItem value="nao_atribuidas">Sem dono</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Tipo</SelectItem>
                    <SelectItem value="suporte">Suporte</SelectItem>
                    <SelectItem value="bot">Bot</SelectItem>
                    <SelectItem value="ia">IA</SelectItem>
                    <SelectItem value="medico">Médico</SelectItem>
                    <SelectItem value="consulta_hoje">Consulta hoje</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroSla} onValueChange={setFiltroSla}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">SLA</SelectItem>
                    <SelectItem value="vencido">SLA vencido</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
                  <SelectTrigger className="h-7 text-[10px] col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Prioridade</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <ScrollArea className="flex-1">
            {loadingConvs ? (
              <div className="p-3 space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex items-start gap-2 px-1">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground space-y-2">
                <Phone className="mx-auto h-8 w-8 opacity-40" />
                <p>{isMedico
                  ? "Nenhuma conversa WhatsApp vinculada às suas consultas."
                  : convs.length === 0
                    ? "Nenhuma conversa WhatsApp ainda. Quando a integração estiver ativa, as conversas aparecerão aqui."
                    : "Nenhuma conversa encontrada com os filtros atuais."
                }</p>
              </div>
            ) : (
              filtered.map(c => {
                const badge = getAtendimentoBadge(c);
                const foraJanela = isMedico && !isConvAllowed(c);
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "w-full text-left border-b px-3 py-3 hover:bg-muted/50 transition-colors",
                      activeId === c.id && "bg-muted",
                      foraJanela && "opacity-50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">{(c.contact_name || c.contact_phone || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">{c.contact_name || c.contact_phone || "Sem nome"}</span>
                          {c.unread_count > 0 && !foraJanela && <Badge className="h-5 min-w-5 px-1.5 text-[10px]">{c.unread_count}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{c.last_message_preview || "—"}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className={cn("text-[9px] py-0 h-4 flex items-center gap-0.5", badge.color)}>
                            {badge.icon} {badge.label}
                          </Badge>
                          {foraJanela && (
                            <Badge variant="outline" className="text-[9px] py-0 h-4 flex items-center gap-0.5 bg-red-500/10 text-red-600 border-red-500/30">
                              <Lock className="h-2.5 w-2.5" /> Fora da janela
                            </Badge>
                          )}
                          {c.priority === "urgente" && <AlertCircle className="h-3 w-3 text-red-500" />}
                          {c.priority === "alta" && !c.resolved_at && (
                            <Badge variant="outline" className="text-[9px] py-0 h-4 bg-orange-500/10 text-orange-600 border-orange-500/30">alta</Badge>
                          )}
                          {!isMedico && <ConversationSlaBadge slaDueAt={c.sla_due_at} resolvedAt={c.resolved_at} compact />}
                          {!isMedico && c.assigned_to && (
                            <AttendantPresenceBadge userId={c.assigned_to} />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </ScrollArea>
        </Card>

        {/* CENTRO — Chat */}
        <Card className="col-span-12 md:col-span-8 lg:col-span-6 flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
              Selecione uma conversa
            </div>
          ) : activeBlocked ? (
            <div className="flex-1 grid place-items-center p-8">
              <div className="text-center space-y-3 max-w-md">
                <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="font-semibold text-lg">Acesso restrito</h3>
                <p className="text-sm text-muted-foreground">
                  Você não tem permissão para acessar esta conversa. O acesso médico é limitado aos
                  pacientes vinculados às suas consultas e dentro da janela configurada
                  ({janelaConfig.janela_pos_consulta_dias} dias pós-consulta).
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b p-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{active.contact_name || active.contact_phone}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {active.contact_phone || "sem número"}
                    </span>
                    <LockBadge
                      lockedBy={active.locked_by}
                      lockedAt={active.locked_at}
                      lockedByName={lockedByName}
                      isMe={active.locked_by === user?.id}
                    />
                    {!isMedico && active.assigned_to && (
                      <span className="flex items-center gap-1">
                        <AttendantPresenceBadge userId={active.assigned_to} showLabel />
                        <span className="font-medium">{assignedName || "—"}</span>
                      </span>
                    )}
                    {!isMedico && (
                      <ConversationSlaBadge slaDueAt={active.sla_due_at} resolvedAt={active.resolved_at} />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {!isMedico && canRespond && (
                    <>
                      <Button size="sm" variant="ghost" onClick={toggleBot} title={active.bot_active ? "Pausar bot" : "Ativar bot"}>
                        {active.bot_active ? <Pause className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={toggleAI} title={active.ai_active ? "Pausar IA" : "Ativar IA"}>
                        <Sparkles className={cn("h-4 w-4", active.ai_active && "text-purple-500")} />
                      </Button>
                    </>
                  )}
                  {/* Lock-aware Assumir / Liberar */}
                  {canAssume && !isMedico && (
                    active.locked_by === null ? (
                      <Button size="sm" variant="outline" onClick={assumir}>
                        <UserCheck className="h-4 w-4 mr-1" />Assumir
                      </Button>
                    ) : active.locked_by === user?.id ? (
                      <Button size="sm" variant="outline" onClick={liberar}>
                        <Lock className="h-4 w-4 mr-1" />Liberar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={liberar}
                        title="Forçar liberação (admin)"
                        className="text-amber-700 border-amber-500/40"
                      >
                        <Lock className="h-4 w-4 mr-1" />Forçar liberar
                      </Button>
                    )
                  )}
                  {canTransfer && !isMedico && (
                    <Button size="sm" variant="outline" onClick={() => setTransferirOpen(true)}>
                      <ArrowRightLeft className="h-4 w-4 mr-1" />Transferir
                    </Button>
                  )}
                  {!isMedico && perms["comunicacao.inbox.resolver"] && !active.resolved_at && (
                    <Button size="sm" variant="outline" onClick={resolver} className="text-emerald-700 border-emerald-500/40">
                      <CheckCircle2 className="h-4 w-4 mr-1" />Resolver
                    </Button>
                  )}
                  {canClose && (
                    <Button size="sm" variant="outline" onClick={fechar}><X className="h-4 w-4 mr-1" />Finalizar</Button>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
                {loadingMsgs && <div className="text-center text-xs text-muted-foreground">Carregando...</div>}
                <div className="space-y-3">
                  {msgs.map(m => {
                    const isExt = m.sender_type === "paciente" || m.sender_type === "lead";
                    const isBot = m.sender_type === "bot" || m.sender_type === "ia";
                    const isSelf = isMedico
                      ? m.sender_type === "medico"
                      : !isExt && !isBot;
                    return (
                      <div key={m.id} className={cn("flex", isExt ? "justify-start" : "justify-end")}>
                        <div className={cn(
                          "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                          isExt ? "bg-muted" : isBot ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900" : "bg-primary text-primary-foreground"
                        )}>
                          {isBot && <div className="text-[10px] font-semibold mb-0.5 flex items-center gap-1">{m.sender_type === "ia" ? <Sparkles className="h-3 w-3" /> : <Bot className="h-3 w-3" />}{m.sender_name || m.sender_type}</div>}
                          {!isBot && !isExt && <div className="text-[10px] opacity-70 mb-0.5">{m.sender_name}</div>}
                          <div className="whitespace-pre-wrap">{m.body}</div>
                          <div className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <TypingIndicator conversationId={active.id} currentUserId={user?.id} />

              {activeCanRespond && (
                <div className="border-t p-3 space-y-2">
                  {active.channel === "whatsapp" && janelaExpirada && (
                    <JanelaExpiradaBanner onUseTemplate={() => setTemplateDialogOpen(true)} />
                  )}
                  {!isMedico && templates.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {templates.slice(0, 5).map(t => (
                        <Button key={t.id} size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => aplicarTemplate(t)}>
                          <FileEdit className="h-3 w-3 mr-1" />{t.name}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      placeholder={isMedico ? "Enviar mensagem ao paciente..." : "Digite sua mensagem..."}
                      className="min-h-[60px] resize-none"
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                    />
                    <Button onClick={enviar} disabled={!draft.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {isMedico && !activeCanRespond && !activeBlocked && (
                <div className="border-t p-3 text-center text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 inline mr-1" />
                  Envio de mensagens desabilitado pela configuração da plataforma.
                </div>
              )}
            </>
          )}
        </Card>

        {/* COLUNA DIREITA — Detalhes */}
        <Card className="hidden lg:flex col-span-3 flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 grid place-items-center text-xs text-muted-foreground">—</div>
          ) : activeBlocked ? (
            <div className="flex-1 grid place-items-center text-xs text-muted-foreground p-4">
              Sem acesso aos detalhes desta conversa.
            </div>
          ) : (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-5">
                {/* Contato */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Contato</h4>
                  <p className="text-sm font-medium">{active.contact_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">{active.contact_phone}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {active.lead_id && <Badge variant="secondary" className="text-[10px]">Lead</Badge>}
                    {active.patient_id && <Badge variant="default" className="text-[10px]">Paciente</Badge>}
                    {active.bot_active && (
                      <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-600">
                        <Bot className="h-2.5 w-2.5 mr-0.5" /> Bot
                      </Badge>
                    )}
                    {active.ai_active && (
                      <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-600">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" /> IA
                      </Badge>
                    )}
                    {active.locked_by && (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600">
                        <UserCheck className="h-2.5 w-2.5 mr-0.5" /> Humano
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Janela 24h Meta */}
                <Janela24hMeta conversationId={active.id} />

                {/* Status do atendimento */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Atendimento</h4>
                  <div className="text-xs space-y-2">
                    {!isMedico ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground w-20">Status:</span>
                        <StatusOperacionalSelect
                          conversationId={active.id}
                          status={active.status}
                          disabled={!perms["comunicacao.responder"]}
                          onChanged={loadConvs}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground w-20">Status:</span>
                        <Badge variant="outline" className={cn("text-[10px]", STATUS_LABEL[active.status]?.color)}>
                          {STATUS_LABEL[active.status]?.icon} {STATUS_LABEL[active.status]?.label || active.status}
                        </Badge>
                      </div>
                    )}
                    {!isMedico && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground w-20">Responsável:</span>
                        {active.assigned_to ? (
                          <span className="font-medium flex items-center gap-1.5">
                            <AttendantPresenceBadge userId={active.assigned_to} />
                            {assignedName || "—"}
                          </span>
                        ) : (
                          canAssume ? (
                            <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={assumir}>
                              <UserCheck className="h-3 w-3 mr-1" /> Assumir conversa
                            </Button>
                          ) : <span className="text-muted-foreground">Ninguém</span>
                        )}
                      </div>
                    )}
                    {active.locked_by && lockedByName && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground w-20">Atendendo:</span>
                        <span className="font-medium">{lockedByName}</span>
                      </div>
                    )}
                    {!isMedico && active.assigned_sector && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground w-20">Setor:</span>
                        <span>{active.assigned_sector}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Operação (Fase 5) */}
                {!isMedico && (
                  <ConversationQueuePanel
                    conversation={{
                      id: active.id,
                      department_id: active.department_id,
                      queue_id: active.queue_id,
                      priority: active.priority,
                      sla_due_at: active.sla_due_at,
                      resolved_at: active.resolved_at,
                    }}
                    onChanged={loadConvs}
                  />
                )}

                {!isMedico && perms["comunicacao.inbox.resolver"] && !active.resolved_at && (
                  <Button size="sm" variant="outline" className="w-full text-emerald-700 border-emerald-500/40" onClick={resolver}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Resolver conversa
                  </Button>
                )}

                {/* Pacientes vinculados (LGPD) */}
                {!isMedico && (
                  <PacientesVinculadosPanel
                    conversationId={active.id}
                    contactPhone={active.contact_phone}
                    pacienteAtivoId={active.paciente_ativo_id}
                    canResponder={!!perms["comunicacao.responder"]}
                    onChange={setVinculosPaciente}
                  />
                )}

                {/* LGPD gate — esconde dados clínicos sem confirmação */}
                {!isMedico && (() => {
                  const hasConfirmed = vinculosPaciente.some(v => v.confirmado_em !== null);
                  const hasAny = vinculosPaciente.length > 0;
                  return (
                    <LGPDGate hasConfirmedLink={hasConfirmed} hasAnyLink={hasAny}>
                      <div className="space-y-5">
                        {consultaInfo && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> Consulta Vinculada
                            </h4>
                            <div className="text-xs space-y-1">
                              <div>Início: {new Date(consultaInfo.inicio).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</div>
                              <div>Status: <Badge variant="outline" className="text-[10px]">{consultaInfo.status}</Badge></div>
                            </div>
                          </div>
                        )}
                        {(active.medico_id || medicoName) && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                              <Stethoscope className="h-3 w-3" /> Médico Vinculado
                            </h4>
                            <p className="text-sm font-medium">{medicoName || "Carregando…"}</p>
                          </div>
                        )}
                      </div>
                    </LGPDGate>
                  );
                })()}

                {/* Médico vinculado (modo médico — sempre visível) */}
                {isMedico && medicoName && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                      <Stethoscope className="h-3 w-3" /> Médico Vinculado
                    </h4>
                    <p className="text-sm font-medium">{medicoName}</p>
                  </div>
                )}

                {/* Audit log */}
                {!isMedico && (
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs"
                      onClick={() => setAuditOpen(true)}
                    >
                      <FileText className="h-3 w-3 mr-1" /> Ver audit log
                    </Button>
                  </div>
                )}

                {/* Origem (only for non-medico) */}
                {!isMedico && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Origem</h4>
                    <div className="text-xs space-y-1">
                      <div>Canal: <Badge variant="outline" className="text-[10px]">{active.channel}</Badge></div>
                      <div>Origem: <Badge variant="outline" className="text-[10px]">{active.origin}</Badge></div>
                      {active.intent && <div>Intenção: <Badge variant="outline" className="text-[10px]">{active.intent}</Badge></div>}
                    </div>
                  </div>
                )}

                {/* Ações rápidas (non-medico only) */}
                {!isMedico && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Ações rápidas</h4>
                    <div className="space-y-1">
                      <Button variant="outline" size="sm" className="w-full justify-start text-xs" disabled={!active.patient_id}>
                        <Calendar className="h-3 w-3 mr-2" /> Criar agendamento
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start text-xs" disabled>
                        <CreditCard className="h-3 w-3 mr-2" /> Enviar cobrança
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start text-xs" disabled>
                        <FileText className="h-3 w-3 mr-2" /> Documentos
                      </Button>
                      {canTransfer && (
                        <Button variant="outline" size="sm" className="w-full justify-start text-xs" disabled>
                          <ArrowRightLeft className="h-3 w-3 mr-2" /> Transferir setor
                        </Button>
                      )}
                      {perms["comunicacao.ver_todas"] && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => setAcessoDialog(true)}
                        >
                          <Shield className="h-3 w-3 mr-2" /> Acesso temporário médico
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Janela temporal info (medico only) */}
                {isMedico && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Janela de Acesso
                    </h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Acesso: 10 min antes até {janelaConfig.janela_pos_consulta_dias} dias após a consulta.</p>
                      <p>Envio de mensagens: {janelaConfig.medico_iniciar_pos_consulta ? "Habilitado" : "Desabilitado"}</p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {active.tags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {active.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>

      {/* Dialog — Acesso temporário para médico (admin/colaborador only) */}
      {!isMedico && (
        <Dialog open={acessoDialog} onOpenChange={setAcessoDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conceder Acesso Temporário a Médico</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>ID do Médico</Label>
                <Input value={acessoMedicoId} onChange={e => setAcessoMedicoId(e.target.value)} placeholder="UUID do médico" />
              </div>
              <div>
                <Label>Motivo (obrigatório)</Label>
                <Textarea value={acessoMotivo} onChange={e => setAcessoMotivo(e.target.value)}
                  placeholder="Ex.: Correção de receita, envio de documento..." rows={3} />
              </div>
              <div>
                <Label>Duração (horas)</Label>
                <Input type="number" value={acessoHoras} onChange={e => setAcessoHoras(Number(e.target.value))} min={1} max={168} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAcessoDialog(false)}>Cancelar</Button>
              <Button onClick={concederAcessoTemporario} disabled={acessoLoading || !acessoMotivo.trim() || !acessoMedicoId}>
                {acessoLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Conceder Acesso
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog — Transferir conversa */}
      {active && (
        <TransferirConversaDialog
          open={transferirOpen}
          onOpenChange={setTransferirOpen}
          conversationId={active.id}
          onTransferred={loadConvs}
        />
      )}

      {/* Drawer — Audit log */}
      <AuditLogDrawer
        open={auditOpen}
        onOpenChange={setAuditOpen}
        conversationId={active?.id ?? null}
      />

      {/* Modal — Enviar template oficial Meta (Fase 4) */}
      <EnviarTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        conversationId={active?.id}
        defaultTo={active?.contact_phone || ""}
        onSent={() => { setDraft(""); setJanelaExpirada(false); }}
      />
    </div>
  );
}
