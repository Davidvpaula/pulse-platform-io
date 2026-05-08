import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Pause, ShieldOff, ShieldCheck, UserCheck, Brain, AlertTriangle, Loader2, Activity } from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/lib/permissions/usePermission";

type Props = {
  conversationId: string;
  onChanged?: () => void;
  onOpenMemory?: () => void;
};

type Settings = {
  active: boolean;
  avatar_modo: "assistido" | "semi_autonomo" | "autonomo_controlado";
  avatar_kill_switch: boolean;
  avatar_cooldown_segundos: number;
  avatar_confianca_minima: string;
};

type Conv = {
  id: string;
  ai_active: boolean;
  ai_avatar_blocked: boolean;
  ai_avatar_blocked_motivo: string | null;
  ai_avatar_paused_until: string | null;
  ai_avatar_consecutive_replies: number;
  ai_avatar_last_reply_at: string | null;
  assigned_to: string | null;
};

type LastLog = {
  confianca: string | null;
  risco: string | null;
  motivo: string | null;
  handoff_motivo: string | null;
  auto_reply: boolean;
  created_at: string;
};

const MODO_LABEL: Record<string, { label: string; color: string }> = {
  assistido: { label: "Assistido", color: "bg-muted text-muted-foreground" },
  semi_autonomo: { label: "Semi-autônomo", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  autonomo_controlado: { label: "Autônomo controlado", color: "bg-violet-500/10 text-violet-600 border-violet-500/30" },
};

const RISCO_COLOR: Record<string, string> = {
  nenhum: "bg-muted text-muted-foreground",
  baixo: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  medio: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  alto: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  critico: "bg-red-500/10 text-red-600 border-red-500/30",
};

export function ConversationAvatarPanel({ conversationId, onChanged, onOpenMemory }: Props) {
  const { allowed: perms } = usePermission(["ia.avatar.usar", "ia.avatar.supervisionar", "ia.avatar.desligar", "ia.avatar.memoria"]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [conv, setConv] = useState<Conv | null>(null);
  const [lastLog, setLastLog] = useState<LastLog | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s, c, l] = await Promise.all([
      supabase.from("ai_settings").select("active,avatar_modo,avatar_kill_switch,avatar_cooldown_segundos,avatar_confianca_minima").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("conversations").select("id,ai_active,ai_avatar_blocked,ai_avatar_blocked_motivo,ai_avatar_paused_until,ai_avatar_consecutive_replies,ai_avatar_last_reply_at,assigned_to").eq("id", conversationId).maybeSingle(),
      supabase.from("ai_logs").select("confianca,risco,motivo,handoff_motivo,auto_reply,created_at").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setSettings((s.data as any) ?? null);
    setConv((c.data as any) ?? null);
    setLastLog((l.data as any) ?? null);
  }, [conversationId]);

  useEffect(() => { load(); }, [load]);

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel(`avatar-conv-${conversationId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${conversationId}` }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_logs", filter: `conversation_id=eq.${conversationId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, load]);

  const canSupervise = !!perms["ia.avatar.supervisionar"] || !!perms["ia.avatar.usar"] || !!perms["ia.avatar.desligar"];
  if (!canSupervise) return null;
  if (!settings) return null;

  const pausedActive = !!conv?.ai_avatar_paused_until && new Date(conv.ai_avatar_paused_until) > new Date();
  const blocked = !!conv?.ai_avatar_blocked;
  const humano = !!conv?.assigned_to;
  const cooldownLeft = (() => {
    if (!conv?.ai_avatar_last_reply_at) return 0;
    const next = new Date(conv.ai_avatar_last_reply_at).getTime() + (settings.avatar_cooldown_segundos * 1000);
    return Math.max(0, Math.round((next - Date.now()) / 1000));
  })();

  // Decide overall status
  let statusLabel = "IA pronta";
  let statusColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
  let statusIcon: any = ShieldCheck;
  if (settings.avatar_kill_switch) { statusLabel = "Kill-switch global"; statusColor = "bg-red-500/10 text-red-600 border-red-500/30"; statusIcon = ShieldOff; }
  else if (!settings.active) { statusLabel = "IA desativada"; statusColor = "bg-muted text-muted-foreground"; statusIcon = ShieldOff; }
  else if (settings.avatar_modo === "assistido") { statusLabel = "Modo assistido (sem auto-resposta)"; statusColor = "bg-muted text-muted-foreground"; statusIcon = Bot; }
  else if (blocked) { statusLabel = "Bloqueada nesta conversa"; statusColor = "bg-orange-500/10 text-orange-600 border-orange-500/30"; statusIcon = ShieldOff; }
  else if (humano) { statusLabel = "Humano assumiu"; statusColor = "bg-blue-500/10 text-blue-600 border-blue-500/30"; statusIcon = UserCheck; }
  else if (pausedActive) { statusLabel = "Pausada"; statusColor = "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"; statusIcon = Pause; }

  async function pausar(min: number) {
    setBusy(true);
    const { error } = await supabase.rpc("ai_avatar_pausar_conversa", { _conversation_id: conversationId, _minutos: min, _motivo: "pausa manual" } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`IA pausada por ${min} min`);
    onChanged?.();
    load();
  }

  async function bloquear() {
    setBusy(true);
    const { error } = await supabase.from("conversations").update({
      ai_avatar_blocked: true,
      ai_avatar_blocked_motivo: "bloqueado manualmente",
      ai_avatar_blocked_at: new Date().toISOString(),
      ai_active: false,
    } as any).eq("id", conversationId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("IA bloqueada nesta conversa");
    onChanged?.();
    load();
  }

  async function desbloquear() {
    setBusy(true);
    const { error } = await supabase.from("conversations").update({
      ai_avatar_blocked: false,
      ai_avatar_blocked_motivo: null,
      ai_avatar_paused_until: null,
      ai_active: true,
    } as any).eq("id", conversationId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("IA reativada nesta conversa");
    onChanged?.();
    load();
  }

  async function assumir() {
    setBusy(true);
    const { error } = await supabase.rpc("ai_avatar_assumir_conversa", { _conversation_id: conversationId } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Você assumiu a conversa. IA bloqueada.");
    onChanged?.();
    load();
  }

  const StatusIcon = statusIcon;

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
          <Bot className="h-3 w-3" /> IA Avatar
        </div>
        <Badge variant="outline" className={`text-[10px] ${MODO_LABEL[settings.avatar_modo].color}`}>
          {MODO_LABEL[settings.avatar_modo].label}
        </Badge>
      </div>

      <div className={`flex items-center gap-2 rounded-md border p-2 text-xs ${statusColor}`}>
        <StatusIcon className="h-3.5 w-3.5" />
        <span className="font-medium">{statusLabel}</span>
      </div>

      {(blocked || pausedActive) && conv?.ai_avatar_blocked_motivo && (
        <div className="text-[11px] text-muted-foreground italic">Motivo: {conv.ai_avatar_blocked_motivo}</div>
      )}
      {pausedActive && (
        <div className="text-[11px] text-muted-foreground">Pausa até {new Date(conv!.ai_avatar_paused_until!).toLocaleTimeString("pt-BR")}</div>
      )}
      {cooldownLeft > 0 && !blocked && !pausedActive && (
        <div className="text-[11px] text-muted-foreground">Cooldown: {cooldownLeft}s</div>
      )}
      {(conv?.ai_avatar_consecutive_replies ?? 0) > 0 && (
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Activity className="h-3 w-3" /> Respostas seguidas: {conv?.ai_avatar_consecutive_replies}
        </div>
      )}

      {lastLog && (
        <div className="rounded border bg-muted/30 p-2 space-y-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Última análise</span>
            <span className="text-muted-foreground">{new Date(lastLog.created_at).toLocaleTimeString("pt-BR")}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {lastLog.confianca && <Badge variant="outline" className="text-[10px]">conf: {lastLog.confianca}</Badge>}
            {lastLog.risco && <Badge variant="outline" className={`text-[10px] ${RISCO_COLOR[lastLog.risco] ?? ""}`}>risco: {lastLog.risco}</Badge>}
            {lastLog.handoff_motivo && (
              <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30">
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> {lastLog.handoff_motivo}
              </Badge>
            )}
            {lastLog.auto_reply && <Badge variant="outline" className="text-[10px]">auto-respondeu</Badge>}
          </div>
          {lastLog.motivo && !lastLog.auto_reply && (
            <div className="text-muted-foreground">Não respondeu: {lastLog.motivo}</div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1">
        {!humano && (
          <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy} onClick={assumir}>
            <UserCheck className="h-3 w-3 mr-1" /> Assumir
          </Button>
        )}
        {!blocked && (
          <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy} onClick={() => pausar(30)}>
            {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Pause className="h-3 w-3 mr-1" />} Pausar 30m
          </Button>
        )}
        {!blocked ? (
          <Button size="sm" variant="outline" className="h-7 text-[11px] text-destructive" disabled={busy} onClick={bloquear}>
            <ShieldOff className="h-3 w-3 mr-1" /> Bloquear IA
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy} onClick={desbloquear}>
            <ShieldCheck className="h-3 w-3 mr-1" /> Reativar IA
          </Button>
        )}
        {onOpenMemory && perms["ia.avatar.memoria"] && (
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onOpenMemory}>
            <Brain className="h-3 w-3 mr-1" /> Memória
          </Button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground italic">
        Avatar opera com supervisão. Modo padrão é assistido e nunca responde sem validação.
      </p>
    </Card>
  );
}
