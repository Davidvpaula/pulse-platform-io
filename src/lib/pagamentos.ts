import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { LOCAL_BACKEND } from "@/lib/local-backend";

export type Pagamento = Database["public"]["Tables"]["pagamentos"]["Row"];
export type PagamentoStatus = Database["public"]["Enums"]["pagamento_status"];
export type PagamentoMetodo = Database["public"]["Enums"]["pagamento_metodo"];
export type PagamentoProvider = Database["public"]["Enums"]["pagamento_provider"];

export interface CriarCheckoutInput {
  /** Se houver consulta pré-existente (fluxo legado), informar aqui */
  consultaId?: string;
  valorCentavos: number;
  metodo?: PagamentoMetodo;
  descricao?: string;
  /** Metadata da reserva unificada — usada para criar consulta pós-pagamento */
  reserva?: {
    slot_id: string;
    tipo: string;
    referencia_id: string;
    motivo?: string | null;
    paciente_id: string;
    medico_id: string;
    /** When set, the consultation is for a dependente (not the titular). */
    paciente_atendido_id?: string | null;
  };
  /** Snapshot financeiro imutável — congelado no momento do checkout */
  snapshot?: {
    valor_bruto_centavos: number;
    referencia_nome: string;
    medico_nome: string;
    duracao_minutos: number;
    inicio: string;
    fim: string;
    modalidade: string;
  };
}

export interface CheckoutSession {
  pagamentoId: string;
  checkoutUrl: string;
  simulated: boolean;
  provider: PagamentoProvider;
  /** True quando a URL deve ser aberta com window.location (Stripe hosted). */
  external?: boolean;
  /** Stripe Embedded Checkout client secret (quando provider=stripe e modo embedded). */
  clientSecret?: string;
}

const STRIPE_CS_KEY = (pagamentoId: string) => `stripe_cs_${pagamentoId}`;

/** Helper que abre o checkout — interno usa router; externo (Stripe hosted) usa redirect. */
export function abrirCheckout(session: CheckoutSession, navigate: (url: string) => void) {
  // Para Stripe Embedded, guardar clientSecret em sessionStorage para a tela de checkout consumir
  if (session.clientSecret) {
    try {
      sessionStorage.setItem(
        STRIPE_CS_KEY(session.pagamentoId),
        JSON.stringify({ cs: session.clientSecret, ts: Date.now() }),
      );
    } catch (_) { /* noop */ }
  }
  if (session.external) {
    window.location.href = session.checkoutUrl;
  } else {
    navigate(session.checkoutUrl);
  }
}

/** Lê o clientSecret guardado pelo `abrirCheckout` (TTL 30 min). */
export function lerStripeClientSecret(pagamentoId: string): string | null {
  try {
    const raw = sessionStorage.getItem(STRIPE_CS_KEY(pagamentoId));
    if (!raw) return null;
    const { cs, ts } = JSON.parse(raw);
    if (!cs || !ts || Date.now() - ts > 30 * 60_000) {
      sessionStorage.removeItem(STRIPE_CS_KEY(pagamentoId));
      return null;
    }
    return cs as string;
  } catch (_) {
    return null;
  }
}

export function limparStripeClientSecret(pagamentoId: string): void {
  try { sessionStorage.removeItem(STRIPE_CS_KEY(pagamentoId)); } catch (_) { /* noop */ }
}

/* ─────────── Provider: configuração ─────────── */

export async function getProviderAtual(): Promise<PagamentoProvider> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "pagamentos_provider")
    .maybeSingle();
  if (error) throw new Error("Falha ao consultar a configuração de pagamentos. Tente novamente.");
  const v = data?.value as unknown;
  if (v === "stripe") return "stripe";
  if (v === "mock" && LOCAL_BACKEND) return "mock";
  throw new Error("Pagamentos indisponíveis neste ambiente. Nenhuma cobrança foi realizada.");
}

/* ─────────── Provider: MOCK (simulado) ─────────── */

const mockProvider = {
  async criarCheckout(input: CriarCheckoutInput): Promise<CheckoutSession> {
    if (!LOCAL_BACKEND || !input.reserva) throw new Error('Checkout local requer uma reserva');
    const { data, error } = await supabase.rpc('paciente_checkout_local' as any, {
      _slot_id: input.reserva.slot_id, _tipo: input.reserva.tipo, _referencia_id: input.reserva.referencia_id,
      _motivo: input.reserva.motivo ?? null, _paciente_atendido_id: input.reserva.paciente_atendido_id ?? null,
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Falha ao criar checkout');
    const id = data as unknown as string;
    return { pagamentoId: id, checkoutUrl: '/app/paciente/checkout/' + id, simulated: true, provider: 'mock' };
  },
  async confirmar(pagamentoId: string, _metodo: PagamentoMetodo): Promise<void> {
    if (!LOCAL_BACKEND) throw new Error('Simulacao disponivel apenas no ambiente local');
    const { error } = await supabase.rpc('paciente_confirmar_pagamento_local' as any, { _pagamento_id: pagamentoId });
    if (error) throw new Error(error.message);
  },
};

const stripeProvider = {
  async criarCheckout(input: CriarCheckoutInput): Promise<CheckoutSession> {
    // Monta body dependendo do fluxo (unificado vs legado)
    const body: Record<string, unknown> = {};

    if (input.reserva) {
      // Fluxo unificado — enviar dados de reserva
      body.reserva = input.reserva;
      body.valorCentavos = input.valorCentavos;
      body.descricao = input.descricao ?? null;
      if (input.snapshot) body.snapshot = input.snapshot;
    } else if (input.consultaId) {
      // Fluxo legado
      body.consulta_id = input.consultaId;
    } else {
      throw new Error("Dados insuficientes para checkout Stripe");
    }

    // Detectar environment via client token
    const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
    body.environment = clientToken?.startsWith("pk_test_") ? "sandbox" : "live";

    const { data, error } = await supabase.functions.invoke("criar-checkout-stripe", {
      body,
    });
    if (error) {
      throw new Error(error.message ?? "Falha ao iniciar checkout Stripe");
    }
    const payload = data as
      | { pagamento_id: string; checkout_url?: string; clientSecret?: string; session_id?: string }
      | { error: string };
    if ("error" in payload) throw new Error(payload.error);

    // Se retornou clientSecret (embedded checkout), usar rota interna de checkout
    const hasEmbedded = !!payload.clientSecret;
    const checkoutUrl = hasEmbedded
      ? `/app/paciente/checkout/${payload.pagamento_id}`
      : (payload.checkout_url ?? `/app/paciente/checkout/${payload.pagamento_id}`);

    return {
      pagamentoId: payload.pagamento_id,
      checkoutUrl,
      simulated: false,
      provider: "stripe",
      external: !hasEmbedded && !!payload.checkout_url,
      clientSecret: payload.clientSecret,
    };
  },
  async confirmar(_pagamentoId: string, _metodo: PagamentoMetodo): Promise<void> {
    throw new Error("Confirmação Stripe ocorre via webhook do servidor.");
  },
  async cancelar(_pagamentoId: string): Promise<void> {
    const { error } = await supabase
      .from("pagamentos")
      .update({ status: "cancelado", cancelled_at: new Date().toISOString() })
      .eq("id", _pagamentoId);
    if (error) throw error;
  },
};

/* ─────────── API pública ─────────── */

export async function criarCheckoutSession(
  input: CriarCheckoutInput,
): Promise<CheckoutSession> {
  const provider = await getProviderAtual();
  return provider === "stripe"
    ? stripeProvider.criarCheckout(input)
    : mockProvider.criarCheckout(input);
}

export async function confirmarPagamento(
  pagamentoId: string,
  metodo: PagamentoMetodo,
): Promise<void> {
  const pagamento = await getPagamento(pagamentoId);
  if (!pagamento) throw new Error("Pagamento indisponivel");
  return pagamento.provider === "stripe"
    ? stripeProvider.confirmar(pagamentoId, metodo)
    : mockProvider.confirmar(pagamentoId, metodo);
}

export async function cancelarPagamento(pagamentoId: string): Promise<void> {
  const { error } = await supabase.rpc('paciente_cancelar_pagamento' as any, { _pagamento_id: pagamentoId });
  if (error) throw new Error(error.message);
}

export async function getPagamento(pagamentoId: string): Promise<Pagamento | null> {
  const { data, error } = await supabase
    .from("pagamentos")
    .select("*")
    .eq("id", pagamentoId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export { formatBRL } from "@/lib/format";
