import { test, expect } from "@playwright/test";
import { gotoApp, expectNoLoaderForever } from "../helpers/navigation";

test.describe("admin / NOC", () => {
  test("NOC renderiza KPIs operacionais", async ({ page }) => {
    await gotoApp(page, "/app/admin/noc");
    await expectNoLoaderForever(page, 15_000);

    await expect(page.locator("h1, h2").first()).toBeVisible();

    // espera ALGUMA métrica/seção carregar (lista de alertas, cards, etc.)
    const sections = page.locator("section, .card, [class*='Card']");
    expect(await sections.count()).toBeGreaterThan(0);
  });
});
