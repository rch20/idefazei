import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
      upcomingEvents: [{ id: 81, name: "Culto de Celebração", type: "culto", startDate: new Date("2030-01-01T19:00:00.000Z"), endDate: null, location: "Templo", description: "Celebre conosco" }],
    };
    const getExperience = vi.spyOn(db, "getPublishedTenantPublicExperienceBySlug").mockResolvedValue(experience as never);

    const caller = appRouter.createCaller(publicContext("igrejaa", 999));

    await expect(caller.tenantPublic.current()).resolves.toEqual(experience);
    expect(getExperience).toHaveBeenCalledTimes(1);
    expect(getExperience).toHaveBeenCalledWith("igrejaa");
    expect(getExperience).not.toHaveBeenCalledWith("999");
    expect((await caller.tenantPublic.current())?.upcomingEvents).toEqual([expect.objectContaining({ id: 81, name: "Culto de Celebração" })]);
  });

  it("não retorna uma configuração pública no domínio principal sem tenant", async () => {
    const getExperience = vi.spyOn(db, "getPublishedTenantPublicExperienceBySlug");
    const caller = appRouter.createCaller(publicContext(null, null));

    await expect(caller.tenantPublic.current()).resolves.toBeNull();
    expect(getExperience).not.toHaveBeenCalled();
  });
});

describe("Pedido de oração público por tenant", () => {
  afterEach(() => vi.restoreAllMocks());

  it("encaminha pedido de oração para a caixa administrativa de oração da igreja", async () => {
    vi.spyOn(db, "getChurchBySlug").mockResolvedValue({ id: 21, slug: "igrejaa", active: true } as never);
    const createPrayer = vi.spyOn(db, "createPrayerRequest").mockResolvedValue({ id: 52 } as never);
    const createLead = vi.spyOn(db, "createVisitorLead").mockResolvedValue({ id: 51 } as never);
    const caller = appRouter.createCaller(publicContext("igrejaa", 21));

    await caller.visitor.submit({ churchSlug: "igrejaa", name: "Visitante de teste", phone: "11999999999", type: "pedido_oracao", message: "Ore por mim" });

    expect(createPrayer).toHaveBeenCalledWith({
      churchId: 21,
      visitorName: "Visitante de teste",
      visitorPhone: "11999999999",
      type: "pedido",
      content: "Ore por mim",
      isPrivate: false,
    });
    expect(createLead).not.toHaveBeenCalled();
  });

  it("mantém outras solicitações do portal no fluxo de leads", async () => {
    vi.spyOn(db, "getChurchBySlug").mockResolvedValue({ id: 21, slug: "igrejaa", active: true } as never);
    const createLead = vi.spyOn(db, "createVisitorLead").mockResolvedValue({ id: 51 } as never);
    const createPrayer = vi.spyOn(db, "createPrayerRequest").mockResolvedValue({ id: 52 } as never);
    const caller = appRouter.createCaller(publicContext("igrejaa", 21));

    await caller.visitor.submit({ churchSlug: "igrejaa", name: "Visitante de teste", type: "visita_pastoral", message: "Gostaria de conversar" });

    expect(createLead).toHaveBeenCalledWith(expect.objectContaining({ churchId: 21, churchSlug: "igrejaa", type: "visita_pastoral" }));
    expect(createPrayer).not.toHaveBeenCalled();
  });

  it("bloqueia tentativa de enviar pedido para outra igreja pelo portal atual", async () => {
    const getChurch = vi.spyOn(db, "getChurchBySlug");
    const createLead = vi.spyOn(db, "createVisitorLead");
    const caller = appRouter.createCaller(publicContext("igrejaa", 21));

    await expect(caller.visitor.submit({ churchSlug: "igrejab", name: "Visitante de teste", type: "pedido_oracao" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getChurch).not.toHaveBeenCalled();
    expect(createLead).not.toHaveBeenCalled();
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

describe("Eventos públicos por tenant", () => {
  const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

  it("filtra eventos ativos e futuros sem selecionar QR code, capacidade ou inscrições", () => {
    const helperStart = dbSource.indexOf("export async function getPublicUpcomingEventsByChurchId");
    const helperEnd = dbSource.indexOf("export async function getEventAttendanceReport", helperStart);
    const helper = dbSource.slice(helperStart, helperEnd);

    expect(helper).toContain("eq(events.churchId, churchId)");
    expect(helper).toContain("eq(events.active, true)");
    expect(helper).toContain("gte(events.startDate, new Date())");
    expect(helper).toContain(".limit(3)");
    expect(helper).not.toContain("qrCode:");
    expect(helper).not.toContain("maxCapacity:");
    expect(helper).not.toContain("eventRegistrations");
  });
});

describe("Ministérios públicos por tenant", () => {
  const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

  it("retorna somente Ministérios ativos da igreja e não consulta participantes, funções ou escalas", () => {
    const helperStart = dbSource.indexOf("export async function getPublicMinistriesByChurchId");
    const helperEnd = dbSource.indexOf("export async function getEventAttendanceReport", helperStart);
    const helper = dbSource.slice(helperStart, helperEnd);

    expect(helper).toContain("eq(ministries.churchId, churchId)");
    expect(helper).toContain("eq(ministries.active, true)");
    expect(helper).toContain(".limit(6)");
    expect(helper).not.toContain("leaderId:");
    expect(helper).not.toContain("ministryMembers");
    expect(helper).not.toContain("ministryRoleAssignments");
    expect(helper).not.toContain("scheduleItems");
  });
});

describe("Horários públicos por tenant", () => {
  const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

  it("aceita somente até sete horários estruturados no rascunho da própria igreja", () => {
    const routerStart = routerSource.indexOf("const tenantPublicRouter");
    const routerEnd = routerSource.indexOf("const peopleRouter", routerStart);
    const router = routerSource.slice(routerStart, routerEnd);

    expect(router).toContain("services: z.array(z.object({");
    expect(router).toContain("day: z.string().trim().min(2).max(32)");
    expect(router).toContain("time: z.string().trim().min(2).max(24)");
    expect(router).toContain("}).strict()).max(7).optional()");
    expect(router).toContain("requireChurchPublicSitePublisher(ctx.user.id, ctx.user.churchId)");
    expect(router).not.toContain("churchId: z.number()");
  });
});

describe("Células públicas por tenant", () => {
  const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

  afterEach(() => vi.restoreAllMocks());

  it("seleciona apenas células ativas, publicadas e geolocalizadas da própria igreja", () => {
    const helperStart = dbSource.indexOf("export async function getPublicCellsByChurchId");
    const helperEnd = dbSource.indexOf("export async function getCellById", helperStart);
    const helper = dbSource.slice(helperStart, helperEnd);

    expect(helper).toContain("eq(cells.churchId, churchId)");
    expect(helper).toContain("eq(cells.active, true)");
    expect(helper).toContain("eq(cells.publicVisible, true)");
    expect(helper).toContain("isNotNull(cells.latitude)");
    expect(helper).toContain("isNotNull(cells.longitude)");
    expect(helper).toContain("Math.round(latitude * 100) / 100");
    expect(helper).toContain("address: exactLocation ? row.address : null");
    expect(helper).toContain("row.publicLeaderContact");
    expect(helper).not.toContain("supervisorId:");
    expect(helper).not.toContain("hostId:");
    expect(helper).not.toContain("pastoralNotes");
  });

  it("permite somente pastor da própria igreja configurar a publicação", async () => {
    vi.spyOn(db, "getChurchMemberByUserId").mockResolvedValue({ id: 1, userId: 10, churchId: 100, role: "pastor_presidente", active: true } as never);
    vi.spyOn(db, "getCellById").mockResolvedValue({ id: 7, churchId: 100, leaderId: 22 } as never);
    vi.spyOn(db, "getPersonById").mockResolvedValue({ id: 22, churchId: 100, whatsapp: "11999999999" } as never);
    const update = vi.spyOn(db, "updateCell").mockResolvedValue({ id: 7 } as never);
    const caller = appRouter.createCaller(churchContext());

    await caller.cells.updatePublicSettings({
      churchId: 100,
      cellId: 7,
      address: "Rua de teste, 10",
      city: "São Paulo",
      neighborhood: "Centro",
      latitude: -23.5505,
      longitude: -46.6333,
      meetingDay: "quarta",
      meetingTime: "19:30",
      publicVisible: true,
      publicLocationMode: "approximate",
      publicLeaderContact: true,
    });

    expect(update).toHaveBeenCalledWith(7, 100, expect.objectContaining({
      publicVisible: true,
      publicLocationMode: "approximate",
      publicLeaderContact: true,
      latitude: "-23.5505",
      longitude: "-46.6333",
    }));
  });

  it("não publica célula sem coordenadas", async () => {
    vi.spyOn(db, "getChurchMemberByUserId").mockResolvedValue({ id: 1, userId: 10, churchId: 100, role: "pastor_local", active: true } as never);
    vi.spyOn(db, "getCellById").mockResolvedValue({ id: 7, churchId: 100, leaderId: 22 } as never);
    const update = vi.spyOn(db, "updateCell");
    const caller = appRouter.createCaller(churchContext("pastor_local"));

    await expect(caller.cells.updatePublicSettings({
      churchId: 100,
      cellId: 7,
      address: null,
      city: null,
      neighborhood: null,
      latitude: null,
      longitude: null,
      meetingDay: null,
      meetingTime: null,
      publicVisible: true,
      publicLocationMode: "approximate",
      publicLeaderContact: false,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(update).not.toHaveBeenCalled();
  });
});

describe("Galeria pública por tenant", () => {
  const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
  const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
  const indexSource = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");

  it("aceita no máximo oito mídias, exige texto alternativo e confirma a propriedade por asset e igreja", () => {
    const saveStart = dbSource.indexOf("export async function saveTenantPublicDraftByChurchId");
    const saveEnd = dbSource.indexOf("export async function publishTenantPublicSiteByChurchId", saveStart);
    const helper = dbSource.slice(saveStart, saveEnd);

    expect(helper).toContain("items.length > 8");
    expect(helper).toContain("/manus-storage/churches/${churchId}/public/");
    expect(helper).toContain("media.mediaAssetId");
    expect(helper).toContain("eq(mediaAssets.churchId, churchId)");
    expect(helper).toContain("media.alt.trim().length < 3");
    expect(helper).not.toContain("input.churchId");
  });

  it("prepara um endpoint genérico para imagens e vídeos sem aceitar finalidade arbitrária", () => {
    expect(indexSource).toContain('app.post("/api/media/upload"');
    expect(indexSource).toContain('"public_video"');
    expect(indexSource).toContain('resourceType: MediaResourceType');
    expect(indexSource).toContain("const imagePurposes = new Set<MediaPurpose>");
    expect(indexSource).toContain("createMediaAsset");
  });

  it("mantém o tenant fora do contrato público de escrita e restringe uploads a pastores", () => {
    const routerStart = routerSource.indexOf("const tenantPublicRouter");
    const routerEnd = routerSource.indexOf("const peopleRouter", routerStart);
    const router = routerSource.slice(routerStart, routerEnd);
    const uploadStart = indexSource.indexOf('app.post("/api/tenant-public-media"');
    const uploadEnd = indexSource.indexOf("// Comprovantes financeiros", uploadStart);
    const upload = indexSource.slice(uploadStart, uploadEnd);

    expect(router).toContain("items: z.array(z.object({");
    expect(router).toContain("}).strict()).max(8).optional()");
    expect(router).not.toContain("churchId: z.number()");
    expect(upload).toContain('const publisherRoles = new Set(["pastor_presidente", "pastor_local"])');
    expect(upload).toContain('purpose: "tenant_public_gallery"');
    expect(upload).toContain("fileSize: 4 * 1024 * 1024");
    expect(upload).toContain("uploadMedia");
    expect(upload).toContain("createMediaAsset");
    expect(router).toContain("mediaAssetId: z.number().int().positive().optional()");
  });
});
