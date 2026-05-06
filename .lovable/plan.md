## Problema

A página `MedicoConfiguracoes` usa `hookMedicoId` (vindo de `useMedicoAtual`) em vários `useEffect` e `useCallback`, mas todos têm dependency arrays vazios `[]`. Como o hook carrega assíncronamente, na primeira execução `hookMedicoId` é `null`, e os effects nunca re-rodam quando o valor real chega.

Resultado: a página entra em "devMode", mostra "Visualização (sem login)" e o toast "Cadastro médico não encontrado" ao tentar salvar.

## Correção

No arquivo `src/pages/app/medico/MedicoConfiguracoes.tsx`:

1. **`fetchConfig` (useCallback, linha ~113)**: Adicionar `hookMedicoId` no dependency array.
2. **useEffect de atendimento (linha ~255)**: Adicionar `hookMedicoId` no dependency array.
3. **useEffect de notificações (linha ~344)**: Adicionar `hookMedicoId` no dependency array.

Isso garante que quando `useMedicoAtual` termina de carregar e popula o ID do médico, todos os effects re-executam com o valor correto.
