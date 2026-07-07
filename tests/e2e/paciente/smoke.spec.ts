import { test, expect } from "@playwright/test";
import { gotoApp, expectNoLoaderForever } from "../helpers/navigation";

const ROTAS_PACIENTE = [
  "/app/paciente/dashboard",
  "/app/paciente/agendamentos",
  "/app/paciente/documentos",
  "/app/paciente/dependentes",
  "/app/paciente/financeiro",
  "/app/paciente/plano",
  "/app/paciente/mensagens",
  "/app/paciente/notificacoes",
  "/app/paciente/perfil",
];

test.describe("paciente / smoke ondas B", () => {
  for (const rota of ROTAS_PACIENTE) {
    test(`renderiza ${rota} sem tela branca`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await gotoApp(page, rota);
      await expectNoLoaderForever(page);

      const main = page.locator("main").first();
      await expect(main).toBeVisible();
      expect(consoleErrors, `pageerror em ${rota}`).toHaveLength(0);
    });
  }

  test("dashboard tem heading e link para agendamentos", async ({ page }) => {
    await gotoApp(page, "/app/paciente/dashboard");
    await expect(page.locator("h1, h2").first()).toBeVisible();

    const link = page.getByRole("link", { name: /agendamento/i }).first();
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      await expect(page).toHaveURL(/\/app\/paciente\/agendamentos/);
    }
  });
});
