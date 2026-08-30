import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("matriz de acesso do membro", () => {
  const routers = () => readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
  const layout = () => readFileSync(resolve(process.cwd(), "client/src/components/ChurchLayout.tsx"), "utf8");
  const app = () => readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
  const db = () => readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
  const communication = () => readFileSync(resolve(process.cwd(), "client/src/pages/Comunicacao.tsx"), "utf8");
  const prayer = () => readFileSync(resolve(process.cwd(), "client/src/pages/Oracao.tsx"), "utf8");
  const onboarding = () => readFileSync(resolve(process.cwd(), "client/src/pages/Onboarding.tsx"), "utf8");

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

  it("mantém pedidos privados visíveis somente na caixa da liderança autorizada", () => {
    const source = `${routers()}\n${db()}\n${prayer()}`;
    expect(source).toContain("await requirePrayerManager(ctx.user.id, input.churchId);");
    expect(source).toContain("return getPrayerRequestsByChurch(input.churchId);");
    expect(source).toContain(".where(eq(prayerRequests.churchId, churchId))");
    expect(source).toContain("const pedidos = (requests ?? []).filter((r) => r.type === \"pedido\");");
  });

  it("explica que Comunicação registra histórico, sem simular entrega externa", () => {
    const source = `${routers()}\n${communication()}`;
    expect(source).toContain('await logCommunication({ ...input, status: "enviado" });');
    expect(source).toContain("o histórico atual registra a intenção de envio, não a entrega por um provedor externo");
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

  it("protege correspondências de Pessoas e nomeação de contas com escopo pastoral", () => {
    const source = routers();
    expect(source).toContain("const matches = await findPossiblePeopleByIdentity(input.churchId, input);");
    expect(source).toContain("return accessibleIds === null ? matches : matches.filter((person) => accessibleIds.has(person.id));");
    const authBlock = source.slice(source.indexOf("const churchAuthRouter"), source.indexOf("const adminAuthRouter"));
    expect(authBlock).toContain("register: protectedProcedure");
    expect(authBlock).toContain("pendingRegistrations: protectedProcedure");
    expect(authBlock).toContain("await requirePastor(ctx.user.id, input.churchId);");
    const inviteBlock = source.slice(source.indexOf("const inviteRouter"), source.indexOf("const reportsRouter"));
    expect(inviteBlock).toContain("await requirePastor(ctx.user.id, input.churchId);");
  });

  it("protege a entrada visual do Onboarding para o Pastor", () => {
    const source = onboarding();
    expect(source).toContain('navigate("/login")');
    expect(source).toContain("!accessSummary.isPastor");
    expect(source).toContain("if (!user || accessLoading || !accessSummary?.isPastor) return null;");
  });
});
