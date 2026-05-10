import { test as setup, expect } from "@playwright/test";
import { E2E_USERS, type E2eRole } from "../fixtures/users";
import { mkdirSync, existsSync, statSync } from "node:fs";

mkdirSync(".storage", { recursive: true });

const ROLES: E2eRole[] = ["admin", "medico", "paciente", "colaborador"];

// Considera storageState válido se foi escrito há menos de 6 horas.
// Tokens Supabase duram >1h; refresh ocorre na primeira request real do spec.
const STORAGE_FRESH_MS = 6 * 60 * 60 * 1000;

function storageIsFresh(path: string): boolean {
  if (!existsSync(path)) return false;
  const ageMs = Date.now() - statSync(path).mtimeMs;
  return ageMs < STORAGE_FRESH_MS;
}

for (const role of ROLES) {
  const user = E2E_USERS[role];

  setup(`autentica seed e2e: ${role}`, async ({ page, context }) => {
    // Skip determinístico: storageState recente já existe em disco.
    if (storageIsFresh(user.storage)) {
      setup.info().annotations.push({
        type: "auth",
        description: `storageState reutilizado (${user.storage})`,
      });
      return;
    }

    const doLogin = async () => {
      await page.goto("/auth", { waitUntil: "domcontentloaded" });
      await page.locator('input[name="email"]').first().fill(user.email);
      await page.locator('input[name="password"]').first().fill(user.password);
      await page.getByRole("button", { name: /entrar/i }).first().click();
      await page.waitForURL((url) => !new URL(url).pathname.startsWith("/auth"), {
        timeout: 25_000,
      });
    };

    await doLogin();

    const hasSession = await page.evaluate(() =>
      Object.keys(localStorage).some(
        (k) => k.includes("auth-token") || k.includes("supabase"),
      ),
    );
    expect(hasSession, `sessão não persistiu para ${role}`).toBe(true);

    await context.storageState({ path: user.storage });
  });
}
