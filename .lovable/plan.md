
## Fix catch block in `src/lib/saques.ts`

**Line 57** — the `parseArr` function has a `catch { /* ignore */ }` that silently swallows errors without returning the fallback value. This means if `JSON.parse` throws, the function falls through to `return fallback` on line 59 anyway, so functionally it's already correct. However, to match the requested pattern and be explicit:

**Change:**
```ts
try { const p = JSON.parse(v); if (Array.isArray(p)) return p.map(Number).filter(n => !isNaN(n)); } catch { /* ignore */ }
```

**To:**
```ts
try { const p = JSON.parse(v); if (Array.isArray(p)) return p.map(Number).filter(n => !isNaN(n)); } catch { return fallback; }
```

After the edit, I'll verify there are no TypeScript errors (build and type-check run automatically).
