import { expect, test, type Page } from "@playwright/test";

const FORBIDDEN_MUTATIONS = [
  /schedules\.(create|update|cancel)/i,
  /ministries\.(create|update|archive|delete|remove|add)/i,
];

function collectForbiddenRequests(page: Page) {
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (FORBIDDEN_MUTATIONS.some((pattern) => pattern.test(url))) {
      requests.push(`${request.method()} ${url}`);
    }
  });
  return requests;
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    documentWidth: document.documentElement.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
    horizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 ||
      document.body.scrollWidth > document.body.clientWidth + 1,
  }));

  expect(metrics.horizontalOverflow, JSON.stringify(metrics)).toBe(false);
}

async function settleFonts(page: Page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
}

test.describe("Escalas — regressão visual diária", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/escalas", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Escalas" })).toBeVisible();
    await settleFonts(page);
  });

  test("não possui overflow horizontal no calendário", async ({ page }) => {
    await expectNoHorizontalOverflow(page);
  });

  test("mantém o calendário e estado vazio visualmente estáveis", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Mês anterior" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Próximo mês" })).toBeVisible();
    await expect(page.getByText("Resumo do Mês")).toBeVisible();
    await expect(page.getByText("Escolha um dia")).toBeVisible();
    await expect(page).toHaveScreenshot("escalas-calendar.png", { fullPage: true });
  });

  test("limpa a seleção ao trocar de mês", async ({ page }) => {
    const forbiddenRequests = collectForbiddenRequests(page);
    const day = page.getByRole("button", { name: /Selecionar 6 de/ });

    await expect(day).toBeVisible();
    await day.click();
    await expect(page.getByRole("heading", { name: /Escala —/ })).toBeVisible();

    await page.getByRole("button", { name: "Próximo mês" }).click();
    await expect(page.getByRole("heading", { name: "Escolha um dia" })).toBeVisible();
    await expect(page.locator('button[aria-pressed="true"]')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    expect(forbiddenRequests).toEqual([]);
  });
});

test.describe("Ministérios — regressão visual diária", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/ministerios", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Ministérios" })).toBeVisible();
    await settleFonts(page);
  });

  test("não possui overflow horizontal no estado vazio", async ({ page }) => {
    await expectNoHorizontalOverflow(page);
  });

  test("mantém o estado vazio e os cards visualmente estáveis", async ({ page }) => {
    await expect(page.getByText("Nenhum ministério por aqui")).toBeVisible();
    await expect(page.getByRole("button", { name: "Novo Ministério" })).toBeVisible();
    await expect(page).toHaveScreenshot("ministerios-empty.png", { fullPage: true });
  });

  test("valida busca, limpeza e modal sem mutation", async ({ page }) => {
    const forbiddenRequests = collectForbiddenRequests(page);
    const search = page.getByPlaceholder("Buscar equipe ou Ministério...");

    await search.fill("Ministério inexistente");
    await expect(page.getByText("Nenhum ministério encontrado")).toBeVisible();
    await page.getByRole("button", { name: "Limpar busca" }).click();
    await expect(page.getByText("Nenhum ministério por aqui")).toBeVisible();

    await page.getByRole("button", { name: "Novo Ministério" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Nome do Ministério")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Criar" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(forbiddenRequests).toEqual([]);
  });
});
