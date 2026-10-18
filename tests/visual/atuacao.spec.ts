import { expect, test, type Page, type TestInfo } from "@playwright/test";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type ReadOnlyHarness = {
  writes: string[];
  pageErrors: string[];
};

async function installReadOnlyGuards(page: Page): Promise<ReadOnlyHarness> {
  const harness: ReadOnlyHarness = { writes: [], pageErrors: [] };

  page.on("request", request => {
    if (WRITE_METHODS.has(request.method())) {
      harness.writes.push(`${request.method()} ${request.url()}`);
    }
  });
  page.on("pageerror", error => {
    harness.pageErrors.push(error.message);
  });
  await page.route("**/api/trpc/**", async route => {
    if (WRITE_METHODS.has(route.request().method())) {
      harness.writes.push(
        `${route.request().method()} ${route.request().url()}`
      );
      await route.abort();
      return;
    }
    await route.continue();
  });

  return harness;
}

async function openStudentFoundation(page: Page) {
  await page.goto("/app/escola-fundamentos", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Escola de Fundamentos", exact: true })
  ).toBeVisible();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

async function assertNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));

  expect(
    dimensions.scrollWidth,
    `overflow horizontal: scrollWidth=${dimensions.scrollWidth}, clientWidth=${dimensions.clientWidth}`
  ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  expect(dimensions.bodyScrollWidth).toBeLessThanOrEqual(
    dimensions.clientWidth + 1
  );
}

async function captureReadOnlyScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string
) {
  const screenshot = await page.screenshot({
    path: testInfo.outputPath(name),
    fullPage: true,
    animations: "disabled",
  });
  expect(screenshot.byteLength).toBeGreaterThan(0);
}

test.describe("Escola de Fundamentos — aluno mobile", () => {
  test("carrega a visão do aluno sem áreas administrativas", async ({
    page,
  }, testInfo) => {
    const harness = await installReadOnlyGuards(page);
    await openStudentFoundation(page);

    await expect(page.locator('nav[aria-label="Áreas da Escola"]')).toHaveCount(
      0
    );
    await expect(page.locator("body")).toContainText(
      /Minha preparação|Sua preparação ainda não foi liberada|Preparação em organização/
    );
    await assertNoHorizontalOverflow(page);
    await captureReadOnlyScreenshot(page, testInfo, "student-overview.png");

    expect(harness.pageErrors, "erros JavaScript na página").toEqual([]);
    expect(harness.writes, "requests de escrita proibidos").toEqual([]);
  });

  test("mantém as etapas e o progresso legíveis quando o estudo está liberado", async ({
    page,
  }, testInfo) => {
    const harness = await installReadOnlyGuards(page);
    await openStudentFoundation(page);

    const progress = page.getByLabel("Progresso do estudo");
    const steps = page.getByLabel("Etapas do estudo");
    const hasProgress = (await progress.count()) > 0;
    const hasSteps = (await steps.count()) > 0;

    if (hasProgress) {
      await expect(progress).toBeVisible();
      await expect(progress).toContainText(/partes concluídas/);
      await expect(page.locator("body")).toContainText("Parte atual:");
    }
    if (hasSteps) {
      await expect(steps).toBeVisible();
    }

    await assertNoHorizontalOverflow(page);
    await captureReadOnlyScreenshot(page, testInfo, "student-progress.png");

    expect(harness.pageErrors, "erros JavaScript na página").toEqual([]);
    expect(harness.writes, "requests de escrita proibidos").toEqual([]);
  });

  test("mantém o cabeçalho do estudo compacto e o progresso acessível", async ({
    page,
  }, testInfo) => {
    const harness = await installReadOnlyGuards(page);
    await openStudentFoundation(page);

    const openStudyButton = page
      .getByRole("button", { name: /Continuar estudo|Começar estudo/ })
      .first();
    if ((await openStudyButton.count()) === 0) {
      test.skip(
        true,
        "Nenhum estudo liberado está disponível para a matrícula de homologação."
      );
      return;
    }

    await openStudyButton.click();
    const header = page.getByTestId("foundation-study-reader-header");
    await expect(header).toBeVisible();
    await expect(header).toContainText(
      "Você pode voltar sem perder o que escreveu."
    );
    await expect(
      page.getByTestId("foundation-study-reader-progress")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sair do estudo" })
    ).toBeVisible();

    const headerSize = await header.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    });
    expect(headerSize.height).toBeLessThan(230);
    expect(headerSize.width).toBeGreaterThan(0);
    await assertNoHorizontalOverflow(page);
    await captureReadOnlyScreenshot(
      page,
      testInfo,
      "student-study-compact-header.png"
    );

    expect(harness.pageErrors, "erros JavaScript na página").toEqual([]);
    expect(
      harness.writes.every(url =>
        /escolaFundamentos\.(startLesson|viewStudyBlock)/.test(url)
      ),
      "somente mutations de abertura/leitura foram bloqueadas localmente"
    ).toBe(true);
  });
});
