## Objetivo

Aplicar a decisão arquitetural "Operação interna, Clínica externa": tornar o sistema interno o SoR operacional definitivo e reduzir a Feegow ao papel de provider clínico externo, atrás de uma abstração `ClinicalProvider` (futuro Memed/Native plugáveis). Sem sync bidirecional, sem espelho de agenda/financeiro, sem iframe.

Memória já registrada em `mem://features/arquitetura-clinical-provider`.

## Frente 1 — Abstração ClinicalProvider

**Backend** (`supabase/functions/_shared/clinical-providers.ts`):
- Interface `ClinicalProvider` com: `getPatientDeepLink`, `getDocumentsList`, `downloadDocument`, `verifyHealth`.
- Implementações: `FeegowProvider` (real, usa edge functions já existentes), `NullProvider` (default no-op).
- Factory `getActiveProvider()` lê `app_settings.clinical_provider` (`'feegow' | 'none'` agora; `'memed' | 'native'` reservados).

**Frontend** (`src/lib/clinical/`):
- `clinicalUrls.ts` — URL builders centralizados (paciente, prontuário, documentos da Feegow). Único ponto de mudança se a URL deles mudar.
- `useClinicalProvider()` hook — devolve `{ enabled, providerId, openPatient(id), openDocuments(id) }` com base em `app_settings`.
- Componente `<AbrirNaFeegowButton patientId={...} variant="prontuario|paciente|documentos" />` que só renderiza se `enabled`.

**Migração mínima**: adicionar coluna `clinical_provider text default 'none'` em `app_settings` (ou chave em JSON existente, conforme padrão do projeto — checar antes).

## Frente 2 — Limpeza de `src/lib/feegow.ts`

Encolher de ~330 linhas para ~80 linhas. Manter apenas:
- Tipos de identidade: `FeegowMapping`, `FeegowConnectionState`.
- URL builders (movidos para `clinicalUrls.ts`).

**Remover**:
- `feegowSchema` (TableDef[] inteiro — vira documentação morta).
- `statusInternoLabel`, `statusFeegowLabel`, `statusMap` (não haverá mapeamento de status).
- `validatePacienteParaFeegow`, `validateAgendamentoParaFeegow` (Feegow não é pré-requisito de nada operacional).
- `integrationLogsMock`, `pendenciasFeegow` (mocks não usados em produção).

Auditar imports antes de remover; substituir usos remanescentes pela nova abstração.

## Frente 3 — Auditoria de edge functions Feegow

| Função | Decisão |
|--------|---------|
| `feegow-importar-documentos` | **Manter** (read-only docs) |
| `feegow-vincular-profissional` | **Manter** (mapping de identidade) |
| `feegow-profissionais` | **Manter** (listing read-only para vincular) |
| `feegow-agenda-readonly` | **Avaliar** — manter só se usada em algum dashboard |
| `feegow-criar-agendamento` | **Marcar deprecated** (header de warning + log) |
| `feegow-enviar-paciente` | **Marcar deprecated** |
| `feegow-liberar-medico` | **Marcar deprecated** |

"Deprecated" = adiciona log `console.warn('[DEPRECATED] ...')` e header `X-Deprecated: true`. Não excluir agora — pode haver chamadas legadas. Excluir em revisão futura.

## Frente 4 — UI: substituir `FeegowSyncConsulta`

- `src/components/admin/FeegowSyncConsulta.tsx` → trocar por `<AbrirNaFeegowButton>` simples (link em nova aba) onde for usado.
- Página `src/pages/app/shared/PendenciasIntegracao.tsx` → reduzir para apenas health-check + lista de erros do `feegow-importar-documentos`. Remover painel de "agendamentos pendentes de sync".
- Adicionar botões `AbrirNaFeegowButton` em:
  - Perfil do paciente (médico/colaborador).
  - Tela de consulta em andamento (médico) — variante "prontuário".

## Frente 5 — Documentação e memória

- Atualizar `mem://features/feegow-agendamento-manual` adicionando nota "SUPERADA pela arquitetura ClinicalProvider".
- (Já feito) `mem://features/arquitetura-clinical-provider` criada e referenciada no index.

## Detalhes técnicos

- **Sem migração destrutiva**: nenhuma coluna `feegow_*` será removida das tabelas — apenas deixam de ser populadas pelos novos fluxos. Compatível com dados existentes.
- **Health-check**: usar `feegow-importar-documentos` ou criar `feegow-health-check` minimal (HEAD na API). Circuit breaker simples em `useClinicalProvider` (cache 60s).
- **Feature flag**: `app_settings.clinical_provider = 'none'` desativa todos os botões instantaneamente. Default = `'none'` para não quebrar nada na entrega.
- **Sem iframe, sem postMessage, sem SSO**. Apenas `window.open(url, '_blank', 'noopener')`.

## O que NÃO está no escopo

- Não tocar em agenda, financeiro, comunicação, IA, auditoria.
- Não criar `MemedProvider` nem `NativeProvider` agora — só a interface preparada.
- Não pedir secrets novos da Feegow.
- Não excluir edge functions ainda (apenas deprecar).
- Não migrar dados históricos.

## Resultado esperado

- `src/lib/feegow.ts` reduzido a ~80 linhas só com identidade + URLs.
- Abstração `ClinicalProvider` pronta para receber Memed/Native sem refatoração.
- UI da Feegow reduzida a botões deep-link discretos, controlados por feature flag.
- Edge functions de sync/agendamento marcadas como deprecated mas ainda funcionais para não quebrar legado.
- Sistema 100% autônomo: derrubar a Feegow não impacta agenda, pagamento, comunicação ou teleconsulta.
