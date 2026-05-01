#!/usr/bin/env node
/**
 * Hardening de navegação — script de validação automática de rotas.
 *
 * Cruza:
 *   1. Rotas declaradas em src/App.tsx (Routes)
 *   2. Itens de menu em src/lib/profiles.ts
 *   3. Links no código (<Link to="...">, navigate("..."), redirect to)
 *
 * Detecta:
 *   • Links 404 (apontam para rota inexistente)
 *   • Rotas órfãs (declaradas, mas sem link em código nem menu)
 *   • Rotas duplicadas (mesma path declarada > 1x)
 *   • Itens de menu apontando para rotas inexistentes
 *
 * Uso:
 *   node scripts/validate-routes.mjs            # relatório
 *   node scripts/validate-routes.mjs --strict   # exit 1 se achar problemas
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const SRC = join(ROOT, "src");
const STRICT = process.argv.includes("--strict");

/* ─── 1. Coletar rotas declaradas em App.tsx ─── */

const appSrc = readFileSync(join(SRC, "App.tsx"), "utf8");

// Captura: <Route path="..." ...>
const routeRe = /<Route\s+(?:[^>]*?\s)?path="([^"]+)"/g;
const declaredRoutes = [];
const duplicates = new Map(); // path -> count
let m;
while ((m = routeRe.exec(appSrc)) !== null) {
  let p = m[1].trim();
  if (p === "*" || p === "") continue;
  // Normaliza rotas relativas dentro de <Route path="/app">
  // Por convenção, se não começa com "/", é filha do bloco /app
  if (!p.startsWith("/")) p = "/app/" + p;
  declaredRoutes.push(p);
  duplicates.set(p, (duplicates.get(p) ?? 0) + 1);
}

const declaredSet = new Set(declaredRoutes);
const duplicatedPaths = [...duplicates.entries()].filter(([, n]) => n > 1).map(([p]) => p);

/* ─── 2. Coletar links no código ─── */

const linkPatterns = [
  /<Link[^>]+to=["']([^"']+)["']/g,
  /\bnavigate\(\s*["']([^"']+)["']/g,
  /<Navigate[^>]+to=["']([^"']+)["']/g,
];

const linkUsages = []; // { path, file, line }

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (["node_modules", ".git", "dist", "build"].includes(entry)) continue;
      walk(full);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      const content = readFileSync(full, "utf8");
      const lines = content.split("\n");
      for (const re of linkPatterns) {
        let mm;
        re.lastIndex = 0;
        while ((mm = re.exec(content)) !== null) {
          const link = mm[1];
          if (!link.startsWith("/app") && !link.startsWith("/")) continue;
          if (link.startsWith("//") || link.startsWith("/http")) continue;
          // Ignora links com query string ou anchor para checagem
          const cleanPath = link.split("?")[0].split("#")[0];
          // Calcula linha
          const upTo = content.slice(0, mm.index);
          const line = upTo.split("\n").length;
          linkUsages.push({ path: cleanPath, raw: link, file: relative(ROOT, full), line });
        }
      }
    }
  }
}
walk(SRC);

/* ─── 3. Coletar itens de menu de profiles.ts ─── */

const profilesSrc = readFileSync(join(SRC, "lib", "profiles.ts"), "utf8");
const menuRe = /to:\s*["']([^"']+)["']/g;
const menuLinks = [];
while ((m = menuRe.exec(profilesSrc)) !== null) {
  if (m[1].startsWith("/")) menuLinks.push(m[1]);
}

/* ─── 4. Análise: matcher de rota dinâmica ─── */

/** Converte path declarado (com :param) em RegExp. */
function declaredToRegex(declared) {
  const escaped = declared
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/:\w+/g, "[^/]+")
    .replace(/\*$/, ".*");
  return new RegExp("^" + escaped + "$");
}
const declaredRegexes = declaredRoutes.map(p => ({ path: p, re: declaredToRegex(p) }));

function isDeclared(path) {
  if (declaredSet.has(path)) return true;
  return declaredRegexes.some(({ re }) => re.test(path));
}

/* ─── 5. Detectar problemas ─── */

// 5a. Links 404
const broken = linkUsages.filter(l => !isDeclared(l.path));

// 5b. Rotas órfãs (sem link em código nem menu)
const usedPaths = new Set([
  ...linkUsages.map(l => l.path),
  ...menuLinks,
]);
const orphanRoutes = declaredRoutes.filter(p => {
  // Ignora rotas catch-all e dinâmicas (que normalmente são acessadas via navigate dinâmico)
  if (p.includes(":") || p.endsWith("*")) return false;
  // Verifica se algum link bate (declarado X usado) — usando regex inversa
  const re = declaredToRegex(p);
  for (const u of usedPaths) {
    if (re.test(u)) return false;
    if (u === p) return false;
  }
  return true;
});

// 5c. Itens de menu para rotas inexistentes
const menuBroken = menuLinks.filter(l => !isDeclared(l));

/* ─── 6. Relatório ─── */

function header(title) {
  console.log("\n" + "═".repeat(60));
  console.log("  " + title);
  console.log("═".repeat(60));
}

header("HARDENING DE NAVEGAÇÃO");
console.log(`Rotas declaradas:    ${declaredRoutes.length}`);
console.log(`Links no código:     ${linkUsages.length}`);
console.log(`Itens de menu:       ${menuLinks.length}`);

let hasIssues = false;

if (duplicatedPaths.length) {
  hasIssues = true;
  header(`❌ ROTAS DUPLICADAS (${duplicatedPaths.length})`);
  duplicatedPaths.forEach(p => console.log("  • " + p + `  (${duplicates.get(p)}x)`));
}

if (broken.length) {
  hasIssues = true;
  header(`❌ LINKS PARA ROTAS INEXISTENTES (${broken.length})`);
  // Agrupa por path
  const grouped = new Map();
  broken.forEach(b => {
    if (!grouped.has(b.path)) grouped.set(b.path, []);
    grouped.get(b.path).push(`${b.file}:${b.line}`);
  });
  for (const [path, files] of grouped) {
    console.log(`  • ${path}`);
    files.slice(0, 3).forEach(f => console.log(`      ${f}`));
    if (files.length > 3) console.log(`      … +${files.length - 3} outros`);
  }
}

if (menuBroken.length) {
  hasIssues = true;
  header(`❌ MENU APONTANDO PARA ROTA INEXISTENTE (${menuBroken.length})`);
  menuBroken.forEach(p => console.log("  • " + p));
}

if (orphanRoutes.length) {
  header(`⚠️  ROTAS ÓRFÃS — declaradas mas sem link nem menu (${orphanRoutes.length})`);
  console.log("    (não é erro; podem ser acessadas via URL direta)");
  orphanRoutes.forEach(p => console.log("  • " + p));
}

if (!hasIssues && !orphanRoutes.length) {
  console.log("\n✅ Tudo certo. Navegação consistente.\n");
} else if (!hasIssues) {
  console.log("\n✅ Sem erros. Apenas avisos informativos.\n");
} else {
  console.log("\n❌ Problemas encontrados acima.\n");
}

if (STRICT && hasIssues) {
  process.exit(1);
}
