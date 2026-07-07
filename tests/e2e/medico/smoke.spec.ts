import { test, expect } from "@playwright/test";
import { gotoApp, expectNoLoaderForever } from "../helpers/navigation";

const ROTAS_MEDICO = [
  "/app/medico/dashboard",
  "/app/medico/agenda",
  "/app/medico/consultas",
  "/app/medico/horarios",
  "/app/medico/pacientes",
  "/app/medico/financeiro",
  "/app/medico/perfil",
  "/app/medico/servicos",
  "/app/medico/notificacoes",
  "/app/medico/documentos",
];

test.describe("medico / smoke ondas B", () => {
  for (const rota of ROTAS_MEDICO) {
    test(`renderiza ${rota} sem tela branca`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await gotoApp(page, rota);
      await expectNoLoaderForever(page);

      const main = page.locator("main").first();
      await expect(main).toBeVisible();

      // Nenhum erro fatal de runtime.
      expect(consoleErrors, `pageerror em ${rota}`).toHaveLength(0);
    });
  }

  test("dashboard tem heading principal", async ({ page }) => {
    await gotoApp(page, "/app/medico/dashboard");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
});
