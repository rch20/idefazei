import { chromium } from "@playwright/test";
import { mkdir, chmod } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const HOMOLOG_ORIGIN = "https://homolog.idefazei.com.br";
const baseUrl = process.env.STAGING_BASE_URL ?? HOMOLOG_ORIGIN;
const email = process.env.HOMOLOG_ADMIN_EMAIL?.trim();
const password = process.env.HOMOLOG_ADMIN_PASSWORD;
const outputPath = path.resolve(
  process.env.HOMOLOG_ADMIN_STATE_PATH ?? "playwright/.auth/pastor-homolog.json"
);

function assertHomologationOnly() {
  const origin = new URL(baseUrl).origin;
  if (origin !== HOMOLOG_ORIGIN) {
    throw new Error(
      `Bloqueado: este script aceita exclusivamente ${HOMOLOG_ORIGIN}; alvo recebido: ${origin}`
    );
  }
  if (!email || !password) {
    throw new Error(
      "Defina HOMOLOG_ADMIN_EMAIL e HOMOLOG_ADMIN_PASSWORD somente no shell local. Nunca envie credenciais pelo chat."
    );
  }
}

async function main() {
  assertHomologationOnly();
  await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  await chmod(path.dirname(outputPath), 0o700);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("E-mail ou telefone").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL(/\/app\//, { timeout: 30_000 });

    await page.goto(`${baseUrl}/app/escola-fundamentos`, {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("heading", { name: "Escola de Fundamentos", exact: true })
      .waitFor({ state: "visible", timeout: 30_000 });

    await context.storageState({ path: outputPath });
    await chmod(outputPath, 0o600);
    process.stdout.write(
      `State criado somente para ${HOMOLOG_ORIGIN}: ${outputPath}\n`
    );
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(error => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exitCode = 1;
});
