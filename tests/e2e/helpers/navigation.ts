import { test as base, expect, type Page } from "@playwright/test";

/**
 * Asserts que a página renderizou conteúdo (não está em branco).
 * Cobre o caso clássico de runtime error que apaga o React tree.
 */
export async function expectNoBlankScreen(page: Page) {
  const root = page.locator("#root");
  await expect(root).toBeVisible();
  // #root deve ter pelo menos 1 elemento filho real
  const childCount = await root.locator("> *").count();
  expect(childCount, "preview parece em branco (#root sem filhos)").toBeGreaterThan(0);
  // body precisa ter altura > 0
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  expect(bodyHeight, "body com altura zero").toBeGreaterThan(50);
}

/**
 * Espera spinners/skeletons sumirem em até `timeoutMs`.
 * Não falha se nunca houve loader — só se ele permanece além do limite.
 */
export async function expectNoLoaderForever(page: Page, timeoutMs = 10_000) {
  const loaderSelector =
    '[data-loading="true"], [aria-busy="true"], .animate-spin, [data-skeleton]';
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const visible = await page.locator(loaderSelector).count();
    if (visible === 0) return;
    await page.waitForTimeout(250);
  }
  const remaining = await page.locator(loaderSelector).count();
  expect(remaining, `loader ainda visível após ${timeoutMs}ms`).toBe(0);
}

/**
 * Atalho: navega para uma rota dentro do /app e valida tela não-branca.
 */
export async function gotoApp(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expectNoBlankScreen(page);
}

/** Re-export do test base para uso comum nos specs. */
export const test = base;
export { expect };
