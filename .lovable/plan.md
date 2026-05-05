
# Mover "Agenda" para dentro de "Consultas" no menu do Médico

## O que muda

No menu lateral do médico, "Agenda" deixará de ser um item separado e passará a ser um sub-item colapsável dentro de "Consultas" — igual ao padrão já usado no menu do Admin (ex.: Financeiro, Empresas, etc.).

**Antes:**
```
Dashboard
Agenda          ← item separado
Meus horários
Consultas       ← item separado
```

**Depois:**
```
Dashboard
Consultas  ▾
  └ Fila de atendimento   (/app/medico/consultas)
  └ Agenda                (/app/medico/agenda)
Meus horários
```

## Alteração técnica

**Arquivo:** `src/lib/profiles.ts` (linhas 66-69)

Substituir os dois itens separados (Agenda e Consultas) por um único item com `children`:

```ts
{
  label: "Consultas",
  icon: Video,
  children: [
    { label: "Fila de atendimento", to: "/app/medico/consultas" },
    { label: "Agenda", to: "/app/medico/agenda" },
  ],
},
```

Nenhuma rota, página ou componente será alterado — apenas a estrutura do menu.
