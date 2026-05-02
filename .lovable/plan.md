
# Sistema de Termos e Condições

## Resumo

Criar um sistema centralizado de gestão de Termos e Condições no dashboard Admin, com versionamento imutavel, aceite obrigatório por usuário (com IP/user-agent), e integração nos fluxos existentes (compra de consulta, planos, cadastro médico, premium, gamificação).

Nenhuma tabela ou fluxo existente será alterada -- apenas novas tabelas, páginas e componentes serão criados.

---

## Fase 1 -- Database (migration)

**Tabela `termos_condicoes`**
- `id` uuid PK
- `tipo` enum: `consulta_paciente`, `privacidade`, `plano_plataforma`, `plano_medico`, `contrato_medico`, `gamificacao_premium`, `criacao_plano_medico`, `uso_feegow`
- `titulo` text NOT NULL
- `conteudo` text NOT NULL (HTML do editor rico)
- `versao` int NOT NULL (auto-incrementa por tipo)
- `status` enum: `ativo`, `inativo`
- `created_at`, `published_at` timestamptz
- `created_by` uuid (actor admin)
- Constraint UNIQUE(tipo, versao) -- nunca sobrescreve
- Constraint: max 1 ativo por tipo (via trigger)

**Tabela `user_terms_acceptance`**
- `id` uuid PK
- `user_id` uuid NOT NULL refs profiles
- `termo_id` uuid NOT NULL refs termos_condicoes
- `aceito_em` timestamptz NOT NULL default now()
- `ip_address` text
- `user_agent` text
- RLS: usuario ve apenas seus aceites; admin le tudo

**Trigger**: ao ativar um termo, desativa automaticamente o anterior do mesmo tipo.

**Auditoria**: trigger que insere em `audit_eventos_unificado` nas ações de criação, edição, ativação e aceite.

---

## Fase 2 -- Pagina Admin `/app/admin/termos-condicoes`

- Listagem de todos os termos agrupados por categoria (Paciente / Medico)
- Cards por tipo mostrando versão ativa, data, status
- Ações: Criar novo termo, ver historico de versoes, ativar/desativar
- Editor rico (textarea com suporte a HTML basico) para conteudo
- Ao editar um termo ativo: cria nova versão (v+1), não sobrescreve
- Aba "Aceites" mostrando quem aceitou cada versão (user, data, IP)
- Rota e menu adicionados ao nav do Admin

---

## Fase 3 -- Componente de aceite reutilizavel

- `TermsAcceptanceDialog.tsx` -- modal obrigatório
  - Recebe `tipo` do termo como prop
  - Busca o termo ativo daquele tipo
  - Exibe titulo + conteudo (scrollável)
  - Checkbox "Li e aceito os termos"
  - Botão confirmar (desabilitado até checkbox)
  - Ao confirmar: insere em `user_terms_acceptance` com IP e user-agent
  - Callback `onAccepted` para liberar o fluxo

- `useTermsCheck(tipo)` -- hook que verifica se o usuario já aceitou a versão ativa do tipo. Retorna `{ needsAcceptance, showDialog, ... }`.

---

## Fase 4 -- Integração nos fluxos existentes

Cada fluxo chama `useTermsCheck` e, se necessário, exibe o dialog antes de prosseguir:

| Fluxo | Tipo do termo | Onde integrar |
|-------|--------------|---------------|
| Compra consulta (paciente) | `consulta_paciente` | Antes de confirmar agendamento |
| Assinar plano plataforma | `plano_plataforma` | Antes de confirmar assinatura |
| Assinar plano médico | `plano_medico` | Antes de confirmar assinatura |
| Cadastro médico (1o login) | `contrato_medico` | Popup obrigatório no dashboard médico |
| Ativar premium | `gamificacao_premium` | Antes de ativar na page gamificação |
| Criar plano (médico) | `criacao_plano_medico` | Antes de salvar novo plano |

A integração será feita adicionando o hook + dialog nos componentes existentes, sem alterar a lógica de negócio atual.

---

## Detalhes técnicos

- Enum `termo_tipo` criado no banco para manter integridade
- RLS: admin full CRUD em `termos_condicoes`; usuarios autenticados SELECT only. Em `user_terms_acceptance`: INSERT proprio + SELECT proprio; admin SELECT all
- IP capturado via header no client (fallback vazio)
- Auditoria via `audit_eventos_unificado` com modulo = 'termos'
- Menu Admin: novo item "Termos & Condições" com icone FileText, entre Segurança e Análises
