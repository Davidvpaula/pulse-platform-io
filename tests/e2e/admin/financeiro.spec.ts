import { test, expect } from "@playwright/test";
import { gotoApp, expectNoLoaderForever } from "../helpers/navigation";

test.describe("admin / financeiro", () => {
  test("dashboard financeiro abre sem runtime error", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (e) => consoleErrors.push(e.message));

    await gotoApp(page, "/app/admin/financeiro");
    await expectNoLoaderForever(page);

    // existe ALGUM heading
    await expect(page.locator("h1, h2").first()).toBeVisible();

    expect(
      consoleErrors,
      `runtime errors: ${consoleErrors.join(" | ")}`
    ).toHaveLength(0);
  });

  test("ledger observabilidade abre", async ({ page }) => {
    await gotoApp(page, "/app/admin/financeiro/ledger-observabilidade");
    await expectNoLoaderForever(page);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
});
