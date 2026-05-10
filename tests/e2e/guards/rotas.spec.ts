import { test } from "@playwright/test";
import { E2E_USERS } from "../fixtures/users";
import { gotoApp, expectNoBlankScreen } from "../helpers/navigation";
import { expectAccessDenied } from "../helpers/rbac";

// ─── paciente tentando acessar área admin ─────────────────
test.describe("guard: paciente em rota admin", () => {
  test.use({ storageState: E2E_USERS.paciente.storage });

  test("paciente é bloqueado em /app/admin/dashboard", async ({ page }) => {
    await page.goto("/app/admin/dashboard", { waitUntil: "domcontentloaded" });
    await expectNoBlankScreen(page);
    await expectAccessDenied(page, "/app/admin/dashboard");
  });

  test("paciente é bloqueado em /app/admin/financeiro", async ({ page }) => {
    await page.goto("/app/admin/financeiro", { waitUntil: "domcontentloaded" });
    await expectNoBlankScreen(page);
    await expectAccessDenied(page, "/app/admin/financeiro");
  });
});

// ─── rota inexistente cai no catch-all sem tela branca ────
test.describe("guard: rota inexistente", () => {
  test.use({ storageState: E2E_USERS.admin.storage });

  test("/app/rota-que-nao-existe não derruba a UI", async ({ page }) => {
    await page.goto("/app/rota-que-nao-existe-totalmente", {
      waitUntil: "domcontentloaded",
    });
    await expectNoBlankScreen(page);
  });

  test("/uma-rota-publica-falsa cai no catch-all", async ({ page }) => {
    await page.goto("/uma-rota-publica-falsa-xyz", {
      waitUntil: "domcontentloaded",
    });
    await expectNoBlankScreen(page);
  });
});

// ─── colaborador tentando ver financeiro do admin ─────────
test.describe("guard: colaborador em rota admin financeira", () => {
  test.use({ storageState: E2E_USERS.colaborador.storage });

  test("colaborador é bloqueado em /app/admin/financeiro", async ({ page }) => {
    await page.goto("/app/admin/financeiro", { waitUntil: "domcontentloaded" });
    await expectNoBlankScreen(page);
    await expectAccessDenied(page, "/app/admin/financeiro");
  });
});

// ─── redirect legado secretaria → colaborador ─────────────
test.describe("redirect: secretaria → colaborador", () => {
  test.use({ storageState: E2E_USERS.colaborador.storage });

  test("/app/secretaria/dashboard redireciona para /app/colaborador/dashboard", async ({
    page,
  }) => {
    await page.goto("/app/secretaria/dashboard", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForURL(/\/app\/colaborador\/dashboard/, { timeout: 10_000 });
    await expectNoBlankScreen(page);
  });
});
