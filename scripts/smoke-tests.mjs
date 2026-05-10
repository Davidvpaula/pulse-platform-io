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
  if (drift) {
    console.error("\n❌ DRIFT contra baseline (scripts/baseline.json):");
    if (newRpcs.length)  console.error("  + RPCs novos:    ", newRpcs.join(", "));
    if (goneRpcs.length) console.error("  - RPCs removidos:", goneRpcs.join(", "));
    if (newPerms.length) console.error("  + Perms novas:   ", newPerms.join(", "));
    if (gonePerms.length)console.error("  - Perms removidas:", gonePerms.join(", "));
    console.error("\n→ Se intencional, regenere a baseline com:");
    console.error("    node scripts/smoke-tests.mjs --json > /tmp/s.json && \\");
    console.error("    node -e \"...\" (ver F6) atualizando scripts/baseline.json");
    process.exit(1);
  }
  if (!routesOk) process.exit(1);
  console.log("\n✅ Baseline OK — sem drift de rotas, RPCs ou permissões.\n");
  process.exit(0);
}

if (!routesOk) process.exit(1);

