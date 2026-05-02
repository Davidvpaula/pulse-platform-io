
## Contexto

A tela `AdminGamificacao` já possui 4 tabs completas:
- **Ranking**: pesos (avaliação, atendimentos, conversão, no-show, recência, premium) + parâmetros gerais (min avaliações, dias ativo, dias penalidade) + tabela top médicos
- **Premium**: regras de conquista (min atendimentos, min avaliação, max no-show, meses ativos, bônus ranking)
- **CPC & Campanhas**: config CPC, tabela de campanhas com ROI
- **Saldo**: pontos por consulta concluída

O que falta: uma **aba de Auditoria** mostrando o histórico de quem alterou as regras e quando.

## Alterações

### `src/pages/app/admin/AdminGamificacao.tsx`

1. Adicionar import de ícones `History`, `Clock`, `User`
2. Adicionar nova tab **"Auditoria"** com ícone `History` no `TabsList`
3. Criar `TabsContent value="auditoria"` com:
   - Tabela mock de log de alterações contendo:
     - Data/hora
     - Usuário (admin)
     - Campo alterado (ex: "peso_avaliacao", "premium_min_atendimentos")
     - Valor anterior → Valor novo
     - Tipo de ação (alteração de peso, alteração de regra premium, alteração de CPC, recálculo manual)
   - Dados mock hardcoded com ~8 entradas variadas
   - Badges coloridos por tipo de ação
   - Filtro simples por tipo de ação (select)

Nenhuma migração necessária (dados mock). Nenhum arquivo novo.
