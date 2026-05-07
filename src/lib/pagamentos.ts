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
      if (input.reserva.paciente_atendido_id) {
        metadata.paciente_atendido_id = input.reserva.paciente_atendido_id;
      }
    }
    // Snapshot financeiro imutável
    if (input.snapshot) {
      metadata.snapshot = input.snapshot;
    }

    const insertObj: Record<string, unknown> = {
      valor_centavos: input.valorCentavos,
      metodo: input.metodo ?? "simulado",
      provider: "mock" as const,
      status: "pendente" as const,
      metadata,
    };
    if (input.consultaId) insertObj.consulta_id = input.consultaId;
    if (input.reserva?.paciente_id) insertObj.paciente_id = input.reserva.paciente_id;
    if (input.reserva?.medico_id) insertObj.medico_id = input.reserva.medico_id;

    const { data, error } = await supabase
      .from("pagamentos")
      .insert(insertObj as any)
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
    // 1) Atualiza pagamento → pago
    const { error } = await supabase
      .from("pagamentos")
      .update({
        status: "pago" as const,
        metodo,
        paid_at: new Date().toISOString(),
        provider_payment_id: `mock_${Date.now()}`,
      })
      .eq("id", pagamentoId);
    if (error) throw error;

    // 2) Cria consulta via RPC (fluxo unificado) ou atualiza consulta existente (legado)
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "criar_consulta_pos_pagamento" as any,
      { _pagamento_id: pagamentoId },
    );

    if (rpcError) {
      console.error("[pagamentos] criar_consulta_pos_pagamento:", rpcError);
      // Fallback: tenta lógica legada (consulta_id já vinculada)
    }

    const res = rpcResult as any;
    if (res && !res.ok) {
      console.warn("[pagamentos] criar_consulta_pos_pagamento:", res.erro);
    }
  },

  async cancelar(pagamentoId: string): Promise<void> {
    const { error } = await supabase
      .from("pagamentos")
      .update({
        status: "cancelado" as const,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", pagamentoId);
    if (error) throw error;

    // Libera consulta e slot ao cancelar pagamento
    const { data: pag } = await supabase
      .from("pagamentos")
      .select("consulta_id, metadata")
      .eq("id", pagamentoId)
      .maybeSingle();

    // Se tem consulta vinculada (fluxo legado), cancela
    if (pag?.consulta_id) {
      const { data: consulta } = await supabase
        .from("consultas")
        .select("slot_id, status")
        .eq("id", pag.consulta_id)
        .maybeSingle();

      if (consulta?.status === "aguardando_pagamento") {
        await supabase
          .from("consultas")
          .update({ status: "cancelada" as const, updated_at: new Date().toISOString() })
          .eq("id", pag.consulta_id);

        if (consulta.slot_id) {
          await supabase
            .from("agenda_slots")
            .update({
              status: "disponivel" as const,
              reservado_por: null,
              reserva_expira_em: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", consulta.slot_id);
        }
      }
    }

    // Se não tem consulta mas tem slot_id na metadata (fluxo unificado), libera slot
    const meta = (pag?.metadata as any) ?? {};
    if (!pag?.consulta_id && meta.slot_id) {
      await supabase
        .from("agenda_slots")
        .update({
          status: "disponivel" as const,
          reservado_por: null,
          reserva_expira_em: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", meta.slot_id)
        .eq("status", "reservado");
    }
  },
};

/* ─────────── Provider: STRIPE (placeholder) ─────────── */

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

    // Se retornou clientSecret (embedded checkout), redirecionar para checkout interno
    const checkoutUrl = payload.checkout_url
      ?? `/app/paciente/checkout/${payload.pagamento_id}`;

    return {
      pagamentoId: payload.pagamento_id,
      checkoutUrl,
      simulated: false,
      provider: "stripe",
      external: !!payload.checkout_url && !payload.clientSecret,
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
