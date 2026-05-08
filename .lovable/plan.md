## Estado atual

- `Janela24hMeta.tsx` (painel direito) **já mostra** tempo restante com 4 estados visuais (verde/amarelo/vermelho/cinza). Pode ser reaproveitado tal como está.
- `JanelaExpiradaBanner.tsx` (sobre o composer) já mostra aviso e botão "Usar template oficial" quando expirada.
- `Inbox.tsx` já intercepta `enviar()` quando `janelaExpirada=true`, abre o template dialog e bloqueia o envio.
- `whatsapp-template-send` já está em `mock_sent` (sandbox). Nada a mudar lá.

Faltam apenas três ajustes pequenos de UX e observabilidade.

## Mudanças

### 1. `JanelaExpiradaBanner.tsx`
Reescrever o texto curto exatamente como pedido:
> "Janela 24h encerrada. Use um template oficial para reabrir a conversa."

Manter o botão "Usar template oficial".

### 2. Indicador de tempo restante junto do composer (quando aberta)
Criar `src/components/comunicacao/JanelaAtivaIndicator.tsx`:
- Recebe `conversationId`.
- Lê `conversation_meta_window` + assina realtime (mesmo padrão de `Janela24hMeta`).
- Renderiza barra fina acima do composer:
  - **Aberta**: `"Janela ativa — restam Xh Ymin"` com ícone Clock (verde).
  - **<2h**: mesma barra em tom âmbar/destructive.
  - **Expirada**: não renderiza nada (o `JanelaExpiradaBanner` cobre esse caso).
- Atualiza a cada 60s.

Em `Inbox.tsx`, dentro do bloco do composer (próximo às linhas 977-980), adicionar:
```tsx
{active.channel === "whatsapp" && !janelaExpirada && (
  <JanelaAtivaIndicator conversationId={active.id} />
)}
{active.channel === "whatsapp" && janelaExpirada && (
  <JanelaExpiradaBanner onUseTemplate={() => setTemplateDialogOpen(true)} />
)}
```

### 3. Log de tentativa bloqueada
Em `Inbox.tsx`, dentro de `enviar()`:

a) Quando `janelaExpirada` bloqueia o envio (linha ~530):
```ts
supabase.functions.invoke("observabilidade-ingest", {
  body: {
    modulo: "whatsapp",
    evento: "mensagem_livre_bloqueada",
    severity: "info",
    conversation_id: active.id,
    metadata: {
      reason: "janela_24h_expirada",
      acao_sugerida: "usar_template",
      contact_phone: active.contact_phone,
    },
  },
}).catch(() => {}); // best-effort
```

b) Quando a edge function devolve `requires_template` (linha ~549): mesmo log, mas com `reason: "janela_24h_expirada_servidor"` para distinguir origem.

## Regras respeitadas
- Sem alterar regra Meta, `wa-providers`, webhook ou enums.
- Sem secrets reais, sem ativar produção; template continua `mock_sent`.
- Nenhuma mudança em Fase 4/5/6/7/8 além de UX e log.

## Validação após implementação
- Conversa com janela aberta → barra verde acima do composer com "restam Xh Ymin".
- Esperar / forçar expiração → barra some, banner âmbar aparece, composer bloqueado.
- Tentar enviar texto livre fora da janela → toast + abre modal de template + evento gravado em `observabilidade_eventos` com `reason=janela_24h_expirada`.
- Enviar template em sandbox → mensagem aparece como `mock_sent`, sem chamada Meta.