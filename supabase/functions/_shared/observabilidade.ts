// Helper compartilhado Fase 8: observabilidade + gates de produção (fail-closed)
// Reutilizável por whatsapp-enviar, whatsapp-webhook, ai-assistant, ai-avatar-reply,
// meta-health-check, meta-template-sync, observabilidade-ingest/export.

export type Severity = "info" | "warn" | "error" | "critical";

export interface LogEventoInput {
  modulo: string;
  evento: string;
  severity?: Severity;
  conversation_id?: string | null;
  user_id?: string | null;
  metadata?: Record<string, unknown>;
}

// best-effort: nunca lança, nunca quebra fluxo principal
export async function logEvento(admin: any, input: LogEventoInput): Promise<void> {
  try {
    await admin.from("observabilidade_eventos").insert({
      modulo: input.modulo,
      evento: input.evento,
      severity: input.severity ?? "info",
      conversation_id: input.conversation_id ?? null,
      user_id: input.user_id ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (e) {
    console.warn("[observabilidade.logEvento] falhou:", (e as Error).message);
  }
}

export async function getAppSetting<T = unknown>(
  admin: any,
  key: string,
  fallback: T,
): Promise<T> {
  try {
    const { data } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (!data) return fallback;
    const v = (data as any).value;
    // app_settings.value é jsonb; extrai escalar quando aplicável
    if (v && typeof v === "object" && "value" in v) return (v as any).value as T;
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export async function getWhatsappModo(
  admin: any,
): Promise<"sandbox" | "staging" | "producao"> {
  const v = await getAppSetting<string>(admin, "whatsapp.modo", "sandbox");
  return (v === "producao" || v === "staging" ? v : "sandbox") as
    | "sandbox"
    | "staging"
    | "producao";
}

export interface WabaHealth {
  status: string; // ok | error | pending_credentials | unknown
  last_check_at?: string;
  quality_rating?: string | null;
  raw?: any;
}

export async function getWabaHealth(admin: any): Promise<WabaHealth> {
  try {
    const { data } = await admin
      .from("meta_waba_health")
      .select("status,last_check_at,quality_rating,raw")
      .order("last_check_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return { status: "pending_credentials" };
    return data as WabaHealth;
  } catch {
    return { status: "unknown" };
  }
}

export interface CanSendRealResult {
  ok: boolean;
  reason?: string;
  modo: "sandbox" | "staging" | "producao";
  health: string;
}

// Gate fail-closed: só libera envio real se modo=producao + health.ok + secrets META presentes
export async function canSendReal(admin: any): Promise<CanSendRealResult> {
  const modo = await getWhatsappModo(admin);
  const health = await getWabaHealth(admin);
  const hasToken = !!Deno.env.get("META_WHATSAPP_TOKEN");
  const hasPhone = !!Deno.env.get("META_PHONE_NUMBER_ID");

  if (modo !== "producao") {
    return { ok: false, reason: `modo=${modo}`, modo, health: health.status };
  }
  if (health.status !== "ok") {
    return { ok: false, reason: `waba_health=${health.status}`, modo, health: health.status };
  }
  if (!hasToken || !hasPhone) {
    return { ok: false, reason: "secrets_meta_ausentes", modo, health: health.status };
  }
  return { ok: true, modo, health: health.status };
}
