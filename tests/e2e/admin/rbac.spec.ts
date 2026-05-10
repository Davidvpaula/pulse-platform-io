import { test, expect } from "@playwright/test";
import { gotoApp } from "../helpers/navigation";
import { expectMenuItemVisible } from "../helpers/rbac";

test.describe("admin / RBAC", () => {
  test("admin enxerga menus do painel admin", async ({ page }) => {
    await gotoApp(page, "/app/admin/dashboard");
    // Pelo menos um link óbvio do escopo admin precisa estar visível
    await expectMenuItemVisible(page, "auditoria");
  });
});
