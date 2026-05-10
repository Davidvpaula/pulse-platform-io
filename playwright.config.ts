import { defineConfig, devices } from "@playwright/test";

const BASE_URL =
  process.env.E2E_BASE_URL ?? "https://pulse-platform-io.lovable.app";

export default defineConfig({
  testDir: "./tests/e2e",
  // Não rodar specs em paralelo dentro do mesmo arquivo — mantém logs simples.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }], ["list"]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // Setup roda primeiro e gera os 4 storageStates.
    // Recebe overrides: timeout maior + 1 retry extra (login pode flakeiar
    // por jitter de rede / cold start do preview Lovable).
    {
      name: "setup",
      testMatch: /auth\/auth\.setup\.ts/,
      timeout: 90_000,
      retries: process.env.CI ? 2 : 0,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "admin",
      testMatch: /admin\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".storage/admin.json",
      },
    },
    {
      name: "guards",
      testMatch: /guards\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        // guards usa storageState dinâmico via test.use() em cada spec
      },
    },
  ],
});
