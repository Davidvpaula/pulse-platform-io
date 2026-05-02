## Objetivo

Exibir no dashboard do médico (`MedicoDashboard.tsx`) uma seção compacta mostrando:
- Posição no ranking (#N)
- Score atual
- Nota média + total de avaliações
- Saldo de crescimento (pontos acumulados)
- Link direto para a página completa de gamificação

Os dados são reais (tabelas `medico_ranking` e `medico_saldo_crescimento` já existem e são populadas por triggers automáticos).

---

## Alterações

### `src/pages/app/medico/MedicoDashboard.tsx`

1. **Importar** `getRankingMedico`, `getSaldoAtual` de `@/lib/gamificacao` e ícones `Star`, `Award`, `Crown` de `lucide-react`.

2. **Adicionar state** para `ranking` (MedicoRanking | null) e `saldoCrescimento` (number).

3. **Na função `carregar()`**, após carregar o médico, fazer em paralelo:
   - `getRankingMedico(medico.id)` 
   - `getSaldoAtual(medico.id)`

4. **Renderizar nova seção** entre os stats cards e a grid de próximas consultas (após o split de receita). Card compacto com layout horizontal:
   - **Posição** (#1, #2...) com badge colorido
   - **Score** (numérico)
   - **Nota média** (estrelas + número)
   - **Saldo** (pontos)
   - Botão "Ver detalhes" linkando para `/app/medico/gamificacao`

Visível apenas quando `isMedico` é true (perfil médico).

---

Nenhuma alteração de banco de dados necessária -- os dados já existem nas tabelas e são atualizados automaticamente via triggers e cron job.
