
## Adicionar link no menu Admin

Arquivo: `src/lib/profiles.ts`

1. Adicionar `Brain` ao import do lucide-react (linha 5)
2. Após o grupo "Gamificação" (linha 246), adicionar novo item de menu:

```
{ label: "Relatório Médico Interno IA", to: "/app/admin/ia-medicos", icon: Brain, requiresCapability: "gamificacao.ver" },
```

Isso coloca o item no sidebar do admin, logo abaixo de Gamificação e acima de Auditoria (ou após Gamificação), com o ícone Brain e a mesma permissão já usada na rota.
