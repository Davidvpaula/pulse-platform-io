#!/usr/bin/env node
/**
 * Smoke Tests — Frente F4
 * Diagnóstico estático de regressão. Não substitui testes E2E.
 *
 * Cobertura:
 *   1) Rotas / menu / links 404  → reaproveita scripts/validate-routes.mjs
 *   2) RPCs chamadas no código   → lista todas as `supabase.rpc("name"`)
 *   3) Chaves de permissão       → lista todas as `perm="..."` / `RequirePermission`
 *
 * As listas (2) e (3) podem ser cruzadas com o banco usando os SQLs ao final
 * (ou rodando o "smoke RPC OK" na frente de QA).
 *
 * Uso:
 *   node scripts/smoke-tests.mjs
 *   node scripts/smoke-tests.mjs --json    # saída JSON
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const FUNCS = join(ROOT, "supabase", "functions");
const JSON_OUT = process.argv.includes("--json");
const STRICT = process.argv.includes("--strict");

function walk(dir, exts = [".ts", ".tsx"]) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p, exts));
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

function collectMatches(files, regex, group = 1) {
  const map = new Map(); // name -> Set(file:line)
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      let m;
      const re = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
      while ((m = re.exec(lines[i])) !== null) {
        const name = m[group];
        if (!map.has(name)) map.set(name, new Set());
        map.get(name).add(`${f.replace(ROOT + "/", "")}:${i + 1}`);
      }
    }
  }
  return map;
}

const srcFiles = walk(SRC);
const funcFiles = walk(FUNCS);
const allFiles = [...srcFiles, ...funcFiles];

// ─── 1. Rotas via validate-routes.mjs ───
let routesReport = "";
let routesOk = true;
try {
  routesReport = execSync("node scripts/validate-routes.mjs", { encoding: "utf8" });
  routesOk = !routesReport.includes("❌");
} catch (e) {
  routesReport = e.stdout?.toString() ?? String(e);
  routesOk = false;
}

// ─── 2. RPCs chamadas ───
const rpcMap = collectMatches(allFiles, /supabase\.rpc\(['"]([a-z0-9_]+)['"]/g);

// ─── 3. Permission keys usadas ───
const permRegexes = [
  /perm=['"]([a-z][a-z0-9_.-]+)['"]/g,
  /requireKey:\s*['"]([a-z][a-z0-9_.-]+)['"]/g,
  /permission:\s*['"]([a-z][a-z0-9_.-]+)['"]/g,
];
const permMap = new Map();
for (const r of permRegexes) {
  const m = collectMatches(srcFiles, r);
  for (const [k, v] of m) {
    if (!permMap.has(k)) permMap.set(k, new Set());
    for (const loc of v) permMap.get(k).add(loc);
  }
}

// ─── Output ───
if (JSON_OUT) {
  console.log(JSON.stringify({
    routes_ok: routesOk,
    rpcs: Object.fromEntries([...rpcMap].map(([k, v]) => [k, [...v]])),
    permissions: Object.fromEntries([...permMap].map(([k, v]) => [k, [...v]])),
  }, null, 2));
  process.exit(routesOk ? 0 : 1);
}

console.log("\n════════════════════════════════════════════════════════════");
console.log("  SMOKE TESTS — Frente F4");
console.log("════════════════════════════════════════════════════════════\n");

console.log(`RPCs chamadas (únicas):       ${rpcMap.size}`);
console.log(`Permission keys (únicas):     ${permMap.size}`);
console.log(`Validação rotas:              ${routesOk ? "✅" : "❌"}`);

console.log("\n── RPCs (cruze contra pg_proc.proname schema=public) ──");
console.log([...rpcMap.keys()].sort().join(", "));

console.log("\n── Permission keys (cruze contra permissions_catalog.permission_key) ──");
console.log([...permMap.keys()].sort().join(", "));

console.log("\n── Relatório de rotas ──");
console.log(routesReport);

// ─── Drift contra baseline (modo --strict) ───
if (STRICT) {
  const { readFileSync: rf } = await import("node:fs");
  let baseline;
  try {
    baseline = JSON.parse(rf("scripts/baseline.json", "utf8"));
  } catch {
    console.error("\n❌ scripts/baseline.json ausente — rode F6 para gerar.");
    process.exit(1);
  }
  const curRpcs = new Set([...rpcMap.keys()]);
  const curPerms = new Set([...permMap.keys()]);
  const baseRpcs = new Set(baseline.rpcs);
  const basePerms = new Set(baseline.permissions);

  const newRpcs = [...curRpcs].filter(k => !baseRpcs.has(k));
  const goneRpcs = [...baseRpcs].filter(k => !curRpcs.has(k));
  const newPerms = [...curPerms].filter(k => !basePerms.has(k));
  const gonePerms = [...basePerms].filter(k => !curPerms.has(k));

  const drift = newRpcs.length || goneRpcs.length || newPerms.length || gonePerms.length;
  const hasRouteIssues = !routesOk;

  // Helpers de formatação
  const sample = (set, n = 3) => {
    if (!set) return [];
    const arr = [...set];
    const head = arr.slice(0, n);
    const more = arr.length - head.length;
    return more > 0 ? [...head, `… +${more} outros`] : head;
  };
  const printList = (label, items, locator) => {
    console.error(`\n  ${label} (${items.length}):`);
    for (const k of items.sort()) {
      console.error(`    • ${k}`);
      const locs = locator ? sample(locator.get(k)) : [];
      for (const l of locs) console.error(`        ${l}`);
    }
  };

  if (drift || hasRouteIssues) {
    console.error("\n════════════════════════════════════════════════════════════");
    console.error("  ❌ DRIFT DETECTADO contra scripts/baseline.json");
    console.error("════════════════════════════════════════════════════════════");

    if (newRpcs.length)   printList("+ RPCs NOVAS (chamadas no código, ausentes na baseline)", newRpcs, rpcMap);
    if (goneRpcs.length)  printList("- RPCs REMOVIDAS (na baseline, sem chamada no código)", goneRpcs, null);
    if (newPerms.length)  printList("+ PERMISSION KEYS NOVAS (usadas no código, ausentes na baseline)", newPerms, permMap);
    if (gonePerms.length) printList("- PERMISSION KEYS REMOVIDAS (na baseline, sem uso no código)", gonePerms, null);

    if (hasRouteIssues) {
      console.error("\n  ❌ ROTAS / LINKS / MENU quebrados:");
      // Extrai blocos relevantes do relatório de rotas
      const blocks = routesReport.split(/\n(?=═|⚠️|❌)/);
      for (const b of blocks) {
        if (/❌/.test(b)) {
          for (const line of b.split("\n")) console.error("    " + line);
        }
      }
    }

    console.error("\n────────────────────────────────────────────────────────────");
    console.error("  Como interpretar:");
    console.error("    • RPC NOVA  → criou função no código mas esqueceu migration / baseline");
    console.error("    • RPC REMOVIDA → renomeou/apagou; verifique call-sites antes de aceitar");
    console.error("    • PERM NOVA → adicionar em permissions_catalog (migration) + baseline");
    console.error("    • PERM REMOVIDA → catálogo precisa ser limpo ou código restaurado");
    console.error("    • ROTA QUEBRADA → link/menu aponta p/ path inexistente em App.tsx");
    console.error("\n  Se a mudança é INTENCIONAL, regenere a baseline:");
    console.error("    node scripts/smoke-tests.mjs --json > /tmp/smoke.json");
    console.error("    # revisar diff e atualizar scripts/baseline.json");
    console.error("    # ver scripts/README-baseline.md");
    console.error("────────────────────────────────────────────────────────────\n");
    process.exit(1);
  }
  console.log("\n✅ Baseline OK — sem drift de rotas, RPCs ou permissões.\n");
  process.exit(0);
}

if (!routesOk) process.exit(1);

