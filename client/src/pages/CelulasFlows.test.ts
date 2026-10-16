import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../..");
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
const pageSource = readFileSync(
  resolve(root, "client/src/pages/Celulas.tsx"),
  "utf8"
);
const routerSource = compactSource(
  readFileSync(resolve(root, "server/routers.ts"), "utf8")
);
const dbSource = compactSource(
  readFileSync(resolve(root, "server/db.ts"), "utf8")
);

describe("Células — participação e histórico", () => {
  it("oferece saída explícita somente para quem pode administrar a Célula", () => {
    expect(pageSource).toContain("trpc.cells.removePerson.useMutation");
    expect(pageSource).toContain("selectedCell?.canManage");
    expect(pageSource).toContain("ConfirmDestructiveActionDialog");
    expect(pageSource).toContain("Retirar da Célula");
    expect(pageSource).toContain(
      "O histórico da participação será preservado e a formação principal não será alterada."
    );
    expect(routerSource).toContain(
      compactSource("removePerson: protectedProcedure")
    );
    expect(routerSource).toContain(
      compactSource(
        "requireCellManagementPermission(ctx.user.id, input.churchId, input.cellId)"
      )
    );
  });

  it("encerra o vínculo ativo sem apagar a linha histórica", () => {
    expect(dbSource).toContain(
      compactSource("export async function removePersonFromCell")
    );
    expect(dbSource).toContain(compactSource("db.transaction(async (tx)"));
    expect(dbSource).toContain(compactSource("eq(cellMembers.active, true)"));
    expect(dbSource).toContain(compactSource("active: false, leftAt: now"));
    expect(dbSource).toContain(
      compactSource("A formação principal não é alterada aqui.")
    );
  });
});

// Este contrato não cria ou altera dados reais; valida apenas a superfície versionada.
