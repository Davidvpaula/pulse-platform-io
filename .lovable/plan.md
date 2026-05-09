## Plano

1. **Remover a caixa "test"** da tabela `whatsapp_instances` (id `aa75b76b-0a32-4ea2-aef8-d0544cdca60c`, número `5511917161109`) via migration de DELETE — ela foi cadastrada com o número formatado errado e está poluindo a tela "Caixas conectadas".
2. **Solicitar atualização do secret** `META_PHONE_NUMBER_ID` novamente, para você colar o Phone Number ID correto vindo da tela WhatsApp → API Setup da Meta (somente dígitos, ~15 caracteres).
3. Não mexer em: webhook, Inbox, `whatsapp.modo`, número oficial, `whatsapp-cloud-test`, nem no token `META_WHATSAPP_TOKEN`.

Após a sua aprovação executo a remoção e em seguida disparo o pedido de atualização do secret.