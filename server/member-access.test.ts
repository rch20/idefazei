import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("matriz de acesso do membro", () => {
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

  const routers = () =>
    compactSource(
      readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8")
    );
  const layout = () =>
    readFileSync(
      resolve(process.cwd(), "client/src/components/ChurchLayout.tsx"),
      "utf8"
    );
  const app = () =>
    readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
  const db = () =>
    compactSource(readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8"));
  const communication = () =>
    readFileSync(
      resolve(process.cwd(), "client/src/pages/Comunicacao.tsx"),
      "utf8"
    );
  const prayer = () =>
    compactSource(
      readFileSync(
        resolve(process.cwd(), "client/src/pages/Oracao.tsx"),
        "utf8"
      )
    );
  const onboarding = () =>
    readFileSync(
      resolve(process.cwd(), "client/src/pages/Onboarding.tsx"),
      "utf8"
    );

  it("mantém oração pastoral separada dos pedidos próprios", () => {
    const source = routers();
    expect(source).toContain(
      compactSource("requirePrayerManager(ctx.user.id, input.churchId)")
    );
    expect(source).toContain(compactSource("mine: protectedProcedure"));
    expect(source).toContain(compactSource("createMine: protectedProcedure"));
    expect(source).toContain(
      compactSource("getPrayerRequestsByPerson(input.churchId, actor.personId)")
    );
  });

  it("protege métricas executivas no servidor", () => {
    const source = routers();
    expect(source).toContain(
      compactSource("return getDashboardStats(input.churchId);")
    );
    expect(source).toContain(
      compactSource("return getRadarEspiritual(input.churchId);")
    );
    expect(source).toContain(
      compactSource("O Radar Espiritual é restrito à liderança autorizada.")
    );
    expect(source).toContain(
      compactSource("requireExecutiveReadAccess(ctx.user.id, input.churchId)")
    );
  });

  it("mantém a criação de nova alma limitada à indicação do membro", () => {
    const source = routers();
    expect(source).toContain(
      compactSource(
        "const isSelfIndication = !access.isPastoralWorker && Boolean(access.actorPersonId)"
      )
    );
    expect(source).toContain(
      compactSource("Membros podem apenas indicar uma nova alma")
    );
    expect(source).toContain(
      compactSource('origin: isSelfIndication ? "indicacao" : input.origin')
    );
    expect(source).toContain(
      compactSource("await requirePastoralAction(ctx.user.id, input.churchId);")
    );
  });

  it("limita a lista de Novas Almas ao escopo da Pessoa para perfis não pastorais", () => {
    const source = routers();
    expect(source).toContain(
      compactSource(
        "const accessiblePersonIds = await getAccessiblePersonIds(ctx.user.id, input.churchId);"
      )
    );
    expect(source).toContain(
      compactSource(
        "return uniqueSouls.filter((soul) => soul.personId !== null && accessiblePersonIds.has(soul.personId));"
      )
    );
    expect(source).toContain(
      compactSource(
        "const uniqueSouls = souls.filter((soul) => !publicLeadSoulIds.has(soul.id));"
      )
    );
    expect(source).not.toContain(
      compactSource(
        "if (access.isExecutive || access.isPastoralWorker) return getSoulsByChurch(input.churchId);"
      )
    );
  });

  it("mantém pedidos privados visíveis somente na caixa da liderança autorizada", () => {
    const source = `${routers()}\n${db()}\n${prayer()}`;
    expect(source).toContain(
      compactSource("await requirePrayerManager(ctx.user.id, input.churchId);")
    );
    expect(source).toContain(
      compactSource("return getPrayerRequestsByChurch(input.churchId);")
    );
    expect(source).toContain(
      compactSource(".where(eq(prayerRequests.churchId, churchId))")
    );
    expect(source).toContain(
      compactSource(
        'const pedidos = (requests ?? []).filter((r) => r.type === "pedido");'
      )
    );
  });

  it("explica que Comunicação registra histórico, sem simular entrega externa", () => {
    const source = `${routers()}\n${communication()}`;
    expect(source).toContain(
      compactSource('await logCommunication({ ...input, status: "enviado" });')
    );
    expect(source).toContain(
      compactSource(
        "o histórico atual registra a intenção de envio, não a entrega por um provedor externo"
      )
    );
  });

  it("aplica guarda de capacidade nas rotas e mantém Biblioteca e Células disponíveis", () => {
    const source = `${layout()}\n${app()}`;
    expect(source).toContain(compactSource('accessKey: "isExecutive"'));
    expect(source).toContain(compactSource('accessKey: "isPastoralWorker"'));
    expect(source).toContain(compactSource('label: "Células"'));
    expect(source).toContain(compactSource('label: "Biblioteca"'));
    expect(source).toContain(compactSource("function AccessDenied"));
    expect(source).toContain(compactSource('requiredAccess="isExecutive"'));
  });

  it("protege correspondências de Pessoas e nomeação de contas com escopo pastoral", () => {
    const source = routers();
    expect(source).toContain(
      compactSource(
        "const matches = await findPossiblePeopleByIdentity(input.churchId, input);"
      )
    );
    expect(source).toContain(
      compactSource(
        "return accessibleIds === null ? matches : matches.filter((person) => accessibleIds.has(person.id));"
      )
    );
    const authBlock = source.slice(
      source.indexOf("const churchAuthRouter"),
      source.indexOf("const adminAuthRouter")
    );
    expect(authBlock).toContain(compactSource("register: protectedProcedure"));
    expect(authBlock).toContain(
      compactSource("pendingRegistrations: protectedProcedure")
    );
    expect(authBlock).toContain(
      compactSource("await requirePastor(ctx.user.id, input.churchId);")
    );
    const inviteBlock = source.slice(
      source.indexOf("const inviteRouter"),
      source.indexOf("const reportsRouter")
    );
    expect(inviteBlock).toContain(
      compactSource("await requirePastor(ctx.user.id, input.churchId);")
    );
  });

  it("protege a entrada visual do Onboarding para o administrador da igreja", () => {
    const source = onboarding();
    expect(source).toContain(compactSource('navigate("/login")'));
    expect(source).toContain(compactSource("!accessSummary.canManageChurch"));
    expect(source).toContain(
      compactSource("if (!user || accessLoading) return null;")
    );
    expect(source).toContain(compactSource("if (accessError) return"));
    expect(source).toContain(
      compactSource("if (!accessSummary?.canManageChurch) return null;")
    );
  });

  it("mantém Pessoas e funções disponíveis para o Supervisor administrador", () => {
    const source = compactSource(
      readFileSync(
        resolve(process.cwd(), "client/src/pages/Configuracoes.tsx"),
        "utf8"
      )
    );
    expect(source).toContain(
      compactSource("const { churchId, accessSummary } = useChurch();")
    );
    expect(source).toContain(
      compactSource(
        "const canManageAccounts = Boolean(accessSummary?.canManageChurch);"
      )
    );
    expect(source).toContain(
      compactSource(
        "const canManageRoles = Boolean(accessSummary?.canManageChurch);"
      )
    );
    expect(source).not.toContain(
      compactSource(
        '["pastor_presidente", "pastor_local"].includes(user?.role ?? "")'
      )
    );
  });
});
