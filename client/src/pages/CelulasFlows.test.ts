import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../..");
const pageSource = readFileSync(resolve(root, "client/src/pages/Celulas.tsx"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");

describe("Células — participação e histórico", () => {
  it("oferece saída explícita somente para quem pode administrar a Célula", () => {
    expect(pageSource).toContain("trpc.cells.removePerson.useMutation");
    expect(pageSource).toContain("selectedCell?.canManage");
    expect(pageSource).toContain("ConfirmDestructiveActionDialog");
    expect(pageSource).toContain("Retirar da Célula");
    expect(pageSource).toContain("O histórico da participação será preservado e a Jornada principal não será alterada.");
    expect(routerSource).toContain("removePerson: protectedProcedure");
    expect(routerSource).toContain("requireCellManagementPermission(ctx.user.id, input.churchId, input.cellId)");
  });

  it("encerra o vínculo ativo sem apagar a linha histórica", () => {
    expect(dbSource).toContain("export async function removePersonFromCell");
    expect(dbSource).toContain("db.transaction(async (tx)");
    expect(dbSource).toContain("eq(cellMembers.active, true)");
    expect(dbSource).toContain("active: false, leftAt: now");
    expect(dbSource).toContain("A Jornada principal não é alterada aqui.");
  });
});

// Este contrato não cria ou altera dados reais; valida apenas a superfície versionada.
