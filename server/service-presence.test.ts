import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("presença no culto — fiação", () => {
  it("define as tabelas e a coluna de limite no schema", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain('mysqlTable(\n  "service_attendance"');
    expect(schema).toContain('mysqlTable(\n  "service_attendance_sessions"');
    expect(schema).toContain('mysqlEnum("source", ["manual", "facial"])');
    expect(schema).toContain('int("serviceAbsenceAlertThreshold")');
  });

  it("registra a migration 0114 no ledger com o checksum correto", () => {
    const ledger = JSON.parse(read("drizzle/custom-migrations.json")) as { entries: Array<{ id: string; file: string; sha256: string }> };
    const entry = ledger.entries.find((e) => e.id === "0114");
    expect(entry).toMatchObject({ id: "0114", file: "drizzle/0114_service_attendance.sql" });
    const actual = createHash("sha256").update(readFileSync(resolve(root, "drizzle/0114_service_attendance.sql"))).digest("hex");
    expect(entry?.sha256).toBe(actual);
  });

  it("a migration é aditiva (sem comandos destrutivos)", () => {
    const sql = read("drizzle/0114_service_attendance.sql").replaceAll("ON UPDATE CURRENT_TIMESTAMP", "");
    expect(sql).not.toMatch(/\b(DROP|DELETE|UPDATE|TRUNCATE)\b/i);
  });

  it("monta o router de presença e usa o acesso dedicado", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("presenca: servicePresenceRouter");
    expect(routers).toContain("const servicePresenceRouter = router({");
    expect(routers).toContain("if (!access.canMarkServiceAttendance)");
    expect(routers).toContain("canMarkServiceAttendance: isExecutive || isPastoralWorker || canManageCells || canManageMinistry || canAccessMinistry");
  });

  it("marcação manual grava source=manual (deixando o facial para a fase 2)", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain('source: "manual"');
    const presence = read("server/servicePresence.ts");
    expect(presence).toContain('source?: "manual" | "facial"');
  });

  it("liga faltas seguidas no culto ao Radar Espiritual", () => {
    const db = read("server/db.ts");
    expect(db).toContain('"ausencia_culto"');
    expect(db).toContain("churches.serviceAbsenceAlertThreshold");
    expect(db).toContain('addSignal("ausencia_culto"');
    const routers = read("server/routers.ts");
    expect(routers).toContain('key: "ausencia_culto"');
    expect(routers).toContain("serviceAbsenceAlertThreshold: z.number().int().min(1).max(12).optional()");
  });

  it("expõe a aba no app com o acesso certo", () => {
    expect(read("client/src/App.tsx")).toContain('<Route path="/app/presenca">');
    expect(read("client/src/App.tsx")).toContain('requiredAccess="canMarkServiceAttendance"');
    expect(read("client/src/components/ChurchLayout.tsx")).toContain('label: "Presença no culto", path: "/app/presenca", group: "cuidado", accessKey: "canMarkServiceAttendance"');
    expect(read("client/src/components/ChurchLayout.tsx")).toContain("canMarkServiceAttendance: boolean;");
  });
});
