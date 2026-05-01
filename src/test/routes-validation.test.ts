import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

describe("Hardening de navegação", () => {
  it("não deve haver links 404, menus quebrados ou rotas duplicadas", () => {
    let output = "";
    let exitCode = 0;
    try {
      output = execSync("node scripts/validate-routes.mjs --strict", {
        encoding: "utf8",
        cwd: process.cwd(),
      });
    } catch (e: any) {
      output = (e.stdout ?? "") + (e.stderr ?? "");
      exitCode = e.status ?? 1;
    }

    if (exitCode !== 0) {
      // Falha o teste exibindo o relatório completo
      throw new Error(
        "Validação de rotas falhou. Relatório:\n\n" + output,
      );
    }

    expect(output).toContain("HARDENING DE NAVEGAÇÃO");
  }, 30_000);
});
