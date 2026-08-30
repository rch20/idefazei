import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("matriz de acesso do membro", () => {
  const routers = () => readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
  const layout = () => readFileSync(resolve(process.cwd(), "client/src/components/ChurchLayout.tsx"), "utf8");
  const app = () => readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

  it("mantém oração pastoral separada dos pedidos próprios", () => {
    const source = routers();
    expect(source).toContain("requirePrayerManager(ctx.user.id, input.churchId)");
    expect(source).toContain("mine: protectedProcedure");
    expect(source).toContain("createMine: protectedProcedure");
    expect(source).toContain("getPrayerRequestsByPerson(input.churchId, actor.personId)");
  });

  it("protege métricas executivas no servidor", () => {
    const source = routers();
    expect(source).toContain("return getDashboardStats(input.churchId);");
    expect(source).toContain("return getRadarEspiritual(input.churchId);");
    expect(source).toContain("O Radar Espiritual é restrito à liderança autorizada.");
    expect(source).toContain("requireExecutiveReadAccess(ctx.user.id, input.churchId)");
  });

  it("mantém a criação de nova alma limitada à indicação do membro", () => {
    const source = routers();
    expect(source).toContain("const isSelfIndication = !access.isPastoralWorker && Boolean(access.actorPersonId)");
    expect(source).toContain("Membros podem apenas indicar uma nova alma");
    expect(source).toContain('origin: isSelfIndication ? "indicacao" : input.origin');
    expect(source).toContain("await requirePastoralAction(ctx.user.id, input.churchId);");
  });

  it("limita a lista de Novas Almas ao escopo da Pessoa para perfis não pastorais", () => {
    const source = routers();
    expect(source).toContain("const accessiblePersonIds = await getAccessiblePersonIds(ctx.user.id, input.churchId);");
    expect(source).toContain("return souls.filter((soul) => soul.personId !== null && accessiblePersonIds.has(soul.personId));");
    expect(source).not.toContain("if (access.isExecutive || access.isPastoralWorker) return getSoulsByChurch(input.churchId);");
  });

  it("aplica guarda de capacidade nas rotas e mantém Biblioteca e Células disponíveis", () => {
    const source = `${layout()}\n${app()}`;
    expect(source).toContain('accessKey: "isExecutive"');
    expect(source).toContain('accessKey: "isPastoralWorker"');
    expect(source).toContain('label: "Células"');
    expect(source).toContain('label: "Biblioteca"');
    expect(source).toContain("function AccessDenied");
    expect(source).toContain('requiredAccess="isExecutive"');
  });
});
