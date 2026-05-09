## Objetivo

Ligar Stripe sandbox ponta a ponta sem quebrar o fluxo mock atual. O paciente passa a pagar com cartão de teste real do Stripe (`4242 4242 4242 4242`), o webhook cria a consulta automaticamente, e o `link_sala` fixo continua nascendo via trigger (igual ao mock).

## Diagnóstico

Toda a infraestrutura Stripe já existe e está conforme as regras de gateway:
- `supabase/functions/criar-checkout-stripe/index.ts` — cria Checkout Session embedded (`ui_mode: "embedded_page"`) e devolve `clientSecret`. ✅
- `supabase/functions/payments-webhook/index.ts` — verifica assinatura HMAC, processa `checkout.session.completed`, chama `criar_consulta_pos_pagamento` e dispara `google-calendar-sync`. ✅
- `_shared/stripe.ts` (gateway proxy), `src/lib/stripe.ts`, libs `@stripe/stripe-js@9.2.0` + `@stripe/react-stripe-js@6.2.0`, secrets `STRIPE_SANDBOX_API_KEY` + `PAYMENTS_SANDBOX_WEBHOOK_SECRET`, e `VITE_PAYMENTS_CLIENT_TOKEN` (pk_test_…) — tudo pronto. ✅
- `src/lib/pagamentos.ts` já tem o `stripeProvider` que chama a edge function. ✅

**O que falta**: a tela `PacienteCheckout.tsx` só sabe lidar com mock. Quando `provider='stripe'`, ela precisa montar `<EmbeddedCheckoutProvider>` + `<EmbeddedCheckout>` usando o `clientSecret` retornado pela edge function. Hoje o `criarCheckoutSession` chama o Stripe e cria o pagamento, mas o `clientSecret` se perde (o helper `CheckoutSession` não o expõe).

## Plano cirúrgico

### 1. Propagar o `clientSecret` no contrato interno
- Adicionar `clientSecret?: string` em `CheckoutSession` (`src/lib/pagamentos.ts`).
- `stripeProvider.criarCheckout` já recebe — só repassar.
- O helper `abrirCheckout`: quando houver `clientSecret`, navegar para `/app/paciente/checkout/:id` e a tela busca o `clientSecret` via uma 2ª chamada (ou guardar em sessionStorage por `pagamentoId`). Vou usar **sessionStorage** com chave `stripe_cs_${pagamentoId}` (TTL 30min) — mais simples e zero round-trip extra.

### 2. Componente `StripeEmbeddedCheckout`
- Novo: `src/components/payments/StripeEmbeddedCheckout.tsx`.
- Recebe `clientSecret` via prop (vindo do sessionStorage). Monta o provider com `fetchClientSecret: () => Promise.resolve(clientSecret)`.
- Banner de modo teste no topo (`PaymentTestModeBanner`).

### 3. `PacienteCheckout.tsx` — branch por provider
- Se `pagamento.provider === 'stripe'`: ler `clientSecret` do sessionStorage; se ausente, exibir mensagem "Sessão expirada — voltar e tentar novamente". Renderizar `StripeEmbeddedCheckout` no lugar dos botões de método.
- Se `provider === 'mock'`: comportamento atual intacto.
- Os botões "Pagar / Cancelar" do mock continuam só para mock.

### 4. Página `PacientePagamentoSucesso.tsx`
- Já existe e é o `return_url` da Stripe. Confirmar que ela busca `pagamento` por `?p=<id>` e mostra confirmação. Se a consulta ainda não nasceu (race com o webhook), fazer 1-2 retentativas (já é o padrão atual). **Não vou mudar nada aqui se já funcionar.**

### 5. Flip do provider
- `UPDATE app_settings SET value='stripe' WHERE key='pagamentos_provider';` via migration.
- Mock continua funcional (código preservado) caso precise reverter.

### 6. Validação mecânica
- Login como paciente (já está).
- Agendar slot online com Nágila (após ela configurar `link_sala_padrao`, se ainda não fez).
- Pagar com `4242 4242 4242 4242`, qualquer CVC e validade futura.
- Verificar via SQL:
  - `pagamentos.status = 'pago'`, `provider = 'stripe'`.
  - `consultas` criada com `link_sala = link_sala_padrao` da médica.
  - Logs do `payments-webhook` mostram `checkout.session.completed` e `criar_consulta_pos_pagamento` com `ok=true`.

## Fora de escopo

- Stripe live (só sandbox por enquanto).
- Stripe Tax / managed_payments (decidir ao publicar).
- Mexer no fluxo mock ou nas RPCs.
- Alterar a UI fora da tela de checkout do paciente.
- Subscriptions / planos pagos (handler já existe no webhook, mas não vamos testar agora).

## Riscos & mitigações

- **`clientSecret` em sessionStorage**: vive só na aba; se o paciente fechar e voltar, perde. Aceitável para checkout (sessão de poucos minutos). Mostro mensagem clara.
- **Webhook fora do ar / atrasado**: a página de sucesso já tem retry. Pior caso: paciente vê "processando" e a consulta nasce em segundos.
- **Reversão**: basta flipar `pagamentos_provider` de volta para `mock` via SQL — UI volta sozinha.