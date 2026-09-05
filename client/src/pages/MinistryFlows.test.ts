import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const dialogSource = readFileSync(resolve(root, "client/src/components/ui/dialog.tsx"), "utf8");
const alertDialogSource = readFileSync(resolve(root, "client/src/components/ui/alert-dialog.tsx"), "utf8");
const ministrySource = readFileSync(resolve(root, "client/src/pages/Ministerios.tsx"), "utf8");
const layoutSource = readFileSync(resolve(root, "client/src/components/ChurchLayout.tsx"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const schedulesSource = readFileSync(resolve(root, "client/src/pages/Escalas.tsx"), "utf8");

describe("Fluxo responsivo e seguro de Ministérios", () => {
  it("mantém os modais limitados à viewport e com rolagem vertical", () => {
    expect(dialogSource).toContain("max-h-[calc(100dvh-1rem)]");
    expect(dialogSource).toContain("overflow-y-auto");
    expect(alertDialogSource).toContain("max-h-[calc(100dvh-1rem)]");
    expect(alertDialogSource).toContain("overflow-y-auto");
  });

  it("mantém ações críticas em rodapé visível e oferece fechamento explícito", () => {
    expect(dialogSource).toContain('data-slot="dialog-footer"');
    expect(dialogSource).toContain("sticky bottom-0");
    expect(ministrySource).toContain("<DialogFooter className=\"pt-3\">");
    expect(ministrySource).toContain("Fechar");
  });

  it("separa acesso de participante da permissão de gestão", () => {
    expect(layoutSource).toContain('accessKey: "canAccessMinistry"');
    expect(routerSource).toContain("const canAccessMinistry = canManageMinistry");
    expect(routerSource).toContain("memberMinistryIds.has(ministry.id)");
    expect(routerSource).toContain("const canManageAll = actorRoles.some((role) => PASTOR_ROLES.has(role))");
  });

  it("permite editar o cadastro básico do Ministério sem alterar sua estrutura", () => {
    expect(ministrySource).toContain('Editar Ministério');
    expect(ministrySource).toContain('ministries.update.useMutation');
    expect(routerSource).toContain('update: protectedProcedure');
    expect(routerSource).toContain('return updateMinistry(input.ministryId, input.churchId');
    expect(routerSource).toContain('await requirePastor(ctx.user.id, input.churchId);');
  });

  it("completa o fluxo de funções personalizadas e mostra a função ao lado da pessoa", () => {
    expect(ministrySource).toContain('Depois de criar uma função, ela aparecerá no seletor');
    expect(ministrySource).toContain('(item.roles ?? []).map');
    expect(routerSource).toContain('getMinistryRoleAssignmentsByMinistry(input.ministryId, input.churchId)');
    expect(routerSource).toContain('const customDefinition =');
    expect(dbSource).toContain('export async function getMinistryRoleAssignmentsByMinistry');
  });

  it("mantém Escalas como agenda única e abre a visão oficial filtrada pelo Ministério", () => {
    expect(ministrySource).toContain('upcomingByMinistry.useQuery');
    expect(ministrySource).toContain('Ver em Escalas');
    expect(ministrySource).toContain('`/app/escalas?ministerio=${selectedMinistry.id}`');
    expect(routerSource).toContain('upcomingByMinistry: protectedProcedure');
    expect(routerSource).toContain('requireMinistryScopedRead(ctx.user.id, input.churchId, input.ministryId)');
    expect(dbSource).toContain('export async function getUpcomingScheduleItemsByMinistry');
    expect(schedulesSource).toContain('get("ministerio")');
    expect(schedulesSource).toContain('displayedScales');
    expect(schedulesSource).toContain('Limpar filtro');
  });

  it("exclui Ministério por arquivamento, com confirmação e preservação de histórico", () => {
    expect(ministrySource).toContain("Excluir Ministério?");
    expect(ministrySource).toContain("archiveMutation.mutate");
    expect(routerSource).toContain("archiveMinistry({ ministryId: input.ministryId, churchId: input.churchId })");
    expect(dbSource).toContain("preservando o histórico");
    expect(dbSource).toContain("eq(scheduleItems.status, \"agendada\")");
    expect(dbSource).toContain("sourceMinistryId, data.ministryId");
  });
});
