## Mudança

Agrupar "Serviços" e "Atendimento imediato" em um único item colapsável no sidebar Admin. Cupons permanece separado.

**Arquivo:** `src/lib/profiles.ts` (linhas 164-165)

Substituir:
```ts
{ label: "Serviços", to: "/app/admin/servicos", icon: Stethoscope, requiresCapability: "financeiro.servicos_gerenciar" },
{ label: "Atendimento imediato", to: "/app/admin/atendimento-imediato", icon: Activity, requiresCapability: "financeiro.servicos_gerenciar" },
```

Por:
```ts
{
  label: "Serviços",
  icon: Stethoscope,
  requiresCapability: "financeiro.servicos_gerenciar",
  children: [
    { label: "Catálogo de serviços", to: "/app/admin/servicos" },
    { label: "Atendimento imediato", to: "/app/admin/atendimento-imediato" },
  ],
},
```

O `AppLayout.tsx` já renderiza grupos com `children` como menus colapsáveis com seta — nenhuma outra alteração necessária.
