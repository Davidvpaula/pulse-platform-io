import { test, expect } from "@playwright/test";
import { gotoApp, expectNoLoaderForever } from "../helpers/navigation";

test.describe("admin / NOC", () => {
  test("NOC renderiza conteúdo operacional", async ({ page }) => {
    await gotoApp(page, "/app/admin/noc");
    await expectNoLoaderForever(page, 15_000);

    // Heading visível.
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // <main> com texto não-trivial (KPIs/alertas renderizaram alguma coisa).
    const main = page.locator("main").first();
    const text = (await main.innerText()).trim();
    expect(text.length, "<main> do NOC sem conteúdo").toBeGreaterThan(50);
  });
});
