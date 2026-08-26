import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Fluxos de liderança — contratos da interface", () => {
  it("usa no App do Líder somente os campos atuais da Consolidação", () => {
    const source = read("client/src/pages/AppLider.tsx");
    expect(source).toContain('key: "callMade"');
    expect(source).toContain('key: "visitMade"');
    expect(source).toContain('key: "bibleDelivered"');
    expect(source).toContain("c.addedToCell");
    expect(source).not.toContain("phoneCalled");
    expect(source).not.toContain("cellInvited");
  });

  it("usa capacidades calculadas pelo backend para ações de Ministérios", () => {
    const source = read("client/src/pages/Ministerios.tsx");
    expect(source).toContain("churchAuth.effectiveRoles.useQuery");
    expect(source).toContain("ministries.updateLeader.useMutation");
    expect(source).toContain("ministries.candidates.useQuery");
    expect(source).toContain("selectedMinistry?.canManage");
    expect(source).toContain("canCreateMinistry &&");
  });

  it("permite ao líder incluir somente Pessoas sem Célula e oculta ações não autorizadas", () => {
    const source = read("client/src/pages/Celulas.tsx");
    expect(source).toContain("cells.managementAccess.useQuery");
    expect(source).toContain("cells.assignmentCandidates.useQuery");
    expect(source).toContain("selectedCell?.canManage");
    expect(source).toContain("Adicionar Pessoa sem Célula");
    expect(source).toContain("Transferências permanecem sob responsabilidade pastoral");
    expect(source).toContain("canCreateCell &&");
  });

  it("mantém operações críticas protegidas por transação e bloqueio", () => {
    const source = read("server/db.ts");
    expect(source).toContain("startConsolidationWorkflow");
    expect(source).toContain("setMinistryLeader");
    expect(source).toContain('.for("update")');
    expect(source).toContain("return db.transaction(async (tx) =>");
  });
});
