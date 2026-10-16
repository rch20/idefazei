import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const HOMOLOG_ORIGIN = "https://homolog.idefazei.com.br";
const baseUrl = process.env.STAGING_BASE_URL ?? HOMOLOG_ORIGIN;
const adminStatePath = process.env.PW_ADMIN_STORAGE_STATE_PATH;
const outputDir = path.resolve(
  process.env.FOUNDATION_E2E_OUTPUT_DIR ??
    path.join("playwright", ".auth", "foundation-e2e")
);

function assertHomologationOnly() {
  const origin = new URL(baseUrl).origin;
  if (origin !== HOMOLOG_ORIGIN) {
    throw new Error(
      `Bloqueado: este provisionador aceita exclusivamente ${HOMOLOG_ORIGIN}; alvo recebido: ${origin}`
    );
  }
  if (
    baseUrl.includes("idefazei.com.br") &&
    !baseUrl.includes("homolog.idefazei.com.br")
  ) {
    throw new Error(
      "Bloqueado: o provisionador não pode operar no domínio de produção."
    );
  }
  if (!adminStatePath) {
    throw new Error(
      "Informe PW_ADMIN_STORAGE_STATE_PATH apontando para um state autenticado de Pastor/Supervisor da homologação. O script não coleta nem imprime credenciais."
    );
  }
}

function runId() {
  return new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeAccount(role, id) {
  const label = role === "teacher" ? "Professor E2E" : "Aluno E2E";
  return {
    name: `${label} ${id}`,
    email: `idefazei.e2e.${role}.${id}@example.invalid`,
    password: `E2E-${role}-${id}-Seguro!2026`,
    phone: role === "teacher" ? "11900000001" : "11900000002",
  };
}

async function registerPublicAccount(page, account) {
  await page.goto(`${baseUrl}/cadastro`, { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: /cadastro/i })
    .first()
    .waitFor({ state: "visible" });

  await page.locator('input[autocomplete="name"]').fill(account.name);
  const emailInputs = page.locator('input[autocomplete="email"]');
  await emailInputs.nth(0).fill(account.email);
  await emailInputs.nth(1).fill(account.email);
  await page.locator('input[type="date"]').fill("1990-01-15");
  const phoneInputs = page.locator('input[autocomplete="tel"]');
  await phoneInputs.nth(0).fill(account.phone);
  await phoneInputs.nth(1).fill(account.phone);
  await page.locator('input[autocomplete="postal-code"]').fill("01310-100");
  await page.locator('input[autocomplete="address-line2"]').fill("100");
  await page
    .locator('input[autocomplete="address-line1"]')
    .fill("Avenida Paulista");
  await page.locator('input[autocomplete="address-level3"]').fill("Bela Vista");
  await page.locator('input[autocomplete="address-level2"]').fill("São Paulo");
  await page.locator('input[autocomplete="address-level1"]').fill("SP");
  const passwordInputs = page.locator('input[autocomplete="new-password"]');
  await passwordInputs.nth(0).fill(account.password);
  await passwordInputs.nth(1).fill(account.password);
  await page
    .getByRole("button", { name: "Enviar cadastro", exact: true })
    .click();

  await page
    .getByRole("heading", { name: "Confirme seu e-mail", exact: true })
    .waitFor({
      state: "visible",
      timeout: 30_000,
    });
  const alert = page.getByRole("alert");
  if (await alert.isVisible().catch(() => false)) {
    throw new Error(
      `Falha ao criar a conta sintética ${account.email}: ${await alert.innerText()}`
    );
  }
}

async function loginAndSaveState(browser, account, destination) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("E-mail ou telefone").fill(account.email);
  await page.getByLabel("Senha").fill(account.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
  await context.storageState({ path: destination });
  await context.close();
}

async function authorizeTeacher(page, teacher) {
  await page.goto(`${baseUrl}/app/escola-fundamentos`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("heading", { name: "Escola de Fundamentos", exact: true })
    .waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Organização", exact: true }).click();
  await page
    .getByRole("heading", { name: "Administradores de estudos", exact: true })
    .waitFor({ state: "visible" });

  const administratorSelect = page.getByRole("combobox").last();
  await administratorSelect.click();
  await page
    .getByRole("option", {
      name: new RegExp(escapeRegExp(`${teacher.name} · ${teacher.email}`)),
    })
    .click();
  await page.getByRole("button", { name: "Autorizar", exact: true }).click();
  await page
    .getByText("Administrador autorizado.", { exact: true })
    .waitFor({ state: "visible" });
}

async function main() {
  assertHomologationOnly();
  const id = runId();
  const teacher = makeAccount("teacher", id);
  const student = makeAccount("student", id);
  const teacherStatePath = path.join(outputDir, `teacher-${id}.json`);
  const studentStatePath = path.join(outputDir, `student-${id}.json`);
  const manifestPath = path.join(outputDir, `manifest-${id}.json`);

  await mkdir(outputDir, { recursive: true, mode: 0o700 });
  await chmod(outputDir, 0o700);

  const browser = await chromium.launch({ headless: true });
  try {
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();
    await registerPublicAccount(publicPage, teacher);
    await registerPublicAccount(publicPage, student);
    await publicContext.close();

    const adminState = JSON.parse(await readFile(adminStatePath, "utf8"));
    const adminContext = await browser.newContext({ storageState: adminState });
    const adminPage = await adminContext.newPage();
    await authorizeTeacher(adminPage, teacher);
    await adminContext.close();

    await loginAndSaveState(browser, teacher, teacherStatePath);
    await loginAndSaveState(browser, student, studentStatePath);

    const manifest = {
      baseUrl: HOMOLOG_ORIGIN,
      createdAt: new Date().toISOString(),
      runId: id,
      teacher: { ...teacher, storageStatePath: teacherStatePath },
      student: { ...student, storageStatePath: studentStatePath },
    };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
      mode: 0o600,
    });
    await chmod(manifestPath, 0o600);
    await chmod(teacherStatePath, 0o600);
    await chmod(studentStatePath, 0o600);

    process.stdout.write(
      `Provisionamento concluído somente em ${HOMOLOG_ORIGIN}.\nmanifest=${manifestPath}\n`
    );
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exitCode = 1;
});
