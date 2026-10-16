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
const dbSource = () =>
  compactSource(readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8"));

function closeCountSheetSource() {
  const source = dbSource();
  const start = source.indexOf("export async function closeTreasuryCountSheet");
  const end = source.indexOf(
    "export async function getTreasuryDepositsByChurch",
    start
  );
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("fechamento atômico da folha de contagem", () => {
  it("executa a folha e o culto dentro de uma transação única", () => {
    const source = closeCountSheetSource();
    expect(source).toContain(
      compactSource("return db.transaction(async (tx) => {")
    );
    expect(source).toContain(
      compactSource("await tx.update(treasuryCountSheets)")
    );
    expect(source).toContain(
      compactSource("await tx.update(treasuryServices)")
    );
    expect(source).not.toContain(
      compactSource("await db.update(treasuryCountSheets)")
    );
    expect(source).not.toContain(
      compactSource("await db.update(treasuryServices)")
    );
  });

  it("bloqueia as linhas relacionadas antes de validar e atualizar o estado", () => {
    const source = closeCountSheetSource();
    expect(source).toContain(compactSource('.limit(1)\n      .for("update");'));
    expect(source.match(/\.for\("update"\)/g)).toHaveLength(2);
  });

  it("mantém escopo por igreja nas leituras e atualizações", () => {
    const source = closeCountSheetSource();
    expect(source).toContain(
      compactSource("eq(treasuryCountSheets.churchId, data.churchId)")
    );
    expect(source).toContain(
      compactSource("eq(treasuryServices.churchId, data.churchId)")
    );
    expect(source).toContain(
      compactSource("eq(treasuryCountSheets.id, data.id)")
    );
    expect(source).toContain(
      compactSource("eq(treasuryServices.id, service.id)")
    );
  });

  it("é idempotente para uma folha já fechada e não escreve novamente", () => {
    const source = closeCountSheetSource();
    const closedGuard = source.indexOf(
      'if (existing.status === "fechada") return existing;'
    );
    const firstWrite = source.indexOf("const sheetUpdate = await tx.update");
    expect(closedGuard).toBeGreaterThanOrEqual(0);
    expect(firstWrite).toBeGreaterThan(closedGuard);
  });

  it("faz rollback lógico se o culto não puder ser fechado depois da folha", () => {
    const source = closeCountSheetSource();
    expect(source).toContain(
      'if (!serviceChanged && service.status !== "fechado") {'
    );
    expect(source).toContain(
      'throw new Error("Falha ao fechar o culto vinculado à folha de contagem")'
    );
    expect(source).toContain(compactSource("serviceUpdate"));
  });

  it("só retorna o estado final depois das duas atualizações", () => {
    const source = closeCountSheetSource();
    const serviceUpdate = source.indexOf(
      "const serviceUpdate = await tx.update"
    );
    const finalRead = source.indexOf(
      "const updatedRows = await tx.select().from(treasuryCountSheets)"
    );
    expect(finalRead).toBeGreaterThan(serviceUpdate);
  });
});
