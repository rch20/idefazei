import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = [
  readFileSync(
    resolve(process.cwd(), "client/src/pages/EscolaFundamentos.tsx"),
    "utf8"
  ),
  readFileSync(
    resolve(
      process.cwd(),
      "client/src/pages/foundation/StudentLearningExperience.tsx"
    ),
    "utf8"
  ),
  readFileSync(
    resolve(
      process.cwd(),
      "client/src/pages/foundation/FoundationStudyPreviewDialog.tsx"
    ),
    "utf8"
  ),
  readFileSync(
    resolve(
      process.cwd(),
      "client/src/pages/foundation/StudyPartQuestions.tsx"
    ),
    "utf8"
  ),
  readFileSync(
    resolve(process.cwd(), "client/src/pages/foundation/StudyPartList.tsx"),
    "utf8"
  ),
  readFileSync(
    resolve(process.cwd(), "client/src/pages/foundation/StudyTrailItem.tsx"),
    "utf8"
  ),
  readFileSync(
    resolve(
      process.cwd(),
      "client/src/pages/foundation/FoundationStudyEditor.tsx"
    ),
    "utf8"
  ),
  readFileSync("client/src/pages/foundation/FoundationStageNotes.tsx", "utf8"),
  readFileSync("client/src/pages/foundation/StudyQuestionEditor.tsx", "utf8"),
].join("\n");
const adaptiveSource = readFileSync(
  resolve(process.cwd(), "client/src/components/AdaptiveFormDialog.tsx"),
  "utf8"
);
const schemaSource = readFileSync(
  resolve(process.cwd(), "drizzle/schema.ts"),
  "utf8"
);
const routerSource = readFileSync(
  resolve(process.cwd(), "server/routers.ts"),
  "utf8"
);
const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

describe("Formação de Fundamentos", () => {
  it("usa o padrão adaptativo somente para criar uma turma", () => {
    expect(source).toContain("Criar turma de Fundamentos");
    expect(source).toContain("AdaptiveFormDialogContent");
    expect(source).toContain("AdaptiveFormDialogBody");
    expect(source).toContain("AdaptiveFormDialogFooter");
    expect(source).toContain("canManageStudies");
  });

  it("mantém o erro de criação dentro do formulário", () => {
    expect(source).toContain("createError");
    expect(source).toContain('role="alert"');
    expect(source).toContain("Informe um nome com ao menos 3 caracteres.");
    expect(source).toContain("setCreateError(null)");
  });

  it("mantém matrícula e gestão de trilhas fora do cadastro de turma", () => {
    expect(source).toContain("Matricular Pessoa");
    expect(source).toContain("Confirmar matrícula");
    expect(source).toContain("Um único caminho para preparar o estudo");
    expect(source).toContain("Abrir Estudos");
    expect(source).toContain("Novo módulo");
    expect(source).toContain("Salvar rascunho");
    expect(source).toContain('template: "biblico"');
    expect(source).toContain("Salvar rascunho");
    expect(source).toContain("Publicar estudo");
    expect(source).toContain("Retirar da publicação");
    expect(source).toContain("Adicionar pergunta");
    expect(source).toContain("Introdução do estudo");
    expect(source).toContain("Visualizar ${study.title} como aluno");
  });

  it("aguarda a atualização da turma antes de selecionar o novo módulo", () => {
    expect(source).toContain(
      "const trailInput = { churchId, courseId: selectedCourseId }"
    );
    expect(source).toContain("listModules.invalidate(trailInput)");
    expect(source).toContain("listStudies.invalidate(trailInput)");
    expect(source).toContain("invalidateTrail().then(() =>");
  });

  it("preserva a camada superior e o rodapé seguro do modelo adaptativo", () => {
    expect(adaptiveSource).toContain("z-[200]");
    expect(adaptiveSource).toContain("100dvh");
    expect(adaptiveSource).toContain("safe-area-inset-bottom");
  });

  it("oferece preparação digital com retomada, reflexão e conclusão sem prova formal", () => {
    expect(source).toContain("learningPath");
    expect(source).toContain("studentPath");
    expect(source).toContain("Estudo da semana");
    expect(source).toContain("Continuar estudo");
    expect(source).toContain("Minha anotação");
    expect(source).toContain("Esta preparação não é uma prova.");
    expect(source).toContain("completeLesson");
  });

  it("mantém o cabeçalho do leitor compacto no mobile e o progresso acessível", () => {
    expect(source).toContain('data-testid="foundation-study-reader-header"');
    expect(source).toContain("Você pode voltar sem perder o que escreveu.");
    expect(source).toContain('data-testid="foundation-study-reader-progress"');
    expect(source).toContain("hidden sm:inline");
  });

  it("mostra o progresso em um só lugar e navega por etapas compactas", () => {
    expect(source).toContain("completedStudyBlocks");
    expect(source).toContain("completedBlockIds");
    expect(source).not.toContain("StudentStudyProgressSummary");
    expect(source).toContain(
      'aria-current={index === selectedBlockIndex ? "step" : undefined}'
    );
    expect(source).toContain("Aguardando a etapa anterior");
    expect(source).toContain("overflow-x-auto");
  });

  it("mantém perguntas e prévia ligadas à parte e ao estudo atuais", () => {
    expect(source).toContain("questionsByBlock");
    expect(source).toContain("Perguntas da parte");
    expect(source).toContain("idefazei-foundation-study-preview-v1");
    expect(source).toContain("Nada nesta tela cria progresso");
  });

  it("protege a liberação sequencial no backend e mantém o progresso por matrícula", () => {
    expect(schemaSource).toContain("foundationLessonProgress");
    expect(schemaSource).toContain(
      "foundation_lesson_progress_enrollment_study_unique"
    );
    expect(routerSource).toContain("reviewLesson");
    expect(routerSource).toContain("releaseNextStudy");
    expect(routerSource).toContain(
      "Esta aula ainda aguarda a liberação do professor."
    );
    expect(routerSource).toContain(
      "Registre a revisão como Compreendeu antes de liberar o próximo tema."
    );
  });

  it("mantém perguntas e tentativas separadas do progresso geral", () => {
    expect(schemaSource).toContain("foundationStudyBlocks");
    expect(schemaSource).toContain("foundationQuestions");
    expect(schemaSource).toContain("foundationQuestionAttempts");
    expect(routerSource).toContain("studyQuestions");
    expect(routerSource).toContain("answerQuestion");
    expect(routerSource).toContain("manageStudyQuestions");
    expect(routerSource).toContain("createQuestionBlock");
    expect(routerSource).toContain("createStudyQuestion");
    expect(routerSource).toContain(
      "Responda corretamente às perguntas do estudo antes de concluí-lo."
    );
    expect(source).toContain("Tentar novamente");
  });

  it("mantém o novo estudo protegido como rascunho até a publicação", () => {
    expect(source).toContain('template: "biblico"');
    expect(dbSource).toContain("active: data.active ?? false");
    expect(routerSource).toContain("active: z.boolean().optional()");
    expect(source).toContain("Publicar estudo");
  });
});

export {};
