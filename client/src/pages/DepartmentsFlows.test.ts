import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const schemaSource = compactSource(
  readFileSync(resolve(root, "drizzle/schema.ts"), "utf8")
);
const migrationSource = compactSource(
  readFileSync(resolve(root, "drizzle/0034_previous_xorn.sql"), "utf8")
);
const scheduleEventMigrationSource = compactSource(
  readFileSync(resolve(root, "drizzle/0093_schedule_event_link.sql"), "utf8")
);
const routerSource = compactSource(
  readFileSync(resolve(root, "server/routers.ts"), "utf8")
);
const dbSource = compactSource(
  readFileSync(resolve(root, "server/db.ts"), "utf8")
);
const ministrySource = compactSource(
  readFileSync(resolve(root, "client/src/pages/Ministerios.tsx"), "utf8")
);
const departmentPanelSource = compactSource(
  readFileSync(
    resolve(root, "client/src/components/DepartmentsPanel.tsx"),
    "utf8"
  )
);
const schedulesSource = compactSource(
  readFileSync(resolve(root, "client/src/pages/Escalas.tsx"), "utf8")
);

describe("Fluxo estrutural de Departamentos", () => {
  it("mantém IDs e tabelas próprias com isolamento por igreja e vínculo ao Ministério", () => {
    expect(schemaSource).toContain(
      compactSource('export const departments = mysqlTable("departments"')
    );
    expect(schemaSource).toContain(
      compactSource(
        'export const departmentMembers = mysqlTable("department_members"'
      )
    );
    expect(schemaSource).toContain(
      compactSource(
        'export const departmentRoleAssignments = mysqlTable("department_role_assignments"'
      )
    );
    expect(schemaSource).toContain(
      compactSource('departmentId: int("departmentId")')
    );
    expect(schemaSource).toContain(compactSource('eventId: int("eventId")'));
    expect(migrationSource).toContain(
      compactSource("CREATE TABLE `departments`")
    );
    expect(migrationSource).toContain(
      compactSource("ALTER TABLE `schedule_items` ADD `departmentId` int")
    );
    expect(scheduleEventMigrationSource).toContain(
      compactSource("ADD COLUMN eventId INT NULL")
    );
    expect(scheduleEventMigrationSource).toContain(
      compactSource("schedule_items_church_event_idx")
    );
  });

  it("protege liderança, participantes e funções por autorização departamental", () => {
    expect(routerSource).toContain(
      compactSource("requireDepartmentManagementPermission")
    );
    expect(routerSource).toContain(
      compactSource("requireChurchRoleManager(ctx.user.id, input.churchId)")
    );
    expect(routerSource).toContain(compactSource("assignPersonToDepartment"));
    expect(routerSource).toContain(compactSource("assignDepartmentRole"));
    expect(routerSource).toContain(compactSource("isActiveDepartmentMember"));
    expect(dbSource).toContain(
      compactSource(
        "from(departments).where(and(eq(departments.id, data.departmentId), eq(departments.churchId, data.churchId)"
      )
    );
    expect(dbSource).toContain(compactSource('.for("update")'));
  });

  it("integra o painel sem criar um modal aninhado dentro do Ministério", () => {
    expect(ministrySource).toContain(compactSource("<DepartmentsPanel"));
    expect(departmentPanelSource).toContain(
      compactSource("trpc.departments.create.useMutation")
    );
    expect(departmentPanelSource).toContain(
      compactSource("trpc.departments.updateLeader.useMutation")
    );
    expect(departmentPanelSource).toContain(
      compactSource("trpc.departments.addMember.useMutation")
    );
    expect(departmentPanelSource).toContain(
      compactSource("trpc.departments.assignRole.useMutation")
    );
    expect(departmentPanelSource).not.toContain(compactSource("<Dialog"));
  });

  it("mantém Escala ministerial e adiciona Departamento como escopo opcional", () => {
    expect(schedulesSource).toContain(
      compactSource(
        "departmentId: form.departmentId ? Number(form.departmentId) : null"
      )
    );
    expect(schedulesSource).toContain(
      compactSource("eventId: form.eventId ? Number(form.eventId) : null")
    );
    expect(schedulesSource).toContain(
      compactSource("Escala geral do Ministério")
    );
    expect(schedulesSource).toContain(compactSource("departmentsForMinistry"));
    expect(schedulesSource).toContain(compactSource("departmentMembers.data"));
    expect(schedulesSource).toContain(compactSource("Escalar grupo inteiro"));
    expect(schedulesSource).toContain(
      compactSource("trpc.events.list.useQuery")
    );
    expect(routerSource).toContain(
      compactSource("requireScheduleManagementPermission")
    );
    expect(routerSource).toContain(compactSource("requireScheduleParticipant"));
    expect(routerSource).toContain(compactSource("createTeam"));
    expect(routerSource).toContain(
      compactSource("createScheduleItemsForDepartmentTeam")
    );
    expect(dbSource).toContain(
      compactSource(
        "export async function createScheduleItemsForDepartmentTeam"
      )
    );
    expect(routerSource).toContain(
      compactSource(
        "O Departamento selecionado não pertence a este Ministério."
      )
    );
  });
});
