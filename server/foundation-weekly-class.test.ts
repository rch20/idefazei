import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("drizzle/schema.ts", "utf8");
const migration = readFileSync(
  "drizzle/0078_foundation_weekly_class.sql",
  "utf8"
);
const router = readFileSync("server/routers.ts", "utf8");
const page = readFileSync("client/src/pages/EscolaFundamentos.tsx", "utf8");
const ledger = readFileSync("drizzle/custom-migrations.json", "utf8");

describe("contrato semanal da Escola de Fundamentos", () => {
  it("mantém a semana no estudo existente e cria uma entidade separada para a aula", () => {
    expect(schema).toContain(
      'weekStart: date("weekStart", { mode: "string" })'
    );
    expect(schema).toContain('mysqlTable("foundation_classes"');
    expect(schema).toContain('mysqlTable("foundation_class_attendance"');
    expect(migration).toContain("ALTER TABLE foundation_studies");
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS foundation_classes"
    );
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS foundation_class_attendance"
    );
  });

  it("preserva o vínculo tenant-aware e impede duplicar a aula do mesmo estudo no mesmo domingo", () => {
    expect(schema).toContain("foundation_classes_church_study_date_unique");
    expect(schema).toContain(
      "foundation_class_attendance_class_enrollment_unique"
    );
    expect(migration).toContain(
      "UNIQUE KEY foundation_classes_church_study_date_unique"
    );
    expect(migration).toContain(
      "UNIQUE KEY foundation_class_attendance_class_enrollment_unique"
    );
  });

  it("mantém a aula presencial separada da conclusão digital e da presença individual", () => {
    expect(router).toContain("studyClass: tenantProcedure");
    expect(router).toContain("classManagement: tenantProcedure");
    expect(router).toContain("saveClass: tenantProcedure");
    expect(router).toContain("recordClassAttendance: tenantProcedure");
    expect(router).toContain(
      "A aula presencial deve ser registrada em um domingo."
    );
    expect(router).toContain("getFoundationStudentAttendance");
  });

  it("expõe a experiência simples no mesmo espaço da Escola", () => {
    expect(page).toContain("Aula presencial");
    expect(page).toContain("Início da semana");
    expect(page).toContain("Presença da turma");
    expect(page).toContain("Pontos para reforçar no domingo");
    expect(page).not.toContain("Escolha uma segunda plataforma");
  });

  it("registra a migration no ledger customizado", () => {
    expect(ledger).toContain('"id": "0078"');
    expect(ledger).toContain("drizzle/0078_foundation_weekly_class.sql");
    expect(ledger).not.toContain("TO_BE_CALCULATED");
  });
});
