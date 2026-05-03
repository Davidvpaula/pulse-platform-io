
# Menu Lateral — Accordion (1 grupo aberto por vez)

## O que muda

Apenas o componente `SidebarBody` em `src/layouts/AppLayout.tsx`, na seção que renderiza os `Collapsible` groups (linhas ~318-351).

### Alteração única

1. Adicionar um `useState<string | null>` chamado `openGroup` no `SidebarBody`
2. Inicializar com o label do grupo cuja sub-rota está ativa (derivado do `pathname`)
3. Trocar cada `<Collapsible defaultOpen={open}>` por `<Collapsible open={openGroup === item.label} onOpenChange={(val) => setOpenGroup(val ? item.label : null)}>`
4. Manter a animação nativa do Radix Collapsible (já tem transição suave)

### O que NÃO muda
- Nenhuma rota alterada
- Nenhum componente novo criado
- Nenhuma permissão afetada
- `lib/profiles.ts` e `lib/menu/menuCatalog.ts` intactos
- Links simples (sem filhos) continuam iguais

### Comportamento resultante
- Clicar num grupo com subitens: abre ele, fecha os demais
- Clicar de novo no mesmo: fecha ele
- Navegar para uma sub-rota: grupo correspondente abre automaticamente
- Navegar dentro do mesmo grupo: mantém aberto
