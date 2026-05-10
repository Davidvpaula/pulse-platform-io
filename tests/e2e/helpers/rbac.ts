import { expect, type Page } from "@playwright/test";

/**
 * Valida que o usuário não tem permissão para a rota atual.
 * Aceita 3 sinais (qualquer um basta):
 *  - texto "Acesso restrito" / "sem permissão"
 *  - redirect para /app (URL diferente da pedida)
 *  - redirect para /auth (sessão perdida — também conta como bloqueio)
 */
export async function expectAccessDenied(page: Page, originalPath: string) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(800); // dá tempo para guard fazer redirect
  const currentUrl = new URL(page.url());
  const onSamePath = currentUrl.pathname === originalPath;

  if (!onSamePath) {
    // redirecionou — basta não estar mais na rota proibida
    expect(currentUrl.pathname).not.toBe(originalPath);
    return;
  }

  // ficou na mesma rota → precisa mostrar mensagem de bloqueio
  const body = await page.locator("body").innerText();
  expect(
    /acesso restrito|sem permiss|n[aã]o autorizado|forbidden/i.test(body),
    `esperava bloqueio em ${originalPath}, mas a página renderizou conteúdo`
  ).toBe(true);
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
