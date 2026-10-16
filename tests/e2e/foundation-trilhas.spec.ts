import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.describe("Escola de Fundamentos — trilha ponta a ponta", () => {
  test("professor cria estudo e aluno percorre as quatro etapas", async ({
    browser,
  }) => {
    const baseUrl =
      process.env.STAGING_BASE_URL ?? "https://homolog.idefazei.com.br";
    expect(new URL(baseUrl).origin).toBe("https://homolog.idefazei.com.br");
    expect(new URL(baseUrl).hostname).toBe("homolog.idefazei.com.br");

    const manifestPath = process.env.FOUNDATION_E2E_MANIFEST;
    expect(
      manifestPath,
      "FOUNDATION_E2E_MANIFEST deve apontar para um manifesto local protegido"
    ).toBeTruthy();
    const manifest = JSON.parse(await readFile(manifestPath!, "utf8")) as {
      baseUrl: string;
      teacher: { email: string; storageStatePath: string };
      student: { name: string; email: string; storageStatePath: string };
    };
    expect(manifest.baseUrl).toBe("https://homolog.idefazei.com.br");

    const teacherContext = await browser.newContext({
      storageState: manifest.teacher.storageStatePath,
    });
    const studentContext = await browser.newContext({
      storageState: manifest.student.storageStatePath,
    });
    const teacherPage = await teacherContext.newPage();
    const studentPage = await studentContext.newPage();

    try {
      for (const page of [teacherPage, studentPage]) {
        page.on("request", request => {
          expect(
            new URL(request.url()).origin,
            "nenhuma requisição pode sair da homologação"
          ).toBe("https://homolog.idefazei.com.br");
        });
      }

      const suffix = new Date()
        .toISOString()
        .replace(/[-:.TZ]/g, "")
        .slice(0, 14);
      const courseName = `E2E Fundamentos ${suffix}`;
      const moduleName = `E2E Alicerces ${suffix}`;
      const studyName = `E2E Estudo ${suffix}`;
      const note = `Anotação E2E ${suffix}`;
      const studyWeekStart = getSaoPauloCivilDate();

      await openFoundationAdmin(teacherPage, baseUrl);
      await createCourse(teacherPage, courseName);
      await enrollStudent(teacherPage, courseName, manifest.student.name);
      await openFoundationAdmin(teacherPage, baseUrl);
      await pageSelectOption(
        teacherPage.getByRole("combobox").first(),
        courseName
      );
      await teacherPage
        .getByPlaceholder("Ex.: Alicerces da fé")
        .fill(moduleName);
      await teacherPage
        .getByPlaceholder("Objetivo do módulo (opcional)")
        .fill("Organizar a primeira sequência do estudo.");
      await teacherPage
        .getByRole("button", { name: "Criar módulo", exact: true })
        .click();
      await teacherPage
        .getByText(moduleName, { exact: true })
        .waitFor({ state: "visible" });

      const studyManagement = teacherPage
        .getByRole("heading", { name: "Estudos e sequência", exact: true })
        .locator("..")
        .locator("..");
      const studySelects = studyManagement.getByRole("combobox");
      await pageSelectOption(studySelects.nth(0), courseName);
      await pageSelectOption(studySelects.nth(1), "Usar modelo bíblico");
      await pageSelectOption(studySelects.nth(2), moduleName);
      await teacherPage.locator("#study-title").fill(studyName);
      await teacherPage
        .locator('input[type="date"]')
        .last()
        .fill(studyWeekStart);
      await teacherPage
        .locator("#study-summary")
        .fill("Estudo criado pelo roteiro E2E protegido.");
      await teacherPage
        .locator("#study-content")
        .fill(
          "Introdução usada para confirmar a passagem do editor para a experiência do aluno."
        );
      await studyManagement
        .getByRole("button", { name: "Criar estudo", exact: true })
        .click();
      await teacherPage
        .getByText(studyName, { exact: true })
        .last()
        .waitFor({ state: "visible" });

      await teacherPage
        .getByRole("button", { name: "Estudos", exact: true })
        .click();
      await teacherPage.getByText("Trilha e conteúdo", { exact: true }).click();
      const studyToggle = teacherPage.getByRole("button", {
        name: new RegExp(
          `${escapeRegExp(studyName)}.*Ver partes, perguntas e materiais`
        ),
      });
      await studyToggle.click();
      await teacherPage
        .getByText("Leia", { exact: true })
        .waitFor({ state: "visible" });
      await expect(
        teacherPage.getByText("Entenda", { exact: true })
      ).toBeVisible();
      await expect(
        teacherPage.getByText("Responda", { exact: true })
      ).toBeVisible();
      await expect(
        teacherPage.getByText("Aplique", { exact: true })
      ).toBeVisible();

      const answerPrompt = `Qual é o objetivo do estudo ${suffix}?`;
      const respondRow = teacherPage
        .locator("li")
        .filter({ hasText: /^Responda/ })
        .first();
      await respondRow
        .getByRole("button", { name: "Adicionar pergunta", exact: true })
        .click();
      await teacherPage
        .getByRole("dialog")
        .getByLabel("Pergunta")
        .fill(answerPrompt);
      await teacherPage
        .getByRole("dialog")
        .getByLabel("Alternativa A")
        .fill("Compreender e praticar.");
      await teacherPage
        .getByRole("dialog")
        .getByLabel("Alternativa B")
        .fill("Ignorar o conteúdo.");
      await teacherPage
        .getByRole("dialog")
        .getByLabel("Explicação depois da resposta")
        .fill("O estudo foi criado para compreender e praticar o conteúdo.");
      await teacherPage
        .getByRole("dialog")
        .getByRole("button", { name: "Salvar pergunta", exact: true })
        .click();
      await teacherPage
        .getByText("Pergunta criada nesta etapa.", { exact: true })
        .waitFor({ state: "visible" });
      await expect(respondRow).toContainText(answerPrompt);

      await openFoundationStudent(studentPage, baseUrl);
      await studentPage
        .getByText(studyName, { exact: true })
        .waitFor({ state: "visible", timeout: 30_000 });
      await studentPage
        .getByRole("button", { name: /Começar estudo|Continuar estudo/ })
        .first()
        .click();
      const lessonDialog = studentPage.getByRole("dialog");
      await expect(lessonDialog).toContainText("Leia");
      await expect(lessonDialog).toContainText("Entenda");
      await expect(lessonDialog).toContainText("Responda");
      await expect(lessonDialog).toContainText("Aplique");
      await expect(lessonDialog).toContainText(
        "Introdução usada para confirmar"
      );

      await completeStage(studentPage, lessonDialog, "Leia");
      await completeStage(studentPage, lessonDialog, "Entenda");
      await selectStage(studentPage, "Responda");
      await expect(lessonDialog).toContainText(answerPrompt);
      await lessonDialog
        .getByRole("button", { name: "Compreender e praticar.", exact: true })
        .click();
      await lessonDialog
        .getByRole("button", { name: "Registrar resposta", exact: true })
        .click();
      await expect(lessonDialog).toContainText("Resposta correta");
      await lessonDialog
        .getByRole("button", { name: "Concluir etapa", exact: true })
        .click();
      await expect(
        lessonDialog.getByRole("button", { name: "Próxima etapa", exact: true })
      ).toBeVisible();
      await lessonDialog
        .getByRole("button", { name: "Próxima etapa", exact: true })
        .click();

      await selectStage(studentPage, "Aplique");
      await lessonDialog.getByLabel("Minha anotação").fill(note);
      await lessonDialog
        .getByRole("button", { name: "Concluir etapa", exact: true })
        .click();
      await expect(
        lessonDialog.getByRole("button", {
          name: "Concluir preparação",
          exact: true,
        })
      ).toBeVisible();
      await lessonDialog
        .getByRole("button", { name: "Concluir preparação", exact: true })
        .click();
      await expect(
        studentPage.getByText("Preparação concluída", { exact: true })
      ).toBeVisible({ timeout: 30_000 });
      await studentPage.reload({ waitUntil: "domcontentloaded" });
      await studentPage
        .getByText("Preparação concluída", { exact: true })
        .waitFor({ state: "visible" });
      await studentPage
        .getByRole("button", { name: "Ver minhas anotações", exact: true })
        .click();
      const notesDialog = studentPage.getByRole("dialog");
      await expect(notesDialog).toContainText("Minhas anotações");
      await expect(notesDialog).toContainText(note);
    } finally {
      await teacherContext.close();
      await studentContext.close();
    }
  });
});

async function openFoundationAdmin(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}/app/escola-fundamentos`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("heading", { name: "Escola de Fundamentos", exact: true })
    .waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Organização", exact: true }).click();
  await page
    .getByRole("heading", { name: "Módulos da trilha", exact: true })
    .waitFor({ state: "visible" });
}

async function openFoundationStudent(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}/app/escola-fundamentos`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("heading", { name: "Escola de Fundamentos", exact: true })
    .waitFor({ state: "visible" });
}

async function createCourse(page: Page, courseName: string) {
  await page.getByRole("button", { name: "Estudos", exact: true }).click();
  await page
    .getByRole("button", { name: "Criar turma", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#foundation-course-name").fill(courseName);
  await dialog
    .locator("#foundation-course-description")
    .fill("Turma sintética criada exclusivamente para validação E2E.");
  await dialog
    .getByRole("button", { name: "Criar turma", exact: true })
    .click();
  await page
    .getByText(courseName, { exact: true })
    .first()
    .waitFor({ state: "visible" });
}

async function enrollStudent(
  page: Page,
  courseName: string,
  studentName: string
) {
  const courseCard = page
    .getByText(courseName, { exact: true })
    .first()
    .locator("xpath=ancestor::div[contains(@class, 'border')][1]");
  await courseCard
    .getByRole("button", { name: "Matricular Pessoa", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: studentName, exact: true }).click();
  await dialog
    .getByRole("button", { name: "Confirmar matrícula", exact: true })
    .click();
  await page.getByText("Matrícula realizada.", { exact: true }).waitFor({
    state: "visible",
  });
}

async function pageSelectOption(
  trigger: ReturnType<Page["getByRole"]>,
  optionName: string
) {
  await trigger.click();
  await trigger
    .page()
    .getByRole("option", { name: optionName, exact: true })
    .click();
}

async function completeStage(
  page: Page,
  dialog: ReturnType<Page["getByRole"]>,
  stageTitle: string
) {
  await selectStage(page, stageTitle);
  await dialog
    .getByRole("button", { name: "Concluir etapa", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Próxima etapa", exact: true })
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Próxima etapa", exact: true })
    .click();
}

async function selectStage(page: Page, stageTitle: string) {
  const stageButton = page
    .getByRole("button", {
      name: new RegExp(`\\d+\\. ${escapeRegExp(stageTitle)}\\.`),
    })
    .first();
  await stageButton.click();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSaoPauloCivilDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const readPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value;
  const year = readPart("year");
  const month = readPart("month");
  const day = readPart("day");
  if (!year || !month || !day)
    throw new Error("Não foi possível calcular a data civil de São Paulo.");
  return `${year}-${month}-${day}`;
}
