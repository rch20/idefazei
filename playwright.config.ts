import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const stagingBaseUrl = process.env.STAGING_BASE_URL;
if (!stagingBaseUrl) {
  throw new Error("STAGING_BASE_URL_REQUIRED");
}

const stagingUrl = new URL(stagingBaseUrl);
if (stagingUrl.hostname !== "homolog.idefazei.com.br") {
  throw new Error(`MOBILE_TEST_TARGET_MUST_BE_HOMOLOG: ${stagingUrl.hostname}`);
}

const configuredStatePath =
  process.env.PW_STORAGE_STATE_PATH ?? "playwright/.auth/student-homolog.json";
const storageState = path.isAbsolute(configuredStatePath)
  ? configuredStatePath
  : path.resolve(process.cwd(), configuredStatePath);

export default defineConfig({
  testDir: "./tests/visual",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: stagingBaseUrl,
    storageState,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "mobile-375",
      use: {
        ...devices["iPhone SE"],
        viewport: { width: 375, height: 812 },
        isMobile: true,
      },
    },
    {
      name: "mobile-390",
      use: {
        ...devices["iPhone 13"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
    {
      name: "tablet-768",
      use: {
        ...devices["iPad Mini"],
        viewport: { width: 768, height: 1024 },
        isMobile: true,
      },
    },
    {
      name: "desktop-1280",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        isMobile: false,
      },
    },
  ],
});
