import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const source = readFileSync(resolve(process.cwd(), "client/src/pages/EscolaLideres.tsx"), "utf8");
const workspaceSource = readFileSync(resolve(process.cwd(), "client/src/pages/leadership/LeadershipStudyWorkspace.tsx"), "utf8");
const readerSource = readFileSync(resolve(process.cwd(), "client/src/pages/leadership/LeadershipStudyReader.tsx"), "utf8");
const studentSource = readFileSync(resolve(process.cwd(), "client/src/pages/EscolaLideresAluno.tsx"), "utf8");
const readerPageSource = readFileSync(resolve(process.cwd(), "client/src/pages/leadership/LeadershipStudyReaderPage.tsx"), "utf8");
const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const professorSource = readFileSync(resolve(process.cwd(), "client/src/pages/EscolaLideresProfessor.tsx"), "utf8");
const adaptiveSource = readFileSync(resolve(process.cwd(), "client/src/components/AdaptiveFormDialog.tsx"), "utf8");
describe("Modais da Escola de Líderes", () => {
  it("usa o formulário adaptativo para criar uma nova turma", () => {
    expect(source).toContain("AdaptiveFormDialogContent");
    expect(source).toContain("AdaptiveFormDialogBody");
    expect(source).toContain("AdaptiveFormDialogFooter");
    expect(source).toContain("Nova Turma — Escola de Líderes");
    expect(source).toContain("createError");
    expect(source).toContain("startDate");
    expect(source).toContain("endDate");
    expect(source).toContain("createClass");
  });
  it("mantém matrícula e certificado como ações do painel, sem migrar a matrícula curta", () => {
    expect(source).toContain("Matricular em {cls.name}");
    expect(source).toContain("Confirmar Matrícula");
    expect(source).toContain("certMutation");
    expect(source).toContain("enrollError");
    expect(source).toContain("<DialogContent className=\"sm:max-w-md\">");
  });
  it("mantém status e certificado como ações inline e compactas", () => {
    expect(source).toContain("updateEnrollment");
    expect(source).toContain("updateError");
    expect(source).toContain("Status atualizado!");
    expect(source).toContain("certificates.generate");
    expect(source).toContain("className=\"h-9 min-w-36 text-xs\"");
  });
  it("preserva a camada superior, viewport e safe area do padrão global", () => {
    expect(adaptiveSource).toContain("z-[200]");
    expect(adaptiveSource).toContain("h-[100dvh]");
    expect(adaptiveSource).toContain("overscroll-contain");
    expect(adaptiveSource).toContain("env(safe-area-inset-bottom)");
  });
  it("conecta a criação pedagógica à turma sem remover o fluxo legado de aulas", () => {
    expect(source).toContain("escola-lideres/conteudo?classId=");
    expect(workspaceSource).toContain("study.modules.list");
    expect(workspaceSource).toContain("study.studies.create");
    expect(workspaceSource).toContain("study.blocks.create");
    expect(workspaceSource).toContain("study.questions.create");
    expect(workspaceSource).toContain("study.materials.attach");
    expect(workspaceSource).toContain("study.studies.publish");
    expect(workspaceSource).toContain("Prévia do aluno");
    expect(workspaceSource).toContain("Nada será salvo na");
    expect(source).toContain("Matricular Aluno");
    expect(source).toContain("certMutation");
  });
  it("permite que professor atribuído abra o editor, mantendo autorização no servidor", () => {
    expect(appSource).toContain('<Route path="/app/escola-lideres/conteudo">');
    expect(appSource).toContain('<AppPage title="Conteúdo pedagógico — Escola de Líderes">');
    expect(appSource).not.toContain('<AppPage title="Conteúdo pedagógico — Escola de Líderes" requiredAccess="isExecutive">');
    expect(professorSource).toContain("/app/escola-lideres/conteudo?classId=");
    expect(professorSource).toContain("Conteúdo pedagógico");
  });
  it("mantém as quatro etapas na experiência do aluno e protege o tenant", () => {
    expect(studentSource).toContain("study.student.history");
    expect(studentSource).toContain("escola-lideres/aluno/estudo");
    expect(readerPageSource).toContain("LeadershipStudyReader");
    expect(readerSource).toContain("churchId, enrollmentId: item.enrollment.id, studyId: item.study.id");
    expect(readerSource).toContain('"leia"');
    expect(readerSource).toContain('"entenda"');
    expect(readerSource).toContain('"responda"');
    expect(readerSource).toContain('"aplique"');
    expect(readerSource).toContain("study.student.answerQuestion");
    expect(readerSource).toContain("study.student.saveReflection");
    expect(readerSource).toContain("study.student.complete");
    expect(readerSource).not.toContain("correctOptionId");
  });
});
export {};
