import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { appRouter } from "./routers";

function publicContext(tenantSlug: string | null, tenantChurchId: number | null): TrpcContext {
  return {
    user: null,
    tenantSlug,
    tenantChurchId,
    req: { protocol: "https", headers: {} },
    res: {},
  } as unknown as TrpcContext;
}

function churchContext(role: "pastor_presidente" | "pastor_local" | "lider" = "pastor_presidente"): TrpcContext {
  return {
    user: { id: 10, churchId: 100, authSource: "church", role },
    tenantSlug: "igreja-teste",
    tenantChurchId: 100,
    req: { protocol: "https", headers: {} },
    res: {},
  } as unknown as TrpcContext;
}

const draftInput = {
  theme: { primaryColor: "#1e3a5f", secondaryColor: "#c9a84c", accentColor: "#c9a84c", fontPair: "sacred_serif" as const, logoUrl: null, faviconUrl: null },
  sections: [{ sectionType: "hero" as const, enabled: true, sortOrder: 0, content: { title: "Bem-vindo", subtitle: "Uma igreja de fé", primaryCtaLabel: "Visitar", primaryCtaHref: "/visitante" }}],
};

describe("tenantPublic.current", () => {
  afterEach(() => vi.restoreAllMocks());

  it("resolve a página pública exclusivamente pelo slug vindo do host", async () => {
    const experience = {
      church: { id: 21, name: "Igreja A", slug: "igrejaa" },
      site: null,
      theme: null,
      sections: [],
    };
    const getExperience = vi.spyOn(db, "getPublishedTenantPublicExperienceBySlug").mockResolvedValue(experience as never);

    const caller = appRouter.createCaller(publicContext("igrejaa", 999));

    await expect(caller.tenantPublic.current()).resolves.toEqual(experience);
    expect(getExperience).toHaveBeenCalledTimes(1);
    expect(getExperience).toHaveBeenCalledWith("igrejaa");
    expect(getExperience).not.toHaveBeenCalledWith("999");
  });

  it("não retorna uma configuração pública no domínio principal sem tenant", async () => {
    const getExperience = vi.spyOn(db, "getPublishedTenantPublicExperienceBySlug");
    const caller = appRouter.createCaller(publicContext(null, null));

    await expect(caller.tenantPublic.current()).resolves.toBeNull();
    expect(getExperience).not.toHaveBeenCalled();
  });
});

describe("tenantPublic administração", () => {
  afterEach(() => vi.restoreAllMocks());

  it("salva rascunho somente no churchId confirmado pela sessão pastoral", async () => {
    vi.spyOn(db, "getChurchMemberByUserId").mockResolvedValue({ id: 1, userId: 10, churchId: 100, role: "pastor_presidente", active: true } as never);
    const saveDraft = vi.spyOn(db, "saveTenantPublicDraftByChurchId").mockResolvedValue({ site: null, theme: null, sections: [], revisions: [] } as never);
    const caller = appRouter.createCaller(churchContext());

    await caller.tenantPublic.saveDraft(draftInput);

    expect(saveDraft).toHaveBeenCalledWith(100, expect.objectContaining({ theme: draftInput.theme }));
    expect(saveDraft).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ churchId: expect.anything() }));
  });

  it("bloqueia líder comum de salvar ou publicar a página pública", async () => {
    vi.spyOn(db, "getChurchMemberByUserId").mockResolvedValue({ id: 2, userId: 10, churchId: 100, role: "lider", active: true } as never);
    const saveDraft = vi.spyOn(db, "saveTenantPublicDraftByChurchId");
    const publish = vi.spyOn(db, "publishTenantPublicSiteByChurchId");
    const caller = appRouter.createCaller(churchContext("lider"));

    await expect(caller.tenantPublic.saveDraft(draftInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.tenantPublic.publish()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(saveDraft).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("publica a revisão somente para a própria igreja pastoral", async () => {
    vi.spyOn(db, "getChurchMemberByUserId").mockResolvedValue({ id: 3, userId: 10, churchId: 100, role: "pastor_local", active: true } as never);
    const publish = vi.spyOn(db, "publishTenantPublicSiteByChurchId").mockResolvedValue({ site: { id: 3 }, theme: null, sections: [], revisions: [] } as never);
    const caller = appRouter.createCaller(churchContext("pastor_local"));

    await caller.tenantPublic.publish();

    expect(publish).toHaveBeenCalledWith(100, 10);
  });
});
