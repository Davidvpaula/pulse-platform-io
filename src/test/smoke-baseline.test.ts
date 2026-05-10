import { describe, it } from "vitest";
import { execSync } from "node:child_process";

describe("F6 — Baseline congelada (smoke + drift)", () => {
  it("não deve haver drift de rotas, RPCs ou permissões vs scripts/baseline.json", () => {
    let output = "";
    let exitCode = 0;
    try {
      output = execSync("node scripts/smoke-tests.mjs --strict", {
        encoding: "utf8",
        cwd: process.cwd(),
      });
    } catch (e: any) {
      output = (e.stdout ?? "") + (e.stderr ?? "");
      exitCode = e.status ?? 1;
    }
    if (exitCode !== 0) {
      throw new Error(
        "Smoke baseline falhou. Se a mudança é intencional, regenere scripts/baseline.json.\n\n" +
          output,
      );
    }
  }, 60_000);
});
