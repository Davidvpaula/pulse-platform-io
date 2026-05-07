## Objetivo
Adicionar um botão na área de ações de cada card de consulta (ao lado dos botões existentes como Continuar, Finalizar, etc.) que abre a página do dashboard Feegow em uma nova aba.

## Implementação

**Arquivo:** `src/pages/app/medico/MedicoConsultas.tsx`

1. Importar `ExternalLink` do lucide-react
2. Adicionar um botão `variant="ghost"` com ícone e título "Abrir Feegow" na área de ações do card (junto com os botões de chat, histórico, reagendar, cancelar)
3. O botão abrirá a URL do dashboard Feegow (`https://app.feegow.com`) em nova aba via `window.open`
4. A URL da Feegow pode vir de uma variável de ambiente (`FEEGOW_BASE_URL`) ou ser fixa — como é apenas um link para o dashboard, usaremos a URL padrão `https://app.feegow.com`

## Detalhes técnicos
- Botão com `variant="ghost"`, `size="sm"`, ícone `ExternalLink` com cor indicativa
- Título (tooltip nativo): "Abrir dashboard Feegow"
- `window.open(url, "_blank", "noopener,noreferrer")`
- Sem dependência de backend, apenas um link externo
