import { test as base, expect, type Page } from "@playwright/test";

const LOADER_SELECTOR =
  '[data-loading="true"], [aria-busy="true"], .animate-spin, [data-skeleton]';

/**
 * Asserts que a página renderizou conteúdo (não está em branco).
 * Cobre o caso clássico de runtime error que apaga o React tree.
 */
export async function expectNoBlankScreen(page: Page) {
  const root = page.locator("#root");
  await expect(root).toBeVisible();
  const childCount = await root.locator("> *").count();
  expect(childCount, "preview parece em branco (#root sem filhos)").toBeGreaterThan(0);
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  expect(bodyHeight, "body com altura zero").toBeGreaterThan(50);
}

/**
 * Espera spinners/skeletons sumirem.
 *
 * Comportamento:
 *  - Se nenhum loader aparecer dentro de `appearWindowMs` (default 1s), retorna OK.
 *    (A ausência de loader não é falha — só significa que a página renderizou direto.)
 *  - Se aparecer, espera o primeiro ficar `detached` em até `timeoutMs`.
 *  - Sem loops com waitForTimeout.
 */
export async function expectNoLoaderForever(
  page: Page,
  timeoutMs = 10_000,
  appearWindowMs = 1_000,
) {
  const loader = page.locator(LOADER_SELECTOR).first();
  try {
    await loader.waitFor({ state: "visible", timeout: appearWindowMs });
  } catch {
    return; // nenhum loader apareceu — OK
  }
  await loader.waitFor({ state: "detached", timeout: timeoutMs });
}

/**
 * Atalho: navega para uma rota e valida tela não-branca.
 */
export async function gotoApp(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expectNoBlankScreen(page);
}

export const test = base;
export { expect };
