import { test as setup, expect } from "@playwright/test";
import { E2E_USERS, type E2eRole } from "../fixtures/users";
import { mkdirSync } from "node:fs";

mkdirSync(".storage", { recursive: true });

const ROLES: E2eRole[] = ["admin", "medico", "paciente", "colaborador"];

for (const role of ROLES) {
  const user = E2E_USERS[role];

  setup(`autentica seed e2e: ${role}`, async ({ page, context }) => {
    await page.goto("/auth", { waitUntil: "domcontentloaded" });

    // form de login (tab "Entrar" já é o default)
    await page.locator('input[name="email"]').first().fill(user.email);
    await page.locator('input[name="password"]').first().fill(user.password);
    await page.getByRole("button", { name: /entrar/i }).first().click();

    // espera sair da tela /auth
    await page.waitForURL((url) => !url.pathname.startsWith("/auth"), {
      timeout: 20_000,
    });

    // sanity: tem sessão no localStorage
    const hasSession = await page.evaluate(() =>
      Object.keys(localStorage).some((k) => k.includes("auth-token") || k.includes("supabase"))
    );
    expect(hasSession, `sessão não persistiu para ${role}`).toBe(true);

    await context.storageState({ path: user.storage });
  });
}
