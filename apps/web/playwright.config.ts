import { defineConfig, devices } from "@playwright/test";

const webPort = Number(process.env.BREWLITE_E2E_WEB_PORT ?? 3100);
const apiPort = Number(process.env.BREWLITE_E2E_API_PORT ?? 3101);
const localWebOrigin = `http://127.0.0.1:${webPort}`;
const webOrigin = process.env.BREWLITE_E2E_BASE_URL ?? localWebOrigin;
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const bffSecret = "browser-e2e-bff-secret";
const useExternalStack = Boolean(process.env.BREWLITE_E2E_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: webOrigin,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: useExternalStack
    ? undefined
    : [
        {
          command: "node e2e/support/mock-api.mjs",
          url: `${apiOrigin}/__e2e/health`,
          timeout: 30_000,
          reuseExistingServer: false,
          env: {
            PORT: String(apiPort),
            BFF_PROXY_SECRET: bffSecret,
          },
        },
        {
          command: "npm run dev",
          url: localWebOrigin,
          timeout: 120_000,
          reuseExistingServer: false,
          env: {
            PORT: String(webPort),
            BIND_ADDRESS: "127.0.0.1",
            API_INTERNAL_URL: apiOrigin,
            APP_ORIGIN: localWebOrigin,
            BFF_PROXY_SECRET: bffSecret,
            NEXT_TELEMETRY_DISABLED: "1",
          },
        },
      ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
