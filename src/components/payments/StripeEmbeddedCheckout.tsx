import { useMemo } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";

interface Props {
  /** clientSecret retornado pela edge function `criar-checkout-stripe`. */
  clientSecret: string;
}

/**
 * Monta o Stripe Embedded Checkout inline. Não bloqueia a UI nem redireciona.
 * O `return_url` da Session aponta para /app/paciente/pagamento/sucesso.
 */
export function StripeEmbeddedCheckout({ clientSecret }: Props) {
  const options = useMemo(
    () => ({ fetchClientSecret: () => Promise.resolve(clientSecret) }),
    [clientSecret],
  );
  return (
    <div id="stripe-checkout" className="rounded-xl border border-border bg-card p-2">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

export function PaymentTestModeBanner() {
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
  if (!token?.startsWith("pk_test_")) return null;
  return (
    <div className="w-full rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-center text-xs text-warning-foreground">
      <strong>Modo teste.</strong> Use o cartão <code className="font-mono">4242 4242 4242 4242</code>,
      qualquer validade futura e CVC <code className="font-mono">123</code>. Nenhuma cobrança real é feita.
    </div>
  );
}
