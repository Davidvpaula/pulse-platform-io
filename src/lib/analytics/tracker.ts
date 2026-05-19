/**
 * Tracker de Analytics — captura page_view, UTMs, dispositivo e eventos do funil.
 * Sessão persistida em sessionStorage (expira ao fechar a aba) + UTMs em localStorage
 * (mantém atribuição entre visitas até nova UTM chegar).
 */
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "nova-saude_session_token";
const UTM_KEY = "nova-saude_utm_attr";
const SESSION_META_KEY = "nova-saude_session_meta";

interface UtmAttr {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  origem?: string;
  referrer?: string;
  capturedAt?: string;
}

interface SessionMeta {
  token: string;
  startedAt: number;
  paginas: number;
}

function getDispositivo(): string {
  if (typeof navigator === "undefined") return "desconhecido";
  const ua = navigator.userAgent;
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  return "desktop";
}

function inferOrigem(referrer: string, utm?: UtmAttr): string {
  if (utm?.utm_source) {
    if (utm.utm_medium === "cpc" || utm.utm_medium === "ads" || utm.utm_source.includes("ads"))
      return utm.utm_source.includes("google") ? "google_ads" : "ads";
    return utm.utm_source.toLowerCase();
  }
  if (!referrer) return "direto";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("google")) return "organico";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
    if (host.includes("whatsapp") || host.includes("wa.me")) return "whatsapp";
    if (host.includes("bing")) return "organico";
    return "referral";
  } catch {
    return "direto";
  }
}

function captureUtmFromUrl(): UtmAttr | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const has =
    params.has("utm_source") ||
    params.has("utm_medium") ||
    params.has("utm_campaign");
  if (!has) return null;
  const attr: UtmAttr = {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    utm_term: params.get("utm_term") || undefined,
    utm_content: params.get("utm_content") || undefined,
    referrer: document.referrer || undefined,
    capturedAt: new Date().toISOString(),
  };
  attr.origem = inferOrigem(document.referrer || "", attr);
  try {
    localStorage.setItem(UTM_KEY, JSON.stringify(attr));
  } catch {}
  return attr;
}

function getStoredUtm(): UtmAttr | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(UTM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getSessionMeta(): SessionMeta | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSessionMeta(m: SessionMeta) {
  try {
    sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(m));
    sessionStorage.setItem(SESSION_KEY, m.token);
  } catch {}
}

let initialized = false;
let currentSessionToken = "";
let lastRoute = "";

async function ensureSession(rota: string): Promise<string> {
  if (typeof window === "undefined") return "";

  // tenta reaproveitar
  let meta = getSessionMeta();
  // reset se sessão > 30min ociosa (heuristica, sessionStorage já trata fechar aba)
  if (meta && Date.now() - meta.startedAt > 1000 * 60 * 60 * 4) meta = null;

  if (meta) {
    currentSessionToken = meta.token;
    return meta.token;
  }

  // nova sessão
  const token = crypto.randomUUID();
  const utmFresh = captureUtmFromUrl();
  const utmStored = utmFresh || getStoredUtm();
  const referrer = document.referrer || "";
  const origem = inferOrigem(referrer, utmStored || undefined);
  const dispositivo = getDispositivo();

  const { data: auth } = await supabase.auth.getUser();

  await supabase.from("analytics_sessions").insert({
    session_token: token,
    user_id: auth.user?.id ?? null,
    inicio: new Date().toISOString(),
    origem,
    referrer: referrer || null,
    utm_source: utmStored?.utm_source ?? null,
    utm_medium: utmStored?.utm_medium ?? null,
    utm_campaign: utmStored?.utm_campaign ?? null,
    utm_term: utmStored?.utm_term ?? null,
    utm_content: utmStored?.utm_content ?? null,
    dispositivo,
    user_agent: navigator.userAgent,
    primeira_rota: rota,
    ultima_rota: rota,
    paginas_vistas: 0,
  });

  currentSessionToken = token;
  setSessionMeta({ token, startedAt: Date.now(), paginas: 0 });
  return token;
}

export async function trackPageView(rota: string) {
  if (typeof window === "undefined") return;
  if (rota === lastRoute) return; // evita duplicar mesmo route
  const rota_anterior = lastRoute;
  lastRoute = rota;

  const token = await ensureSession(rota);
  const utm = getStoredUtm();
  const origem = inferOrigem(document.referrer || "", utm || undefined);
  const dispositivo = getDispositivo();
  const { data: auth } = await supabase.auth.getUser();

  await supabase.from("analytics_events").insert({
    session_token: token,
    user_id: auth.user?.id ?? null,
    tipo: "page_view",
    rota,
    rota_anterior: rota_anterior || null,
    origem,
    dispositivo,
  });

  // incrementa paginas_vistas e ultima_rota
  const meta = getSessionMeta();
  if (meta) {
    meta.paginas += 1;
    setSessionMeta(meta);
  }
  await supabase
    .from("analytics_sessions")
    .update({ paginas_vistas: meta?.paginas ?? 1, ultima_rota: rota, fim: new Date().toISOString() })
    .eq("session_token", token);
}

export async function trackEvent(
  tipo: "click" | "inicio_agendamento" | "agendamento_concluido" | "pagamento_confirmado" | string,
  detalhes?: Record<string, any>,
) {
  if (typeof window === "undefined") return;
  const token = await ensureSession(window.location.pathname);
  const utm = getStoredUtm();
  const { data: auth } = await supabase.auth.getUser();

  await supabase.from("analytics_events").insert({
    session_token: token,
    user_id: auth.user?.id ?? null,
    tipo,
    rota: window.location.pathname,
    origem: inferOrigem(document.referrer || "", utm || undefined),
    dispositivo: getDispositivo(),
    detalhes: detalhes ?? null,
  });
}

export async function trackConversion(params: {
  tipo: "agendamento" | "pagamento";
  valor?: number;
  consulta_id?: string;
  pagamento_id?: string;
  servico?: string;
  medico_id?: string;
  empresa_id?: string;
}) {
  if (typeof window === "undefined") return;
  const token = await ensureSession(window.location.pathname);
  const utm = getStoredUtm();
  const { data: auth } = await supabase.auth.getUser();
  const origem = inferOrigem(document.referrer || "", utm || undefined);

  await supabase.from("analytics_conversions").insert({
    session_token: token,
    user_id: auth.user?.id ?? null,
    tipo: params.tipo,
    valor: params.valor ?? null,
    consulta_id: params.consulta_id ?? null,
    pagamento_id: params.pagamento_id ?? null,
    origem,
    utm_source: utm?.utm_source ?? null,
    utm_medium: utm?.utm_medium ?? null,
    utm_campaign: utm?.utm_campaign ?? null,
    servico: params.servico ?? null,
    medico_id: params.medico_id ?? null,
    empresa_id: params.empresa_id ?? null,
  });

  // marca a sessão como convertida
  if (token) {
    await supabase.from("analytics_sessions").update({ converteu: true }).eq("session_token", token);
  }

  // dispara evento também
  await trackEvent(
    params.tipo === "pagamento" ? "pagamento_confirmado" : "agendamento_concluido",
    { valor: params.valor, servico: params.servico, medico_id: params.medico_id },
  );
}

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  // captura UTM já no boot
  captureUtmFromUrl();
  currentSessionToken = sessionStorage.getItem(SESSION_KEY) || "";
}
