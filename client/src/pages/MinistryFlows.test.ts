import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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

const root = resolve(process.cwd());
const dialogSource = compactSource(
  readFileSync(resolve(root, "client/src/components/ui/dialog.tsx"), "utf8")
);
const alertDialogSource = compactSource(
  readFileSync(
    resolve(root, "client/src/components/ui/alert-dialog.tsx"),
    "utf8"
  )
);
const ministrySource = compactSource(
  readFileSync(resolve(root, "client/src/pages/Ministerios.tsx"), "utf8")
);
const layoutSource = compactSource(
  readFileSync(resolve(root, "client/src/components/ChurchLayout.tsx"), "utf8")
);
const routerSource = compactSource(
  readFileSync(resolve(root, "server/routers.ts"), "utf8")
);
const dbSource = compactSource(
  readFileSync(resolve(root, "server/db.ts"), "utf8")
);
const schedulesSource = compactSource(
  readFileSync(resolve(root, "client/src/pages/Escalas.tsx"), "utf8")
);
const iconsSource = compactSource(
  readFileSync(resolve(root, "shared/ministryIcons.ts"), "utf8")
);
const schemaSource = compactSource(
  readFileSync(resolve(root, "drizzle/schema.ts"), "utf8")
);
const sonnerSource = compactSource(
  readFileSync(resolve(root, "client/src/components/ui/sonner.tsx"), "utf8")
);

describe("Fluxo responsivo e seguro de Ministérios", () => {
  it("mantém os modais limitados à viewport e com rolagem vertical", () => {
    expect(dialogSource).toContain(compactSource("max-h-[calc(100dvh-1rem)]"));
    expect(dialogSource).toContain(compactSource("overflow-y-auto"));
    expect(alertDialogSource).toContain(
      compactSource("max-h-[calc(100dvh-1rem)]")
    );
    expect(alertDialogSource).toContain(compactSource("overflow-y-auto"));
  });

  it("mantém ações críticas em rodapé visível e oferece fechamento explícito", () => {
    expect(dialogSource).toContain(compactSource('data-slot="dialog-footer"'));
    expect(dialogSource).toContain(compactSource("sticky bottom-0"));
    expect(ministrySource).toContain(compactSource("AdaptiveFormDialogFooter"));
    expect(ministrySource).toContain(compactSource("Fechar"));
  });

  it("usa Full-Screen Modal no cadastro e na equipe, sem ampliar a edição curta", () => {
    expect(
      ministrySource.match(/<AdaptiveFormDialogContent/g)?.length
    ).toBeGreaterThanOrEqual(2);
    expect(ministrySource).toContain(compactSource("Criar Ministério"));
    expect(ministrySource).toContain(compactSource("Equipe do Ministério"));
    expect(ministrySource).toContain(compactSource("Funções avançadas"));
    expect(ministrySource).toContain(
      compactSource('<AdaptiveFormDialogContent className="sm:max-w-lg">')
    );
    expect(ministrySource).toContain(
      compactSource("setSelectedMinistry(null);")
    );
    expect(ministrySource).toContain(compactSource("setEditTarget(target);"));
    expect(ministrySource).toContain(compactSource("const closeEditMinistry"));
    expect(ministrySource).toContain(compactSource("Excluir Ministério?"));
  });

  it("separa acesso de participante da permissão de gestão", () => {
    expect(layoutSource).toContain(
      compactSource('accessKey: "canAccessMinistry"')
    );
    expect(layoutSource).toContain(
      compactSource('accessKey: "canManageSchedules"')
    );
    expect(layoutSource).toContain(
      compactSource("canManageSchedules: boolean")
    );
    expect(routerSource).toContain(
      compactSource("const canAccessMinistry = canManageMinistry")
    );
    expect(routerSource).toContain(
      compactSource(
        "const canManageSchedules = canManageMinistry || canManageDepartmentSchedule"
      )
    );
    expect(routerSource).toContain(
      compactSource("memberMinistryIds.has(ministry.id)")
    );
    expect(routerSource).toContain(
      compactSource(
        "const canManageAll = actorRoles.some((role) => PASTOR_OR_SUPERVISOR_ROLES.has(role))"
      )
    );
  });

  it("reutiliza o accessSummary no Ministério em vez de repetir a consulta de papéis", () => {
    expect(ministrySource).toContain(
      compactSource("const { churchId, accessSummary } = useChurch();")
    );
    expect(ministrySource).toContain(
      compactSource(
        "const canCreateMinistry = Boolean(accessSummary?.canManageChurch);"
      )
    );
    expect(ministrySource).not.toContain(
      compactSource("effectiveRoles.useQuery")
    );
  });

  it("permite editar o cadastro básico do Ministério sem alterar sua estrutura", () => {
    expect(ministrySource).toContain(compactSource("Editar Ministério"));
    expect(ministrySource).toContain(
      compactSource("ministries.update.useMutation")
    );
    expect(ministrySource).toContain(
      compactSource("ministryId: editTarget.id")
    );
    expect(routerSource).toContain(compactSource("update: protectedProcedure"));
    expect(routerSource).toContain(
      compactSource("return updateMinistry(input.ministryId, input.churchId")
    );
    expect(routerSource).toContain(
      compactSource("await requirePastor(ctx.user.id, input.churchId);")
    );
  });

  it("oferece biblioteca fechada de ícones e persiste a escolha por tenant", () => {
    expect(ministrySource).toContain(
      compactSource("MINISTRY_ICON_OPTIONS.map")
    );
    expect(ministrySource).toContain(
      compactSource("aria-pressed={form.iconKey === option.key}")
    );
    expect(ministrySource).toContain(
      compactSource("aria-pressed={editForm.iconKey === option.key}")
    );
    expect(iconsSource).toContain(compactSource('key: "sparkles"'));
    expect(iconsSource).toContain(compactSource('key: "music"'));
    expect(iconsSource).toContain(compactSource('key: "utensils"'));
    expect(iconsSource).toContain(compactSource("DEFAULT_MINISTRY_ICON_KEY"));
    expect(routerSource).toContain(
      compactSource(
        "iconKey: z.enum(MINISTRY_ICON_KEYS as [string, ...string[]])"
      )
    );
    expect(routerSource).toContain(compactSource("iconKey: input.iconKey"));
    expect(schemaSource).toContain(
      compactSource(
        'iconKey: varchar("iconKey", { length: 40 }).default("sparkles").notNull()'
      )
    );
  });

  it("completa o fluxo de funções personalizadas e mostra a função ao lado da pessoa", () => {
    expect(ministrySource).toContain(
      compactSource("Depois de criar uma função, ela aparecerá no seletor")
    );
    expect(ministrySource).toContain(compactSource("(item.roles ?? []).map"));
    expect(routerSource).toContain(
      compactSource(
        "getMinistryRoleAssignmentsByMinistry(input.ministryId, input.churchId)"
      )
    );
    expect(routerSource).toContain(compactSource("const customDefinition ="));
    expect(dbSource).toContain(
      compactSource(
        "export async function getMinistryRoleAssignmentsByMinistry"
      )
    );
  });

  it("mantém Escalas como agenda única e abre a visão oficial filtrada pelo Ministério", () => {
    expect(ministrySource).toContain(
      compactSource("upcomingByMinistry.useQuery")
    );
    expect(ministrySource).toContain(compactSource("Ver em Escalas"));
    expect(ministrySource).toContain(
      compactSource("`/app/escalas?ministerio=${selectedMinistry.id}`")
    );
    expect(routerSource).toContain(
      compactSource("upcomingByMinistry: protectedProcedure")
    );
    expect(routerSource).toContain(
      compactSource(
        "requireMinistryScopedRead(ctx.user.id, input.churchId, input.ministryId)"
      )
    );
    expect(dbSource).toContain(
      compactSource("export async function getUpcomingScheduleItemsByMinistry")
    );
    expect(schedulesSource).toContain(compactSource('get("ministerio")'));
    expect(schedulesSource).toContain(compactSource("displayedScales"));
    expect(schedulesSource).toContain(compactSource("Limpar filtro"));
  });

  it("oferece filtro de acompanhamento e resumo operacional sem duplicar registros", () => {
    expect(ministrySource).toContain(compactSource("statusFilter"));
    expect(ministrySource).toContain(compactSource("Sem líder responsável"));
    expect(ministrySource).toContain(
      compactSource("Acompanhamento do Ministério")
    );
    expect(ministrySource).toContain(compactSource("operationalAttention"));
    expect(ministrySource).toContain(
      compactSource("os registros continuam nas áreas oficiais do sistema")
    );
    expect(ministrySource).toContain(compactSource("Próxima escala"));
    expect(ministrySource).toContain(compactSource("upcomingSchedules.data"));
    expect(schedulesSource).toContain(compactSource("displayedScales"));
  });

  it("exclui Ministério por arquivamento, com confirmação e preservação de histórico", () => {
    expect(ministrySource).toContain(compactSource("Excluir Ministério?"));
    expect(ministrySource).toContain(compactSource("archiveMutation.mutate"));
    expect(routerSource).toContain(
      compactSource(
        "archiveMinistry({ ministryId: input.ministryId, churchId: input.churchId })"
      )
    );
    expect(dbSource).toContain(compactSource("preservando o histórico"));
    expect(dbSource).toContain(
      compactSource('eq(scheduleItems.status, "agendada")')
    );
    expect(dbSource).toContain(
      compactSource("sourceMinistryId, data.ministryId")
    );
  });

  it("exibe o bloqueio de exclusão com contraste e acima do menu mobile", () => {
    expect(ministrySource).toContain(
      compactSource('toast.error("Não foi possível excluir o Ministério"')
    );
    expect(ministrySource).toContain(compactSource('position: "top-center"'));
    expect(sonnerSource).toContain(compactSource('position="top-center"'));
    expect(sonnerSource).toContain(
      compactSource('className="toaster group z-[9999]"')
    );
    expect(sonnerSource).toContain(
      compactSource("!bg-white !text-red-900 !border-red-300")
    );
    expect(sonnerSource).toContain(compactSource("closeButton"));
  });
});
