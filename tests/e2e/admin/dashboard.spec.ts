import { test, expect } from "@playwright/test";
import { gotoApp, expectNoLoaderForever } from "../helpers/navigation";

test.describe("admin / dashboard", () => {
  test("renderiza KPIs e sidebar sem tela branca", async ({ page }) => {
    await gotoApp(page, "/app/admin/dashboard");
    await expectNoLoaderForever(page);

    // pelo menos um KPI/card visível
    const cards = page.locator("[data-testid='kpi-card'], .card, [class*='Card']");
    expect(await cards.count()).toBeGreaterThan(0);

    // sidebar tem links
    const navLinks = page.locator("nav a, aside a");
    expect(await navLinks.count()).toBeGreaterThan(2);
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
