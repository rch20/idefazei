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

describe("Células — registro de encontro e visitantes", () => {
  it("abre a lista de presença acima da modal da Célula", () => {
    // A modal da Célula usa z-[200]; a de presença precisa vir à frente.
    expect(pageSource).toContain('overlayClassName="z-[205]"');
    expect(pageSource).toContain('className="z-[210]');
  });

  it("permite informar visitantes novos de forma opcional", () => {
    expect(pageSource).toContain('id="cell-meeting-visitors"');
    expect(pageSource).toContain("Visitantes novos (opcional)");
    expect(pageSource).toContain("visitorsCount:");
    expect(routerSource).toContain(
      compactSource("visitorsCount: z.number().int().min(0).max(999).optional()")
    );
  });

  it("registra visitantes como presença reusando o schema existente", () => {
    expect(dbSource).toContain(compactSource('status: "visitante" as const'));
    expect(dbSource).toContain(compactSource("isNewSoul: true"));
    expect(dbSource).toContain(compactSource("= 'visitante' THEN 1 ELSE 0 END"));
  });
});

// Este contrato não cria ou altera dados reais; valida apenas a superfície versionada.
