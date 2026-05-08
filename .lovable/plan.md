## Causa do erro

Ao clicar em **Abrir** no modal "Nova conversa" do Inbox, o código tenta inserir uma nova conversa com `origin: "admin_manual"`. Esse valor **não existe** no enum `conversation_origin` do banco, que aceita apenas: `comercial`, `operacional`, `site`, `empresa`, `medico`, `sistema`.

Por isso o Postgres rejeita o insert com `invalid input value for enum conversation_origin: "admin_manual"`.

Arquivo: `src/lib/comunicacao/openOrCreateConversation.ts` (linha 51).

## Correção

Trocar `origin: "admin_manual"` por `origin: "operacional"` em `src/lib/comunicacao/openOrCreateConversation.ts`. Sem migração de banco, sem alterar contratos existentes, sem afetar Fase 4–8.

Após o fix: abrir nova conversa no Inbox admin deve criar o registro normalmente e abrir a thread.