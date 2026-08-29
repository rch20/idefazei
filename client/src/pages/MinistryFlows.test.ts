import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const dialogSource = readFileSync(resolve(root, "client/src/components/ui/dialog.tsx"), "utf8");
const alertDialogSource = readFileSync(resolve(root, "client/src/components/ui/alert-dialog.tsx"), "utf8");
const ministrySource = readFileSync(resolve(root, "client/src/pages/Ministerios.tsx"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");

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

  it("exclui Ministério por arquivamento, com confirmação e preservação de histórico", () => {
    expect(ministrySource).toContain("Excluir Ministério?");
    expect(ministrySource).toContain("archiveMutation.mutate");
    expect(routerSource).toContain("archiveMinistry({ ministryId: input.ministryId, churchId: input.churchId })");
    expect(dbSource).toContain("preservando o histórico");
    expect(dbSource).toContain("eq(scheduleItems.status, \"agendada\")");
    expect(dbSource).toContain("sourceMinistryId, data.ministryId");
  });
});
