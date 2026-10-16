import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "drizzle/0095_foundation_stage_reflections.sql",
  "utf8"
);
const schema = readFileSync("drizzle/schema.ts", "utf8");
const db = readFileSync("server/db.ts", "utf8");
const router = readFileSync("server/routers.ts", "utf8");
const editor = readFileSync(
  "client/src/pages/foundation/FoundationStudyEditor.tsx",
  "utf8"
);
const preview = readFileSync(
  "client/src/pages/foundation/FoundationStudyPreviewDialog.tsx",
  "utf8"
);
const student = readFileSync(
  "client/src/pages/foundation/StudentLearningExperience.tsx",
  "utf8"
);

const notes = readFileSync(
  "client/src/pages/foundation/FoundationStageNotes.tsx",
  "utf8"
);

const compact = (source: string) => source.replace(/\s+/g, " ");

describe("Fase 2 — reflexões individuais por etapa", () => {
  it("é aditiva e não remove a anotação geral histórica", () => {
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS reflectionPrompt TEXT NULL"
    );
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS reflection TEXT NULL"
    );
    expect(schema).toContain('reflectionPrompt: text("reflectionPrompt")');
    expect(schema).toContain('reflection: text("reflection")');
    expect(db).toContain("saveFoundationLessonReflection");
    expect(db).toContain("saveFoundationBlockReflection");
  });

  it("mantém autorização por aluno, estudo, etapa e igreja", () => {
    expect(compact(router)).toContain("saveBlockReflection: tenantProcedure");
    expect(router).toContain("requireFoundationStudentLesson");
    expect(router).toContain("input.churchId");
    expect(router).toContain("input.courseId");
    expect(router).toContain("input.studyId");
    expect(compact(router)).toContain("blockId: z.number().int().positive()");
    expect(compact(router)).toContain("Etapa não encontrada neste estudo.");
  });

  it("conecta o editor e a prévia ao mesmo bloco sem criar uma estrutura paralela", () => {
    expect(editor).toContain("FoundationStageNotes");
    expect(notes).toContain("Para refletir");
    expect(editor).toContain("reflectionPrompt");
    expect(preview).toContain("CompatibilityPreviewStageNotes");
    expect(preview).toContain("prompt?.trim() ?");
    expect(notes).toContain("não será salva");
  });

  it("salva e exibe uma anotação por etapa no aluno", () => {
    expect(student).toContain("StageReflectionCard");
    expect(student).toContain("saveBlockReflection");
    expect(student).toContain("blockId: activeBlock.id");
    expect(student).toContain("stageReflections");
    expect(student).toContain("Anotações por etapa");
    expect(notes).not.toContain("O que esta etapa desperta em você?");
    expect(notes).toContain("prompt?.trim() ?");
  });
});
