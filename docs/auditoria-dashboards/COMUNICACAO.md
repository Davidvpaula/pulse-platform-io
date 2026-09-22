# Auditoria — Comunicação compartilhada

## Rotas e funções

Não é um novo papel de usuário. É um módulo compartilhado com `/app/comunicacao/dashboard`, Inbox, conversas (alias), WhatsApp (alias), bot, IA, templates, automações, métricas e configurações: dez declarações. [Inventário completo](INVENTARIO-COMUNICACAO.md).

Funções encontradas: atendimento por conversas, respostas, atribuição/transferência, presença e digitação, mensagens reaproveitáveis, automações, configuração de bot/IA, métricas e configuração do Inbox. A central de WhatsApp propriamente dita fica no admin. Comunicação interna e notificações por perfil também aparecem nos inventários dos dashboards consumidores.

## Mecânica

As rotas compartilham autenticação do layout. [Inbox](../../src/pages/app/comunicacao/Inbox.tsx) consulta um conjunto próprio de permissões e usa componentes/hooks para operação, presença e IA. Não se deve generalizar os controles do Inbox para todas as páginas irmãs. Templates, por exemplo, fazem CRUD direto em `message_templates`.

O backend contém políticas/RPCs específicas de comunicação e Edge Functions. O inventário liga chamadas às implementações encontradas; existência de implementação não comprova credencial, webhook ou provedor operacional.

## Achados

### COM-01 — Alta — Autorização de rota não é uniforme

**Confirmado no frontend; exploração em dados depende do servidor.** As páginas `/app/comunicacao/*` não usam `RequireRoutePermission` no roteador. [Templates](../../src/pages/app/comunicacao/Templates.tsx) não verifica capacidade antes de renderizar criação/edição/exclusão. O menu do colaborador usa `comunicacao.usar_templates`, embora a página permita gerenciar templates, capacidade diferente presente no catálogo.

Correção: definir leitura/uso versus configuração para cada rota e ação, com RLS/RPC correspondente. Aceite: paciente/empresa e colaborador sem capacidade não acessam gestão por URL direta; permissão de usar template não permite editá-lo.

### COM-02 — Média — Falha de exclusão de template não é exibida

**Confirmado.** `remover` aguarda delete, ignora `error` e recarrega. `load` também trata falha como lista vazia. Correção: conferir resposta e manter estado/feedback coerente. Testar rejeição por permissão e rede indisponível.

### COM-03 — Média — Funcionalidades explicitamente pendentes

**Incompleto.** [BotConfig](../../src/pages/app/comunicacao/BotConfig.tsx) mantém simulação de conversa desabilitada. Inbox contém marcador de tabela pendente para acesso temporário; esse marcador é pista de implementação, não prova de ausência no banco atual. Conferir migração efetiva e o handler antes de anunciar acesso temporário como concluído.

### COM-04 — Alta — Regras de permissão herdam cache não reativo

Ver COL-02: alterações feitas pelo administrador não garantem atualização imediata da interface. Comunicação precisa verificar autorização também na ação de enviar, transferir e visualizar mensagens; manter conversa aberta não deve preservar acesso revogado.

## Validação necessária

Com dados fictícios, testar conversas atribuídas versus globais, revogação durante conversa aberta, transferência entre atendentes, anexos, expiração de sessão, entrega duplicada de webhook e falha do provedor. Não enviar mensagens reais durante homologação. Nenhuma mensagem foi enviada nesta auditoria.

Status: módulo incluído para cobrir todos os dashboards encontrados, além dos cinco perfis principais.
