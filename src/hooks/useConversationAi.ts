import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AIAction =
  | "summarize"
  | "suggest_reply"
  | "classify_intent"
  | "detect_urgency"
  | "detect_risk"
  | "suggest_department";

type SummaryRow = { id: string; summary: string; summary_type: string; created_at: string; last_message_id?: string | null };
type IntentRow = { id: string; detected_intent: string; suggested_department: string | null; suggested_priority: string | null; confidence: number | null; created_at: string };
type RiskRow = { id: string; risk_level: string; score: number | null; signals: any; requires_supervisor: boolean; notes: string | null; created_at: string };

export function useConversationAi(conversationId: string | null | undefined) {
  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [intent, setIntent] = useState<IntentRow | null>(null);
  const [risk, setRisk] = useState<RiskRow | null>(null);
  const [loadingAction, setLoadingAction] = useState<AIAction | null>(null);
  const [enabled, setEnabled] = useState<boolean>(false);

  // Settings — só verifica se IA está ligada
  useEffect(() => {
    let alive = true;
    supabase
      .from("ai_assistant_settings")
      .select("enabled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (alive) setEnabled(!!data?.enabled); });
    return () => { alive = false; };
  }, []);

  // Carrega cache + realtime
  useEffect(() => {
    if (!conversationId) { setSummary(null); setIntent(null); setRisk(null); return; }
    let alive = true;
    const load = async () => {
      const [s, i, r] = await Promise.all([
        supabase.from("conversation_ai_summaries").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("conversation_ai_intents").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("conversation_ai_risk_analysis").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!alive) return;
      setSummary((s.data as any) ?? null);
      setIntent((i.data as any) ?? null);
      setRisk((r.data as any) ?? null);
    };
    load();
    const ch = supabase
      .channel(`ai-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_ai_summaries", filter: `conversation_id=eq.${conversationId}` }, (p: any) => setSummary(p.new))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_ai_intents", filter: `conversation_id=eq.${conversationId}` }, (p: any) => setIntent(p.new))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_ai_risk_analysis", filter: `conversation_id=eq.${conversationId}` }, (p: any) => setRisk(p.new))
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [conversationId]);

  const lastCallRef = useState<Record<string, number>>({})[0];

  const run = useCallback(async <T = any>(action: AIAction, options?: Record<string, unknown>): Promise<T | null> => {
    if (!conversationId) return null;
    const key = `${conversationId}:${action}`;
    const now = Date.now();
    if (lastCallRef[key] && now - lastCallRef[key] < 10_000) {
      toast.info("Aguarde alguns segundos antes de gerar novamente.");
      return null;
    }
    lastCallRef[key] = now;
    setLoadingAction(action);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { action, conversation_id: conversationId, ...(options ?? {}) },
      });
      if (error) {
        toast.error(`IA: ${error.message}`);
        return null;
      }
      if ((data as any)?.error) {
        const e = (data as any).error;
        if (e === "ai_disabled") toast.error("IA assistiva está desativada.");
        else if (e === "daily_budget_exceeded") toast.error("Orçamento diário de IA esgotado.");
        else if (e === "missing_permission") toast.error("Sem permissão para usar IA.");
        else toast.error(`IA: ${e}`);
        return null;
      }
      return data as T;
    } finally {
      setLoadingAction(null);
    }
  }, [conversationId, lastCallRef]);

  const markAccepted = useCallback(async (auditId: string, accepted: boolean) => {
    if (!auditId) return;
    await supabase.from("ai_audit_logs").update({ accepted_by_user: accepted }).eq("id", auditId);
  }, []);

  return { enabled, summary, intent, risk, loadingAction, run, markAccepted };
}
