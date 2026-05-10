import { expect, type Page } from "@playwright/test";

const ACCESS_DENIED_REGEX = /acesso restrito|sem permiss|n[aã]o autorizado|forbidden/i;

/**
 * Valida que o usuário não tem permissão para a rota atual.
 *
 * Determinístico: corre 2 condições em paralelo e ganha a primeira que resolver,
 * em até `timeoutMs`:
 *  1. URL muda (qualquer redirect — para /app, /auth, etc).
 *  2. Texto de bloqueio aparece (acesso restrito / sem permissão / etc).
 *
 * Se nenhuma das duas acontecer dentro do timeout, falha com diagnóstico
 * (URL final + snippet do <main>).
 */
export async function expectAccessDenied(
  page: Page,
  originalPath: string,
  timeoutMs = 8_000,
) {
  const urlChanged = page
    .waitForURL(
      (url) => new URL(url).pathname !== originalPath,
      { timeout: timeoutMs },
    )
    .then(() => "url-changed" as const);

  const blockMessage = page
    .getByText(ACCESS_DENIED_REGEX)
    .first()
    .waitFor({ state: "visible", timeout: timeoutMs })
    .then(() => "block-message" as const);

  try {
    await Promise.race([urlChanged, blockMessage]);
    return;
  } catch {
    const finalUrl = page.url();
    const mainText = await page
      .locator("main")
      .first()
      .innerText()
      .catch(() => "(sem <main>)");
    expect.fail(
      `expectAccessDenied falhou em ${originalPath}\n` +
        `URL final: ${finalUrl}\n` +
        `Snippet <main>: ${mainText.slice(0, 300)}`,
    );
  }
}

/** Verifica que um item de menu (por texto) NÃO está visível na sidebar. */
export async function expectMenuItemHidden(page: Page, label: string) {
  const item = page.getByRole("link", { name: new RegExp(label, "i") });
  await expect(item).toHaveCount(0);
}

/** Verifica que um item de menu (por texto) está visível. */
export async function expectMenuItemVisible(page: Page, label: string) {
  const item = page.getByRole("link", { name: new RegExp(label, "i") });
  await expect(item.first()).toBeVisible();
}
