import { test, expect } from "@playwright/test";
import { gotoApp, expectNoLoaderForever } from "../helpers/navigation";

test.describe("admin / dashboard", () => {
  test("renderiza conteúdo principal e sidebar sem tela branca", async ({ page }) => {
    await gotoApp(page, "/app/admin/dashboard");
    await expectNoLoaderForever(page);

    // Conteúdo principal: <main> existe e tem texto não-vazio.
    const main = page.locator("main").first();
    await expect(main).toBeVisible();
    const text = (await main.innerText()).trim();
    expect(text.length, "<main> sem texto").toBeGreaterThan(20);

    // Pelo menos um heading visível na página.
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Sidebar/nav tem ao menos 1 link (pode estar collapsed em viewport CI).
    const navLinks = page.locator("nav a, aside a");
    expect(await navLinks.count()).toBeGreaterThanOrEqual(1);
  });

  test("CTA para auditoria navega corretamente", async ({ page }) => {
    await gotoApp(page, "/app/admin/dashboard");
    const auditoriaLink = page
      .getByRole("link", { name: /auditoria/i })
      .first();
    if (await auditoriaLink.isVisible().catch(() => false)) {
      await auditoriaLink.click();
      await expect(page).toHaveURL(/\/app\/admin\/auditoria/);
    }
  });
});
