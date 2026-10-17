import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(
  resolve(process.cwd(), "drizzle/schema.ts"),
  "utf8"
);
const migration = readFileSync(
  resolve(process.cwd(), "drizzle/0064_familiar_the_watchers.sql"),
  "utf8"
);
const phase1MigrationPath = resolve(
  process.cwd(),
  "drizzle/0098_leadership_school_study_structure.sql"
);
const phase1Migration = readFileSync(phase1MigrationPath, "utf8");
const customMigrationLedger = JSON.parse(
  readFileSync(resolve(process.cwd(), "drizzle/custom-migrations.json"), "utf8")
) as {
  entries: Array<{ id: string; file: string; sha256: string }>;
};
const compactSource = (source: string) =>
  source
    .replace(/\s+/g, " ")
    .replace(/\basync\s+\(\s*([A-Za-z_$][\w$]*)\s*\)/g, "async $1")
    .replace(/\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>/g, "$1 =>")
    .replace(/\s+\./g, ".")
    .replace(/\.\s+/g, ".")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/,\s*}/g, "}")
    .replace(/\s+}/g, "}")
    .trim();
const compactSchema = compactSource(schema);
const db = compactSource(
  readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8")
);
const router = compactSource(
  readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8")
);
const page = readFileSync(
  resolve(process.cwd(), "client/src/pages/EscolaLideresProfessor.tsx"),
  "utf8"
);
const studentPage = readFileSync(
  resolve(process.cwd(), "client/src/pages/EscolaLideresAluno.tsx"),
  "utf8"
);
const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("Escola de Líderes — Painel do Professor", () => {
  it("possui estrutura tenant-aware para professores, aulas, presença e progresso", () => {
    expect(compactSchema).toContain('mysqlTable("leadership_school_teachers"');
    expect(compactSchema).toContain('mysqlTable("leadership_school_lessons"');
    expect(compactSchema).toContain(
      'mysqlTable("leadership_school_attendance"'
    );
    expect(compactSchema).toContain('mysqlTable("leadership_school_progress"');
    expect(compactSchema).toContain("leadership_school_attendance_unique");
    expect(compactSchema).toContain("leadership_school_progress_unique");
    expect(migration).toContain("CREATE TABLE `leadership_school_teachers`");
    expect(migration).toContain("CREATE TABLE `leadership_school_lessons`");
    expect(migration).toContain("CREATE TABLE `leadership_school_attendance`");
    expect(migration).toContain("CREATE TABLE `leadership_school_progress`");
  });

  it("declara a estrutura pedagógica independente na migration 0098", () => {
    const tables = [
      "leadership_school_modules",
      "leadership_school_studies",
      "leadership_school_study_blocks",
      "leadership_school_questions",
      "leadership_school_question_attempts",
      "leadership_school_study_materials",
      "leadership_school_study_progress",
      "leadership_school_block_progress",
      "leadership_school_lesson_studies",
      "leadership_school_study_administrators",
      "leadership_school_import_drafts",
    ];

    for (const table of tables) {
      expect(compactSchema).toContain(`mysqlTable("${table}"`);
      expect(phase1Migration).toContain(
        `CREATE TABLE IF NOT EXISTS \`${table}\``
      );
    }

    expect(phase1Migration.match(/CREATE TABLE IF NOT EXISTS/g)).toHaveLength(
      tables.length
    );
    expect(phase1Migration).not.toContain("ALTER TABLE");
    expect(phase1Migration).not.toMatch(/CREATE TABLE[^;]*foundation_/);
    expect(compactSchema).toContain("correctOptionId");
    expect(compactSchema).toContain("reflectionVersion");

    const entry = customMigrationLedger.entries.find(
      candidate => candidate.id === "0098"
    );
    expect(entry).toMatchObject({
      id: "0098",
      file: "drizzle/0098_leadership_school_study_structure.sql",
      kind: "custom-additive",
    });
    expect(entry?.sha256).toBe(
      createHash("sha256")
        .update(readFileSync(phase1MigrationPath))
        .digest("hex")
    );
  });

  it("protege o escopo do professor e as operações pedagógicas no servidor", () => {
    expect(router).toContain(compactSource("requireLeadershipTeacher"));
    expect(router).toContain(compactSource("teacherClasses"));
    expect(router).toContain(compactSource("lessonRoster"));
    expect(router).toContain(compactSource("assignTeacher"));
    expect(router).toContain(compactSource("saveAttendance"));
    expect(router).toContain(compactSource("reviewProgress"));
    expect(router).toContain(compactSource("releaseNextLesson"));
    expect(router).toContain(
      compactSource("lessonDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/)")
    );
    expect(router).not.toContain(
      compactSource(
        "lessonDate: z.string().regex(/^\\\\d{4}-\\\\d{2}-\\\\d{2}$/)"
      )
    );
    expect(router).toContain(
      compactSource("Você não está atribuído a esta turma.")
    );
    expect(db).toContain(compactSource("getLeadershipLessonRoster"));
    expect(db).toContain(compactSource("saveLeadershipAttendance"));
    expect(db).toContain(compactSource("releaseLeadershipLesson"));
  });

  it("mantém o painel orientado ao professor e não como uma tela administrativa duplicada", () => {
    expect(page).toContain("Painel do Professor");
    expect(page).toContain("Diário do encontro");
    expect(page).toContain("Registrar revisão");
    expect(page).toContain("Liberar próximo tema");
    expect(page).toContain("Nova aula");
    expect(page).not.toContain("attendence");
  });

  it("mantém uma Área do Aluno separada com bloqueio progressivo", () => {
    expect(studentPage).toContain("Minha formação");
    expect(studentPage).toContain("Aguardando liberação");
    expect(studentPage).toContain("Concluir aula");
    expect(studentPage).toContain("studentPath");
    expect(studentPage).toContain("completeStudentLesson");
    expect(app).toContain("/app/escola-lideres/aluno");
    expect(app).toContain("/app/escola-lideres/professor");
  });
});
