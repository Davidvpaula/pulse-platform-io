import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const excluded = new Set(['.git', 'node_modules', 'dist', 'test-results', 'playwright-report', 'docs']);
function walk(dir = '.') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (excluded.has(entry.name) || entry.name.startsWith('.env')) return [];
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? walk(path) : [path];
  });
}
mkdirSync('docs/audit', { recursive: true });
const files = walk().map(path => {
  const bytes = readFileSync(path);
  return { path: path.slice(2), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
});
const functions = files.filter(f => /^supabase\/functions\/[^/]+\/index.ts$/.test(f.path)).map(f => {
  const source = readFileSync(f.path, 'utf8');
  return { path: f.path, envNames: [...new Set([...source.matchAll(/Deno\.env\.get\(["']([^"']+)/g)].map(m => m[1]))], usesServiceRole: /SUPABASE_SERVICE_ROLE_KEY/.test(source), explicitAuthMarkers: /getUser\(|getClaims\(|has_role|Unauthorized|verify.*Signature|authorization/i.test(source) };
});
writeFileSync('docs/audit/inventory.json', JSON.stringify({ generatedAt: new Date().toISOString(), totalFiles: files.length, files, functions }, null, 2) + '\n');
writeFileSync('docs/audit/routes.txt', execFileSync(process.execPath, ['scripts/validate-routes.mjs'], { encoding: 'utf8' }));
writeFileSync('docs/audit/smoke.json', execFileSync(process.execPath, ['scripts/smoke-tests.mjs', '--json'], { encoding: 'utf8' }));
console.log(`${files.length} files inventoried; ${functions.length} edge functions. Auth markers are screening signals, not proof of security.`);
