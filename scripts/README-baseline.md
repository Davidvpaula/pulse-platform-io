# F6 — Baseline guard-rail

`scripts/baseline.json` congela o estado saudável de:

- Rotas declaradas em `src/App.tsx`
- RPCs chamadas no código (`supabase.rpc("...")`)
- Permission keys usadas (`perm="..."`, `requireKey: "..."`, `permission: "..."`)

O CI roda `node scripts/smoke-tests.mjs --strict` e **quebra** se houver drift:

- Permission key adicionada sem atualizar `permissions_catalog` + baseline
- RPC removida, renomeada, ou nova chamada sem registro
- Link / item de menu apontando para rota inexistente
- Rota duplicada em `App.tsx`

## Quando o drift for intencional

Faça a mudança normal (nova RPC, nova permission, nova rota) e atualize a baseline **no mesmo commit**:

```bash
# 1. Gerar snapshot atual
node scripts/smoke-tests.mjs --json > /tmp/smoke.json

# 2. Revisar o diff (manual): comparar /tmp/smoke.json com scripts/baseline.json

# 3. Atualizar scripts/baseline.json com as listas novas:
node -e "
  const cur = JSON.parse(require('fs').readFileSync('/tmp/smoke.json','utf8'));
  const out = {
    generated_at: new Date().toISOString().slice(0,10),
    description: 'F6 baseline congelada — qualquer drift deve ser revisto e a baseline atualizada intencionalmente.',
    routes_ok: cur.routes_ok,
    rpcs: Object.keys(cur.rpcs).sort(),
    permissions: Object.keys(cur.permissions).sort(),
  };
  require('fs').writeFileSync('scripts/baseline.json', JSON.stringify(out, null, 2) + '\n');
"

# 4. Validar
node scripts/smoke-tests.mjs --strict

# 5. Commitar baseline.json JUNTO com a mudança que causou o drift
```

## Anti-padrões

- ❌ Atualizar baseline em commit separado da mudança real
- ❌ Atualizar baseline sem revisar o diff (encobre regressões)
- ❌ Adicionar permission key no código sem inserir em `permissions_catalog` via migration
- ❌ Renomear RPC sem atualizar todos os call-sites
