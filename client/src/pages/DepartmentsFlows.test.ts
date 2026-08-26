import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const migrationSource = readFileSync(resolve(root, "drizzle/0034_previous_xorn.sql"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const ministrySource = readFileSync(resolve(root, "client/src/pages/Ministerios.tsx"), "utf8");
const departmentPanelSource = readFileSync(resolve(root, "client/src/components/DepartmentsPanel.tsx"), "utf8");
const schedulesSource = readFileSync(resolve(root, "client/src/pages/Escalas.tsx"), "utf8");

describe("Fluxo estrutural de Departamentos", () => {
  it("mantém IDs e tabelas próprias com isolamento por igreja e vínculo ao Ministério", () => {
    expect(schemaSource).toContain('export const departments = mysqlTable("departments"');
    expect(schemaSource).toContain('export const departmentMembers = mysqlTable("department_members"');
    expect(schemaSource).toContain('export const departmentRoleAssignments = mysqlTable("department_role_assignments"');
    expect(schemaSource).toContain('departmentId: int("departmentId")');
    expect(migrationSource).toContain('CREATE TABLE `departments`');
    expect(migrationSource).toContain('ALTER TABLE `schedule_items` ADD `departmentId` int');
  });

  it("protege liderança, participantes e funções por autorização departamental", () => {
    expect(routerSource).toContain("requireDepartmentManagementPermission");
    expect(routerSource).toContain("requireChurchRoleManager(ctx.user.id, input.churchId)");
    expect(routerSource).toContain("assignPersonToDepartment");
    expect(routerSource).toContain("assignDepartmentRole");
    expect(routerSource).toContain("isActiveDepartmentMember");
    expect(dbSource).toContain('from(departments).where(and(eq(departments.id, data.departmentId), eq(departments.churchId, data.churchId)');
    expect(dbSource).toContain('.for("update")');
  });

  it("integra o painel sem criar um modal aninhado dentro do Ministério", () => {
    expect(ministrySource).toContain("<DepartmentsPanel");
    expect(departmentPanelSource).toContain("trpc.departments.create.useMutation");
    expect(departmentPanelSource).toContain("trpc.departments.updateLeader.useMutation");
    expect(departmentPanelSource).toContain("trpc.departments.addMember.useMutation");
    expect(departmentPanelSource).toContain("trpc.departments.assignRole.useMutation");
    expect(departmentPanelSource).not.toContain("<Dialog");
  });

  it("mantém Escala ministerial e adiciona Departamento como escopo opcional", () => {
    expect(schedulesSource).toContain('departmentId: form.departmentId ? Number(form.departmentId) : null');
    expect(schedulesSource).toContain('Escala geral do Ministério');
    expect(schedulesSource).toContain('departmentsForMinistry');
    expect(schedulesSource).toContain('departmentMembers.data');
    expect(routerSource).toContain("requireScheduleManagementPermission");
    expect(routerSource).toContain("requireScheduleParticipant");
    expect(routerSource).toContain("O Departamento selecionado não pertence a este Ministério.");
  });
});
