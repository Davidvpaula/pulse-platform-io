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
  };
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
    const metadata: Record<string, unknown> = {
      descricao: input.descricao ?? null,
      simulated: true,
    };
    // Armazena dados da reserva unificada para criação pós-pagamento
    if (input.reserva) {
      metadata.slot_id = input.reserva.slot_id;
      metadata.tipo = input.reserva.tipo;
      metadata.referencia_id = input.reserva.referencia_id;
      metadata.motivo = input.reserva.motivo ?? null;
      metadata.paciente_id = input.reserva.paciente_id;
      metadata.medico_id = input.reserva.medico_id;
    }

    const { data, error } = await supabase
      .from("pagamentos")
      .insert({
        consulta_id: input.consultaId ?? null,
        valor_centavos: input.valorCentavos,
        metodo: input.metodo ?? "simulado",
        provider: "mock",
        status: "pendente",
        metadata,
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
    // 1) Atualiza pagamento
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

    // 2) Busca consulta vinculada e atualiza status + slot
    const { data: pag } = await supabase
      .from("pagamentos")
      .select("consulta_id")
      .eq("id", pagamentoId)
      .maybeSingle();

    if (pag?.consulta_id) {
      // Atualiza consulta de aguardando_pagamento → agendada
      await supabase
        .from("consultas")
        .update({ status: "agendada", updated_at: new Date().toISOString() })
        .eq("id", pag.consulta_id)
        .eq("status", "aguardando_pagamento");

      // Busca slot_id da consulta para bloquear
      const { data: consulta } = await supabase
        .from("consultas")
        .select("slot_id")
        .eq("id", pag.consulta_id)
        .maybeSingle();

      if (consulta?.slot_id) {
        await supabase
          .from("agenda_slots")
          .update({
            status: "bloqueado",
            reserva_expira_em: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", consulta.slot_id);
      }
    }
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

    // Libera consulta e slot ao cancelar pagamento
    const { data: pag } = await supabase
      .from("pagamentos")
      .select("consulta_id")
      .eq("id", pagamentoId)
      .maybeSingle();

    if (pag?.consulta_id) {
      const { data: consulta } = await supabase
        .from("consultas")
        .select("slot_id, status")
        .eq("id", pag.consulta_id)
        .maybeSingle();

      if (consulta?.status === "aguardando_pagamento") {
        await supabase
          .from("consultas")
          .update({ status: "cancelada", updated_at: new Date().toISOString() })
          .eq("id", pag.consulta_id);

        if (consulta.slot_id) {
          await supabase
            .from("agenda_slots")
            .update({
              status: "disponivel",
              reservado_por: null,
              reserva_expira_em: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", consulta.slot_id);
        }
      }
    }
  },
};

/* ─────────── Provider: STRIPE (placeholder) ─────────── */

const stripeProvider = {
  async criarCheckout(input: CriarCheckoutInput): Promise<CheckoutSession> {
    const { data, error } = await supabase.functions.invoke("criar-checkout-stripe", {
      body: { consulta_id: input.consultaId },
    });
    if (error) {
      throw new Error(error.message ?? "Falha ao iniciar checkout Stripe");
    }
    const payload = data as
      | { pagamento_id: string; checkout_url: string; session_id?: string }
      | { error: string };
    if ("error" in payload) throw new Error(payload.error);
    return {
      pagamentoId: payload.pagamento_id,
      checkoutUrl: payload.checkout_url,
      simulated: false,
      provider: "stripe",
      external: true,
    };
  },
  async confirmar(_pagamentoId: string, _metodo: PagamentoMetodo): Promise<void> {
    throw new Error("Confirmação Stripe ocorre via webhook do servidor.");
  },
  async cancelar(_pagamentoId: string): Promise<void> {
    // Marca como cancelado localmente (sem revogar no Stripe — sessões expiram sozinhas)
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

export { formatBRL } from "@/lib/format";
