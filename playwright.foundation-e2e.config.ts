import { defineConfig, devices } from "@playwright/test";

const stagingBaseUrl = process.env.STAGING_BASE_URL;
if (!stagingBaseUrl) {
  throw new Error("STAGING_BASE_URL_REQUIRED");
}

const stagingUrl = new URL(stagingBaseUrl);
if (stagingUrl.origin !== "https://homolog.idefazei.com.br") {
  throw new Error(
    `FOUNDATION_E2E_TARGET_MUST_BE_HOMOLOG: ${stagingUrl.origin}`
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: stagingBaseUrl,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "foundation-e2e-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        isMobile: false,
      },
    },
  ],
});
