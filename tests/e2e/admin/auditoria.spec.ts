import { test, expect } from "@playwright/test";
import { gotoApp, expectNoLoaderForever } from "../helpers/navigation";

test.describe("admin / auditoria", () => {
  test("página de auditoria carrega e responde a filtros via URL", async ({ page }) => {
    await gotoApp(page, "/app/admin/auditoria");
    await expectNoLoaderForever(page);
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Filtro via querystring (rota suporta ?tab=painel)
    await page.goto("/app/admin/auditoria?tab=painel", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/auditoria\?tab=painel/);
  });
});
