/**
 * Camada de pagamentos.
 *
 * Suporta dois providers atrás da mesma interface:
 *  - "mock"   → checkout simulado (atual). Toda a UX é interna ao app.
 *  - "stripe" → futura integração real (Checkout Session via edge function).
 *
 * Hoje só "mock" está habilitado. Quando ligarmos o Stripe, basta:
 *   1. Criar a edge function que cria a Checkout Session.
 *   2. Implementar `stripeProvider.criarCheckout` chamando `supabase.functions.invoke`.
 *   3. Mudar `pagamentos_provider` em `app_settings` para "stripe".
 *
 * Nada nas telas precisa mudar.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Pagamento = Database["public"]["Tables"]["pagamentos"]["Row"];
export type PagamentoStatus = Database["public"]["Enums"]["pagamento_status"];
export type PagamentoMetodo = Database["public"]["Enums"]["pagamento_metodo"];
export type PagamentoProvider = Database["public"]["Enums"]["pagamento_provider"];

export interface CriarCheckoutInput {
  consultaId: string;
  valorCentavos: number;
  metodo?: PagamentoMetodo;
  descricao?: string;
}

export interface CheckoutSession {
  pagamentoId: string;
  checkoutUrl: string;
  simulated: boolean;
  provider: PagamentoProvider;
  /** True quando a URL deve ser aberta com window.location (Stripe hosted). */
  external?: boolean;
}

/** Helper que abre o checkout — interno usa router; externo (Stripe) usa redirect. */
export function abrirCheckout(session: CheckoutSession, navigate: (url: string) => void) {
  if (session.external) {
    window.location.href = session.checkoutUrl;
  } else {
    navigate(session.checkoutUrl);
  }
}

/* ─────────── Provider: configuração ─────────── */

export async function getProviderAtual(): Promise<PagamentoProvider> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "pagamentos_provider")
    .maybeSingle();
  const v = data?.value as unknown;
  if (v === "stripe") return "stripe";
  return "mock";
}

/* ─────────── Provider: MOCK (simulado) ─────────── */

const mockProvider = {
  async criarCheckout(input: CriarCheckoutInput): Promise<CheckoutSession> {
    const { data, error } = await supabase
      .from("pagamentos")
      .insert({
        consulta_id: input.consultaId,
        valor_centavos: input.valorCentavos,
        metodo: input.metodo ?? "simulado",
        provider: "mock",
        status: "pendente",
        metadata: { descricao: input.descricao ?? null, simulated: true },
      })
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Falha ao criar pagamento");

    const checkoutUrl = `/app/paciente/checkout/${data.id}`;
    await supabase
      .from("pagamentos")
      .update({ checkout_url: checkoutUrl })
      .eq("id", data.id);

    return {
      pagamentoId: data.id,
      checkoutUrl,
      simulated: true,
      provider: "mock",
    };
  },

  /** No mock, "confirmar" o pagamento é o próprio paciente clicando "Pagar". */
  async confirmar(pagamentoId: string, metodo: PagamentoMetodo): Promise<void> {
    const { error } = await supabase
      .from("pagamentos")
      .update({
        status: "pago",
        metodo,
        paid_at: new Date().toISOString(),
        provider_payment_id: `mock_${Date.now()}`,
      })
      .eq("id", pagamentoId);
    if (error) throw error;
  },

  async cancelar(pagamentoId: string): Promise<void> {
    const { error } = await supabase
      .from("pagamentos")
      .update({
        status: "cancelado",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", pagamentoId);
    if (error) throw error;
  },
};

/* ─────────── Provider: STRIPE (placeholder) ─────────── */

const stripeProvider = {
  async criarCheckout(_input: CriarCheckoutInput): Promise<CheckoutSession> {
    throw new Error(
      "Provider Stripe ainda não está conectado. Use o modo simulado ou conecte o Stripe nas configurações de Admin.",
    );
  },
  async confirmar(_pagamentoId: string, _metodo: PagamentoMetodo): Promise<void> {
    throw new Error("Confirmação Stripe ocorre via webhook do servidor.");
  },
  async cancelar(_pagamentoId: string): Promise<void> {
    throw new Error("Cancelamento Stripe ocorre via API do servidor.");
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
  const provider = await getProviderAtual();
  return provider === "stripe"
    ? stripeProvider.confirmar(pagamentoId, metodo)
    : mockProvider.confirmar(pagamentoId, metodo);
}

export async function cancelarPagamento(pagamentoId: string): Promise<void> {
  const provider = await getProviderAtual();
  return provider === "stripe"
    ? stripeProvider.cancelar(pagamentoId)
    : mockProvider.cancelar(pagamentoId);
}

export async function getPagamento(pagamentoId: string): Promise<Pagamento | null> {
  const { data } = await supabase
    .from("pagamentos")
    .select("*")
    .eq("id", pagamentoId)
    .maybeSingle();
  return data;
}

export function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
