import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "drizzle/0064_familiar_the_watchers.sql"), "utf8");
const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const page = readFileSync(resolve(process.cwd(), "client/src/pages/EscolaLideresProfessor.tsx"), "utf8");
const studentPage = readFileSync(resolve(process.cwd(), "client/src/pages/EscolaLideresAluno.tsx"), "utf8");
const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("Escola de Líderes — Painel do Professor", () => {
  it("possui estrutura tenant-aware para professores, aulas, presença e progresso", () => {
    expect(schema).toContain('mysqlTable("leadership_school_teachers"');
    expect(schema).toContain('mysqlTable("leadership_school_lessons"');
    expect(schema).toContain('mysqlTable("leadership_school_attendance"');
    expect(schema).toContain('mysqlTable("leadership_school_progress"');
    expect(schema).toContain("leadership_school_attendance_unique");
    expect(schema).toContain("leadership_school_progress_unique");
    expect(migration).toContain("CREATE TABLE `leadership_school_teachers`");
    expect(migration).toContain("CREATE TABLE `leadership_school_lessons`");
    expect(migration).toContain("CREATE TABLE `leadership_school_attendance`");
    expect(migration).toContain("CREATE TABLE `leadership_school_progress`");
  });

  it("protege o escopo do professor e as operações pedagógicas no servidor", () => {
    expect(router).toContain("requireLeadershipTeacher");
    expect(router).toContain("teacherClasses");
    expect(router).toContain("lessonRoster");
    expect(router).toContain("assignTeacher");
    expect(router).toContain("saveAttendance");
    expect(router).toContain("reviewProgress");
    expect(router).toContain("releaseNextLesson");
    expect(router).toContain("lessonDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/)");
    expect(router).not.toContain("lessonDate: z.string().regex(/^\\\\d{4}-\\\\d{2}-\\\\d{2}$/)");
    expect(router).toContain("Você não está atribuído a esta turma.");
    expect(db).toContain("getLeadershipLessonRoster");
    expect(db).toContain("saveLeadershipAttendance");
    expect(db).toContain("releaseLeadershipLesson");
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
