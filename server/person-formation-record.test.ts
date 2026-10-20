import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routers = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../drizzle/0102_stage_progress_source.sql", import.meta.url), "utf8");

describe("prontuário da pessoa", () => {
  it("a migration só adiciona colunas, com sintaxe aceita pelo MySQL de produção", () => {
    expect(migration).toContain("ADD COLUMN `source`");
    expect(migration).toContain("ADD COLUMN `sourceRef`");
    expect(migration).not.toContain("IF NOT EXISTS");
    expect(migration).not.toMatch(/DROP|DELETE|UPDATE|TRUNCATE/i);
  });

  it("o preenchimento automático nunca sobrescreve etapa concluída", () => {
    const fn = db.slice(db.indexOf("export async function recordAutomaticStageCompletion"), db.indexOf("export async function hasFinishedAllFoundationCourses"));
    expect(fn).toContain('existing[0]?.status === "concluida"');
    expect(fn).toContain('reason: "ja_concluida"');
    expect(fn).toContain('source: "automatico"');
    expect(fn).toContain("!personRows[0].baptismDate");
    expect(fn).toContain("eq(people.churchId, input.churchId)");
  });

  it("o lançamento manual marca a origem como manual", () => {
    const fn = db.slice(db.indexOf("export async function upsertDiscipleshipStageProgress"), db.indexOf("type JourneyStageKey"));
    expect(fn).toContain('source: "manual" as const');
  });

  it("batismo, encontro e cursos alimentam o prontuário sem bloquear a ação principal", () => {
    expect(routers).toContain('stage: "batismo"');
    expect(routers).toContain('stage: "encontro_com_deus"');
    expect(routers).toContain('stage: "fundamentos"');
    expect(routers).toContain("hasFinishedAllFoundationCourses(input.churchId, personId)");
    expect((routers.match(/\[prontuario\] Falha ao registrar/g) ?? []).length).toBe(3);
  });

  it("conclusão e criação de turma de batismo exigem administrador da igreja", () => {
    const start = routers.indexOf("const batismoRouter = router({");
    const block = routers.slice(start, start + 6500);
    expect(block).not.toContain("await requireChurchMember(ctx.user.id, input.churchId);\n      await createBaptismClass");
    expect(block).toContain("await requireChurchAdministrator(ctx.user.id, input.churchId);\n      await createBaptismClass");
    expect(block).toContain("const actor = await requireChurchAdministrator(ctx.user.id, input.churchId);\n      const baptismEnrollment");
  });

  it("a leitura de cursos e eventos exige permissão de leitura da jornada", () => {
    const start = routers.indexOf("formationRecords: protectedProcedure");
    expect(routers.slice(start, start + 400)).toContain("requireJourneyReadPermission(ctx.user.id, input.churchId, input.id)");
  });

  it("lançamento de outra igreja é manual, tem origem, data não futura e permissão da jornada", () => {
    const fn = db.slice(db.indexOf("export async function recordPriorChurchStage"), db.indexOf("export async function backfillFormationFromRecords"));
    expect(fn).toContain('source: "outra_igreja" as const');
    expect(fn).toContain("eq(people.churchId, input.churchId)");
    expect(fn).toContain("Veio de outra igreja:");
    const start = routers.indexOf("recordPriorStage: protectedProcedure");
    const block = routers.slice(start, start + 1800);
    expect(block).toContain("requireJourneyStagePermission(ctx.user.id, input.churchId, input.id)");
    expect(block).toContain("A data não pode estar no futuro.");
    expect(block).not.toContain('"nova_alma"');
  });

  it("o preenchimento do histórico é restrito a pastores e supervisores e não altera etapas concluídas", () => {
    const start = routers.indexOf("backfillFormation: protectedProcedure");
    expect(routers.slice(start, start + 500)).toContain('requireNotificationPreferenceManager(ctx.user.id, input.churchId, "preencher o prontuário")');
    const fn = db.slice(db.indexOf("export async function backfillFormationFromRecords"), db.indexOf("export async function hasFinishedAllFoundationCourses"));
    expect(fn).toContain("recordAutomaticStageCompletion");
    expect(fn).toContain("eq(baptismEnrollments.churchId, churchId)");
    expect(fn).toContain("eq(encounterEnrollments.churchId, churchId)");
    expect(fn).toContain("eq(courses.churchId, churchId)");
  });

  it("a prévia não grava e o desfazer só atinge registros automáticos ou de outra igreja", () => {
    const backfill = db.slice(db.indexOf("export async function backfillFormationFromRecords"), db.indexOf("export async function hasFinishedAllFoundationCourses"));
    expect(backfill).toContain("if (!dryRun) return recordAutomaticStageCompletion(args);");
    const undo = db.slice(db.indexOf("export async function undoStageRecord"), db.indexOf("export async function backfillFormationFromRecords"));
    expect(undo).toContain('row.source === "manual"');
    expect(undo).toContain("eq(discipleshipStageProgress.churchId, input.churchId)");
    expect(undo).toContain("discipleshipStageEvents");
    const start = routers.indexOf("undoStageRecord: protectedProcedure");
    expect(routers.slice(start, start + 900)).toContain("requireJourneyStagePermission(ctx.user.id, input.churchId, input.id)");
  });

  it("o membro lê só o próprio prontuário e sem as observações da liderança", () => {
    const start = routers.indexOf("myFormation: protectedProcedure");
    const block = routers.slice(start, start + 1400);
    expect(block).toContain("actor.personId");
    expect(block).not.toContain("input.id");
    expect(block).not.toContain("notes:");
  });
});
