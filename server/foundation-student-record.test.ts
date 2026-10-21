import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routers = readFileSync("server/routers.ts", "utf8");
const db = readFileSync("server/db.ts", "utf8");
const page = readFileSync("client/src/pages/EscolaFundamentos.tsx", "utf8");
const record = readFileSync("client/src/pages/foundation/FoundationStudentRecord.tsx", "utf8");

describe("Escola de Fundamentos: ficha do aluno", () => {
  it("expõe respostas e anotações só para a liderança", () => {
    expect(routers).toContain("studentStudyDetail: tenantProcedure");
    expect(db).toContain("export async function getFoundationStudentStudyDetail");
    const start = routers.indexOf("studentStudyDetail: tenantProcedure");
    expect(routers.slice(start, start + 900)).toContain("requireFoundationStudyManager");
  });
  it("mostra progresso real na aba Alunos e abre a ficha", () => {
    expect(page).toContain("estudos concluídos");
    expect(page).toContain("Ver respostas");
    expect(page).toContain("FoundationStudentRecord");
  });
  it("a ficha lista etapas, respostas e avaliação", () => {
    expect(record).toContain("Sem anotação nesta etapa.");
    expect(record).toContain("Resposta correta:");
    expect(record).toContain("Salvar avaliação");
  });
});

describe("Escola de Fundamentos: leitura confortável", () => {
  it("separa parágrafos, estima o tempo e avisa quando a etapa fica longa", () => {
    const lesson = readFileSync("client/src/pages/foundation/StudentLearningExperience.tsx", "utf8");
    const editor = readFileSync("client/src/pages/foundation/StudyPartEditor.tsx", "utf8");
    expect(lesson).toContain("function ReadingText");
    expect(lesson).toContain("Leitura de cerca de");
    expect(editor).toContain("Este texto está longo para ler no celular");
  });
});
