import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("./components/ChurchLayout.tsx", import.meta.url), "utf8");
const constructionSource = readFileSync(new URL("./components/UnderConstruction.tsx", import.meta.url), "utf8");

describe("disponibilidade das áreas temporariamente bloqueadas", () => {
  it("mantém o estado Em construção sem depender do tenant", () => {
    expect(appSource).toContain("UnderConstruction");
    expect(appSource).toContain("underConstruction?: boolean");
    expect(layoutSource).toContain("underConstruction?: boolean");
    expect(layoutSource).toContain("Em construção");
    expect(constructionSource).toContain("Em construção");
    expect(constructionSource).toContain("Voltar ao início");
  });

  it("mantém bloqueadas as áreas administrativas e libera somente a Escola", () => {
    expect(appSource).toContain('<AppPage title="Certificados" requiredAccess="canManageChurch" underConstruction>');
    expect(appSource).toContain('<AppPage title="Faturamento" requiredAccess="canManageChurch" underConstruction>');
    expect(appSource).toContain('<AppPage title="Escola de Fundamentos">');
    expect(appSource).not.toContain('<AppPage title="Escola de Fundamentos" underConstruction>');
    expect(layoutSource).toContain('label: "Escola de Fundamentos", path: "/app/escola-fundamentos", group: "discipulado" },');
  });
});
