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
    expect(source).toContain("Adicionar pessoa à Célula");
    expect(source).toContain("Adicionar à Célula");
    expect(source).toContain("getWhatsAppLinkWithMessage");
    expect(source).toContain("section=resumo");
    expect(source).toContain("Abrir prontuário de");
    expect(source).toContain("Conversar com");
    expect(source).toContain("Transferências entre Células continuam sob responsabilidade pastoral");
    expect(source).toContain("canCreateCell &&");
  });

  it("organiza o modal de gestão da Célula para leitura no desktop", () => {
    const source = read("client/src/pages/Celulas.tsx");
    expect(source).toContain("sm:max-w-2xl");
    expect(source).toContain("Gestão da Célula, liderança, rotina e pessoas vinculadas em um só lugar.");
    expect(source).toContain("lg:grid-cols-2");
    expect(source).toContain("Encontro semanal");
    expect(source).toContain("Localização");
    expect(source).toContain("Rotina da Célula");
    expect(source).toContain("lg:overflow-y-auto");
    expect(source).toContain("lg:grid-cols-2");
    expect(source).toContain("lg:col-span-2");
    expect(source).toContain("Pessoa sem Célula");
    expect(source).toContain("lg:grid-cols-[minmax(0,1fr)_auto]");
    expect(source).toContain("rounded-2xl border");
  });

  it("mantém operações críticas protegidas por transação e bloqueio", () => {
    const source = read("server/db.ts");
    expect(source).toContain("startConsolidationWorkflow");
    expect(source).toContain("setMinistryLeader");
    expect(source).toContain('.for("update")');
    expect(source).toContain("return db.transaction(async (tx) =>");
  });
});
