import { expect, test, type Page, type TestInfo } from "@playwright/test";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type ReadOnlyHarness = {
  writes: string[];
  pageErrors: string[];
};

function installReadOnlyGuards(page: Page): ReadOnlyHarness {
  const harness: ReadOnlyHarness = { writes: [], pageErrors: [] };

  page.on("request", request => {
    if (WRITE_METHODS.has(request.method())) {
      harness.writes.push(`${request.method()} ${request.url()}`);
    }
  });
  page.on("pageerror", error => {
    harness.pageErrors.push(error.message);
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
    const harness = installReadOnlyGuards(page);
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
    const harness = installReadOnlyGuards(page);
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
});
