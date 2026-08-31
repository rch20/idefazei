import { and, count, desc, eq, gt, gte, isNotNull, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  announcements,
  baptismClasses,
  baptismEnrollments,
  careAssignments,
  cellAttendance,
  cellMeetings,
  cellMembers,
  cells,
  churchMembers,
  churchNotificationPreferences,
  churchRegistrations,
  churchUserComplementaryRoles,
  churchUsers,
  churches,
  communicationLogs,
  consolidations,
  consolidationCaseAssignments,
  consolidationFollowUps,
  consolidationReferrals,
  careVisitEvents,
  careVisits,
  counselingNotes,
  counselingSessions,
  courseEnrollments,
  courses,
  departmentMembers,
  departmentRoleAssignments,
  departments,
  foundationStudies,
  foundationModules,
  foundationStudyMaterials,
  foundationStudyAdministrators,
  encounterChecklistItems,
  encounterDiscipleForms,
  encounterEnrollments,
  encounterEvents,
  encounterHistory,
  encounterPublicForms,
  encounterServantAssignments,
  encounterTeams,
  eventRegistrations,
  events,
  families,
  familyMembers,
  financialAccounts,
  financialAuditLogs,
  financialCategories,
  financialPeriodClosures,
  financialReconciliationAttachments,
  financialReconciliations,
  financialTransactions,
  treasuryServices,
  treasuryRecurringSchedules,
  treasuryCountSheets,
  treasuryDeposits,
  treasuryReports,
  mediaAssets,
  InsertMediaAsset,
  InsertUser,
  leadershipHistory,
  leadershipSchoolClasses,
  leadershipSchoolEnrollments,
  libraryItems,
  ministries,
  ministryMembers,
  ministryRoleAssignments,
  ministryRoleDefinitions,
  notificationDeliveries,
  notificationEvents,
  people,
  prayerRequests,
  scheduleItems,
  startupDiagnostics,
  superAdmins,
  souls,
  tenantPageRevisions,
  tenantPageSections,
  tenantPublicSites,
  tenantThemes,
  users,
  visitorLeads,
  onboardingProgress,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getDerivedLogoIconUrls } from "./media";
import { normalizeSocialMediaLinks } from "../shared/socialMedia";
import { normalizePastoralSupportConfig } from "../shared/pastoralSupport";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function createMediaAsset(data: InsertMediaAsset) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(mediaAssets).values(data);
  const id = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
  if (!id) return null;
  const rows = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), eq(mediaAssets.churchId, data.churchId))).limit(1);
  return rows[0] ?? null;
}

export async function getActiveMediaAssetById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), eq(mediaAssets.churchId, churchId), eq(mediaAssets.status, "active"))).limit(1);
  return rows[0] ?? null;
}

export async function markMediaAssetDeleted(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(mediaAssets).set({ status: "deleted" }).where(and(eq(mediaAssets.id, id), eq(mediaAssets.churchId, churchId), eq(mediaAssets.status, "active")));
  return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

// ─── NOTIFICAÇÕES MULTI-CANAL ─────────────────────────────────────────────────

export type NotificationEventType =
  | "cadastro_pendente"
  | "pessoa_aprovada"
  | "visita_agendada"
  | "lembrete_visita"
  | "visita_nao_realizada"
  | "responsabilidade_atribuida"
  | "funcao_ministerial_atribuida"
  | "evento_igreja"
  | "comunicado_lideranca"
  | "encaminhamento_sem_aceite"
  | "lembrete_escala"
  | "escala_alterada"
  | "escala_cancelada";

export type NotificationChannel = "sistema" | "whatsapp";

export async function isNotificationChannelActive(churchId: number, eventType: NotificationEventType, channel: NotificationChannel) {
  const db = await getDb();
  if (!db) return false;
  const preference = await db.select().from(churchNotificationPreferences)
    .where(and(eq(churchNotificationPreferences.churchId, churchId), eq(churchNotificationPreferences.eventType, eventType), eq(churchNotificationPreferences.channel, channel)))
    .limit(1);
  return preference[0]?.active ?? channel === "sistema";
}

export async function getNotificationEventByDedupeKey(churchId: number, dedupeKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(notificationEvents)
    .where(and(eq(notificationEvents.churchId, churchId), eq(notificationEvents.dedupeKey, dedupeKey)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createNotificationEvent(data: {
  churchId: number; type: NotificationEventType; entityType?: string | null; entityId?: number | null;
  title: string; body: string; metadata?: Record<string, unknown> | null; dedupeKey?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notificationEvents).values({
    churchId: data.churchId, type: data.type, entityType: data.entityType ?? null, entityId: data.entityId ?? null,
    title: data.title, body: data.body, metadata: data.metadata ?? null, dedupeKey: data.dedupeKey ?? null,
  });
  const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
  const rows = await db.select().from(notificationEvents).where(eq(notificationEvents.id, id)).limit(1);
  if (!rows[0]) throw new Error("Falha ao criar evento de notificação");
  return rows[0];
}

export async function createInternalNotificationDelivery(data: { churchId: number; eventId: number; recipientChurchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(notificationDeliveries).values({
    churchId: data.churchId, eventId: data.eventId, recipientChurchUserId: data.recipientChurchUserId,
    channel: "sistema", status: "entregue", deliveredAt: new Date(),
  });
}

export async function getNotificationsForChurchUser(data: { churchId: number; churchUserId: number; unreadOnly?: boolean; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(notificationDeliveries.churchId, data.churchId), eq(notificationDeliveries.recipientChurchUserId, data.churchUserId), eq(notificationDeliveries.channel, "sistema")];
  if (data.unreadOnly) conditions.push(isNull(notificationDeliveries.readAt));
  return db.select({ delivery: notificationDeliveries, event: notificationEvents })
    .from(notificationDeliveries)
    .innerJoin(notificationEvents, and(eq(notificationEvents.id, notificationDeliveries.eventId), eq(notificationEvents.churchId, data.churchId)))
    .where(and(...conditions)).orderBy(desc(notificationDeliveries.createdAt)).limit(data.limit ?? 40);
}

export async function getUnreadNotificationCount(churchId: number, churchUserId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ value: count() }).from(notificationDeliveries)
    .where(and(eq(notificationDeliveries.churchId, churchId), eq(notificationDeliveries.recipientChurchUserId, churchUserId), eq(notificationDeliveries.channel, "sistema"), isNull(notificationDeliveries.readAt)));
  return Number(rows[0]?.value ?? 0);
}

export async function markNotificationRead(data: { id: number; churchId: number; churchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notificationDeliveries).set({ status: "lida", readAt: new Date() })
    .where(and(eq(notificationDeliveries.id, data.id), eq(notificationDeliveries.churchId, data.churchId), eq(notificationDeliveries.recipientChurchUserId, data.churchUserId), eq(notificationDeliveries.channel, "sistema")));
}

// ─── DIAGNÓSTICOS DE INICIALIZAÇÃO ────────────────────────────────────────────

export type StartupDiagnosticKind = "error" | "unhandled_rejection" | "resource_load" | "startup_timeout" | "recovery";

export async function createStartupDiagnostic(data: {
  churchId?: number | null;
  kind: StartupDiagnosticKind;
  message: string;
  fingerprint: string;
  path: string;
  userAgent: string;
  platform?: string | null;
  appVersion?: string | null;
  clientId?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const retentionDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await db.delete(startupDiagnostics).where(lt(startupDiagnostics.createdAt, retentionDate));
  const result = await db.insert(startupDiagnostics).values(data);
  const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
  const rows = await db.select().from(startupDiagnostics).where(eq(startupDiagnostics.id, id)).limit(1);
  if (!rows[0]) throw new Error("Falha ao registrar diagnóstico de inicialização");
  return rows[0];
}

export async function getStartupDiagnostics(limit = 80) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(startupDiagnostics).orderBy(desc(startupDiagnostics.createdAt)).limit(Math.min(Math.max(limit, 1), 200));
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── CHURCHES (TENANTS) ───────────────────────────────────────────────────────

export async function getChurchBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(churches).where(eq(churches.slug, slug)).limit(1);
  return result[0] ?? null;
}

export async function getChurchById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(churches).where(eq(churches.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getAllChurches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(churches).where(eq(churches.active, true)).orderBy(churches.name);
}

export async function createChurch(data: typeof churches.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(churches).values(data);
  const insertId = (result[0] as { insertId?: number })?.insertId;
  if (!insertId) throw new Error("Failed to create church");
  const rows = await db.select().from(churches).where(eq(churches.id, insertId)).limit(1);
  return rows[0];
}

type PublishedBrandingPatch = Partial<Pick<typeof tenantThemes.$inferInsert, "primaryColor" | "secondaryColor" | "logoUrl" | "faviconUrl">>;

async function syncPublishedBranding(tx: Parameters<Parameters<NonNullable<Awaited<ReturnType<typeof getDb>>>["transaction"]>[0]>[0], churchId: number, branding: PublishedBrandingPatch) {
  const siteRows = await tx.select().from(tenantPublicSites).where(eq(tenantPublicSites.churchId, churchId)).limit(1);
  const site = siteRows[0];
  if (!site?.publishedRevisionId) return;
  const revisionRows = await tx.select().from(tenantPageRevisions).where(and(
    eq(tenantPageRevisions.id, site.publishedRevisionId),
    eq(tenantPageRevisions.churchId, churchId),
    eq(tenantPageRevisions.siteId, site.id),
  )).limit(1);
  const revision = revisionRows[0];
  const snapshot = revision?.snapshot as { theme?: Record<string, unknown>; sections?: unknown } | undefined;
  if (!revision || !snapshot?.theme) return;
  await tx.update(tenantPageRevisions).set({
    snapshot: { ...snapshot, theme: { ...snapshot.theme, ...branding } },
  }).where(and(
    eq(tenantPageRevisions.id, revision.id),
    eq(tenantPageRevisions.churchId, churchId),
    eq(tenantPageRevisions.siteId, site.id),
  ));
}

async function getLatestLogoForChurch(churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(mediaAssets).where(and(
    eq(mediaAssets.churchId, churchId),
    eq(mediaAssets.purpose, "tenant_logo"),
    eq(mediaAssets.status, "active"),
  )).orderBy(desc(mediaAssets.createdAt), desc(mediaAssets.id)).limit(1);
  return rows[0] ?? null;
}

async function deriveLatestLogoIcon(churchId: number, backgroundColor?: string | null) {
  const asset = await getLatestLogoForChurch(churchId);
  if (!asset) return null;
  return getDerivedLogoIconUrls({
    provider: asset.provider,
    publicId: asset.publicId,
    url: asset.secureUrl ?? asset.url,
  }, backgroundColor);
}

export async function updateChurch(id: number, data: Partial<typeof churches.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const currentChurch = await getChurchById(id);
  const shouldRefreshDerivedIcon = Boolean(
    currentChurch &&
    currentChurch.pwaIconAssetId === null &&
    currentChurch.pwaIconSource !== "custom" &&
    (data.primaryColor !== undefined || data.logoUrl !== undefined),
  );
  const derivedIconUrls = shouldRefreshDerivedIcon
    ? await deriveLatestLogoIcon(id, data.primaryColor ?? currentChurch?.primaryColor)
    : null;
  const branding: PublishedBrandingPatch = {};
  if (data.primaryColor) branding.primaryColor = data.primaryColor;
  if (data.secondaryColor) branding.secondaryColor = data.secondaryColor;
  if (data.logoUrl !== undefined) branding.logoUrl = data.logoUrl;
  if (derivedIconUrls) branding.faviconUrl = derivedIconUrls.icon192Url;
  const churchPatch = derivedIconUrls
    ? { ...data, pwaIconAssetId: null, pwaIcon192Url: derivedIconUrls.icon192Url, pwaIcon512Url: derivedIconUrls.icon512Url, pwaIconSource: "derived" as const }
    : data;
  await db.transaction(async (tx) => {
    await tx.update(churches).set(churchPatch).where(eq(churches.id, id));
    if (Object.keys(branding).length > 0) {
      await tx.update(tenantThemes).set(branding).where(eq(tenantThemes.churchId, id));
      await syncPublishedBranding(tx, id, branding);
    }
  });
  return getChurchById(id);
}

export async function getEffectivePwaIconUrls(churchId: number) {
  const church = await getChurchById(churchId);
  if (!church) return null;
  if (church.pwaIconAssetId !== null || church.pwaIconSource === "custom") {
    return {
      icon192Url: church.pwaIcon192Url || church.logoUrl,
      icon512Url: church.pwaIcon512Url || church.pwaIcon192Url || church.logoUrl,
    };
  }
  if (!church.logoUrl) return null;
  const derived = await deriveLatestLogoIcon(churchId, church.primaryColor);
  return derived ?? { icon192Url: church.logoUrl, icon512Url: church.logoUrl };
}

export async function updateChurchPwaIcon(churchId: number, data: { assetId: number | null; icon192Url: string; icon512Url: string; source: "custom" | "derived" }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.transaction(async (tx) => {
    await tx.update(churches).set({ pwaIconAssetId: data.assetId, pwaIcon192Url: data.icon192Url, pwaIcon512Url: data.icon512Url, pwaIconSource: data.source }).where(eq(churches.id, churchId));
    await tx.update(tenantThemes).set({ faviconUrl: data.icon192Url }).where(eq(tenantThemes.churchId, churchId));
    await syncPublishedBranding(tx, churchId, { faviconUrl: data.icon192Url });
  });
}

/** Reativa a logo institucional como fonte do ícone sem excluir o upload manual anterior. */
export async function useChurchLogoAsPwaIcon(churchId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const church = await getChurchById(churchId);
  if (!church?.logoUrl) throw new Error("Este tenant ainda não possui uma logo institucional.");
  const logoAsset = await getLatestLogoForChurch(churchId);
  const logoMedia = logoAsset ? {
    provider: logoAsset.provider,
    publicId: logoAsset.publicId,
    url: logoAsset.secureUrl ?? logoAsset.url,
  } : null;
  const urls = logoMedia
    ? getDerivedLogoIconUrls(logoMedia, church.primaryColor)
    : { icon192Url: church.logoUrl, icon512Url: church.logoUrl };
  await updateChurchPwaIcon(churchId, { assetId: null, ...urls, source: "derived" });
  return getChurchById(churchId);
}

// ─── SITE PÚBLICO MULTI-TENANT ─────────────────────────────────────────────────

/**
 * Retorna somente o conteúdo já publicado para um tenant ativo. A resolução usa o
 * slug no servidor e nunca aceita churchId informado pelo visitante.
 */
export async function getPublishedTenantPublicExperienceBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const churchRows = await db.select().from(churches)
    .where(and(eq(churches.slug, slug), eq(churches.active, true))).limit(1);
  const church = churchRows[0];
  if (!church) return null;
  const pastoralSupport = normalizePastoralSupportConfig(church.pastoralSupport);
  const publicPastoralSupport = pastoralSupport.enabled && pastoralSupport.showPublic && pastoralSupport.url
    ? { url: pastoralSupport.url, label: pastoralSupport.label }
    : null;

  const [siteRows, themeRows] = await Promise.all([
    db.select().from(tenantPublicSites).where(eq(tenantPublicSites.churchId, church.id)).limit(1),
    db.select().from(tenantThemes).where(eq(tenantThemes.churchId, church.id)).limit(1),
  ]);
  const site = siteRows[0] ?? null;
  const theme = themeRows[0] ?? null;
  const sections = site && site.status === "published"
    ? await db.select().from(tenantPageSections)
      .where(and(
        eq(tenantPageSections.churchId, church.id),
        eq(tenantPageSections.siteId, site.id),
        eq(tenantPageSections.enabled, true),
      ))
      .orderBy(tenantPageSections.sortOrder, tenantPageSections.id)
    : [];

  let publishedTheme = theme;
  let publishedSections = sections;
  if (site?.publishedRevisionId) {
    const revisionRows = await db.select().from(tenantPageRevisions).where(and(
      eq(tenantPageRevisions.id, site.publishedRevisionId),
      eq(tenantPageRevisions.churchId, church.id),
      eq(tenantPageRevisions.siteId, site.id),
    )).limit(1);
    const snapshot = revisionRows[0]?.snapshot as { theme?: unknown; sections?: unknown } | undefined;
    if (snapshot?.theme && Array.isArray(snapshot.sections)) {
      publishedTheme = snapshot.theme as typeof theme;
      publishedSections = (snapshot.sections as typeof sections).filter((section) => section.enabled);
    }
  }

  const upcomingEvents = site?.status === "published"
    ? await getPublicUpcomingEventsByChurchId(church.id)
    : [];
  const publicMinistries = site?.status === "published"
    ? await getPublicMinistriesByChurchId(church.id)
    : [];
  const publicCells = site?.status === "published"
    ? await getPublicCellsByChurchId(church.id)
    : [];
  const publicAnnouncements = site?.status === "published"
    ? await getPublicAnnouncementsByChurch(church.id)
    : [];
  const publicDevotional = site?.status === "published"
    ? await getPublicDailyDevotionalByChurch(church.id)
    : null;

  return {
    church: {
      id: church.id,
      name: church.name,
      slug: church.slug,
      logoUrl: church.logoUrl,
      pwaIconAssetId: church.pwaIconAssetId,
      pwaIconSource: church.pwaIconSource,
      pwaIconVersion: church.updatedAt.getTime(),
      primaryColor: church.primaryColor,
      secondaryColor: church.secondaryColor,
      city: church.city,
      state: church.state,
      phone: church.phone,
      whatsapp: church.whatsapp,
      email: church.email,
      website: church.website,
      address: church.address,
      vision: church.vision,
      mission: church.mission,
      values: church.values,
      socialMedia: normalizeSocialMediaLinks(church.socialMedia),
      pastoralSupport: publicPastoralSupport,
      publicRegistration: {
        enabled: church.publicRegistrationEnabled,
        title: church.publicRegistrationTitle,
        message: church.publicRegistrationMessage,
        path: "/cadastro",
      },
    },
    site,
    theme: publishedTheme,
    sections: publishedSections,
    upcomingEvents,
    publicMinistries,
    publicCells,
    publicAnnouncements,
    publicDevotional,
  };
}

/** Consulta administrativa preparada para a próxima fase. Sempre recebe churchId validado no router. */
export async function getTenantPublicSiteByChurchId(churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const siteRows = await db.select().from(tenantPublicSites).where(eq(tenantPublicSites.churchId, churchId)).limit(1);
  const site = siteRows[0] ?? null;
  if (!site) return { site: null, theme: null, sections: [], revisions: [] };
  const [themeRows, sections, revisions] = await Promise.all([
    db.select().from(tenantThemes).where(eq(tenantThemes.churchId, churchId)).limit(1),
    db.select().from(tenantPageSections).where(and(eq(tenantPageSections.churchId, churchId), eq(tenantPageSections.siteId, site.id))).orderBy(tenantPageSections.sortOrder, tenantPageSections.id),
    db.select().from(tenantPageRevisions).where(and(eq(tenantPageRevisions.churchId, churchId), eq(tenantPageRevisions.siteId, site.id))).orderBy(desc(tenantPageRevisions.version)),
  ]);
  return { site, theme: themeRows[0] ?? null, sections, revisions };
}

export type TenantPublicDraftInput = {
  seoTitle?: string | null;
  seoDescription?: string | null;
  theme: { primaryColor: string; secondaryColor: string; accentColor?: string | null; fontPair?: "sacred_serif"; logoUrl?: string | null; faviconUrl?: string | null };
  sections: Array<{ sectionType: "hero" | "welcome" | "about" | "schedule" | "events" | "ministries" | "gallery" | "contact" | "footer"; enabled: boolean; sortOrder: number; content: Record<string, unknown> }>;
};

const DEFAULT_PUBLIC_SECTIONS = [
  { sectionType: "hero" as const, enabled: true, sortOrder: 0, content: { title: "", eyebrow: "", subtitle: "", primaryCtaLabel: "Quero conhecer a igreja", primaryCtaHref: "/visitante", heroImageSource: "preset", heroImagePresetId: "original", heroImageUrl: null, heroImageAssetId: null } },
  { sectionType: "about" as const, enabled: true, sortOrder: 1, content: { title: "Uma igreja para caminhar junto", body: "" } },
  { sectionType: "schedule" as const, enabled: true, sortOrder: 2, content: { title: "Horários de culto", body: "Encontre um horário para caminhar conosco.", services: [] } },
  { sectionType: "events" as const, enabled: true, sortOrder: 3, content: { title: "Próximos eventos", subtitle: "Participe do que Deus está fazendo em nossa comunidade." } },
  { sectionType: "ministries" as const, enabled: true, sortOrder: 4, content: { title: "Nossos ministérios", subtitle: "Encontre um lugar para servir e caminhar em comunidade." } },
  { sectionType: "contact" as const, enabled: true, sortOrder: 5, content: { title: "Visite-nos", subtitle: "Estamos prontos para receber você." } },
];

/** Garante a fundação do site sem depender de IDs enviados pelo cliente. */
async function ensureTenantPublicSiteByChurchId(churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const churchRows = await db.select().from(churches).where(eq(churches.id, churchId)).limit(1);
  const church = churchRows[0];
  if (!church) return null;
  await db.insert(tenantPublicSites).values({ churchId, templateKey: "ministerial_base", status: "draft" }).onDuplicateKeyUpdate({ set: { templateKey: sql`templateKey` } });
  const siteRows = await db.select().from(tenantPublicSites).where(eq(tenantPublicSites.churchId, churchId)).limit(1);
  const site = siteRows[0];
  if (!site) return null;
  await db.insert(tenantThemes).values({ churchId, primaryColor: church.primaryColor || "#1e3a5f", secondaryColor: church.secondaryColor || "#c9a84c", logoUrl: church.logoUrl, faviconUrl: church.pwaIcon192Url || church.logoUrl }).onDuplicateKeyUpdate({ set: { churchId: sql`churchId` } });
  for (const section of DEFAULT_PUBLIC_SECTIONS) {
    const content = section.sectionType === "hero"
      ? { ...section.content, title: `Bem-vindo à ${church.name}`, subtitle: church.mission || "Uma igreja comprometida com pessoas, fé e propósito." }
      : section.sectionType === "about"
        ? { ...section.content, body: church.vision || church.mission || "" }
        : section.content;
    await db.insert(tenantPageSections).values({ churchId, siteId: site.id, ...section, content }).onDuplicateKeyUpdate({ set: { churchId: sql`churchId` } });
  }
  return site;
}

/** Persiste somente o rascunho da própria igreja. O visitante continua lendo a última versão publicada. */
export async function saveTenantPublicDraftByChurchId(churchId: number, input: TenantPublicDraftInput) {
  const db = await getDb();
  if (!db) return null;
  const site = await ensureTenantPublicSiteByChurchId(churchId);
  if (!site) return null;
  for (const section of input.sections) {
    if (section.sectionType !== "gallery") continue;
    const items = Array.isArray(section.content.items) ? section.content.items : [];
    if (items.length > 8) throw new Error("A galeria permite no máximo oito imagens.");
    for (const item of items) {
      if (!item || typeof item !== "object") throw new Error("Imagem de galeria inválida.");
      const media = item as { url?: unknown; alt?: unknown; caption?: unknown; mediaAssetId?: unknown };
      if (typeof media.mediaAssetId === "number" && Number.isInteger(media.mediaAssetId) && media.mediaAssetId > 0) {
        const assetRows = await db.select({ id: mediaAssets.id, url: mediaAssets.url, secureUrl: mediaAssets.secureUrl, purpose: mediaAssets.purpose, resourceType: mediaAssets.resourceType }).from(mediaAssets).where(and(eq(mediaAssets.id, media.mediaAssetId), eq(mediaAssets.churchId, churchId), eq(mediaAssets.purpose, "tenant_public_gallery"), eq(mediaAssets.resourceType, "image"), eq(mediaAssets.status, "active"))).limit(1);
        const asset = assetRows[0];
        if (!asset || typeof media.url !== "string" || (asset.url !== media.url && asset.secureUrl !== media.url)) throw new Error("A imagem não pertence a esta igreja.");
      } else {
        const ownedPrefix = `/manus-storage/churches/${churchId}/public/`;
        if (typeof media.url !== "string" || !media.url.startsWith(ownedPrefix)) throw new Error("A imagem não pertence a esta igreja.");
      }
      if (typeof media.alt !== "string" || media.alt.trim().length < 3 || media.alt.length > 180) throw new Error("Informe um texto alternativo entre 3 e 180 caracteres.");
      if (media.caption !== undefined && (typeof media.caption !== "string" || media.caption.length > 180)) throw new Error("A legenda da imagem é inválida.");
    }
  }
  await db.transaction(async (tx) => {
    await tx.update(tenantPublicSites).set({ seoTitle: input.seoTitle ?? null, seoDescription: input.seoDescription ?? null }).where(and(eq(tenantPublicSites.id, site.id), eq(tenantPublicSites.churchId, churchId)));
    await tx.update(tenantThemes).set(input.theme).where(eq(tenantThemes.churchId, churchId));
    for (const section of input.sections) {
      await tx.insert(tenantPageSections).values({ churchId, siteId: site.id, ...section }).onDuplicateKeyUpdate({ set: { enabled: section.enabled, sortOrder: section.sortOrder, content: section.content } });
    }
  });
  return getTenantPublicSiteByChurchId(churchId);
}

/** Publica um snapshot imutável do rascunho, preservando a última versão pública até esta transição. */
export async function publishTenantPublicSiteByChurchId(churchId: number, createdByChurchUserId: number) {
  const db = await getDb();
  if (!db) return null;
  const site = await ensureTenantPublicSiteByChurchId(churchId);
  if (!site) return null;
  const current = await getTenantPublicSiteByChurchId(churchId);
  if (!current?.theme) return null;
  const version = (current.revisions[0]?.version ?? 0) + 1;
  const snapshot = { theme: current.theme, sections: current.sections, seoTitle: current.site?.seoTitle ?? null, seoDescription: current.site?.seoDescription ?? null };
  const result = await db.insert(tenantPageRevisions).values({ churchId, siteId: site.id, version, snapshot, createdByChurchUserId, publishedAt: new Date() });
  const revisionId = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
  if (!revisionId) throw new Error("Não foi possível registrar a revisão publicada.");
  await db.update(tenantPublicSites).set({ status: "published", publishedRevisionId: revisionId }).where(and(eq(tenantPublicSites.id, site.id), eq(tenantPublicSites.churchId, churchId)));
  return getTenantPublicSiteByChurchId(churchId);
}

// ─── CHURCH MEMBERS ───────────────────────────────────────────────────────────

export async function getChurchMemberByUserId(userId: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(churchMembers)
    .where(and(eq(churchMembers.userId, userId), eq(churchMembers.churchId, churchId)))
    .limit(1);
  return result[0] ?? null;
}

/** Retorna somente um usuário próprio de igreja que continua ativo. */
export async function getActiveChurchUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(churchUsers)
    .where(and(eq(churchUsers.id, userId), eq(churchUsers.active, true)))
    .limit(1);
  return result[0] ?? null;
}

export async function getChurchUsersByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  const accounts = await db
    .select({
      id: churchUsers.id,
      name: churchUsers.name,
      email: churchUsers.email,
      role: churchUsers.role,
      personId: churchUsers.personId,
      active: churchUsers.active,
      lastLoginAt: churchUsers.lastLoginAt,
    })
    .from(churchUsers)
    .where(eq(churchUsers.churchId, churchId))
    .orderBy(churchUsers.name);
  const complementary = await db
    .select({ churchUserId: churchUserComplementaryRoles.churchUserId, role: churchUserComplementaryRoles.role })
    .from(churchUserComplementaryRoles)
    .where(eq(churchUserComplementaryRoles.churchId, churchId));
  return accounts.map((account) => ({
    ...account,
    complementaryRoles: complementary.filter((item) => item.churchUserId === account.id).map((item) => item.role),
  }));
}

export async function linkChurchUserToPerson(userId: number, churchId: number, personId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(churchUsers)
    .set({ personId })
    .where(and(eq(churchUsers.id, userId), eq(churchUsers.churchId, churchId)));
  return getActiveChurchUserById(userId);
}

export async function updateChurchUserAssignment(
  userId: number,
  churchId: number,
  data: { personId: number; role: typeof churchUsers.$inferInsert["role"] }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(churchUsers)
    .set(data)
    .where(and(eq(churchUsers.id, userId), eq(churchUsers.churchId, churchId)));
  return getActiveChurchUserById(userId);
}

export async function getPendingChurchUsers(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(churchUsers)
    .where(and(eq(churchUsers.churchId, churchId), eq(churchUsers.registrationStatus, "pending")))
    .orderBy(churchUsers.createdAt);
}

export async function resolveChurchUserRegistration(
  userId: number,
  churchId: number,
  approverId: number,
  approved: boolean,
  rejectionReason?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(churchUsers)
    .set({
      registrationStatus: approved ? "approved" : "rejected",
      active: approved,
      approvedAt: approved ? new Date() : null,
      approvedByChurchUserId: approverId,
      rejectionReason: approved ? null : rejectionReason || "Cadastro não aprovado",
    })
    .where(
      and(
        eq(churchUsers.id, userId),
        eq(churchUsers.churchId, churchId),
        eq(churchUsers.registrationStatus, "pending")
      )
    );
  const rows = await db
    .select()
    .from(churchUsers)
    .where(and(eq(churchUsers.id, userId), eq(churchUsers.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getComplementaryRolesByChurchUser(churchUserId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ role: churchUserComplementaryRoles.role })
    .from(churchUserComplementaryRoles)
    .where(
      and(
        eq(churchUserComplementaryRoles.churchUserId, churchUserId),
        eq(churchUserComplementaryRoles.churchId, churchId)
      )
    );
  return rows.map((row) => row.role);
}

export async function setComplementaryRolesForChurchUser(
  churchUserId: number,
  churchId: number,
  roles: Array<"consolidador" | "diacono" | "tesoureiro" | "levita">
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .delete(churchUserComplementaryRoles)
    .where(
      and(
        eq(churchUserComplementaryRoles.churchUserId, churchUserId),
        eq(churchUserComplementaryRoles.churchId, churchId)
      )
    );
  const uniqueRoles = Array.from(new Set(roles));
  if (uniqueRoles.length > 0) {
    await db.insert(churchUserComplementaryRoles).values(
      uniqueRoles.map((role) => ({ churchId, churchUserId, role }))
    );
  }
  return getComplementaryRolesByChurchUser(churchUserId, churchId);
}

/** Determina se uma conta pode movimentar a jornada espiritual de uma Pessoa. */
export async function canChurchUserManageJourney(input: {
  churchId: number;
  actorPersonId: number | null;
  actorRoles: string[];
  targetPersonId: number;
}) {
  if (input.actorRoles.some((role) => ["pastor_presidente", "pastor_local"].includes(role))) return true;
  if (!input.actorPersonId) return false;

  const db = await getDb();
  if (!db) return false;

  if (input.actorRoles.includes("consolidador")) {
    const assignment = await getCurrentCareAssignment(input.targetPersonId, input.churchId);
    if (assignment?.responsiblePersonId === input.actorPersonId && assignment.role === "consolidador") return true;
  }

  if (input.actorRoles.includes("lider") || input.actorRoles.includes("supervisor")) {
    const matches = await db
      .select({ leaderId: cells.leaderId, coLeaderId: cells.coLeaderId, supervisorId: cells.supervisorId })
      .from(cellMembers)
      .innerJoin(cells, eq(cells.id, cellMembers.cellId))
      .where(
        and(
          eq(cellMembers.personId, input.targetPersonId),
          eq(cellMembers.active, true),
          eq(cells.churchId, input.churchId)
        )
      )
      .limit(1);
    return matches.some((cell) =>
      (input.actorRoles.includes("lider") && [cell.leaderId, cell.coLeaderId].includes(input.actorPersonId)) ||
      (input.actorRoles.includes("supervisor") && cell.supervisorId === input.actorPersonId)
    );
  }

  return false;
}

/** Lista as Pessoas que um perfil não pastoral pode movimentar no Funil. */
export async function getJourneyManagedPersonIds(input: {
  churchId: number;
  actorPersonId: number | null;
  actorRoles: string[];
}) {
  if (!input.actorPersonId) return [];
  const db = await getDb();
  if (!db) return [];

  const personIds = new Set<number>();

  if (input.actorRoles.includes("consolidador")) {
    const rows = await db
      .select({ personId: careAssignments.personId })
      .from(careAssignments)
      .where(
        and(
          eq(careAssignments.churchId, input.churchId),
          eq(careAssignments.responsiblePersonId, input.actorPersonId),
          eq(careAssignments.role, "consolidador"),
          eq(careAssignments.active, true)
        )
      );
    rows.forEach((row) => personIds.add(row.personId));
  }

  if (input.actorRoles.includes("lider") || input.actorRoles.includes("supervisor")) {
    const rows = await db
      .select({ personId: cellMembers.personId, leaderId: cells.leaderId, coLeaderId: cells.coLeaderId, supervisorId: cells.supervisorId })
      .from(cellMembers)
      .innerJoin(cells, eq(cells.id, cellMembers.cellId))
      .where(
        and(
          eq(cellMembers.active, true),
          eq(cells.churchId, input.churchId)
        )
      );
    rows
      .filter((cell) =>
        (input.actorRoles.includes("lider") && [cell.leaderId, cell.coLeaderId].includes(input.actorPersonId)) ||
        (input.actorRoles.includes("supervisor") && cell.supervisorId === input.actorPersonId)
      )
      .forEach((cell) => personIds.add(cell.personId));
  }

  return Array.from(personIds);
}

/** Retorna somente um Super Admin que continua ativo. */
export async function getActiveSuperAdminById(adminId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(superAdmins)
    .where(and(eq(superAdmins.id, adminId), eq(superAdmins.active, true)))
    .limit(1);
  return result[0] ?? null;
}

export async function getChurchMembersByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(churchMembers)
    .where(and(eq(churchMembers.churchId, churchId), eq(churchMembers.active, true)));
}

// ─── PEOPLE ───────────────────────────────────────────────────────────────────

export async function getPeopleByChurch(churchId: number, search?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(people.churchId, churchId), eq(people.active, true)];
  if (search) {
    conditions.push(
      or(
        sql`${people.fullName} LIKE ${`%${search}%`}`,
        sql`${people.email} LIKE ${`%${search}%`}`,
        sql`${people.phone} LIKE ${`%${search}%`}`
      ) as any
    );
  }
  return db
    .select()
    .from(people)
    .where(and(...conditions))
    .orderBy(people.fullName)
    .limit(100);
}

export async function getPersonById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(people)
    .where(and(eq(people.id, id), eq(people.churchId, churchId)))
    .limit(1);
  return result[0] ?? null;
}

/** Sugere fichas existentes, sem vincular automaticamente pessoas homônimas. */
export async function findPossiblePeopleByIdentity(
  churchId: number,
  identity: { fullName: string; phone?: string; email?: string }
) {
  const db = await getDb();
  if (!db) return [];
  const matches = [eq(people.fullName, identity.fullName.trim())];
  const normalizedPhone = identity.phone?.replace(/\D/g, "");
  if (normalizedPhone) {
    const phoneExpression = (column: any) => sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column}, ''), '(', ''), ')', ''), '-', ''), ' ', ''), '+', '') = ${normalizedPhone}`;
    matches.push(phoneExpression(people.phone), phoneExpression(people.whatsapp));
  }
  const normalizedEmail = identity.email?.trim().toLowerCase();
  if (normalizedEmail) matches.push(sql`LOWER(TRIM(COALESCE(${people.email}, ''))) = ${normalizedEmail}`);
  return db
    .select()
    .from(people)
    .where(and(eq(people.churchId, churchId), eq(people.active, true), or(...matches)))
    .orderBy(people.fullName)
    .limit(10);
}

export async function getChurchUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ id: churchUsers.id, churchId: churchUsers.churchId, email: churchUsers.email, active: churchUsers.active, registrationStatus: churchUsers.registrationStatus })
    .from(churchUsers)
    .where(sql`LOWER(${churchUsers.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return rows[0] ?? null;
}

export async function createPerson(data: typeof people.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(people).values(data);
  const personId = (result[0] as { insertId?: number }).insertId;
  if (!personId) throw new Error("Failed to create person");
  return getPersonById(personId, data.churchId);
}

export async function updatePerson(id: number, churchId: number, data: Partial<typeof people.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(people).set(data).where(and(eq(people.id, id), eq(people.churchId, churchId)));
}

// ─── SOULS (GANHAR ALMAS) ─────────────────────────────────────────────────────

export async function getSoulsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(souls)
    .where(eq(souls.churchId, churchId))
    .orderBy(desc(souls.createdAt))
    .limit(100);
}

export async function getSoulsByWinner(churchId: number, wonById: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(souls)
    .where(and(eq(souls.churchId, churchId), eq(souls.wonById, wonById)))
    .orderBy(desc(souls.createdAt))
    .limit(100);
}

export async function getSoulById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(souls)
    .where(and(eq(souls.id, id), eq(souls.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createSoul(data: typeof souls.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(souls).values(data);
  const soulId = (result[0] as { insertId?: number }).insertId;
  if (!soulId) throw new Error("Failed to create soul");
  const rows = await db
    .select()
    .from(souls)
    .where(and(eq(souls.id, soulId), eq(souls.churchId, data.churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateSoul(id: number, churchId: number, data: Partial<typeof souls.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(souls).set(data).where(and(eq(souls.id, id), eq(souls.churchId, churchId)));
}

export async function linkSoulToPerson(soulId: number, churchId: number, personId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(souls)
    .set({ personId })
    .where(and(eq(souls.id, soulId), eq(souls.churchId, churchId)));
}

// ─── CUIDADO PASTORAL ─────────────────────────────────────────────────────────

export async function getCurrentCareAssignment(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(careAssignments)
    .where(
      and(
        eq(careAssignments.personId, personId),
        eq(careAssignments.churchId, churchId),
        eq(careAssignments.active, true)
      )
    )
    .orderBy(desc(careAssignments.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCareHistoryByPerson(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(careAssignments)
    .where(and(eq(careAssignments.personId, personId), eq(careAssignments.churchId, churchId)))
    .orderBy(desc(careAssignments.startedAt));
}

/** Retorna a fila objetiva de pessoas que demandam uma ação pastoral. */
export async function getCareAttentionByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  const [persons, churchSouls, churchConsolidations, activeAssignments, activeMemberships] = await Promise.all([
    getPeopleByChurch(churchId),
    getSoulsByChurch(churchId),
    getConsolidationsByChurch(churchId),
    db.select().from(careAssignments).where(and(eq(careAssignments.churchId, churchId), eq(careAssignments.active, true))),
    db
      .select({ personId: cellMembers.personId, cellId: cells.id, cellName: cells.name })
      .from(cellMembers)
      .innerJoin(cells, eq(cells.id, cellMembers.cellId))
      .where(and(eq(cells.churchId, churchId), eq(cells.active, true), eq(cellMembers.active, true))),
  ]);

  const soulByPerson = new Map(churchSouls.filter((soul) => soul.personId).map((soul) => [soul.personId!, soul]));
  const consolidationBySoul = new Map(churchConsolidations.map((item) => [item.soulId, item]));
  const careByPerson = new Map(activeAssignments.map((item) => [item.personId, item]));
  const cellByPerson = new Map(activeMemberships.map((item) => [item.personId, item]));

  return persons.map((person) => {
    const soul = soulByPerson.get(person.id);
    const consolidation = soul ? consolidationBySoul.get(soul.id) : undefined;
    const careAssignment = careByPerson.get(person.id);
    const cell = cellByPerson.get(person.id);
    const reasons: string[] = [];
    let nextStep = "Acompanhamento em dia";
    let priority: "alta" | "media" | "normal" = "normal";

    if (!careAssignment) {
      reasons.push("Sem responsável pelo cuidado");
      nextStep = "Definir responsável";
      priority = "alta";
    }
    if (soul && !consolidation) {
      reasons.push("Consolidação não iniciada");
      nextStep = "Iniciar consolidação";
      priority = "alta";
    } else if (consolidation && !consolidation.callMade) {
      reasons.push("Sem primeiro contato registrado");
      nextStep = "Registrar primeiro contato";
      priority = "alta";
    } else if (soul?.status === "consolidado" && !cell) {
      reasons.push("Sem célula ativa");
      nextStep = "Enviar para célula";
      priority = priority === "alta" ? "alta" : "media";
    }

    return {
      person,
      soul: soul ?? null,
      consolidation: consolidation ?? null,
      careAssignment: careAssignment ?? null,
      cell: cell ?? null,
      nextStep,
      priority,
      reasons,
    };
  });
}

export type SpiritualRadarPriority = "alta" | "media" | "normal";
export type SpiritualRadarSignalKey =
  | "consolidacao_pendente"
  | "primeiro_contato_pendente"
  | "visita_pendente"
  | "follow_up_vencido"
  | "sem_responsavel"
  | "sem_celula"
  | "sem_discipulador"
  | "ausencias_recentes"
  | "pedido_oracao_pendente"
  | "sem_formacao";

export type SpiritualRadarItem = {
  person: {
    id: number;
    fullName: string;
    discipleshipStage: string | null;
  };
  cell: { id: number; name: string } | null;
  careAssignment: { responsiblePersonId: number; role: string } | null;
  priority: SpiritualRadarPriority;
  score: number;
  nextAction: string;
  signals: Array<{
    key: SpiritualRadarSignalKey;
    label: string;
    severity: SpiritualRadarPriority;
    evidence: string;
    source: "pessoas" | "consolidacao" | "visitas" | "celulas" | "oracao" | "formacao";
    sourceId: number | null;
  }>;
};

/**
 * Calcula uma fila explicável de atenção pastoral. O retorno deliberadamente não
 * inclui telefone, endereço, CPF, WhatsApp ou notas pastorais; esses dados seguem
 * protegidos pelos procedimentos de ficha e cuidado já existentes.
 */
export async function getSpiritualRadarByChurch(churchId: number) {
  const db = await getDb();
  const empty = {
    items: [] as SpiritualRadarItem[],
    summary: { totalPeople: 0, peopleWithSignals: 0, alta: 0, media: 0, normal: 0, bySignal: {} as Record<string, number> },
  };
  if (!db) return empty;

  const [persons, churchRoles, activeCells, activeCare, churchSouls, churchConsolidations, referrals, visits, followUps, prayers, enrollments, attendance] = await Promise.all([
    db
      .select({ id: people.id, fullName: people.fullName, discipleshipStage: people.discipleshipStage, discipledById: people.discipledById })
      .from(people)
      .where(and(eq(people.churchId, churchId), eq(people.active, true))),
    db
      .select({ personId: churchMembers.personId, role: churchMembers.role })
      .from(churchMembers)
      .where(and(eq(churchMembers.churchId, churchId), eq(churchMembers.active, true), isNotNull(churchMembers.personId))),
    db
      .select({ personId: cellMembers.personId, cellId: cells.id, cellName: cells.name })
      .from(cellMembers)
      .innerJoin(cells, eq(cells.id, cellMembers.cellId))
      .where(and(eq(cells.churchId, churchId), eq(cells.active, true), eq(cellMembers.active, true))),
    db
      .select({ personId: careAssignments.personId, responsiblePersonId: careAssignments.responsiblePersonId, role: careAssignments.role })
      .from(careAssignments)
      .where(and(eq(careAssignments.churchId, churchId), eq(careAssignments.active, true))),
    getSoulsByChurch(churchId),
    getConsolidationsByChurch(churchId),
    db.select().from(consolidationReferrals).where(eq(consolidationReferrals.churchId, churchId)),
    db.select().from(careVisits).where(eq(careVisits.churchId, churchId)),
    db.select().from(consolidationFollowUps).where(eq(consolidationFollowUps.churchId, churchId)),
    db
      .select({ id: prayerRequests.id, personId: prayerRequests.personId, createdAt: prayerRequests.createdAt })
      .from(prayerRequests)
      .where(and(eq(prayerRequests.churchId, churchId), eq(prayerRequests.answered, false), isNotNull(prayerRequests.personId))),
    db
      .select({ personId: courseEnrollments.personId, status: courseEnrollments.status })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
      .where(and(eq(courses.churchId, churchId), eq(courses.active, true))),
    db
      .select({ personId: cellAttendance.personId, status: cellAttendance.status, meetingDate: cellMeetings.meetingDate })
      .from(cellAttendance)
      .innerJoin(cellMeetings, eq(cellMeetings.id, cellAttendance.meetingId))
      .where(and(eq(cellMeetings.churchId, churchId), isNotNull(cellAttendance.personId))),
  ]);

  const stageOrder: Record<string, number> = {
    nova_alma: 0,
    consolidacao: 1,
    fundamentos: 2,
    celula: 3,
    batismo: 4,
    encontro_com_deus: 5,
    escola_de_lideres: 6,
    lideranca: 7,
    multiplicador: 8,
  };
  const pastoralRoleKeys = new Set(["pastor_presidente", "pastor_local"]);
  const pastoralPersonIds = new Set(churchRoles.filter((item) => item.personId && pastoralRoleKeys.has(item.role)).map((item) => item.personId!));
  const cellByPerson = new Map<number, { id: number; name: string }>();
  activeCells.forEach((item) => {
    if (!cellByPerson.has(item.personId)) cellByPerson.set(item.personId, { id: item.cellId, name: item.cellName });
  });
  const careByPerson = new Map(activeCare.map((item) => [item.personId, { responsiblePersonId: item.responsiblePersonId, role: item.role }]));
  const soulByPerson = new Map<number, (typeof churchSouls)[number]>();
  churchSouls.forEach((soul) => { if (soul.personId && !soulByPerson.has(soul.personId)) soulByPerson.set(soul.personId, soul); });
  const consolidationBySoul = new Map<number, (typeof churchConsolidations)[number]>();
  churchConsolidations.forEach((item) => consolidationBySoul.set(item.soulId, item));
  const referralById = new Map(referrals.map((item) => [item.id, item]));
  const activeReferralByPerson = new Map<number, (typeof referrals)[number]>();
  referrals
    .filter((item) => !["encerrado", "cancelado"].includes(item.status))
    .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
    .forEach((item) => { if (!activeReferralByPerson.has(item.personId)) activeReferralByPerson.set(item.personId, item); });
  const openVisitByPerson = new Map<number, (typeof visits)[number]>();
  visits
    .filter((item) => !["realizada", "cancelada"].includes(item.status))
    .sort((a, b) => Number(new Date(a.scheduledAt ?? a.createdAt)) - Number(new Date(b.scheduledAt ?? b.createdAt)))
    .forEach((item) => {
      const referral = referralById.get(item.referralId);
      if (referral && !openVisitByPerson.has(referral.personId)) openVisitByPerson.set(referral.personId, item);
    });
  const latestFollowUpByReferral = new Map<number, (typeof followUps)[number]>();
  followUps
    .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
    .forEach((item) => { if (!latestFollowUpByReferral.has(item.referralId)) latestFollowUpByReferral.set(item.referralId, item); });
  const unansweredPrayerByPerson = new Map<number, number>();
  prayers.forEach((item) => { if (item.personId) unansweredPrayerByPerson.set(item.personId, (unansweredPrayerByPerson.get(item.personId) ?? 0) + 1); });
  const enrolledPersonIds = new Set(enrollments.map((item) => item.personId));
  const attendanceByPerson = new Map<number, Array<{ status: string; date: string }>>();
  attendance.forEach((item) => {
    if (!item.personId) return;
    const list = attendanceByPerson.get(item.personId) ?? [];
    list.push({ status: item.status, date: String(item.meetingDate) });
    attendanceByPerson.set(item.personId, list);
  });

  const signalMeta: Record<SpiritualRadarSignalKey, { label: string; severity: SpiritualRadarPriority; weight: number; source: SpiritualRadarItem["signals"][number]["source"] }> = {
    consolidacao_pendente: { label: "Consolidação pendente", severity: "alta", weight: 45, source: "consolidacao" },
    primeiro_contato_pendente: { label: "Primeiro contato pendente", severity: "alta", weight: 45, source: "consolidacao" },
    visita_pendente: { label: "Visita pendente", severity: "alta", weight: 40, source: "visitas" },
    follow_up_vencido: { label: "Follow-up vencido", severity: "alta", weight: 40, source: "consolidacao" },
    sem_responsavel: { label: "Sem responsável", severity: "alta", weight: 40, source: "pessoas" },
    sem_celula: { label: "Sem célula ativa", severity: "media", weight: 24, source: "celulas" },
    sem_discipulador: { label: "Sem discipulador", severity: "media", weight: 22, source: "pessoas" },
    ausencias_recentes: { label: "Ausências recentes", severity: "media", weight: 24, source: "celulas" },
    pedido_oracao_pendente: { label: "Pedido de oração pendente", severity: "media", weight: 20, source: "oracao" },
    sem_formacao: { label: "Sem formação registrada", severity: "normal", weight: 10, source: "formacao" },
  };
  const nextActionByKey: Record<SpiritualRadarSignalKey, string> = {
    consolidacao_pendente: "Abrir ou atribuir Consolidação",
    primeiro_contato_pendente: "Registrar primeiro contato",
    visita_pendente: "Abrir e atribuir Visita",
    follow_up_vencido: "Registrar retorno ou reagendar ação",
    sem_responsavel: "Definir responsável pelo cuidado",
    sem_celula: "Encaminhar para uma célula",
    sem_discipulador: "Definir discipulador",
    ausencias_recentes: "Verificar a situação com cuidado",
    pedido_oracao_pendente: "Registrar retorno pastoral",
    sem_formacao: "Recomendar formação adequada",
  };

  const items = persons
    .filter((person) => !pastoralPersonIds.has(person.id))
    .map((person): SpiritualRadarItem => {
      const signals: SpiritualRadarItem["signals"] = [];
      const cell = cellByPerson.get(person.id) ?? null;
      const careAssignment = careByPerson.get(person.id) ?? null;
      const soul = soulByPerson.get(person.id);
      const consolidation = soul ? consolidationBySoul.get(soul.id) : undefined;
      const referral = activeReferralByPerson.get(person.id);
      const visit = openVisitByPerson.get(person.id);
      const stage = stageOrder[person.discipleshipStage ?? "nova_alma"] ?? 0;
      const addSignal = (key: SpiritualRadarSignalKey, evidence: string, sourceId: number | null = null) => {
        const meta = signalMeta[key];
        signals.push({ key, label: meta.label, severity: meta.severity, evidence, source: meta.source, sourceId });
      };

      if (!careAssignment) addSignal("sem_responsavel", "Não há responsável ativo registrado para esta Pessoa.");
      if (soul && !consolidation) addSignal("consolidacao_pendente", "Existe uma Nova Alma sem ficha de Consolidação.", soul.id);
      else if (consolidation && !consolidation.callMade) addSignal("primeiro_contato_pendente", "A Consolidação existe, mas o primeiro contato ainda não foi registrado.", consolidation.id);
      if (visit) {
        const overdue = visit.scheduledAt && Number(new Date(visit.scheduledAt)) < Date.now();
        addSignal("visita_pendente", overdue ? "A visita está agendada para uma data já vencida." : "Há uma visita aberta aguardando atribuição ou realização.", visit.id);
      }
      if (referral) {
        const lastFollowUp = latestFollowUpByReferral.get(referral.id);
        if (lastFollowUp?.nextActionAt && Number(new Date(lastFollowUp.nextActionAt)) < Date.now()) {
          addSignal("follow_up_vencido", "A próxima ação registrada para este caso está vencida.", lastFollowUp.id);
        }
      }
      if (stage >= 2 && !cell) addSignal("sem_celula", "A Pessoa está em uma etapa que já recomenda integração em célula.");
      if (stage <= 6 && !person.discipledById) addSignal("sem_discipulador", "A etapa atual não possui discipulador registrado.");
      const recentAttendance = (attendanceByPerson.get(person.id) ?? []).sort((a, b) => Number(new Date(b.date)) - Number(new Date(a.date)));
      if (recentAttendance.length >= 2 && recentAttendance.slice(0, 2).every((item) => item.status === "ausente")) {
        addSignal("ausencias_recentes", "As duas últimas marcações registradas foram ausências.");
      }
      const prayerCount = unansweredPrayerByPerson.get(person.id) ?? 0;
      if (prayerCount > 0) addSignal("pedido_oracao_pendente", `${prayerCount} pedido(s) de oração aguardam retorno registrado.`);
      if (stage >= 2 && enrollments.length > 0 && !enrolledPersonIds.has(person.id)) addSignal("sem_formacao", "Não há matrícula em formação ativa ou concluída registrada.");

      const score = Math.min(100, signals.reduce((total, signal) => total + signalMeta[signal.key].weight, 0));
      const priority: SpiritualRadarPriority = signals.some((signal) => signal.severity === "alta") ? "alta" : signals.some((signal) => signal.severity === "media") ? "media" : "normal";
      const firstSignal = signals.find((signal) => signal.severity === "alta") ?? signals.find((signal) => signal.severity === "media") ?? signals[0];
      return {
        person: { id: person.id, fullName: person.fullName, discipleshipStage: person.discipleshipStage },
        cell,
        careAssignment,
        priority,
        score,
        nextAction: firstSignal ? nextActionByKey[firstSignal.key] : "Acompanhamento em dia",
        signals,
      };
    })
    .filter((item) => item.signals.length > 0)
    .sort((a, b) => b.score - a.score || a.person.fullName.localeCompare(b.person.fullName, "pt-BR"));

  const bySignal: Record<string, number> = {};
  items.forEach((item) => item.signals.forEach((signal) => { bySignal[signal.key] = (bySignal[signal.key] ?? 0) + 1; }));
  return {
    items,
    summary: {
      totalPeople: persons.length,
      peopleWithSignals: items.length,
      alta: items.filter((item) => item.priority === "alta").length,
      media: items.filter((item) => item.priority === "media").length,
      normal: items.filter((item) => item.priority === "normal").length,
      bySignal,
    },
  };
}

/** Encerra o responsável anterior, define o atual e pode liberar a conta pendente da Pessoa. */
export async function setCurrentCareAssignment(data: {
  churchId: number;
  personId: number;
  responsiblePersonId: number;
  role: "quem_ganhou" | "consolidador" | "lider_celula" | "discipulador" | "pastor";
  notes?: string;
  releaseAccess?: boolean;
  approverChurchUserId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const now = new Date();
    await tx
      .update(careAssignments)
      .set({ active: false, endedAt: now })
      .where(
        and(
          eq(careAssignments.personId, data.personId),
          eq(careAssignments.churchId, data.churchId),
          eq(careAssignments.active, true)
        )
      );
    const result = await tx.insert(careAssignments).values({
      churchId: data.churchId,
      personId: data.personId,
      responsiblePersonId: data.responsiblePersonId,
      role: data.role,
      notes: data.notes,
      active: true,
      startedAt: now,
    });
    const assignmentId = (result[0] as { insertId?: number }).insertId;
    if (!assignmentId) throw new Error("Failed to set care assignment");

    let accessReleased = false;
    if (data.releaseAccess === true) {
      const pendingAccounts = await tx
        .select({ id: churchUsers.id })
        .from(churchUsers)
        .where(
          and(
            eq(churchUsers.churchId, data.churchId),
            eq(churchUsers.personId, data.personId),
            eq(churchUsers.registrationStatus, "pending"),
            eq(churchUsers.active, false)
          )
        )
        .limit(1);
      const pendingAccount = pendingAccounts[0];
      if (pendingAccount) {
        const updateResult = await tx
          .update(churchUsers)
          .set({
            registrationStatus: "approved",
            active: true,
            approvedAt: now,
            approvedByChurchUserId: data.approverChurchUserId ?? null,
            rejectionReason: null,
          })
          .where(
            and(
              eq(churchUsers.id, pendingAccount.id),
              eq(churchUsers.churchId, data.churchId),
              eq(churchUsers.personId, data.personId),
              eq(churchUsers.registrationStatus, "pending"),
              eq(churchUsers.active, false)
            )
          );
        accessReleased = Number((updateResult as { affectedRows?: number }).affectedRows ?? 0) > 0;
      }
    }

    const rows = await tx.select().from(careAssignments).where(eq(careAssignments.id, assignmentId)).limit(1);
    return rows[0] ? { ...rows[0], accessReleased } : null;
  });
}

// ─── CONSOLIDATIONS ───────────────────────────────────────────────────────────

export async function getConsolidationsBySoul(soulId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consolidations)
    .where(and(eq(consolidations.soulId, soulId), eq(consolidations.churchId, churchId)));
}

export async function getConsolidationsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consolidations)
    .where(eq(consolidations.churchId, churchId))
    .orderBy(desc(consolidations.createdAt));
}

export async function getConsolidationById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(consolidations)
    .where(and(eq(consolidations.id, id), eq(consolidations.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createConsolidation(data: typeof consolidations.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(consolidations).values(data);
  return result[0];
}

export async function startConsolidationWorkflow(data: { churchId: number; soulId: number; personId: number; consolidatorId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const lockedSouls = await tx
      .select({ id: souls.id, personId: souls.personId })
      .from(souls)
      .where(and(eq(souls.id, data.soulId), eq(souls.churchId, data.churchId)))
      .limit(1)
      .for("update");
    const soul = lockedSouls[0];
    if (!soul || soul.personId !== data.personId) throw new Error("Nova Alma inválida para iniciar a Consolidação.");

    const existing = await tx
      .select({ id: consolidations.id })
      .from(consolidations)
      .where(and(eq(consolidations.soulId, data.soulId), eq(consolidations.churchId, data.churchId)))
      .limit(1);
    if (existing.length > 0) throw new Error("Esta Nova Alma já possui uma consolidação em andamento.");

    const insert = await tx.insert(consolidations).values({ churchId: data.churchId, soulId: data.soulId, consolidatorId: data.consolidatorId });
    const consolidationId = Number((insert[0] as { insertId?: number } | undefined)?.insertId ?? 0);
    if (!consolidationId) throw new Error("Não foi possível iniciar a Consolidação.");

    await tx.update(souls).set({ status: "em_consolidacao" }).where(and(eq(souls.id, data.soulId), eq(souls.churchId, data.churchId)));
    await tx.update(people).set({ discipleshipStage: "consolidacao" }).where(and(eq(people.id, data.personId), eq(people.churchId, data.churchId)));
    const now = new Date();
    await tx.update(careAssignments).set({ active: false, endedAt: now }).where(and(eq(careAssignments.personId, data.personId), eq(careAssignments.churchId, data.churchId), eq(careAssignments.active, true)));
    await tx.insert(careAssignments).values({ churchId: data.churchId, personId: data.personId, responsiblePersonId: data.consolidatorId, role: "consolidador", notes: "Responsável atualizado ao iniciar a consolidação.", active: true, startedAt: now });

    const rows = await tx.select().from(consolidations).where(and(eq(consolidations.id, consolidationId), eq(consolidations.churchId, data.churchId))).limit(1);
    return rows[0] ?? null;
  });
}

export async function updateConsolidation(id: number, churchId: number, data: Partial<typeof consolidations.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(consolidations)
    .set(data)
    .where(and(eq(consolidations.id, id), eq(consolidations.churchId, churchId)));
}

// ─── ENCAMINHAMENTOS PARA CONSOLIDAÇÃO ─────────────────────────────────────────

export async function getConsolidationReferralsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consolidationReferrals)
    .where(eq(consolidationReferrals.churchId, churchId))
    .orderBy(desc(consolidationReferrals.referredAt));
}

export async function getConsolidationReferralById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(consolidationReferrals)
    .where(and(eq(consolidationReferrals.id, id), eq(consolidationReferrals.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getActiveConsolidationReferralByPerson(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(consolidationReferrals)
    .where(and(
      eq(consolidationReferrals.personId, personId),
      eq(consolidationReferrals.churchId, churchId),
      or(
        eq(consolidationReferrals.status, "pendente"),
        eq(consolidationReferrals.status, "aprovado"),
        eq(consolidationReferrals.status, "aceito"),
        eq(consolidationReferrals.status, "em_acompanhamento"),
      ),
    ))
    .orderBy(desc(consolidationReferrals.referredAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function createConsolidationReferral(data: typeof consolidationReferrals.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(consolidationReferrals).values(data);
  return result[0];
}

export async function createConsolidationReferralCase(data: typeof consolidationReferrals.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const target = await tx.select({ id: people.id }).from(people).where(and(eq(people.id, data.personId), eq(people.churchId, data.churchId), eq(people.active, true))).limit(1).for("update");
    if (target.length === 0) throw new Error("Pessoa não encontrada nesta igreja.");
    const active = await tx.select({ id: consolidationReferrals.id }).from(consolidationReferrals).where(and(eq(consolidationReferrals.churchId, data.churchId), eq(consolidationReferrals.personId, data.personId), or(eq(consolidationReferrals.status, "pendente"), eq(consolidationReferrals.status, "aprovado"), eq(consolidationReferrals.status, "aceito"), eq(consolidationReferrals.status, "em_acompanhamento")))).limit(1);
    if (active.length > 0) throw new Error("Esta Pessoa já possui um caso ativo na Consolidação.");
    const result = await tx.insert(consolidationReferrals).values(data);
    const referralId = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
    if (!referralId) throw new Error("Não foi possível criar o caso de Consolidação.");
    if (data.assignedToPersonId) {
      await tx.insert(consolidationCaseAssignments).values({ churchId: data.churchId, referralId, action: "atribuido", toPersonId: data.assignedToPersonId, performedByChurchUserId: data.assignedByChurchUserId ?? null });
    }
    const rows = await tx.select().from(consolidationReferrals).where(and(eq(consolidationReferrals.id, referralId), eq(consolidationReferrals.churchId, data.churchId))).limit(1);
    return rows[0] ?? null;
  });
}

export async function assignConsolidationCase(data: { churchId: number; referralId: number; toPersonId: number | null; performedByChurchUserId: number | null; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(consolidationReferrals).where(and(eq(consolidationReferrals.id, data.referralId), eq(consolidationReferrals.churchId, data.churchId))).limit(1).for("update");
    const referral = rows[0];
    if (!referral) throw new Error("Caso de Consolidação não encontrado.");
    if (["encerrado", "cancelado"].includes(referral.status)) throw new Error("Não é possível alterar a atribuição de um caso encerrado.");
    if (data.toPersonId) {
      const person = await tx.select({ id: people.id }).from(people).where(and(eq(people.id, data.toPersonId), eq(people.churchId, data.churchId), eq(people.active, true))).limit(1);
      if (person.length === 0) throw new Error("Consolidador inválido para esta igreja.");
    }
    const fromPersonId = referral.assignedToPersonId ?? referral.acceptedByPersonId ?? null;
    const action = data.toPersonId ? (fromPersonId ? "reatribuido" : "atribuido") : "devolvido_fila";
    await tx.update(consolidationReferrals).set({ assignedToPersonId: data.toPersonId, assignedByChurchUserId: data.toPersonId ? data.performedByChurchUserId : null, assignedAt: data.toPersonId ? new Date() : null, acceptedByPersonId: data.toPersonId === referral.acceptedByPersonId ? referral.acceptedByPersonId : null, acceptedAt: data.toPersonId === referral.acceptedByPersonId ? referral.acceptedAt : null, status: data.toPersonId === referral.acceptedByPersonId ? referral.status : referral.status === "aprovado" ? "aprovado" : "pendente" }).where(and(eq(consolidationReferrals.id, data.referralId), eq(consolidationReferrals.churchId, data.churchId)));
    await tx.insert(consolidationCaseAssignments).values({ churchId: data.churchId, referralId: data.referralId, action, fromPersonId, toPersonId: data.toPersonId, performedByChurchUserId: data.performedByChurchUserId, notes: data.notes ?? null });
    const updated = await tx.select().from(consolidationReferrals).where(and(eq(consolidationReferrals.id, data.referralId), eq(consolidationReferrals.churchId, data.churchId))).limit(1);
    return updated[0] ?? null;
  });
}

export async function acceptConsolidationCase(data: { churchId: number; referralId: number; personId: number; churchUserId: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(consolidationReferrals).where(and(eq(consolidationReferrals.id, data.referralId), eq(consolidationReferrals.churchId, data.churchId))).limit(1).for("update");
    const referral = rows[0];
    if (!referral) throw new Error("Caso de Consolidação não encontrado.");
    if (!["pendente", "aprovado"].includes(referral.status)) throw new Error("Este caso não está mais disponível para aceite.");
    if (referral.assignedToPersonId && referral.assignedToPersonId !== data.personId) throw new Error("Este caso está atribuído a outro Consolidador.");
    const now = new Date();
    await tx.update(consolidationReferrals).set({ assignedToPersonId: data.personId, assignedByChurchUserId: referral.assignedByChurchUserId ?? data.churchUserId, assignedAt: referral.assignedAt ?? now, acceptedByPersonId: data.personId, acceptedAt: now, status: "aceito" }).where(and(eq(consolidationReferrals.id, data.referralId), eq(consolidationReferrals.churchId, data.churchId), or(eq(consolidationReferrals.status, "pendente"), eq(consolidationReferrals.status, "aprovado"))));
    await tx.update(careAssignments).set({ active: false, endedAt: now }).where(and(eq(careAssignments.personId, referral.personId), eq(careAssignments.churchId, data.churchId), eq(careAssignments.active, true)));
    await tx.insert(careAssignments).values({ churchId: data.churchId, personId: referral.personId, responsiblePersonId: data.personId, role: "consolidador", notes: `Caso de Consolidação aceito: ${referral.reason}`, active: true, startedAt: now });
    await tx.insert(consolidationCaseAssignments).values({ churchId: data.churchId, referralId: data.referralId, action: "aceito", fromPersonId: referral.assignedToPersonId, toPersonId: data.personId, performedByChurchUserId: data.churchUserId });
    const updated = await tx.select().from(consolidationReferrals).where(and(eq(consolidationReferrals.id, data.referralId), eq(consolidationReferrals.churchId, data.churchId))).limit(1);
    return updated[0] ?? null;
  });
}

export async function approveConsolidationCase(data: { churchId: number; referralId: number; approvedByPersonId: number | null; churchUserId: number | null; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(consolidationReferrals).where(and(eq(consolidationReferrals.id, data.referralId), eq(consolidationReferrals.churchId, data.churchId))).limit(1).for("update");
    const referral = rows[0];
    if (!referral) throw new Error("Caso de Consolidação não encontrado.");
    if (referral.status !== "pendente") throw new Error("Este caso já foi analisado pela liderança.");
    const now = new Date();
    const assignedPersonId = referral.assignedToPersonId ?? referral.preferredConsolidatorId ?? null;
    await tx.update(consolidationReferrals).set({ status: "aprovado", approvedByPersonId: data.approvedByPersonId, approvedAt: now }).where(and(eq(consolidationReferrals.id, data.referralId), eq(consolidationReferrals.churchId, data.churchId), eq(consolidationReferrals.status, "pendente")));
    await tx.insert(consolidationCaseAssignments).values({ churchId: data.churchId, referralId: data.referralId, action: "aprovado", fromPersonId: null, toPersonId: assignedPersonId, performedByChurchUserId: data.churchUserId, notes: data.notes ?? null });
    const updated = await tx.select().from(consolidationReferrals).where(and(eq(consolidationReferrals.id, data.referralId), eq(consolidationReferrals.churchId, data.churchId))).limit(1);
    return updated[0] ?? null;
  });
}

export async function getConsolidationCaseAssignments(referralId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(consolidationCaseAssignments).where(and(eq(consolidationCaseAssignments.referralId, referralId), eq(consolidationCaseAssignments.churchId, churchId))).orderBy(desc(consolidationCaseAssignments.createdAt));
}

export async function updateConsolidationReferral(
  id: number,
  churchId: number,
  data: Partial<typeof consolidationReferrals.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(consolidationReferrals)
    .set(data)
    .where(and(eq(consolidationReferrals.id, id), eq(consolidationReferrals.churchId, churchId)));
  return getConsolidationReferralById(id, churchId);
}

export async function getConsolidationFollowUpsByReferral(referralId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consolidationFollowUps)
    .where(and(eq(consolidationFollowUps.referralId, referralId), eq(consolidationFollowUps.churchId, churchId)))
    .orderBy(desc(consolidationFollowUps.createdAt));
}

export async function getConsolidationFollowUpsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consolidationFollowUps)
    .where(eq(consolidationFollowUps.churchId, churchId))
    .orderBy(desc(consolidationFollowUps.createdAt));
}

export async function createConsolidationFollowUp(data: typeof consolidationFollowUps.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(consolidationFollowUps).values(data);
  return result[0];
}

export async function getCareVisitsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(careVisits).where(eq(careVisits.churchId, churchId)).orderBy(desc(careVisits.createdAt));
}

export async function getCareVisitById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(careVisits).where(and(eq(careVisits.id, id), eq(careVisits.churchId, churchId))).limit(1);
  return rows[0] ?? null;
}

export async function getCareVisitEvents(visitId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(careVisitEvents).where(and(eq(careVisitEvents.visitId, visitId), eq(careVisitEvents.churchId, churchId))).orderBy(desc(careVisitEvents.createdAt));
}

export async function createCareVisit(data: typeof careVisits.$inferInsert & { performedByChurchUserId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const referral = await tx.select({ id: consolidationReferrals.id, status: consolidationReferrals.status }).from(consolidationReferrals).where(and(eq(consolidationReferrals.id, data.referralId), eq(consolidationReferrals.churchId, data.churchId))).limit(1).for("update");
    if (referral.length === 0 || ["encerrado", "cancelado"].includes(referral[0].status)) throw new Error("Caso de Consolidação inválido para solicitar Visita.");
    const status = data.scheduledAt ? "agendada" : "solicitada";
    const result = await tx.insert(careVisits).values({ churchId: data.churchId, referralId: data.referralId, departmentId: data.departmentId ?? null, requestedByPersonId: data.requestedByPersonId, assignedToPersonId: data.assignedToPersonId ?? null, assignedByChurchUserId: data.assignedByChurchUserId ?? null, priority: data.priority ?? "normal", status, reason: data.reason, address: data.address ?? null, scheduledAt: data.scheduledAt ?? null, assignedAt: data.assignedToPersonId ? new Date() : null });
    const visitId = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
    if (!visitId) throw new Error("Não foi possível criar a Visita.");
    await tx.insert(careVisitEvents).values({ churchId: data.churchId, visitId, action: "criada", toPersonId: data.assignedToPersonId ?? null, performedByChurchUserId: data.performedByChurchUserId ?? null, notes: data.reason });
    if (data.assignedToPersonId) await tx.insert(careVisitEvents).values({ churchId: data.churchId, visitId, action: "atribuida", toPersonId: data.assignedToPersonId, performedByChurchUserId: data.performedByChurchUserId ?? null });
    if (data.scheduledAt) await tx.insert(careVisitEvents).values({ churchId: data.churchId, visitId, action: "agendada", toPersonId: data.assignedToPersonId ?? null, performedByChurchUserId: data.performedByChurchUserId ?? null });
    const rows = await tx.select().from(careVisits).where(and(eq(careVisits.id, visitId), eq(careVisits.churchId, data.churchId))).limit(1);
    return rows[0] ?? null;
  });
}

export async function assignCareVisit(data: { churchId: number; visitId: number; toPersonId: number | null; performedByChurchUserId: number | null; scheduledAt?: Date | null; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(careVisits).where(and(eq(careVisits.id, data.visitId), eq(careVisits.churchId, data.churchId))).limit(1).for("update");
    const visit = rows[0];
    if (!visit) throw new Error("Visita não encontrada.");
    if (["realizada", "cancelada"].includes(visit.status)) throw new Error("Esta Visita não pode mais ser atribuída.");
    const action = visit.assignedToPersonId || data.toPersonId === null ? "reatribuida" : "atribuida";
    const nextStatus = data.scheduledAt ?? visit.scheduledAt ? "agendada" : "solicitada";
    await tx.update(careVisits).set({ assignedToPersonId: data.toPersonId, assignedByChurchUserId: data.toPersonId ? data.performedByChurchUserId : null, assignedAt: data.toPersonId ? new Date() : null, scheduledAt: data.scheduledAt === undefined ? visit.scheduledAt : data.scheduledAt, status: nextStatus }).where(and(eq(careVisits.id, data.visitId), eq(careVisits.churchId, data.churchId)));
    await tx.insert(careVisitEvents).values({ churchId: data.churchId, visitId: data.visitId, action, fromPersonId: visit.assignedToPersonId, toPersonId: data.toPersonId, performedByChurchUserId: data.performedByChurchUserId, notes: data.notes ?? null });
    if (data.scheduledAt && data.scheduledAt.getTime() !== visit.scheduledAt?.getTime()) await tx.insert(careVisitEvents).values({ churchId: data.churchId, visitId: data.visitId, action: visit.scheduledAt ? "reagendada" : "agendada", toPersonId: data.toPersonId, performedByChurchUserId: data.performedByChurchUserId });
    const updated = await tx.select().from(careVisits).where(and(eq(careVisits.id, data.visitId), eq(careVisits.churchId, data.churchId))).limit(1);
    return updated[0] ?? null;
  });
}

export async function acceptCareVisit(data: { churchId: number; visitId: number; personId: number; performedByChurchUserId: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(careVisits).where(and(eq(careVisits.id, data.visitId), eq(careVisits.churchId, data.churchId))).limit(1).for("update");
    const visit = rows[0];
    if (!visit) throw new Error("Visita não encontrada.");
    if (["realizada", "cancelada"].includes(visit.status)) throw new Error("Esta Visita não pode mais ser aceita.");
    if (visit.assignedToPersonId && visit.assignedToPersonId !== data.personId) throw new Error("Esta Visita já foi assumida por outro Visitador.");
    if (visit.assignedToPersonId === data.personId) return visit;
    await tx.update(careVisits).set({
      assignedToPersonId: data.personId,
      assignedByChurchUserId: data.performedByChurchUserId,
      assignedAt: new Date(),
      status: visit.scheduledAt ? "agendada" : "solicitada",
    }).where(and(eq(careVisits.id, data.visitId), eq(careVisits.churchId, data.churchId)));
    await tx.insert(careVisitEvents).values({
      churchId: data.churchId,
      visitId: data.visitId,
      action: "aceita",
      fromPersonId: visit.assignedToPersonId,
      toPersonId: data.personId,
      performedByChurchUserId: data.performedByChurchUserId,
      notes: "Visita aceita pelo Visitador.",
    });
    const updated = await tx.select().from(careVisits).where(and(eq(careVisits.id, data.visitId), eq(careVisits.churchId, data.churchId))).limit(1);
    return updated[0] ?? null;
  });
}

export async function completeCareVisit(data: { churchId: number; visitId: number; performedByChurchUserId: number | null; notes: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(careVisits).where(and(eq(careVisits.id, data.visitId), eq(careVisits.churchId, data.churchId))).limit(1).for("update");
    const visit = rows[0];
    if (!visit) throw new Error("Visita não encontrada.");
    if (visit.status === "realizada") return visit;
    if (visit.status === "cancelada") throw new Error("Uma Visita cancelada não pode ser concluída.");
    const completedAt = new Date();
    await tx.update(careVisits).set({ status: "realizada", completedAt, completionNotes: data.notes }).where(and(eq(careVisits.id, data.visitId), eq(careVisits.churchId, data.churchId)));
    await tx.insert(careVisitEvents).values({ churchId: data.churchId, visitId: data.visitId, action: "concluida", toPersonId: visit.assignedToPersonId, performedByChurchUserId: data.performedByChurchUserId, notes: data.notes });
    const updated = await tx.select().from(careVisits).where(and(eq(careVisits.id, data.visitId), eq(careVisits.churchId, data.churchId))).limit(1);
    return updated[0] ?? null;
  });
}

export async function cancelCareVisit(data: { churchId: number; visitId: number; performedByChurchUserId: number | null; reason: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(careVisits).where(and(eq(careVisits.id, data.visitId), eq(careVisits.churchId, data.churchId))).limit(1).for("update");
    const visit = rows[0];
    if (!visit) throw new Error("Visita não encontrada.");
    if (visit.status === "realizada") throw new Error("Uma Visita realizada não pode ser cancelada.");
    if (visit.status === "cancelada") return visit;
    await tx.update(careVisits).set({ status: "cancelada", cancelledAt: new Date(), cancellationReason: data.reason }).where(and(eq(careVisits.id, data.visitId), eq(careVisits.churchId, data.churchId)));
    await tx.insert(careVisitEvents).values({ churchId: data.churchId, visitId: data.visitId, action: "cancelada", toPersonId: visit.assignedToPersonId, performedByChurchUserId: data.performedByChurchUserId, notes: data.reason });
    const updated = await tx.select().from(careVisits).where(and(eq(careVisits.id, data.visitId), eq(careVisits.churchId, data.churchId))).limit(1);
    return updated[0] ?? null;
  });
}

// ─── CELLS ────────────────────────────────────────────────────────────────────

export async function getCellsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(cells)
    .where(and(eq(cells.churchId, churchId), eq(cells.active, true)))
    .orderBy(cells.name);
}

/**
 * Consulta pública mínima de Células. A chamada externa é resolvida pelo slug do
 * host e só ocorre quando a página pública do tenant está publicada.
 */
export async function getPublicCellsByChurchId(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: cells.id,
      name: cells.name,
      address: cells.address,
      city: cells.city,
      neighborhood: cells.neighborhood,
      latitude: cells.latitude,
      longitude: cells.longitude,
      meetingDay: cells.meetingDay,
      meetingTime: cells.meetingTime,
      publicLocationMode: cells.publicLocationMode,
      publicLeaderContact: cells.publicLeaderContact,
      leaderName: people.fullName,
      leaderWhatsapp: people.whatsapp,
      leaderPhone: people.phone,
    })
    .from(cells)
    .innerJoin(people, and(eq(people.id, cells.leaderId), eq(people.churchId, cells.churchId)))
    .where(and(
      eq(cells.churchId, churchId),
      eq(cells.active, true),
      eq(cells.publicVisible, true),
      isNotNull(cells.latitude),
      isNotNull(cells.longitude),
    ))
    .orderBy(cells.name)
    .limit(100);

  return rows.map((row) => {
    const exactLocation = row.publicLocationMode === "exact";
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    return {
      id: row.id,
      name: row.name,
      city: row.city,
      neighborhood: row.neighborhood,
      latitude: exactLocation ? latitude : Math.round(latitude * 100) / 100,
      longitude: exactLocation ? longitude : Math.round(longitude * 100) / 100,
      locationMode: row.publicLocationMode,
      address: exactLocation ? row.address : null,
      meetingDay: row.meetingDay,
      meetingTime: row.meetingTime,
      leaderName: row.leaderName,
      leaderWhatsapp: row.publicLeaderContact
        ? (row.leaderWhatsapp?.trim() || row.leaderPhone?.trim() || null)
        : null,
    };
  });
}

export async function getCellById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(cells)
    .where(and(eq(cells.id, id), eq(cells.churchId, churchId)))
    .limit(1);
  return result[0] ?? null;
}
/** Retorna as Células operacionais acessíveis à Pessoa no tenant. */
export async function getAccessibleCellIdsByPerson(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  const [leadershipRows, membership] = await Promise.all([
    db
      .select({ id: cells.id })
      .from(cells)
      .where(and(
        eq(cells.churchId, churchId),
        eq(cells.active, true),
        or(
          eq(cells.leaderId, personId),
          eq(cells.coLeaderId, personId),
          eq(cells.supervisorId, personId),
        ),
      )),
    getActiveCellMembership(personId, churchId),
  ]);
  const ids = new Set(leadershipRows.map((row) => row.id));
  if (membership) ids.add(membership.cellId);
  return Array.from(ids);
}
/** Converte liderança estrutural de Célula em papéis efetivos deduplicados. */
export async function getActiveCellRoleKeysByPerson(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ leaderId: cells.leaderId, coLeaderId: cells.coLeaderId, supervisorId: cells.supervisorId })
    .from(cells)
    .where(and(
      eq(cells.churchId, churchId),
      eq(cells.active, true),
      or(
        eq(cells.leaderId, personId),
        eq(cells.coLeaderId, personId),
        eq(cells.supervisorId, personId),
      ),
    ));
  const roles = new Set<string>();
  for (const row of rows) {
    if (row.leaderId === personId || row.coLeaderId === personId) roles.add("lider");
    if (row.supervisorId === personId) roles.add("supervisor");
  }
  return Array.from(roles);
}
export async function createCell(data: typeof cells.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(cells).values(data);
  return result[0];
}

export async function updateCell(id: number, churchId: number, data: Partial<typeof cells.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(cells).set(data).where(and(eq(cells.id, id), eq(cells.churchId, churchId)));
  return getCellById(id, churchId);
}

export async function getCellMembersCount(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ cellId: cellMembers.cellId, count: sql<number>`COUNT(*)` })
    .from(cellMembers)
    .innerJoin(cells, eq(cells.id, cellMembers.cellId))
    .where(and(eq(cells.churchId, churchId), eq(cellMembers.active, true)))
    .groupBy(cellMembers.cellId);
}

/** Retorna as reuniões recentes de uma Célula com o resumo de presença já calculado. */
export async function getCellMeetingSummaries(cellId: number, churchId: number, limit = 6) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      meeting: cellMeetings,
      total: sql<number>`COUNT(${cellAttendance.id})`,
      present: sql<number>`COALESCE(SUM(CASE WHEN ${cellAttendance.status} = 'presente' THEN 1 ELSE 0 END), 0)`,
      absent: sql<number>`COALESCE(SUM(CASE WHEN ${cellAttendance.status} = 'ausente' THEN 1 ELSE 0 END), 0)`,
    })
    .from(cellMeetings)
    .leftJoin(cellAttendance, eq(cellAttendance.meetingId, cellMeetings.id))
    .innerJoin(cells, eq(cells.id, cellMeetings.cellId))
    .where(and(eq(cellMeetings.cellId, cellId), eq(cellMeetings.churchId, churchId), eq(cells.churchId, churchId)))
    .groupBy(cellMeetings.id)
    .orderBy(desc(cellMeetings.meetingDate))
    .limit(limit);
}

export async function getCellMeetingByDate(cellId: number, churchId: number, meetingDate: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(cellMeetings)
    .where(
      and(
        eq(cellMeetings.cellId, cellId),
        eq(cellMeetings.churchId, churchId),
        sql`${cellMeetings.meetingDate} = DATE(${meetingDate})`
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Cria um único encontro e sua lista completa de presença na mesma transação. */
export async function createCellMeetingWithAttendance(data: {
  cellId: number;
  churchId: number;
  meetingDate: string;
  topic?: string | null;
  notes?: string | null;
  attendance: Array<{ personId: number; status: "presente" | "ausente" }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const normalizedMeetingDate = new Date(`${data.meetingDate}T12:00:00.000Z`);

  return db.transaction(async (tx) => {
    const result = await tx.insert(cellMeetings).values({
      cellId: data.cellId,
      churchId: data.churchId,
      meetingDate: normalizedMeetingDate,
      topic: data.topic ?? null,
      notes: data.notes ?? null,
    });
    const meetingId = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
    if (!meetingId) throw new Error("Failed to create cell meeting");

    if (data.attendance.length > 0) {
      await tx.insert(cellAttendance).values(
        data.attendance.map((entry) => ({
          meetingId,
          personId: entry.personId,
          status: entry.status,
        }))
      );
    }

    const rows = await tx.select().from(cellMeetings).where(eq(cellMeetings.id, meetingId)).limit(1);
    return rows[0] ?? null;
  });
}

export async function getActiveMembersByCell(cellId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ membership: cellMembers, person: people })
    .from(cellMembers)
    .innerJoin(cells, eq(cells.id, cellMembers.cellId))
    .innerJoin(people, eq(people.id, cellMembers.personId))
    .where(and(eq(cellMembers.cellId, cellId), eq(cellMembers.active, true), eq(cells.churchId, churchId), eq(people.churchId, churchId)))
    .orderBy(people.fullName);
}

export async function getActiveCellMembership(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: cellMembers.id,
      personId: cellMembers.personId,
      cellId: cells.id,
      cellName: cells.name,
      joinedAt: cellMembers.joinedAt,
    })
    .from(cellMembers)
    .innerJoin(cells, eq(cells.id, cellMembers.cellId))
    .where(and(eq(cellMembers.personId, personId), eq(cellMembers.active, true), eq(cells.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPeopleWithoutActiveCell(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  const [churchPeople, activeMemberships] = await Promise.all([
    db
      .select({ id: people.id, fullName: people.fullName })
      .from(people)
      .where(and(eq(people.churchId, churchId), eq(people.active, true)))
      .orderBy(people.fullName),
    db
      .select({ personId: cellMembers.personId })
      .from(cellMembers)
      .innerJoin(cells, eq(cells.id, cellMembers.cellId))
      .where(and(eq(cells.churchId, churchId), eq(cellMembers.active, true))),
  ]);
  const assignedIds = new Set(activeMemberships.map((membership) => membership.personId));
  return churchPeople.filter((person) => !assignedIds.has(person.id));
}

export async function getCellMembershipHistory(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: cellMembers.id,
      cellId: cells.id,
      cellName: cells.name,
      joinedAt: cellMembers.joinedAt,
      leftAt: cellMembers.leftAt,
      active: cellMembers.active,
    })
    .from(cellMembers)
    .innerJoin(cells, eq(cells.id, cellMembers.cellId))
    .where(and(eq(cellMembers.personId, personId), eq(cells.churchId, churchId)))
    .orderBy(desc(cellMembers.joinedAt));
}

/** Encerra qualquer vínculo ativo antes de inserir a nova Célula da Pessoa. */
export async function assignPersonToCell(data: { churchId: number; personId: number; cellId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const personRows = await tx.select({ id: people.id }).from(people).where(and(eq(people.id, data.personId), eq(people.churchId, data.churchId), eq(people.active, true))).limit(1).for("update");
    if (personRows.length === 0) throw new Error("Pessoa não encontrada nesta igreja.");
    const targetCells = await tx.select({ id: cells.id }).from(cells).where(and(eq(cells.id, data.cellId), eq(cells.churchId, data.churchId), eq(cells.active, true))).limit(1);
    if (targetCells.length === 0) throw new Error("Célula inválida para esta igreja.");

    const now = new Date();
    const activeMemberships = await tx
      .select({ membershipId: cellMembers.id, cellId: cellMembers.cellId })
      .from(cellMembers)
      .innerJoin(cells, eq(cells.id, cellMembers.cellId))
      .where(and(eq(cellMembers.personId, data.personId), eq(cellMembers.active, true), eq(cells.churchId, data.churchId)));
    const current = activeMemberships.find((membership) => membership.cellId === data.cellId);
    if (current) {
      const rows = await tx.select().from(cellMembers).where(eq(cellMembers.id, current.membershipId)).limit(1);
      return rows[0] ?? null;
    }
    for (const membership of activeMemberships) {
      await tx.update(cellMembers).set({ active: false, leftAt: now }).where(eq(cellMembers.id, membership.membershipId));
    }
    const result = await tx.insert(cellMembers).values({ cellId: data.cellId, personId: data.personId, active: true, joinedAt: now });
    const membershipId = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
    if (!membershipId) throw new Error("Failed to assign person to cell");
    const rows = await tx.select().from(cellMembers).where(eq(cellMembers.id, membershipId)).limit(1);
    return rows[0] ?? null;
  });
}

/** Integra um caso moderno em Célula e encerra o cuidado na mesma transação. */
export async function integrateConsolidationReferralIntoCell(data: { churchId: number; referralId: number; cellId: number; closeNotes: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const referralRows = await tx
      .select()
      .from(consolidationReferrals)
      .where(and(eq(consolidationReferrals.id, data.referralId), eq(consolidationReferrals.churchId, data.churchId)))
      .limit(1)
      .for("update");
    const referral = referralRows[0];
    if (!referral) throw new Error("Caso de Consolidação não encontrado.");
    if (referral.status !== "em_acompanhamento") throw new Error("Registre um acompanhamento antes de integrar a Pessoa em uma Célula.");
    if (!referral.acceptedByPersonId) throw new Error("O caso precisa ter um Consolidador responsável antes da integração.");

    const targetCells = await tx
      .select({ id: cells.id, name: cells.name, leaderId: cells.leaderId })
      .from(cells)
      .where(and(eq(cells.id, data.cellId), eq(cells.churchId, data.churchId), eq(cells.active, true)))
      .limit(1);
    const targetCell = targetCells[0];
    if (!targetCell) throw new Error("Célula inválida para esta igreja.");
    if (!targetCell.leaderId) throw new Error("A Célula precisa ter um líder definido antes de receber esta Pessoa.");

    const personRows = await tx
      .select({ id: people.id })
      .from(people)
      .where(and(eq(people.id, referral.personId), eq(people.churchId, data.churchId), eq(people.active, true)))
      .limit(1)
      .for("update");
    if (personRows.length === 0) throw new Error("Pessoa não encontrada nesta igreja.");

    const now = new Date();
    const activeMemberships = await tx
      .select({ membershipId: cellMembers.id, cellId: cellMembers.cellId })
      .from(cellMembers)
      .innerJoin(cells, eq(cells.id, cellMembers.cellId))
      .where(and(eq(cellMembers.personId, referral.personId), eq(cellMembers.active, true), eq(cells.churchId, data.churchId)));
    const current = activeMemberships.find((membership) => membership.cellId === data.cellId);
    let membership;
    if (current) {
      const rows = await tx.select().from(cellMembers).where(eq(cellMembers.id, current.membershipId)).limit(1);
      membership = rows[0] ?? null;
    } else {
      for (const activeMembership of activeMemberships) {
        await tx.update(cellMembers).set({ active: false, leftAt: now }).where(eq(cellMembers.id, activeMembership.membershipId));
      }
      const result = await tx.insert(cellMembers).values({ cellId: data.cellId, personId: referral.personId, active: true, joinedAt: now });
      const membershipId = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
      if (!membershipId) throw new Error("Não foi possível integrar a Pessoa à Célula.");
      const rows = await tx.select().from(cellMembers).where(eq(cellMembers.id, membershipId)).limit(1);
      membership = rows[0] ?? null;
    }

    await tx.update(consolidationReferrals).set({ status: "encerrado", closedAt: now, closeNotes: data.closeNotes }).where(and(eq(consolidationReferrals.id, data.referralId), eq(consolidationReferrals.churchId, data.churchId)));
    await tx.update(careAssignments).set({ active: false, endedAt: now }).where(and(eq(careAssignments.personId, referral.personId), eq(careAssignments.churchId, data.churchId), eq(careAssignments.active, true)));
    await tx.insert(careAssignments).values({ churchId: data.churchId, personId: referral.personId, responsiblePersonId: targetCell.leaderId, role: "lider_celula", notes: `Cuidado transferido após integração na ${targetCell.name}.`, active: true, startedAt: now });

    const updatedRows = await tx.select().from(consolidationReferrals).where(and(eq(consolidationReferrals.id, data.referralId), eq(consolidationReferrals.churchId, data.churchId))).limit(1);
    return { referral: updatedRows[0] ?? null, membership, cellName: targetCell.name };
  });
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────

export async function getEventsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(events)
    .where(and(eq(events.churchId, churchId), eq(events.active, true)))
    .orderBy(desc(events.startDate));
}

/** Expõe somente dados institucionais de próximos eventos ativos da mesma igreja. */
export async function getPublicUpcomingEventsByChurchId(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: events.id,
    name: events.name,
    type: events.type,
    description: events.description,
    startDate: events.startDate,
    endDate: events.endDate,
    location: events.location,
  })
    .from(events)
    .where(and(
      eq(events.churchId, churchId),
      eq(events.active, true),
      gte(events.startDate, new Date()),
    ))
    .orderBy(events.startDate)
    .limit(3);
}

/** Expõe somente a identidade institucional de Ministérios ativos da mesma igreja. */
export async function getPublicMinistriesByChurchId(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: ministries.id,
    name: ministries.name,
    type: ministries.type,
    description: ministries.description,
  })
    .from(ministries)
    .where(and(
      eq(ministries.churchId, churchId),
      eq(ministries.active, true),
    ))
    .orderBy(ministries.name)
    .limit(6);
}

export async function getEventAttendanceReport(data: { churchId: number; eventId: number }) {
  const db = await getDb();
  if (!db) return null;
  const eventRows = await db.select().from(events)
    .where(and(eq(events.id, data.eventId), eq(events.churchId, data.churchId)))
    .limit(1);
  const event = eventRows[0];
  if (!event) return null;

  const rows = await db.select({
    id: eventRegistrations.id,
    personId: eventRegistrations.personId,
    registeredAt: eventRegistrations.registeredAt,
    checkedIn: eventRegistrations.checkedIn,
    checkedInAt: eventRegistrations.checkedInAt,
    status: eventRegistrations.status,
    personName: people.fullName,
  })
    .from(eventRegistrations)
    .innerJoin(people, and(eq(people.id, eventRegistrations.personId), eq(people.churchId, data.churchId)))
    .where(eq(eventRegistrations.eventId, event.id))
    .orderBy(desc(eventRegistrations.checkedInAt), desc(eventRegistrations.registeredAt));

  const registrations = rows.filter((row) => row.status !== "cancelado");
  const checkedIn = registrations.filter((row) => row.checkedIn || row.status === "participou");
  const absent = registrations.filter((row) => !row.checkedIn && row.status !== "participou");
  return {
    event,
    summary: {
      registeredCount: registrations.length,
      checkedInCount: checkedIn.length,
      absentCount: absent.length,
      cancelledCount: rows.length - registrations.length,
    },
    registrations: registrations.map((row) => ({ ...row, attendance: row.checkedIn || row.status === "participou" ? "presente" as const : "ausente" as const })),
  };
}

export async function createEvent(data: typeof events.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(events).values(data);
  return result[0];
}

// ─── MINISTRIES ───────────────────────────────────────────────────────────────

export async function getMinistriesByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ministries)
    .where(and(eq(ministries.churchId, churchId), eq(ministries.active, true)))
    .orderBy(ministries.name);
}

/** Retorna os Ministérios ativos dos quais a Pessoa participa nesta igreja. */
export async function getMinistryMembershipsByPerson(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ membership: ministryMembers, ministry: ministries })
    .from(ministryMembers)
    .innerJoin(ministries, eq(ministries.id, ministryMembers.ministryId))
    .innerJoin(people, eq(people.id, ministryMembers.personId))
    .where(and(
      eq(ministryMembers.personId, personId),
      eq(ministryMembers.active, true),
      eq(ministries.churchId, churchId),
      eq(ministries.active, true),
      eq(people.churchId, churchId),
      eq(people.active, true),
    ))
    .orderBy(ministries.name);
}

export async function createMinistry(data: typeof ministries.$inferInsert, participantIds: number[] = []) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const result = await tx.insert(ministries).values(data);
    const ministryId = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
    if (!ministryId) throw new Error("Failed to create ministry");
    const initialParticipantIds = Array.from(new Set([data.leaderId, ...participantIds].filter((id): id is number => Boolean(id))));
    for (const personId of initialParticipantIds) {
      await tx.insert(ministryMembers).values({ ministryId, personId, active: true });
    }
    if (data.type === "consolidacao") {
      for (const department of [
        { name: "Consolidação", description: "Acompanhamento e integração de Pessoas.", systemKey: "consolidacao" as const },
        { name: "Visitas", description: "Planejamento e execução de visitas de cuidado.", systemKey: "visitas" as const },
      ]) {
        await tx.insert(departments).values({
          churchId: data.churchId,
          ministryId,
          name: department.name,
          description: department.description,
          systemKey: department.systemKey,
          active: true,
        });
      }
    } else if (data.type === "visitas") {
      await tx.insert(departments).values({
        churchId: data.churchId,
        ministryId,
        name: "Visitas",
        description: "Planejamento e execução de visitas de cuidado.",
        systemKey: "visitas",
        leaderId: data.leaderId ?? null,
        active: true,
      });
    }
    const rows = await tx.select().from(ministries).where(and(eq(ministries.id, ministryId), eq(ministries.churchId, data.churchId))).limit(1);
    return rows[0] ?? null;
  });
}

export async function updateMinistry(id: number, churchId: number, data: Partial<typeof ministries.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(ministries).set(data).where(and(eq(ministries.id, id), eq(ministries.churchId, churchId)));
  const rows = await db.select().from(ministries).where(and(eq(ministries.id, id), eq(ministries.churchId, churchId))).limit(1);
  return rows[0] ?? null;
}

/** Arquiva um Ministério no tenant, preservando o histórico e desativando apenas os vínculos operacionais. */
export async function archiveMinistry(data: { ministryId: number; churchId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const ministryRows = await tx.select({ id: ministries.id, name: ministries.name, active: ministries.active })
      .from(ministries)
      .where(and(eq(ministries.id, data.ministryId), eq(ministries.churchId, data.churchId)))
      .limit(1)
      .for("update");
    const ministry = ministryRows[0];
    if (!ministry) return { archived: false as const, reason: "not_found" as const };
    if (!ministry.active) return { archived: true as const, alreadyArchived: true as const, ministryId: ministry.id, name: ministry.name };

    const scheduledRows = await tx.select({ id: scheduleItems.id })
      .from(scheduleItems)
      .where(and(eq(scheduleItems.churchId, data.churchId), eq(scheduleItems.ministryId, data.ministryId), eq(scheduleItems.status, "agendada")))
      .limit(1);
    if (scheduledRows.length > 0) return { archived: false as const, reason: "scheduled_items" as const };

    const referralRows = await tx.select({ id: consolidationReferrals.id })
      .from(consolidationReferrals)
      .where(and(eq(consolidationReferrals.churchId, data.churchId), eq(consolidationReferrals.sourceMinistryId, data.ministryId)))
      .limit(1);
    if (referralRows.length > 0) return { archived: false as const, reason: "consolidation_referrals" as const };

    await tx.update(ministries)
      .set({ active: false })
      .where(and(eq(ministries.id, data.ministryId), eq(ministries.churchId, data.churchId)));
    await tx.update(ministryMembers).set({ active: false }).where(eq(ministryMembers.ministryId, data.ministryId));
    await tx.update(ministryRoleAssignments).set({ active: false, endedAt: new Date() }).where(and(eq(ministryRoleAssignments.churchId, data.churchId), eq(ministryRoleAssignments.ministryId, data.ministryId)));
    await tx.update(ministryRoleDefinitions).set({ active: false }).where(and(eq(ministryRoleDefinitions.churchId, data.churchId), eq(ministryRoleDefinitions.ministryId, data.ministryId)));
    const departmentRows = await tx.select({ id: departments.id }).from(departments).where(and(eq(departments.churchId, data.churchId), eq(departments.ministryId, data.ministryId)));
    for (const department of departmentRows) {
      await tx.update(departmentMembers).set({ active: false, leftAt: new Date() }).where(and(eq(departmentMembers.churchId, data.churchId), eq(departmentMembers.departmentId, department.id)));
      await tx.update(departmentRoleAssignments).set({ active: false, endedAt: new Date() }).where(and(eq(departmentRoleAssignments.churchId, data.churchId), eq(departmentRoleAssignments.departmentId, department.id)));
      await tx.update(departments).set({ active: false }).where(and(eq(departments.id, department.id), eq(departments.churchId, data.churchId)));
    }
    return { archived: true as const, alreadyArchived: false as const, ministryId: ministry.id, name: ministry.name };
  });
}

export async function setMinistryLeader(data: { ministryId: number; churchId: number; leaderId: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const locked = await tx.select({ id: ministries.id, type: ministries.type }).from(ministries).where(and(eq(ministries.id, data.ministryId), eq(ministries.churchId, data.churchId), eq(ministries.active, true))).limit(1).for("update");
    if (locked.length === 0) return null;
    await tx.update(ministries).set({ leaderId: data.leaderId }).where(and(eq(ministries.id, data.ministryId), eq(ministries.churchId, data.churchId)));
    if (locked[0].type === "visitas") {
      await tx.update(departments).set({ leaderId: data.leaderId }).where(and(eq(departments.churchId, data.churchId), eq(departments.ministryId, data.ministryId), eq(departments.systemKey, "visitas")));
    }
    if (data.leaderId) {
      const existing = await tx.select({ id: ministryMembers.id }).from(ministryMembers).where(and(eq(ministryMembers.ministryId, data.ministryId), eq(ministryMembers.personId, data.leaderId), eq(ministryMembers.active, true))).limit(1);
      if (existing.length === 0) await tx.insert(ministryMembers).values({ ministryId: data.ministryId, personId: data.leaderId, active: true });
    }
    const rows = await tx.select().from(ministries).where(and(eq(ministries.id, data.ministryId), eq(ministries.churchId, data.churchId))).limit(1);
    return rows[0] ?? null;
  });
}

// ─── DEPARTAMENTOS ────────────────────────────────────────────────────────────

export async function getDepartmentsByMinistry(ministryId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).where(and(eq(departments.ministryId, ministryId), eq(departments.churchId, churchId), eq(departments.active, true))).orderBy(departments.name);
}

export async function getDepartmentsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).where(eq(departments.churchId, churchId)).orderBy(departments.name);
}

export async function getDepartmentById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(departments).where(and(eq(departments.id, id), eq(departments.churchId, churchId), eq(departments.active, true))).limit(1);
  return rows[0] ?? null;
}

export async function createDepartment(data: { churchId: number; ministryId: number; name: string; description?: string | null; systemKey?: "consolidacao" | "visitas" | null; leaderId?: number | null; supervisorId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const ministryRows = await tx.select({ id: ministries.id }).from(ministries).where(and(eq(ministries.id, data.ministryId), eq(ministries.churchId, data.churchId), eq(ministries.active, true))).limit(1).for("update");
    if (ministryRows.length === 0) throw new Error("Ministério não encontrado nesta igreja.");
    const responsibleIds = Array.from(new Set([data.leaderId, data.supervisorId].filter((id): id is number => Boolean(id))));
    for (const personId of responsibleIds) {
      const peopleRows = await tx.select({ id: people.id }).from(people).where(and(eq(people.id, personId), eq(people.churchId, data.churchId), eq(people.active, true))).limit(1);
      if (peopleRows.length === 0) throw new Error("Responsável inválido para esta igreja.");
    }
    const result = await tx.insert(departments).values({ churchId: data.churchId, ministryId: data.ministryId, name: data.name, description: data.description ?? null, systemKey: data.systemKey ?? null, leaderId: data.leaderId ?? null, supervisorId: data.supervisorId ?? null });
    const departmentId = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
    if (!departmentId) throw new Error("Não foi possível criar o Departamento.");
    for (const personId of responsibleIds) {
      const ministryMembership = await tx.select({ id: ministryMembers.id }).from(ministryMembers).where(and(eq(ministryMembers.ministryId, data.ministryId), eq(ministryMembers.personId, personId), eq(ministryMembers.active, true))).limit(1);
      if (ministryMembership.length === 0) await tx.insert(ministryMembers).values({ ministryId: data.ministryId, personId, active: true });
      await tx.insert(departmentMembers).values({ churchId: data.churchId, departmentId, personId, active: true });
    }
    const rows = await tx.select().from(departments).where(and(eq(departments.id, departmentId), eq(departments.churchId, data.churchId))).limit(1);
    return rows[0] ?? null;
  });
}

export async function updateDepartment(data: { id: number; churchId: number; name?: string; description?: string | null; active?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(departments).set({ name: data.name, description: data.description, active: data.active }).where(and(eq(departments.id, data.id), eq(departments.churchId, data.churchId)));
  return getDepartmentById(data.id, data.churchId);
}

export async function setDepartmentLeader(data: { departmentId: number; churchId: number; leaderId: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const departmentRows = await tx.select().from(departments).where(and(eq(departments.id, data.departmentId), eq(departments.churchId, data.churchId), eq(departments.active, true))).limit(1).for("update");
    const department = departmentRows[0];
    if (!department) return null;
    if (data.leaderId) {
      const peopleRows = await tx.select({ id: people.id }).from(people).where(and(eq(people.id, data.leaderId), eq(people.churchId, data.churchId), eq(people.active, true))).limit(1);
      if (peopleRows.length === 0) throw new Error("Líder inválido para esta igreja.");
      const ministryMembership = await tx.select({ id: ministryMembers.id }).from(ministryMembers).where(and(eq(ministryMembers.ministryId, department.ministryId), eq(ministryMembers.personId, data.leaderId), eq(ministryMembers.active, true))).limit(1);
      if (ministryMembership.length === 0) await tx.insert(ministryMembers).values({ ministryId: department.ministryId, personId: data.leaderId, active: true });
      const departmentMembership = await tx.select({ id: departmentMembers.id }).from(departmentMembers).where(and(eq(departmentMembers.churchId, data.churchId), eq(departmentMembers.departmentId, data.departmentId), eq(departmentMembers.personId, data.leaderId), eq(departmentMembers.active, true))).limit(1);
      if (departmentMembership.length === 0) await tx.insert(departmentMembers).values({ churchId: data.churchId, departmentId: data.departmentId, personId: data.leaderId, active: true });
    }
    await tx.update(departments).set({ leaderId: data.leaderId }).where(and(eq(departments.id, data.departmentId), eq(departments.churchId, data.churchId)));
    const rows = await tx.select().from(departments).where(and(eq(departments.id, data.departmentId), eq(departments.churchId, data.churchId))).limit(1);
    return rows[0] ?? null;
  });
}

export async function setDepartmentSupervisor(data: { departmentId: number; churchId: number; supervisorId: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const departmentRows = await tx.select().from(departments).where(and(eq(departments.id, data.departmentId), eq(departments.churchId, data.churchId), eq(departments.active, true))).limit(1).for("update");
    const department = departmentRows[0];
    if (!department) return null;
    if (data.supervisorId) {
      const peopleRows = await tx.select({ id: people.id }).from(people).where(and(eq(people.id, data.supervisorId), eq(people.churchId, data.churchId), eq(people.active, true))).limit(1);
      if (peopleRows.length === 0) throw new Error("Supervisor inválido para esta igreja.");
      const ministryMembership = await tx.select({ id: ministryMembers.id }).from(ministryMembers).where(and(eq(ministryMembers.ministryId, department.ministryId), eq(ministryMembers.personId, data.supervisorId), eq(ministryMembers.active, true))).limit(1);
      if (ministryMembership.length === 0) await tx.insert(ministryMembers).values({ ministryId: department.ministryId, personId: data.supervisorId, active: true });
      const departmentMembership = await tx.select({ id: departmentMembers.id }).from(departmentMembers).where(and(eq(departmentMembers.churchId, data.churchId), eq(departmentMembers.departmentId, data.departmentId), eq(departmentMembers.personId, data.supervisorId), eq(departmentMembers.active, true))).limit(1);
      if (departmentMembership.length === 0) await tx.insert(departmentMembers).values({ churchId: data.churchId, departmentId: data.departmentId, personId: data.supervisorId, active: true });
    }
    await tx.update(departments).set({ supervisorId: data.supervisorId }).where(and(eq(departments.id, data.departmentId), eq(departments.churchId, data.churchId)));
    const rows = await tx.select().from(departments).where(and(eq(departments.id, data.departmentId), eq(departments.churchId, data.churchId))).limit(1);
    return rows[0] ?? null;
  });
}

export async function setConsolidationDepartmentLeadership(data: { churchId: number; departmentId: number; leaderId: number | null; supervisorId: number | null; assignedByChurchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const departmentRows = await tx.select().from(departments).where(and(eq(departments.id, data.departmentId), eq(departments.churchId, data.churchId), eq(departments.active, true))).limit(1).for("update");
    const department = departmentRows[0];
    if (!department || !department.systemKey) throw new Error("Departamento sistêmico não encontrado nesta igreja.");

    const roleKeys = department.systemKey === "consolidacao"
      ? { leader: "lider_consolidacao", supervisor: "supervisor_consolidacao" }
      : { leader: "lider_visitas", supervisor: "supervisor_visitas" };
    const responsibleIds = Array.from(new Set([data.leaderId, data.supervisorId].filter((id): id is number => Boolean(id))));

    for (const personId of responsibleIds) {
      const personRows = await tx.select({ id: people.id }).from(people).where(and(eq(people.id, personId), eq(people.churchId, data.churchId), eq(people.active, true))).limit(1);
      if (personRows.length === 0) throw new Error("Responsável inválido para esta igreja.");
      const ministryMembership = await tx.select({ id: ministryMembers.id }).from(ministryMembers).where(and(eq(ministryMembers.ministryId, department.ministryId), eq(ministryMembers.personId, personId), eq(ministryMembers.active, true))).limit(1);
      if (ministryMembership.length === 0) await tx.insert(ministryMembers).values({ ministryId: department.ministryId, personId, active: true });
      const departmentMembership = await tx.select({ id: departmentMembers.id }).from(departmentMembers).where(and(eq(departmentMembers.churchId, data.churchId), eq(departmentMembers.departmentId, data.departmentId), eq(departmentMembers.personId, personId), eq(departmentMembers.active, true))).limit(1);
      if (departmentMembership.length === 0) await tx.insert(departmentMembers).values({ churchId: data.churchId, departmentId: data.departmentId, personId, active: true });
    }

    const assignments = await tx.select().from(departmentRoleAssignments).where(and(eq(departmentRoleAssignments.churchId, data.churchId), eq(departmentRoleAssignments.departmentId, data.departmentId), eq(departmentRoleAssignments.active, true))).for("update");
    for (const assignment of assignments) {
      const removeLeaderRole = assignment.roleKey === roleKeys.leader && assignment.personId !== data.leaderId;
      const removeSupervisorRole = assignment.roleKey === roleKeys.supervisor && assignment.personId !== data.supervisorId;
      if (removeLeaderRole || removeSupervisorRole) {
        await tx.update(departmentRoleAssignments).set({ active: false, endedAt: new Date() }).where(and(eq(departmentRoleAssignments.id, assignment.id), eq(departmentRoleAssignments.churchId, data.churchId), eq(departmentRoleAssignments.departmentId, data.departmentId), eq(departmentRoleAssignments.active, true)));
      }
    }

    await tx.update(departments).set({ leaderId: data.leaderId, supervisorId: data.supervisorId }).where(and(eq(departments.id, data.departmentId), eq(departments.churchId, data.churchId)));
    for (const assignment of [
      data.leaderId ? { personId: data.leaderId, roleKey: roleKeys.leader } : null,
      data.supervisorId ? { personId: data.supervisorId, roleKey: roleKeys.supervisor } : null,
    ].filter((item): item is { personId: number; roleKey: string } => Boolean(item))) {
      const existing = await tx.select({ id: departmentRoleAssignments.id }).from(departmentRoleAssignments).where(and(eq(departmentRoleAssignments.churchId, data.churchId), eq(departmentRoleAssignments.departmentId, data.departmentId), eq(departmentRoleAssignments.personId, assignment.personId), eq(departmentRoleAssignments.roleKey, assignment.roleKey), eq(departmentRoleAssignments.active, true))).limit(1);
      if (existing.length === 0) await tx.insert(departmentRoleAssignments).values({ churchId: data.churchId, departmentId: data.departmentId, personId: assignment.personId, roleKey: assignment.roleKey, assignedByChurchUserId: data.assignedByChurchUserId, active: true });
    }

    const updated = await tx.select().from(departments).where(and(eq(departments.id, data.departmentId), eq(departments.churchId, data.churchId))).limit(1);
    return updated[0] ?? null;
  });
}

export async function ensureConsolidationMinistryStructure(churchId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    let ministry = (await tx.select().from(ministries).where(and(eq(ministries.churchId, churchId), or(eq(ministries.type, "consolidacao"), sql`LOWER(${ministries.name}) LIKE '%consolida%'`), eq(ministries.active, true))).limit(1).for("update"))[0];
    if (!ministry) {
      const result = await tx.insert(ministries).values({ churchId, name: "Consolidação e Visitas", type: "consolidacao", description: "Cuidado, acompanhamento e visitas da igreja.", active: true });
      const ministryId = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
      ministry = (await tx.select().from(ministries).where(and(eq(ministries.id, ministryId), eq(ministries.churchId, churchId))).limit(1))[0];
    }
    if (!ministry) throw new Error("Não foi possível estruturar o Ministério de Consolidação.");

    for (const definition of [
      { systemKey: "consolidacao" as const, name: "Consolidação", description: "Acompanhamento e integração de Pessoas." },
      { systemKey: "visitas" as const, name: "Visitas", description: "Planejamento e execução de visitas de cuidado." },
    ]) {
      const existing = await tx.select({ id: departments.id }).from(departments).where(and(eq(departments.churchId, churchId), eq(departments.ministryId, ministry.id), eq(departments.systemKey, definition.systemKey))).limit(1);
      if (existing.length === 0) await tx.insert(departments).values({ churchId, ministryId: ministry.id, name: definition.name, description: definition.description, systemKey: definition.systemKey, active: true });
    }

    const departmentRows = await tx.select().from(departments).where(and(eq(departments.churchId, churchId), eq(departments.ministryId, ministry.id), eq(departments.active, true))).orderBy(departments.name);
    return { ministry, departments: departmentRows };
  });
}

export async function getActiveDepartmentRoleKeysByPerson(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ roleKey: departmentRoleAssignments.roleKey }).from(departmentRoleAssignments).innerJoin(departments, eq(departments.id, departmentRoleAssignments.departmentId)).where(and(eq(departmentRoleAssignments.churchId, churchId), eq(departmentRoleAssignments.personId, personId), eq(departmentRoleAssignments.active, true), eq(departments.churchId, churchId), eq(departments.active, true)));
  return Array.from(new Set(rows.map((row) => row.roleKey)));
}

export async function getDepartmentMembers(departmentId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ membership: departmentMembers, person: people }).from(departmentMembers).innerJoin(departments, eq(departments.id, departmentMembers.departmentId)).innerJoin(people, eq(people.id, departmentMembers.personId)).where(and(eq(departmentMembers.departmentId, departmentId), eq(departmentMembers.churchId, churchId), eq(departmentMembers.active, true), eq(departments.churchId, churchId), eq(departments.active, true), eq(people.churchId, churchId))).orderBy(people.fullName);
}

export async function getDepartmentCandidates(departmentId: number, churchId: number) {
  const department = await getDepartmentById(departmentId, churchId);
  if (!department) return [];
  const [ministryMemberships, currentMembers] = await Promise.all([getMinistryMembers(department.ministryId, churchId), getDepartmentMembers(departmentId, churchId)]);
  const currentIds = new Set(currentMembers.map(({ person }) => person.id));
  return ministryMemberships.filter(({ person }) => !currentIds.has(person.id)).map(({ person }) => ({ id: person.id, fullName: person.fullName }));
}

export async function isActiveDepartmentMember(departmentId: number, personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: departmentMembers.id }).from(departmentMembers).innerJoin(departments, eq(departments.id, departmentMembers.departmentId)).where(and(eq(departmentMembers.departmentId, departmentId), eq(departmentMembers.personId, personId), eq(departmentMembers.churchId, churchId), eq(departmentMembers.active, true), eq(departments.churchId, churchId), eq(departments.active, true))).limit(1);
  return rows.length > 0;
}

export async function assignPersonToDepartment(data: { churchId: number; departmentId: number; personId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const departmentRows = await tx.select().from(departments).where(and(eq(departments.id, data.departmentId), eq(departments.churchId, data.churchId), eq(departments.active, true))).limit(1).for("update");
    const department = departmentRows[0];
    if (!department) throw new Error("Departamento não encontrado nesta igreja.");
    const eligible = await tx.select({ id: ministryMembers.id }).from(ministryMembers).innerJoin(people, eq(people.id, ministryMembers.personId)).where(and(eq(ministryMembers.ministryId, department.ministryId), eq(ministryMembers.personId, data.personId), eq(ministryMembers.active, true), eq(people.churchId, data.churchId), eq(people.active, true))).limit(1);
    if (eligible.length === 0) throw new Error("A Pessoa precisa participar do Ministério antes de entrar no Departamento.");
    const existing = await tx.select().from(departmentMembers).where(and(eq(departmentMembers.churchId, data.churchId), eq(departmentMembers.departmentId, data.departmentId), eq(departmentMembers.personId, data.personId), eq(departmentMembers.active, true))).limit(1);
    if (existing[0]) return existing[0];
    const result = await tx.insert(departmentMembers).values({ churchId: data.churchId, departmentId: data.departmentId, personId: data.personId, active: true });
    const membershipId = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
    const rows = await tx.select().from(departmentMembers).where(eq(departmentMembers.id, membershipId)).limit(1);
    return rows[0] ?? null;
  });
}

export async function removePersonFromDepartment(data: { churchId: number; departmentId: number; personId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const departmentRows = await tx.select().from(departments).where(and(eq(departments.id, data.departmentId), eq(departments.churchId, data.churchId), eq(departments.active, true))).limit(1).for("update");
    const department = departmentRows[0];
    if (!department) return false;
    if (department.leaderId === data.personId) throw new Error("Defina outro líder antes de remover a liderança do Departamento.");
    if (department.supervisorId === data.personId) throw new Error("Defina outro supervisor antes de remover a supervisão do Departamento.");
    const result = await tx.update(departmentMembers).set({ active: false, leftAt: new Date() }).where(and(eq(departmentMembers.churchId, data.churchId), eq(departmentMembers.departmentId, data.departmentId), eq(departmentMembers.personId, data.personId), eq(departmentMembers.active, true)));
    await tx.update(departmentRoleAssignments).set({ active: false, endedAt: new Date() }).where(and(eq(departmentRoleAssignments.churchId, data.churchId), eq(departmentRoleAssignments.departmentId, data.departmentId), eq(departmentRoleAssignments.personId, data.personId), eq(departmentRoleAssignments.active, true)));
    return Number((result[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0) > 0;
  });
}

export async function getDepartmentRoleAssignments(departmentId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departmentRoleAssignments).where(and(eq(departmentRoleAssignments.departmentId, departmentId), eq(departmentRoleAssignments.churchId, churchId), eq(departmentRoleAssignments.active, true))).orderBy(departmentRoleAssignments.roleKey);
}

export async function assignDepartmentRole(data: { churchId: number; departmentId: number; personId: number; roleKey: string; assignedByChurchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const department = await tx.select({ id: departments.id }).from(departments).where(and(eq(departments.id, data.departmentId), eq(departments.churchId, data.churchId), eq(departments.active, true))).limit(1).for("update");
    if (department.length === 0) throw new Error("Departamento não encontrado nesta igreja.");
    const member = await tx.select({ id: departmentMembers.id }).from(departmentMembers).where(and(eq(departmentMembers.churchId, data.churchId), eq(departmentMembers.departmentId, data.departmentId), eq(departmentMembers.personId, data.personId), eq(departmentMembers.active, true))).limit(1);
    if (member.length === 0) throw new Error("A função só pode ser atribuída a participante ativo do Departamento.");
    const existing = await tx.select().from(departmentRoleAssignments).where(and(eq(departmentRoleAssignments.churchId, data.churchId), eq(departmentRoleAssignments.departmentId, data.departmentId), eq(departmentRoleAssignments.personId, data.personId), eq(departmentRoleAssignments.roleKey, data.roleKey), eq(departmentRoleAssignments.active, true))).limit(1);
    if (existing[0]) return existing[0];
    const result = await tx.insert(departmentRoleAssignments).values({ ...data, active: true });
    const id = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
    const rows = await tx.select().from(departmentRoleAssignments).where(eq(departmentRoleAssignments.id, id)).limit(1);
    return rows[0] ?? null;
  });
}

export async function endDepartmentRole(data: { id: number; churchId: number; departmentId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.update(departmentRoleAssignments).set({ active: false, endedAt: new Date() }).where(and(eq(departmentRoleAssignments.id, data.id), eq(departmentRoleAssignments.churchId, data.churchId), eq(departmentRoleAssignments.departmentId, data.departmentId), eq(departmentRoleAssignments.active, true)));
  return Number((result[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0) > 0;
}

export async function getMinistryMembers(ministryId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ membership: ministryMembers, person: people })
    .from(ministryMembers)
    .innerJoin(ministries, eq(ministries.id, ministryMembers.ministryId))
    .innerJoin(people, eq(people.id, ministryMembers.personId))
    .where(and(eq(ministryMembers.ministryId, ministryId), eq(ministries.churchId, churchId), eq(ministryMembers.active, true)))
    .orderBy(people.fullName);
}

export async function getMinistryMemberCounts(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ ministryId: ministryMembers.ministryId, count: sql<number>`COUNT(*)` })
    .from(ministryMembers)
    .innerJoin(ministries, eq(ministries.id, ministryMembers.ministryId))
    .where(and(eq(ministries.churchId, churchId), eq(ministryMembers.active, true)))
    .groupBy(ministryMembers.ministryId);
}

export async function isActiveMinistryMember(ministryId: number, personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: ministryMembers.id })
    .from(ministryMembers)
    .innerJoin(ministries, eq(ministries.id, ministryMembers.ministryId))
    .innerJoin(people, eq(people.id, ministryMembers.personId))
    .where(
      and(
        eq(ministryMembers.ministryId, ministryId),
        eq(ministryMembers.personId, personId),
        eq(ministryMembers.active, true),
        eq(ministries.churchId, churchId),
        eq(people.churchId, churchId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Participar do Ministério de Consolidação libera a atuação de Consolidador.
 * O vínculo é derivado somente de registros ativos da mesma igreja; a ação de
 * aprovação da liderança e a assunção do cuidado continuam protegidas pelas
 * regras próprias da Consolidação.
 */
export async function isActiveConsolidationMinistryMember(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: ministryMembers.id })
    .from(ministryMembers)
    .innerJoin(ministries, eq(ministries.id, ministryMembers.ministryId))
    .innerJoin(people, eq(people.id, ministryMembers.personId))
    .where(and(
      eq(ministryMembers.personId, personId),
      eq(ministryMembers.active, true),
      or(eq(ministries.type, "consolidacao"), sql`LOWER(${ministries.name}) LIKE '%consolida%'`),
      eq(ministries.churchId, churchId),
      eq(ministries.active, true),
      eq(people.id, personId),
      eq(people.churchId, churchId),
      eq(people.active, true),
    ))
    .limit(1);
  return rows.length > 0;
}

/** Participantes ativos do Ministério de Visitas recebem a capacidade operacional de Visitador. */
export async function isActiveVisitsMinistryMember(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: ministryMembers.id })
    .from(ministryMembers)
    .innerJoin(ministries, eq(ministries.id, ministryMembers.ministryId))
    .innerJoin(people, eq(people.id, ministryMembers.personId))
    .where(and(
      eq(ministryMembers.personId, personId),
      eq(ministryMembers.active, true),
      or(eq(ministries.type, "visitas"), sql`(LOWER(${ministries.name}) LIKE '%visita%' AND LOWER(${ministries.name}) NOT LIKE '%consolida%')`),
      eq(ministries.churchId, churchId),
      eq(ministries.active, true),
      eq(people.id, personId),
      eq(people.churchId, churchId),
      eq(people.active, true),
    ))
    .limit(1);
  return rows.length > 0;
}

export async function getScheduleTimeConflicts(data: {
  churchId: number;
  personId: number;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  excludeScheduleItemId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(scheduleItems)
    .where(
      and(
        eq(scheduleItems.churchId, data.churchId),
        eq(scheduleItems.personId, data.personId),
        eq(scheduleItems.scheduledDate, new Date(`${data.scheduledDate}T12:00:00`))
      )
    );
  return rows.filter((item) =>
    item.id !== data.excludeScheduleItemId
    && item.status !== "cancelada"
    && Boolean(item.startTime && item.endTime && item.startTime < data.endTime && item.endTime > data.startTime)
  );
}

export async function getScheduleItemById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(scheduleItems)
    .where(and(eq(scheduleItems.id, id), eq(scheduleItems.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateScheduleItem(data: {
  id: number;
  churchId: number;
  ministryId: number;
  departmentId?: number | null;
  personId: number;
  scheduledDate: Date;
  startTime: string;
  endTime: string;
  role?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(scheduleItems)
    .set({
      ministryId: data.ministryId,
      departmentId: data.departmentId ?? null,
      personId: data.personId,
      scheduledDate: data.scheduledDate,
      startTime: data.startTime,
      endTime: data.endTime,
      role: data.role ?? null,
    })
    .where(and(eq(scheduleItems.id, data.id), eq(scheduleItems.churchId, data.churchId), eq(scheduleItems.status, "agendada")));
  return getScheduleItemById(data.id, data.churchId);
}

export async function cancelScheduleItem(data: {
  id: number;
  churchId: number;
  cancelledByChurchUserId: number;
  cancelReason?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(scheduleItems)
    .set({
      status: "cancelada",
      cancelledAt: new Date(),
      cancelledByChurchUserId: data.cancelledByChurchUserId,
      cancelReason: data.cancelReason ?? null,
    })
    .where(and(eq(scheduleItems.id, data.id), eq(scheduleItems.churchId, data.churchId), eq(scheduleItems.status, "agendada")));
  return getScheduleItemById(data.id, data.churchId);
}

export async function assignPersonToMinistry(data: { churchId: number; ministryId: number; personId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const locked = await tx.select({ id: ministries.id }).from(ministries).where(and(eq(ministries.id, data.ministryId), eq(ministries.churchId, data.churchId), eq(ministries.active, true))).limit(1).for("update");
    if (locked.length === 0) throw new Error("Ministério não encontrado nesta igreja.");
    const person = await tx.select({ id: people.id }).from(people).where(and(eq(people.id, data.personId), eq(people.churchId, data.churchId), eq(people.active, true))).limit(1);
    if (person.length === 0) throw new Error("Pessoa não encontrada nesta igreja.");
    const existing = await tx.select().from(ministryMembers).where(and(eq(ministryMembers.ministryId, data.ministryId), eq(ministryMembers.personId, data.personId), eq(ministryMembers.active, true))).limit(1);
    if (existing[0]) return existing[0];
    const result = await tx.insert(ministryMembers).values({ ministryId: data.ministryId, personId: data.personId, active: true });
    const membershipId = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
    if (!membershipId) throw new Error("Não foi possível vincular a Pessoa ao Ministério.");
    const rows = await tx.select().from(ministryMembers).where(and(eq(ministryMembers.id, membershipId), eq(ministryMembers.ministryId, data.ministryId))).limit(1);
    return rows[0] ?? null;
  });
}
export async function removePersonFromMinistry(data: { churchId: number; ministryId: number; personId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const ministry = await tx.select({ id: ministries.id }).from(ministries).where(and(eq(ministries.id, data.ministryId), eq(ministries.churchId, data.churchId))).limit(1).for("update");
    if (ministry.length === 0) throw new Error("Ministério não encontrado nesta igreja.");
    const result = await tx.update(ministryMembers).set({ active: false }).where(and(eq(ministryMembers.ministryId, data.ministryId), eq(ministryMembers.personId, data.personId), eq(ministryMembers.active, true)));
    await tx.update(ministryRoleAssignments).set({ active: false, endedAt: new Date() }).where(and(eq(ministryRoleAssignments.churchId, data.churchId), eq(ministryRoleAssignments.ministryId, data.ministryId), eq(ministryRoleAssignments.personId, data.personId), eq(ministryRoleAssignments.active, true)));
    return Number((result[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0) > 0;
  });
}

export async function getMinistryRoleAssignmentById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(ministryRoleAssignments)
    .where(and(eq(ministryRoleAssignments.id, id), eq(ministryRoleAssignments.churchId, churchId), eq(ministryRoleAssignments.active, true)))
    .limit(1);
  return rows[0] ?? null;
}
export async function getMinistryRoleAssignmentsByPerson(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ assignment: ministryRoleAssignments, ministry: ministries })
    .from(ministryRoleAssignments)
    .innerJoin(ministries, eq(ministries.id, ministryRoleAssignments.ministryId))
    .where(and(
      eq(ministryRoleAssignments.churchId, churchId),
      eq(ministryRoleAssignments.personId, personId),
      eq(ministryRoleAssignments.active, true),
      eq(ministries.churchId, churchId),
      eq(ministries.active, true)
    ))
    .orderBy(ministries.name, ministryRoleAssignments.roleKey);
}

export async function getActiveMinistryRoleKeysByPerson(personId: number, churchId: number) {
  const assignments = await getMinistryRoleAssignmentsByPerson(personId, churchId);
  return Array.from(new Set(assignments.map(({ assignment }) => assignment.roleKey)));
}

export async function assignMinistryRole(data: {
  churchId: number;
  ministryId: number;
  personId: number;
  roleKey: string;
  assignedByChurchUserId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select({ id: ministryRoleAssignments.id })
    .from(ministryRoleAssignments)
    .where(and(
      eq(ministryRoleAssignments.churchId, data.churchId),
      eq(ministryRoleAssignments.ministryId, data.ministryId),
      eq(ministryRoleAssignments.personId, data.personId),
      eq(ministryRoleAssignments.roleKey, data.roleKey),
      eq(ministryRoleAssignments.active, true)
    ))
    .limit(1);
  if (existing.length) return { id: existing[0].id, alreadyAssigned: true };
  const result = await db.insert(ministryRoleAssignments).values({ ...data, active: true });
  return { id: result[0].insertId, alreadyAssigned: false };
}

export async function deactivateMinistryRole(id: number, churchId: number, ministryId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(ministryRoleAssignments).set({ active: false, endedAt: new Date() })
    .where(and(eq(ministryRoleAssignments.id, id), eq(ministryRoleAssignments.churchId, churchId), eq(ministryRoleAssignments.ministryId, ministryId), eq(ministryRoleAssignments.active, true)));
}

export async function getMinistryRoleDefinitionsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ministryRoleDefinitions).where(eq(ministryRoleDefinitions.churchId, churchId)).orderBy(ministryRoleDefinitions.name);
}

export async function createMinistryRoleDefinition(data: {
  churchId: number;
  ministryId?: number | null;
  key: string;
  name: string;
  permissionPackage: "member" | "cell_leader" | "consolidator" | "visitor" | "treasurer" | "ministry_leader" | "communication_leader";
  createdByChurchUserId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(ministryRoleDefinitions).values({ ...data, ministryId: data.ministryId ?? null, createdByChurchUserId: data.createdByChurchUserId ?? null });
  const rows = await db.select().from(ministryRoleDefinitions).where(and(eq(ministryRoleDefinitions.churchId, data.churchId), eq(ministryRoleDefinitions.key, data.key))).limit(1);
  return rows[0] ?? null;
}

// ─── ANNOUNCEMENTS (MURAL) ────────────────────────────────────────────────────

export async function getAnnouncementsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(announcements)
    .where(eq(announcements.churchId, churchId))
    .orderBy(desc(announcements.pinned), desc(announcements.createdAt))
    .limit(50);
}

export async function getPublicDailyDevotionalByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const rows = await db.select({
    id: announcements.id,
    title: announcements.title,
    content: announcements.content,
    type: announcements.type,
    imageUrl: announcements.imageUrl,
    ctaLabel: announcements.ctaLabel,
    ctaHref: announcements.ctaHref,
    publishedAt: announcements.publishedAt,
    expiresAt: announcements.expiresAt,
  }).from(announcements).where(and(
    eq(announcements.churchId, churchId),
    eq(announcements.type, "devocional"),
    eq(announcements.publicVisible, true),
    or(eq(announcements.publicStatus, "publicado"), eq(announcements.publicStatus, "agendado")),
    or(isNull(announcements.publicStartsAt), lte(announcements.publicStartsAt, now)),
    or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now)),
  )).orderBy(desc(announcements.publishedAt)).limit(1);
  return rows[0] ?? null;
}

export async function getPublicAnnouncementsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select({
    id: announcements.id,
    title: announcements.title,
    content: announcements.content,
    type: announcements.type,
    imageUrl: announcements.imageUrl,
    pinned: announcements.pinned,
    ctaLabel: announcements.ctaLabel,
    ctaHref: announcements.ctaHref,
    publishedAt: announcements.publishedAt,
    expiresAt: announcements.expiresAt,
  }).from(announcements).where(and(
    eq(announcements.churchId, churchId),
    eq(announcements.publicVisible, true),
    or(eq(announcements.publicStatus, "publicado"), eq(announcements.publicStatus, "agendado")),
    or(isNull(announcements.publicStartsAt), lte(announcements.publicStartsAt, now)),
    or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now)),
  )).orderBy(desc(announcements.pinned), desc(announcements.publishedAt)).limit(6);
}

export async function updateAnnouncement(id: number, churchId: number, data: Partial<typeof announcements.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(announcements).set(data).where(and(eq(announcements.id, id), eq(announcements.churchId, churchId)));
  const rows = await db.select().from(announcements).where(and(eq(announcements.id, id), eq(announcements.churchId, churchId))).limit(1);
  return rows[0] ?? null;
}

export async function createAnnouncement(data: typeof announcements.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(announcements).values(data);
  const id = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
  if (!id) return result[0];
  const rows = await db.select().from(announcements).where(and(eq(announcements.id, id), eq(announcements.churchId, data.churchId))).limit(1);
  return rows[0] ?? result[0];
}

// ─── PRAYER REQUESTS ──────────────────────────────────────────────────────────

export async function getPrayerRequestsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(prayerRequests)
    .where(eq(prayerRequests.churchId, churchId))
    .orderBy(desc(prayerRequests.createdAt))
    .limit(50);
}

export async function getPrayerRequestsByPerson(churchId: number, personId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(prayerRequests)
    .where(and(eq(prayerRequests.churchId, churchId), eq(prayerRequests.personId, personId)))
    .orderBy(desc(prayerRequests.createdAt))
    .limit(50);
}

export async function createPrayerRequest(data: typeof prayerRequests.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(prayerRequests).values(data);
  return result[0];
}

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

export async function getDashboardStats(churchId: number) {
  const db = await getDb();
  if (!db) return null;

  const [totalMembers] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people)
    .where(and(eq(people.churchId, churchId), eq(people.active, true)));

  const [newSouls] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(souls)
    .where(and(eq(souls.churchId, churchId), eq(souls.status, "nova_alma")));

  const [consolidated] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(souls)
    .where(and(eq(souls.churchId, churchId), eq(souls.status, "consolidado")));

  const [baptized] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people)
    .where(
      and(
        eq(people.churchId, churchId),
        sql`${people.baptismDate} IS NOT NULL`
      )
    );

  const [totalCells] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(cells)
    .where(and(eq(cells.churchId, churchId), eq(cells.active, true)));

  const [totalLeaders] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(churchMembers)
    .where(
      and(
        eq(churchMembers.churchId, churchId),
        eq(churchMembers.active, true),
        or(
          eq(churchMembers.role, "lider"),
          eq(churchMembers.role, "supervisor"),
          eq(churchMembers.role, "pastor_local"),
          eq(churchMembers.role, "pastor_presidente")
        ) as any
      )
    );

  const [totalMinistries] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ministries)
    .where(and(eq(ministries.churchId, churchId), eq(ministries.active, true)));

  return {
    totalMembers: Number(totalMembers?.count ?? 0),
    newSouls: Number(newSouls?.count ?? 0),
    consolidated: Number(consolidated?.count ?? 0),
    baptized: Number(baptized?.count ?? 0),
    totalCells: Number(totalCells?.count ?? 0),
    totalLeaders: Number(totalLeaders?.count ?? 0),
    totalMinistries: Number(totalMinistries?.count ?? 0),
  };
}

// ─── RADAR ESPIRITUAL ─────────────────────────────────────────────────────────

export async function getRadarEspiritual(churchId: number) {
  const db = await getDb();
  if (!db) return null;

  // Pessoas sem célula
  const semCelula = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people)
    .where(
      and(
        eq(people.churchId, churchId),
        eq(people.active, true),
        sql`${people.id} NOT IN (SELECT personId FROM cell_members WHERE active = true)`
      )
    );

  // Pessoas sem discipulador
  const semDiscipulador = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people)
    .where(
      and(
        eq(people.churchId, churchId),
        eq(people.active, true),
        isNull(people.discipledById)
      )
    );

  // Pessoas sem consolidação (novas almas sem consolidador)
  const semConsolidacao = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(souls)
    .where(
      and(
        eq(souls.churchId, churchId),
        eq(souls.status, "nova_alma"),
        sql`${souls.id} NOT IN (SELECT soulId FROM consolidations)`
      )
    );

  // Pessoas sem curso
  const semCurso = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people)
    .where(
      and(
        eq(people.churchId, churchId),
        eq(people.active, true),
        sql`${people.id} NOT IN (SELECT personId FROM course_enrollments)`
      )
    );

  return {
    semCelula: Number(semCelula[0]?.count ?? 0),
    semDiscipulador: Number(semDiscipulador[0]?.count ?? 0),
    semConsolidacao: Number(semConsolidacao[0]?.count ?? 0),
    semCurso: Number(semCurso[0]?.count ?? 0),
  };
}

// ─── DISCIPLESHIP FUNNEL ──────────────────────────────────────────────────────

export async function getDiscipleshipFunnel(churchId: number) {
  const db = await getDb();
  if (!db) return [];

  const stages = [
    "nova_alma",
    "consolidacao",
    "fundamentos",
    "celula",
    "batismo",
    "encontro_com_deus",
    "escola_de_lideres",
    "lideranca",
    "multiplicador",
  ] as const;

  const results = await Promise.all(
    stages.map(async (stage) => {
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(people)
        .where(
          and(
            eq(people.churchId, churchId),
            eq(people.active, true),
            eq(people.discipleshipStage, stage)
          )
        );
      return { stage, count: Number(row?.count ?? 0) };
    })
  );

  return results;
}

// ─── DISCIPLESHIP TREE ────────────────────────────────────────────────────────

export async function getDiscipleshipTree(churchId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: people.id,
      fullName: people.fullName,
      photoUrl: people.photoUrl,
      discipleshipStage: people.discipleshipStage,
      wonById: people.wonById,
      discipledById: people.discipledById,
    })
    .from(people)
    .where(and(eq(people.churchId, churchId), eq(people.active, true)))
    .orderBy(people.fullName)
    .limit(200);
}

// ─── FAMILIES ─────────────────────────────────────────────────────────────────
export async function getFamiliesByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(families)
    .where(eq(families.churchId, churchId))
    .limit(200);
  return rows.map((f) => ({
    id: f.id,
    name: f.familyName,
    fatherName: null as string | null,
    motherName: null as string | null,
    childrenCount: 0,
    memberCount: 0,
    phone: null as string | null,
    address: null as string | null,
    notes: f.notes,
  }));
}

export async function createFamily(input: { churchId: number; name: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(families).values({
    churchId: input.churchId,
    familyName: input.name,
  });
  return { success: true };
}

// ─── SUPER ADMIN ──────────────────────────────────────────────────────────────

export async function getAllChurchesAdmin() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: churches.id,
      name: churches.name,
      slug: churches.slug,
      city: churches.city,
      state: churches.state,
      email: churches.email,
      phone: churches.phone,
      active: churches.active,
      createdAt: churches.createdAt,
    })
    .from(churches)
    .orderBy(churches.createdAt);
  return rows;
}

export async function getGlobalStats() {
  const db = await getDb();
  if (!db) return { totalChurches: 0, totalMembers: 0, totalCells: 0, totalSouls: 0 };
  const [churchCount] = await db.select({ count: sql<number>`count(*)` }).from(churches);
  const [memberCount] = await db.select({ count: sql<number>`count(*)` }).from(people);
  const [cellCount] = await db.select({ count: sql<number>`count(*)` }).from(cells);
  const [soulCount] = await db.select({ count: sql<number>`count(*)` }).from(souls);
  return {
    totalChurches: Number(churchCount?.count ?? 0),
    totalMembers: Number(memberCount?.count ?? 0),
    totalCells: Number(cellCount?.count ?? 0),
    totalSouls: Number(soulCount?.count ?? 0),
  };
}

// ─── VISITOR LEADS ────────────────────────────────────────────────────────────

export async function createVisitorLead(input: {
  churchId: number;
  name: string;
  phone?: string;
  email?: string;
  type: "pedido_oracao" | "visita_pastoral" | "primeira_visita" | "interesse_participar";
  message?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(visitorLeads).values({
    churchId: input.churchId,
    name: input.name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    type: input.type,
    message: input.message ?? null,
  });
  return { success: true };
}

export async function getVisitorLeadsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visitorLeads).where(eq(visitorLeads.churchId, churchId)).orderBy(visitorLeads.createdAt);
}

// ─── CHURCH REGISTRATION ──────────────────────────────────────────────────────

export async function createChurchRegistration(churchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(churchRegistrations).values({ churchId });
  return { success: true };
}

export async function getPendingRegistrations() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: churchRegistrations.id,
      churchId: churchRegistrations.churchId,
      status: churchRegistrations.status,
      submittedAt: churchRegistrations.submittedAt,
      churchName: churches.name,
      churchSlug: churches.slug,
      email: churches.email,
    })
    .from(churchRegistrations)
    .innerJoin(churches, eq(churches.id, churchRegistrations.churchId))
    .where(eq(churchRegistrations.status, "pending"))
    .orderBy(churchRegistrations.submittedAt);
}

export async function updateChurchRegistration(id: number, status: "approved" | "rejected" | "suspended", reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const registration = await db
    .select({ churchId: churchRegistrations.churchId })
    .from(churchRegistrations)
    .where(eq(churchRegistrations.id, id))
    .limit(1);
  if (!registration[0]) throw new Error("Cadastro de igreja não encontrado");

  await db.update(churchRegistrations).set({
    status,
    reviewedAt: new Date(),
    rejectionReason: status === "rejected" ? (reason ?? null) : null,
    suspensionReason: status === "suspended" ? (reason ?? null) : null,
  }).where(eq(churchRegistrations.id, id));
  await db
    .update(churches)
    .set({ active: status === "approved" })
    .where(eq(churches.id, registration[0].churchId));
  return { success: true };
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

export async function getOnboardingProgress(churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(onboardingProgress)
    .where(eq(onboardingProgress.churchId, churchId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertOnboardingProgress(data: {
  churchId: number;
  stepWelcome?: boolean;
  stepImportMembers?: boolean;
  stepCreateCell?: boolean;
  stepInviteLeaders?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getOnboardingProgress(data.churchId);
  const update: Record<string, unknown> = {};
  if (data.stepWelcome !== undefined) update.stepWelcome = data.stepWelcome;
  if (data.stepImportMembers !== undefined) update.stepImportMembers = data.stepImportMembers;
  if (data.stepCreateCell !== undefined) update.stepCreateCell = data.stepCreateCell;
  if (data.stepInviteLeaders !== undefined) update.stepInviteLeaders = data.stepInviteLeaders;

  if (existing) {
    // Check if all steps completed
    const merged = { ...existing, ...update };
    if (merged.stepWelcome && merged.stepImportMembers && merged.stepCreateCell && merged.stepInviteLeaders) {
      update.completedAt = new Date();
    }
    await db.update(onboardingProgress).set(update).where(eq(onboardingProgress.id, existing.id));
    return { ...existing, ...update };
  } else {
    const vals = { churchId: data.churchId, ...update };
    await db.insert(onboardingProgress).values(vals as typeof onboardingProgress.$inferInsert);
    return vals;
  }
}

export async function importPeopleFromCSV(
  churchId: number,
  rows: { fullName: string; email?: string; phone?: string; birthDate?: string }[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let imported = 0;
  for (const row of rows) {
    if (!row.fullName?.trim()) continue;
    await db.insert(people).values({
      churchId,
      fullName: row.fullName.trim(),
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      birthDate: row.birthDate ? new Date(row.birthDate) : null,
      status: "membro",
    } as typeof people.$inferInsert);
    imported++;
  }
  return imported;
}

// ─── ESCOLA DE FUNDAMENTOS ────────────────────────────────────────────────────

export async function getCoursesByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).where(eq(courses.churchId, churchId));
}

export async function createCourse(data: {
  churchId: number;
  name: string;
  type: "salvacao" | "oracao" | "biblia" | "igreja" | "espirito_santo" | "batismo" | "outro";
  description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(courses).values({
    churchId: data.churchId,
    name: data.name.trim(),
    type: data.type,
    description: data.description?.trim() || null,
    active: true,
  });
  return { id: result.insertId };
}

export async function getCourseEnrollments(courseId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    enrollment: courseEnrollments,
    person: { id: people.id, fullName: people.fullName, phone: people.phone },
  })
  .from(courseEnrollments)
  .innerJoin(people, eq(courseEnrollments.personId, people.id))
  .where(and(eq(courseEnrollments.courseId, courseId), eq(people.churchId, churchId)));
}

export async function getCourseEnrollmentById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ enrollment: courseEnrollments })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .innerJoin(people, eq(courseEnrollments.personId, people.id))
    .where(and(eq(courseEnrollments.id, id), eq(courses.churchId, churchId), eq(people.churchId, churchId)))
    .limit(1);
  return rows[0]?.enrollment ?? null;
}

export async function enrollInCourse(data: { courseId: number; personId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(courseEnrollments).values({
    courseId: data.courseId,
    personId: data.personId,
    status: "matriculado",
  } as typeof courseEnrollments.$inferInsert);
}

export async function updateCourseEnrollment(id: number, data: { status?: string; completedAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const update: Record<string, unknown> = {};
  if (data.status !== undefined) update.status = data.status;
  if (data.completedAt !== undefined) update.completedAt = data.completedAt;
  await db.update(courseEnrollments).set(update).where(eq(courseEnrollments.id, id));
}

export async function getFoundationStudiesByCourse(churchId: number, courseId: number, includeInactive = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(foundationStudies.churchId, churchId), eq(foundationStudies.courseId, courseId)];
  if (!includeInactive) conditions.push(eq(foundationStudies.active, true));
  return db
    .select()
    .from(foundationStudies)
    .where(and(...conditions))
    .orderBy(foundationStudies.position, foundationStudies.id);
}

export async function getFoundationModulesByCourse(churchId: number, courseId: number, includeInactive = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(foundationModules.churchId, churchId), eq(foundationModules.courseId, courseId)];
  if (!includeInactive) conditions.push(eq(foundationModules.active, true));
  return db.select().from(foundationModules).where(and(...conditions)).orderBy(foundationModules.position, foundationModules.id);
}

export async function getFoundationModuleById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(foundationModules)
    .where(and(eq(foundationModules.id, id), eq(foundationModules.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createFoundationModule(data: { churchId: number; courseId: number; title: string; description?: string | null; position: number; createdByChurchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(foundationModules).values({
    ...data,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    active: true,
  });
  return { id: result.insertId };
}

export async function updateFoundationModule(data: { id: number; churchId: number; title?: string; description?: string | null; position?: number; active?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title.trim();
  if (data.description !== undefined) update.description = data.description?.trim() || null;
  if (data.position !== undefined) update.position = data.position;
  if (data.active !== undefined) update.active = data.active;
  if (Object.keys(update).length === 0) return;
  await db.update(foundationModules).set(update).where(and(eq(foundationModules.id, data.id), eq(foundationModules.churchId, data.churchId)));
}

export async function getFoundationStudyById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(foundationStudies)
    .where(and(eq(foundationStudies.id, id), eq(foundationStudies.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createFoundationStudy(data: {
  churchId: number;
  courseId: number;
  moduleId?: number | null;
  title: string;
  summary?: string | null;
  content?: string | null;
  position: number;
  createdByChurchUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(foundationStudies).values({
    ...data,
    title: data.title.trim(),
    summary: data.summary?.trim() || null,
    content: data.content?.trim() || null,
    active: true,
  });
  return { id: result.insertId };
}

export async function updateFoundationStudy(data: {
  id: number;
  churchId: number;
  moduleId?: number | null;
  title?: string;
  summary?: string | null;
  content?: string | null;
  position?: number;
  active?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title.trim();
  if (data.moduleId !== undefined) update.moduleId = data.moduleId;
  if (data.summary !== undefined) update.summary = data.summary?.trim() || null;
  if (data.content !== undefined) update.content = data.content?.trim() || null;
  if (data.position !== undefined) update.position = data.position;
  if (data.active !== undefined) update.active = data.active;
  if (Object.keys(update).length === 0) return;
  await db.update(foundationStudies).set(update).where(and(eq(foundationStudies.id, data.id), eq(foundationStudies.churchId, data.churchId)));
}

export async function getLibraryItemById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(libraryItems)
    .where(and(eq(libraryItems.id, id), eq(libraryItems.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFoundationStudyMaterials(churchId: number, studyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: foundationStudyMaterials.id,
    studyId: foundationStudyMaterials.studyId,
    libraryItemId: foundationStudyMaterials.libraryItemId,
    position: foundationStudyMaterials.position,
    title: libraryItems.title,
    type: libraryItems.type,
    fileUrl: libraryItems.fileUrl,
    thumbnailUrl: libraryItems.thumbnailUrl,
    description: libraryItems.description,
  })
    .from(foundationStudyMaterials)
    .innerJoin(libraryItems, and(
      eq(foundationStudyMaterials.libraryItemId, libraryItems.id),
      eq(foundationStudyMaterials.churchId, libraryItems.churchId),
    ))
    .where(and(eq(foundationStudyMaterials.churchId, churchId), eq(foundationStudyMaterials.studyId, studyId)))
    .orderBy(foundationStudyMaterials.position, foundationStudyMaterials.id);
}

export async function attachFoundationStudyMaterial(data: { churchId: number; studyId: number; libraryItemId: number; position: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(foundationStudyMaterials).values(data).onDuplicateKeyUpdate({ set: { position: data.position } });
}

export async function updateFoundationStudyMaterialPosition(data: { id: number; churchId: number; studyId: number; position: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(foundationStudyMaterials).set({ position: data.position })
    .where(and(
      eq(foundationStudyMaterials.id, data.id),
      eq(foundationStudyMaterials.churchId, data.churchId),
      eq(foundationStudyMaterials.studyId, data.studyId),
    ));
}

export async function detachFoundationStudyMaterial(data: { id: number; churchId: number; studyId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(foundationStudyMaterials).where(and(
    eq(foundationStudyMaterials.id, data.id),
    eq(foundationStudyMaterials.churchId, data.churchId),
    eq(foundationStudyMaterials.studyId, data.studyId),
  ));
}

export async function getFoundationStudyAdministrators(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: foundationStudyAdministrators.id,
      churchUserId: foundationStudyAdministrators.churchUserId,
      assignedByChurchUserId: foundationStudyAdministrators.assignedByChurchUserId,
      createdAt: foundationStudyAdministrators.createdAt,
      name: churchUsers.name,
      email: churchUsers.email,
      role: churchUsers.role,
      active: churchUsers.active,
    })
    .from(foundationStudyAdministrators)
    .innerJoin(churchUsers, eq(foundationStudyAdministrators.churchUserId, churchUsers.id))
    .where(and(eq(foundationStudyAdministrators.churchId, churchId), eq(churchUsers.churchId, churchId)))
    .orderBy(churchUsers.name);
}

export async function isFoundationStudyAdministrator(churchId: number, churchUserId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: foundationStudyAdministrators.id })
    .from(foundationStudyAdministrators)
    .innerJoin(churchUsers, eq(foundationStudyAdministrators.churchUserId, churchUsers.id))
    .where(and(
      eq(foundationStudyAdministrators.churchId, churchId),
      eq(foundationStudyAdministrators.churchUserId, churchUserId),
      eq(churchUsers.churchId, churchId),
      eq(churchUsers.active, true),
    ))
    .limit(1);
  return Boolean(rows[0]);
}

export async function assignFoundationStudyAdministrator(data: { churchId: number; churchUserId: number; assignedByChurchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(foundationStudyAdministrators).values(data).onDuplicateKeyUpdate({
    set: { assignedByChurchUserId: data.assignedByChurchUserId },
  });
}

export async function removeFoundationStudyAdministrator(churchId: number, churchUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(foundationStudyAdministrators)
    .where(and(eq(foundationStudyAdministrators.churchId, churchId), eq(foundationStudyAdministrators.churchUserId, churchUserId)));
}

// ─── BATISMO ──────────────────────────────────────────────────────────────────

export async function getBaptismClassesByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(baptismClasses).where(eq(baptismClasses.churchId, churchId));
}

export async function getBaptismEnrollments(classId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    enrollment: baptismEnrollments,
    person: { id: people.id, fullName: people.fullName, phone: people.phone },
  })
  .from(baptismEnrollments)
  .innerJoin(people, eq(baptismEnrollments.personId, people.id))
  .where(and(eq(baptismEnrollments.baptismClassId, classId), eq(baptismEnrollments.churchId, churchId)));
}

export async function createBaptismClass(data: {
  churchId: number; name: string; date: string; location?: string; pastor?: string; notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(baptismClasses).values(data as unknown as typeof baptismClasses.$inferInsert);
}

export async function enrollInBaptism(data: { baptismClassId: number; personId: number; churchId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(baptismEnrollments).values({ ...data, status: "inscrito" } as typeof baptismEnrollments.$inferInsert);
}

export async function updateBaptismEnrollment(id: number, churchId: number, data: { status?: string; completedAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const update: Record<string, unknown> = {};
  if (data.status !== undefined) update.status = data.status;
  if (data.completedAt !== undefined) update.completedAt = data.completedAt;
  await db.update(baptismEnrollments).set(update).where(and(eq(baptismEnrollments.id, id), eq(baptismEnrollments.churchId, churchId)));
}

// ─── ENCONTRO COM DEUS ────────────────────────────────────────────────────────

export type EncounterEventStatus = "rascunho" | "planejamento" | "confirmado" | "em_andamento" | "encerrado" | "cancelado";
export type EncounterEnrollmentStatus = "inscrito" | "confirmado" | "participou" | "concluiu" | "cancelado";
export type EncounterReviewStatus = "recebida" | "em_analise" | "confirmada" | "precisa_correcao" | "rejeitada";

const DEFAULT_ENCOUNTER_TEAMS = [
  { name: "Supervisor Espiritual", category: "lideranca" as const, requiredCount: 1, sortOrder: 0 },
  { name: "Coordenador", category: "lideranca" as const, requiredCount: 1, sortOrder: 1 },
  { name: "Intercessores", category: "espiritual" as const, requiredCount: null, sortOrder: 10 },
  { name: "Stand-by", category: "apoio" as const, requiredCount: null, sortOrder: 20 },
  { name: "Cozinha", category: "operacional" as const, requiredCount: null, sortOrder: 30 },
  { name: "Limpeza", category: "operacional" as const, requiredCount: null, sortOrder: 40 },
  { name: "Correios", category: "operacional" as const, requiredCount: null, sortOrder: 50 },
] as const;

function insertIdOf(result: unknown) {
  return Number(((result as [{ insertId?: number }] | undefined)?.[0] as { insertId?: number } | undefined)?.insertId ?? 0);
}

export async function getEncounterEventsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(encounterEvents)
    .where(eq(encounterEvents.churchId, churchId))
    .orderBy(desc(encounterEvents.date), desc(encounterEvents.id));
}

export async function getEncounterManagedEventIds(churchId: number, personId: number) {
  const db = await getDb();
  if (!db) return [];
  const [responsibleEvents, assignmentEvents] = await Promise.all([
    db.select({ eventId: encounterEvents.id }).from(encounterEvents)
      .where(and(eq(encounterEvents.churchId, churchId), eq(encounterEvents.responsiblePersonId, personId), eq(encounterEvents.active, true))),
    db.select({ eventId: encounterServantAssignments.encounterEventId }).from(encounterServantAssignments)
      .where(and(eq(encounterServantAssignments.churchId, churchId), eq(encounterServantAssignments.personId, personId), eq(encounterServantAssignments.assignmentType, "responsavel"), eq(encounterServantAssignments.active, true))),
  ]);
  return Array.from(new Set([...responsibleEvents, ...assignmentEvents].map((item) => item.eventId)));
}

export async function getEncounterEventById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(encounterEvents)
    .where(and(eq(encounterEvents.id, id), eq(encounterEvents.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getEncounterOverview(eventId: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const event = await getEncounterEventById(eventId, churchId);
  if (!event) return null;
  const [enrollments, confirmed, completed, teams, servants, pendingItems] = await Promise.all([
    db.select({ value: count() }).from(encounterEnrollments).where(and(eq(encounterEnrollments.churchId, churchId), eq(encounterEnrollments.encounterEventId, eventId), ne(encounterEnrollments.status, "cancelado"))),
    db.select({ value: count() }).from(encounterEnrollments).where(and(eq(encounterEnrollments.churchId, churchId), eq(encounterEnrollments.encounterEventId, eventId), eq(encounterEnrollments.status, "confirmado"))),
    db.select({ value: count() }).from(encounterEnrollments).where(and(eq(encounterEnrollments.churchId, churchId), eq(encounterEnrollments.encounterEventId, eventId), eq(encounterEnrollments.status, "concluiu"))),
    db.select({ value: count() }).from(encounterTeams).where(and(eq(encounterTeams.churchId, churchId), eq(encounterTeams.encounterEventId, eventId), eq(encounterTeams.active, true))),
    db.select({ value: count() }).from(encounterServantAssignments).where(and(eq(encounterServantAssignments.churchId, churchId), eq(encounterServantAssignments.encounterEventId, eventId), eq(encounterServantAssignments.active, true))),
    db.select({ value: count() }).from(encounterChecklistItems).where(and(eq(encounterChecklistItems.churchId, churchId), eq(encounterChecklistItems.encounterEventId, eventId), or(eq(encounterChecklistItems.status, "pendente"), eq(encounterChecklistItems.status, "em_andamento")))),
  ]);
  return {
    event,
    summary: {
      enrollmentCount: Number(enrollments[0]?.value ?? 0),
      confirmedCount: Number(confirmed[0]?.value ?? 0),
      completedCount: Number(completed[0]?.value ?? 0),
      teamCount: Number(teams[0]?.value ?? 0),
      servantCount: Number(servants[0]?.value ?? 0),
      pendingChecklistCount: Number(pendingItems[0]?.value ?? 0),
    },
  };
}

export async function createEncounterEvent(data: {
  churchId: number;
  name: string;
  date: string;
  endDate?: string | null;
  location?: string | null;
  maxParticipants?: number | null;
  description?: string | null;
  status?: EncounterEventStatus;
  responsiblePersonId?: number | null;
  generalNotes?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const result = await tx.insert(encounterEvents).values({
      ...data,
      endDate: data.endDate ?? null,
      location: data.location ?? null,
      maxParticipants: data.maxParticipants ?? null,
      description: data.description ?? null,
      status: data.status ?? "planejamento",
      responsiblePersonId: data.responsiblePersonId ?? null,
      generalNotes: data.generalNotes ?? null,
    } as unknown as typeof encounterEvents.$inferInsert);
    const eventId = insertIdOf(result);
    if (!eventId) throw new Error("Falha ao criar Encontro com Deus");

    let coordinatorTeamId: number | null = null;
    for (const team of DEFAULT_ENCOUNTER_TEAMS) {
      const teamResult = await tx.insert(encounterTeams).values({
        churchId: data.churchId,
        encounterEventId: eventId,
        parentTeamId: team.category === "lideranca" ? null : coordinatorTeamId,
        name: team.name,
        category: team.category,
        source: "padrao",
        requiredCount: team.requiredCount,
        sortOrder: team.sortOrder,
        active: true,
      });
      if (team.name === "Coordenador") coordinatorTeamId = insertIdOf(teamResult);
    }

    await tx.insert(encounterHistory).values({
      churchId: data.churchId,
      encounterEventId: eventId,
      actorPersonId: data.responsiblePersonId ?? null,
      action: "encontro_criado",
      entityType: "encontro",
      entityId: eventId,
      details: { name: data.name, status: data.status ?? "planejamento" },
    });
    return { id: eventId };
  });
}

export async function updateEncounterEvent(id: number, churchId: number, data: Partial<{
  name: string;
  date: string;
  endDate: string | null;
  location: string | null;
  maxParticipants: number | null;
  description: string | null;
  status: EncounterEventStatus;
  responsiblePersonId: number | null;
  generalNotes: string | null;
  active: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(encounterEvents).set(data as unknown as Partial<typeof encounterEvents.$inferInsert>).where(and(eq(encounterEvents.id, id), eq(encounterEvents.churchId, churchId)));
  return getEncounterEventById(id, churchId);
}

export async function getEncounterEnrollments(eventId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    enrollment: encounterEnrollments,
    person: { id: people.id, fullName: people.fullName, phone: people.phone, whatsapp: people.whatsapp },
    form: encounterDiscipleForms,
  })
    .from(encounterEnrollments)
    .innerJoin(people, and(eq(encounterEnrollments.personId, people.id), eq(people.churchId, churchId)))
    .leftJoin(encounterDiscipleForms, and(eq(encounterDiscipleForms.encounterEnrollmentId, encounterEnrollments.id), eq(encounterDiscipleForms.churchId, churchId)))
    .where(and(eq(encounterEnrollments.encounterEventId, eventId), eq(encounterEnrollments.churchId, churchId)))
    .orderBy(people.fullName);
}

export async function getEncounterEnrollmentById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(encounterEnrollments)
    .where(and(eq(encounterEnrollments.id, id), eq(encounterEnrollments.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function enrollInEncounter(data: { encounterEventId: number; personId: number; churchId: number; source?: "manual" | "public_form"; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const eventRows = await tx.select().from(encounterEvents)
      .where(and(eq(encounterEvents.id, data.encounterEventId), eq(encounterEvents.churchId, data.churchId), eq(encounterEvents.active, true)))
      .limit(1);
    const event = eventRows[0];
    if (!event || event.status === "cancelado" || event.status === "encerrado") throw new Error("ENCOUNTER_UNAVAILABLE");

    const personRows = await tx.select({ id: people.id }).from(people)
      .where(and(eq(people.id, data.personId), eq(people.churchId, data.churchId), eq(people.active, true)))
      .limit(1);
    if (!personRows[0]) throw new Error("PERSON_NOT_FOUND");

    const existing = await tx.select().from(encounterEnrollments)
      .where(and(eq(encounterEnrollments.churchId, data.churchId), eq(encounterEnrollments.encounterEventId, data.encounterEventId), eq(encounterEnrollments.personId, data.personId)))
      .limit(1);
    if (existing[0]) throw new Error("ENCOUNTER_DUPLICATE_ENROLLMENT");

    if (event.maxParticipants) {
      const totals = await tx.select({ value: count() }).from(encounterEnrollments)
        .where(and(eq(encounterEnrollments.churchId, data.churchId), eq(encounterEnrollments.encounterEventId, data.encounterEventId), ne(encounterEnrollments.status, "cancelado")));
      if (Number(totals[0]?.value ?? 0) >= event.maxParticipants) throw new Error("ENCOUNTER_CAPACITY_REACHED");
    }

    const result = await tx.insert(encounterEnrollments).values({
      churchId: data.churchId,
      encounterEventId: data.encounterEventId,
      personId: data.personId,
      status: "inscrito",
      source: data.source ?? "manual",
      notes: data.notes ?? null,
    });
    const enrollmentId = insertIdOf(result);
    await tx.insert(encounterHistory).values({
      churchId: data.churchId,
      encounterEventId: data.encounterEventId,
      action: "discipulo_inscrito",
      entityType: "discipulo",
      entityId: enrollmentId,
      details: { personId: data.personId, source: data.source ?? "manual" },
    });
    return { id: enrollmentId };
  });
}

export async function updateEncounterEnrollment(id: number, churchId: number, data: { status?: EncounterEnrollmentStatus; notes?: string | null; completedAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getEncounterEnrollmentById(id, churchId);
  if (!current) return null;
  const update: Partial<typeof encounterEnrollments.$inferInsert> = {};
  if (data.status !== undefined) {
    update.status = data.status;
    if (data.status === "confirmado") update.confirmedAt = new Date();
    if (data.status === "concluiu") update.completedAt = new Date();
    if (data.status === "cancelado") update.cancelledAt = new Date();
  }
  if (data.completedAt !== undefined) update.completedAt = data.completedAt;
  if (data.notes !== undefined) update.notes = data.notes;
  await db.update(encounterEnrollments).set(update).where(and(eq(encounterEnrollments.id, id), eq(encounterEnrollments.churchId, churchId)));
  await db.insert(encounterHistory).values({
    churchId,
    encounterEventId: current.encounterEventId,
    action: data.status ? `discipulo_${data.status}` : "discipulo_atualizado",
    entityType: "discipulo",
    entityId: id,
    details: { previousStatus: current.status, status: data.status ?? current.status },
  });
  return getEncounterEnrollmentById(id, churchId);
}

export async function getEncounterPublicFormByToken(publicToken: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({
    publicForm: encounterPublicForms,
    event: encounterEvents,
    church: {
      id: churches.id,
      name: churches.name,
      slug: churches.slug,
      logoUrl: churches.logoUrl,
      primaryColor: churches.primaryColor,
      secondaryColor: churches.secondaryColor,
    },
  })
    .from(encounterPublicForms)
    .innerJoin(encounterEvents, and(eq(encounterEvents.id, encounterPublicForms.encounterEventId), eq(encounterEvents.churchId, encounterPublicForms.churchId)))
    .innerJoin(churches, eq(churches.id, encounterPublicForms.churchId))
    .where(and(
      eq(encounterPublicForms.publicToken, publicToken),
      eq(encounterPublicForms.active, true),
      isNull(encounterPublicForms.revokedAt),
      or(isNull(encounterPublicForms.expiresAt), gt(encounterPublicForms.expiresAt, new Date())),
      eq(encounterEvents.active, true),
      ne(encounterEvents.status, "cancelado"),
      ne(encounterEvents.status, "encerrado"),
      eq(churches.active, true),
    ))
    .limit(1);
  return rows[0] ?? null;
}

export async function getEncounterPublicFormByEvent(eventId: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(encounterPublicForms)
    .where(and(eq(encounterPublicForms.churchId, churchId), eq(encounterPublicForms.encounterEventId, eventId), isNull(encounterPublicForms.revokedAt)))
    .orderBy(desc(encounterPublicForms.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function rotateEncounterPublicForm(data: { churchId: number; encounterEventId: number; publicToken: string; createdByPersonId?: number | null; expiresAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    await tx.update(encounterPublicForms).set({ active: false, revokedAt: new Date() })
      .where(and(eq(encounterPublicForms.churchId, data.churchId), eq(encounterPublicForms.encounterEventId, data.encounterEventId), eq(encounterPublicForms.active, true)));
    const result = await tx.insert(encounterPublicForms).values({
      churchId: data.churchId,
      encounterEventId: data.encounterEventId,
      publicToken: data.publicToken,
      active: true,
      expiresAt: data.expiresAt ?? null,
      createdByPersonId: data.createdByPersonId ?? null,
    });
    const id = insertIdOf(result);
    await tx.insert(encounterHistory).values({
      churchId: data.churchId,
      encounterEventId: data.encounterEventId,
      actorPersonId: data.createdByPersonId ?? null,
      action: "link_publico_renovado",
      entityType: "link_publico",
      entityId: id,
    });
    return { id, publicToken: data.publicToken };
  });
}

export async function setEncounterPublicFormActive(data: { churchId: number; encounterEventId: number; active: boolean; actorPersonId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(encounterPublicForms).set({ active: data.active })
    .where(and(eq(encounterPublicForms.churchId, data.churchId), eq(encounterPublicForms.encounterEventId, data.encounterEventId), isNull(encounterPublicForms.revokedAt)));
  await db.insert(encounterHistory).values({
    churchId: data.churchId,
    encounterEventId: data.encounterEventId,
    actorPersonId: data.actorPersonId ?? null,
    action: data.active ? "link_publico_ativado" : "link_publico_pausado",
    entityType: "link_publico",
    details: { active: data.active },
  });
}

export async function submitEncounterDiscipleForm(data: {
  publicToken: string;
  fullName: string;
  age: number;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  friendName: string;
  friendPhone: string;
  attendingChurch: string;
  invitedByName: string;
  consentAccepted: true;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalizedPhone = data.phone.replace(/\D/g, "");
  const normalizedName = data.fullName.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  return db.transaction(async (tx) => {
    const resolvedRows = await tx.select({ publicForm: encounterPublicForms, event: encounterEvents })
      .from(encounterPublicForms)
      .innerJoin(encounterEvents, and(eq(encounterEvents.id, encounterPublicForms.encounterEventId), eq(encounterEvents.churchId, encounterPublicForms.churchId)))
      .where(and(
        eq(encounterPublicForms.publicToken, data.publicToken),
        eq(encounterPublicForms.active, true),
        isNull(encounterPublicForms.revokedAt),
        or(isNull(encounterPublicForms.expiresAt), gt(encounterPublicForms.expiresAt, new Date())),
        eq(encounterEvents.active, true),
        ne(encounterEvents.status, "cancelado"),
        ne(encounterEvents.status, "encerrado"),
      ))
      .limit(1);
    const resolved = resolvedRows[0];
    if (!resolved) throw new Error("ENCOUNTER_PUBLIC_FORM_UNAVAILABLE");
    const churchId = resolved.publicForm.churchId;
    const eventId = resolved.publicForm.encounterEventId;
    const phoneExpression = (column: any) => sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column}, ''), '(', ''), ')', ''), '-', ''), ' ', ''), '+', '') = ${normalizedPhone}`;
    const candidates = await tx.select().from(people)
      .where(and(eq(people.churchId, churchId), eq(people.active, true), or(phoneExpression(people.phone), phoneExpression(people.whatsapp))))
      .limit(10);
    let person = candidates.find((candidate) => candidate.fullName.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === normalizedName) ?? null;
    if (!person) {
      const personResult = await tx.insert(people).values({
        churchId,
        fullName: data.fullName.trim(),
        phone: normalizedPhone,
        whatsapp: normalizedPhone,
        discipleshipStage: "nova_alma",
        active: true,
      });
      const personId = insertIdOf(personResult);
      if (!personId) throw new Error("Falha ao criar Pessoa a partir da ficha");
      const personRows = await tx.select().from(people).where(and(eq(people.id, personId), eq(people.churchId, churchId))).limit(1);
      person = personRows[0] ?? null;
    }
    if (!person) throw new Error("Falha ao vincular Pessoa à ficha");

    let enrollmentRows = await tx.select().from(encounterEnrollments)
      .where(and(eq(encounterEnrollments.churchId, churchId), eq(encounterEnrollments.encounterEventId, eventId), eq(encounterEnrollments.personId, person.id)))
      .limit(1);
    let enrollment = enrollmentRows[0] ?? null;
    if (!enrollment) {
      if (resolved.event.maxParticipants) {
        const totals = await tx.select({ value: count() }).from(encounterEnrollments)
          .where(and(eq(encounterEnrollments.churchId, churchId), eq(encounterEnrollments.encounterEventId, eventId), ne(encounterEnrollments.status, "cancelado")));
        if (Number(totals[0]?.value ?? 0) >= resolved.event.maxParticipants) throw new Error("ENCOUNTER_CAPACITY_REACHED");
      }
      const enrollmentResult = await tx.insert(encounterEnrollments).values({
        churchId,
        encounterEventId: eventId,
        personId: person.id,
        status: "inscrito",
        source: "public_form",
      });
      const enrollmentId = insertIdOf(enrollmentResult);
      enrollmentRows = await tx.select().from(encounterEnrollments).where(and(eq(encounterEnrollments.id, enrollmentId), eq(encounterEnrollments.churchId, churchId))).limit(1);
      enrollment = enrollmentRows[0] ?? null;
    } else {
      if (enrollment.status === "cancelado") {
        if (resolved.event.maxParticipants) {
          const totals = await tx.select({ value: count() }).from(encounterEnrollments)
            .where(and(eq(encounterEnrollments.churchId, churchId), eq(encounterEnrollments.encounterEventId, eventId), ne(encounterEnrollments.status, "cancelado")));
          if (Number(totals[0]?.value ?? 0) >= resolved.event.maxParticipants) throw new Error("ENCOUNTER_CAPACITY_REACHED");
        }
        await tx.update(encounterEnrollments).set({ source: "public_form", status: "inscrito", cancelledAt: null }).where(and(eq(encounterEnrollments.id, enrollment.id), eq(encounterEnrollments.churchId, churchId), eq(encounterEnrollments.encounterEventId, eventId)));
        enrollment = { ...enrollment, source: "public_form", status: "inscrito", cancelledAt: null };
      } else {
        await tx.update(encounterEnrollments).set({ source: "public_form" }).where(and(eq(encounterEnrollments.id, enrollment.id), eq(encounterEnrollments.churchId, churchId), eq(encounterEnrollments.encounterEventId, eventId)));
      }
    }
    if (!enrollment) throw new Error("Falha ao criar inscrição no encontro");
    const existingFormRows = await tx.select({ id: encounterDiscipleForms.id }).from(encounterDiscipleForms)
      .where(and(eq(encounterDiscipleForms.churchId, churchId), eq(encounterDiscipleForms.encounterEventId, eventId), eq(encounterDiscipleForms.encounterEnrollmentId, enrollment.id)))
      .limit(1);
    if (existingFormRows[0]) throw new Error("ENCOUNTER_FORM_ALREADY_SUBMITTED");

    const formValues = {
      churchId,
      encounterEventId: eventId,
      encounterEnrollmentId: enrollment.id,
      personId: person.id,
      fullName: data.fullName.trim(),
      age: data.age,
      phone: normalizedPhone,
      guardianName: data.guardianName.trim(),
      guardianPhone: data.guardianPhone.replace(/\D/g, ""),
      friendName: data.friendName.trim(),
      friendPhone: data.friendPhone.replace(/\D/g, ""),
      attendingChurch: data.attendingChurch.trim(),
      invitedByName: data.invitedByName.trim(),
      reviewStatus: "recebida" as const,
      reviewNotes: null,
      consentAccepted: true,
      consentVersion: "v1",
      consentAcceptedAt: new Date(),
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedByPersonId: null,
    };
    await tx.insert(encounterDiscipleForms).values(formValues);
    const formRows = await tx.select().from(encounterDiscipleForms)
      .where(and(eq(encounterDiscipleForms.churchId, churchId), eq(encounterDiscipleForms.encounterEnrollmentId, enrollment.id)))
      .limit(1);
    const form = formRows[0];
    await tx.insert(encounterHistory).values({
      churchId,
      encounterEventId: eventId,
      action: "ficha_publica_recebida",
      entityType: "ficha",
      entityId: form?.id ?? null,
      details: { personId: person.id, enrollmentId: enrollment.id },
    });
    return { eventId, enrollmentId: enrollment.id, personId: person.id, formId: form?.id ?? null };
  });
}

export async function updateEncounterDiscipleFormReview(data: { id: number; eventId: number; churchId: number; reviewStatus: EncounterReviewStatus; reviewNotes?: string | null; reviewedByPersonId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(encounterDiscipleForms)
    .where(and(eq(encounterDiscipleForms.id, data.id), eq(encounterDiscipleForms.encounterEventId, data.eventId), eq(encounterDiscipleForms.churchId, data.churchId)))
    .limit(1);
  const form = rows[0];
  if (!form) return null;
  await db.update(encounterDiscipleForms).set({
    reviewStatus: data.reviewStatus,
    reviewNotes: data.reviewNotes ?? null,
    reviewedAt: new Date(),
    reviewedByPersonId: data.reviewedByPersonId ?? null,
  }).where(and(eq(encounterDiscipleForms.id, data.id), eq(encounterDiscipleForms.encounterEventId, data.eventId), eq(encounterDiscipleForms.churchId, data.churchId)));
  await db.insert(encounterHistory).values({
    churchId: data.churchId,
    encounterEventId: form.encounterEventId,
    actorPersonId: data.reviewedByPersonId ?? null,
    action: `ficha_${data.reviewStatus}`,
    entityType: "ficha",
    entityId: form.id,
  });
  return { ...form, reviewStatus: data.reviewStatus, reviewNotes: data.reviewNotes ?? null };
}

export async function getEncounterTeams(eventId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(encounterTeams)
    .where(and(eq(encounterTeams.churchId, churchId), eq(encounterTeams.encounterEventId, eventId), eq(encounterTeams.active, true)))
    .orderBy(encounterTeams.sortOrder, encounterTeams.name);
}

export async function getEncounterTeamById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(encounterTeams).where(and(eq(encounterTeams.id, id), eq(encounterTeams.churchId, churchId))).limit(1);
  return rows[0] ?? null;
}

export async function createEncounterTeam(data: typeof encounterTeams.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(encounterTeams).values(data);
  return { id: insertIdOf(result) };
}

export async function updateEncounterTeam(id: number, churchId: number, data: Partial<typeof encounterTeams.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(encounterTeams).set(data).where(and(eq(encounterTeams.id, id), eq(encounterTeams.churchId, churchId)));
}

export async function getEncounterServants(eventId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ assignment: encounterServantAssignments, person: { id: people.id, fullName: people.fullName, phone: people.phone, whatsapp: people.whatsapp }, team: encounterTeams })
    .from(encounterServantAssignments)
    .innerJoin(people, and(eq(people.id, encounterServantAssignments.personId), eq(people.churchId, churchId)))
    .leftJoin(encounterTeams, and(eq(encounterTeams.id, encounterServantAssignments.teamId), eq(encounterTeams.churchId, churchId)))
    .where(and(eq(encounterServantAssignments.churchId, churchId), eq(encounterServantAssignments.encounterEventId, eventId), eq(encounterServantAssignments.active, true)))
    .orderBy(encounterServantAssignments.roleName, people.fullName);
}

export async function createEncounterServantAssignment(data: typeof encounterServantAssignments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const duplicate = await db.select({ id: encounterServantAssignments.id }).from(encounterServantAssignments)
    .where(and(eq(encounterServantAssignments.churchId, data.churchId), eq(encounterServantAssignments.encounterEventId, data.encounterEventId), eq(encounterServantAssignments.personId, data.personId), eq(encounterServantAssignments.roleName, data.roleName), eq(encounterServantAssignments.active, true)))
    .limit(1);
  if (duplicate[0]) throw new Error("ENCOUNTER_DUPLICATE_SERVANT_ASSIGNMENT");
  const result = await db.insert(encounterServantAssignments).values(data);
  const id = insertIdOf(result);
  await db.insert(encounterHistory).values({ churchId: data.churchId, encounterEventId: data.encounterEventId, action: "servo_atribuido", entityType: "servo", entityId: id, details: { personId: data.personId, roleName: data.roleName } });
  return { id };
}

export async function deactivateEncounterServantAssignment(id: number, eventId: number, churchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(encounterServantAssignments).set({ active: false }).where(and(eq(encounterServantAssignments.id, id), eq(encounterServantAssignments.encounterEventId, eventId), eq(encounterServantAssignments.churchId, churchId)));
}

export async function getEncounterChecklist(eventId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ item: encounterChecklistItems, assignee: { id: people.id, fullName: people.fullName } })
    .from(encounterChecklistItems)
    .leftJoin(people, and(eq(people.id, encounterChecklistItems.assignedPersonId), eq(people.churchId, churchId)))
    .where(and(eq(encounterChecklistItems.churchId, churchId), eq(encounterChecklistItems.encounterEventId, eventId)))
    .orderBy(encounterChecklistItems.sortOrder, encounterChecklistItems.dueAt, encounterChecklistItems.id);
}

export async function createEncounterChecklistItem(data: typeof encounterChecklistItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(encounterChecklistItems).values(data);
  return { id: insertIdOf(result) };
}

export async function updateEncounterChecklistItem(id: number, eventId: number, churchId: number, data: Partial<typeof encounterChecklistItems.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(encounterChecklistItems).set(data).where(and(eq(encounterChecklistItems.id, id), eq(encounterChecklistItems.encounterEventId, eventId), eq(encounterChecklistItems.churchId, churchId)));
}

export async function addEncounterHistory(data: typeof encounterHistory.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(encounterHistory).values(data);
}

export async function getEncounterHistory(eventId: number, churchId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(encounterHistory)
    .where(and(eq(encounterHistory.churchId, churchId), eq(encounterHistory.encounterEventId, eventId)))
    .orderBy(desc(encounterHistory.createdAt), desc(encounterHistory.id))
    .limit(Math.min(Math.max(limit, 1), 200));
}

// ─── ESCOLA DE LÍDERES ────────────────────────────────────────────────────────

export async function getLeadershipClassesByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadershipSchoolClasses).where(eq(leadershipSchoolClasses.churchId, churchId));
}

export async function getLeadershipEnrollments(classId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    enrollment: leadershipSchoolEnrollments,
    person: { id: people.id, fullName: people.fullName, phone: people.phone },
  })
  .from(leadershipSchoolEnrollments)
  .innerJoin(people, eq(leadershipSchoolEnrollments.personId, people.id))
  .where(and(eq(leadershipSchoolEnrollments.classId, classId), eq(leadershipSchoolEnrollments.churchId, churchId)));
}

export async function createLeadershipClass(data: {
  churchId: number; name: string; period?: string; startDate?: string; endDate?: string; pastor?: string; description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leadershipSchoolClasses).values(data as unknown as typeof leadershipSchoolClasses.$inferInsert);
}

export async function enrollInLeadershipSchool(data: { classId: number; personId: number; churchId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leadershipSchoolEnrollments).values({ ...data, status: "matriculado" } as typeof leadershipSchoolEnrollments.$inferInsert);
}

export async function updateLeadershipEnrollment(id: number, churchId: number, data: { status?: string; grade?: number; attendance?: number; completedAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const update: Record<string, unknown> = {};
  if (data.status !== undefined) update.status = data.status;
  if (data.grade !== undefined) update.grade = data.grade;
  if (data.attendance !== undefined) update.attendance = data.attendance;
  if (data.completedAt !== undefined) update.completedAt = data.completedAt;
  await db.update(leadershipSchoolEnrollments).set(update).where(and(eq(leadershipSchoolEnrollments.id, id), eq(leadershipSchoolEnrollments.churchId, churchId)));
}

// ─── HISTÓRICO DE LIDERANÇA ───────────────────────────────────────────────────

export async function getLeadershipHistory(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    history: leadershipHistory,
    person: { id: people.id, fullName: people.fullName },
  })
  .from(leadershipHistory)
  .innerJoin(people, eq(leadershipHistory.personId, people.id))
  .where(eq(leadershipHistory.churchId, churchId))
  .orderBy(desc(leadershipHistory.createdAt));
}

export async function getLeadershipHistoryByPerson(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadershipHistory)
    .where(and(eq(leadershipHistory.personId, personId), eq(leadershipHistory.churchId, churchId)))
    .orderBy(desc(leadershipHistory.startDate));
}

export async function addLeadershipHistory(data: {
  churchId: number; personId: number; role: string; startDate: string; endDate?: string; ministry?: string; notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leadershipHistory).values(data as unknown as typeof leadershipHistory.$inferInsert);
}

// ─── ACONSELHAMENTO PASTORAL ──────────────────────────────────────────────────

export async function getCounselingSessionsByChurch(churchId: number, counselorId?: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    session: counselingSessions,
    person: { id: people.id, fullName: people.fullName },
  })
  .from(counselingSessions)
  .innerJoin(people, eq(counselingSessions.personId, people.id))
  .where(counselorId ? and(eq(counselingSessions.churchId, churchId), eq(counselingSessions.counselorId, counselorId)) : eq(counselingSessions.churchId, churchId))
  .orderBy(desc(counselingSessions.scheduledAt));
}

export async function getCounselingSessionById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(counselingSessions)
    .where(and(eq(counselingSessions.id, id), eq(counselingSessions.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCounselingSession(data: {
  churchId: number; personId: number; counselorId: number; scheduledAt: Date; notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(counselingSessions).values(data as typeof counselingSessions.$inferInsert);
}

export async function updateCounselingSession(id: number, churchId: number, data: { status?: string; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const update: Record<string, unknown> = {};
  if (data.status !== undefined) update.status = data.status;
  if (data.notes !== undefined) update.notes = data.notes;
  await db.update(counselingSessions).set(update).where(and(eq(counselingSessions.id, id), eq(counselingSessions.churchId, churchId)));
}

export async function getCounselingNotes(sessionId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(counselingNotes)
    .where(and(eq(counselingNotes.sessionId, sessionId), eq(counselingNotes.churchId, churchId)));
}

export async function addCounselingNote(data: {
  sessionId: number; churchId: number; authorId: number; content: string; confidential?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(counselingNotes).values(data as typeof counselingNotes.$inferInsert);
}

// ─── COMUNICAÇÃO ──────────────────────────────────────────────────────────────

export async function getCommunicationLogs(churchId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(communicationLogs)
    .where(eq(communicationLogs.churchId, churchId))
    .orderBy(desc(communicationLogs.sentAt))
    .limit(limit);
}

export async function logCommunication(data: {
  churchId: number;
  type: "push" | "email" | "whatsapp" | "sms";
  category: "boas_vindas" | "aniversario" | "lembrete_evento" | "lembrete_celula" | "convite" | "aviso" | "outro";
  recipientPersonId?: number;
  recipientName?: string;
  title?: string;
  message?: string;
  status?: "enviado" | "entregue" | "falhou";
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(communicationLogs).values(data as typeof communicationLogs.$inferInsert);
}

// ─── TESOURARIA ────────────────────────────────────────────────────────────────

const DEFAULT_FINANCIAL_ACCOUNTS = [
  { name: "Caixa", type: "caixa" as const },
  { name: "Banco principal", type: "banco" as const },
];

const DEFAULT_FINANCIAL_CATEGORIES = [
  { type: "entrada" as const, key: "dizimo", name: "Dízimo" },
  { type: "entrada" as const, key: "oferta", name: "Oferta" },
  { type: "entrada" as const, key: "voto", name: "Voto" },
  { type: "entrada" as const, key: "primicias", name: "Primícias" },
  { type: "entrada" as const, key: "missoes", name: "Missões" },
  { type: "entrada" as const, key: "acao_social", name: "Ação social" },
  { type: "entrada" as const, key: "doacao", name: "Doação" },
  { type: "entrada" as const, key: "outra_entrada", name: "Outra entrada" },
  { type: "saida" as const, key: "aluguel", name: "Aluguel" },
  { type: "saida" as const, key: "agua", name: "Água" },
  { type: "saida" as const, key: "luz", name: "Luz" },
  { type: "saida" as const, key: "internet", name: "Internet" },
  { type: "saida" as const, key: "manutencao", name: "Manutenção" },
  { type: "saida" as const, key: "ministerios", name: "Ministérios" },
  { type: "saida" as const, key: "acao_social", name: "Ação social" },
  { type: "saida" as const, key: "administracao", name: "Administração" },
  { type: "saida" as const, key: "outra_saida", name: "Outra saída" },
];

function financialDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

export async function ensureTreasuryDefaults(churchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existingAccounts, existingCategories] = await Promise.all([
    db.select({ name: financialAccounts.name }).from(financialAccounts).where(eq(financialAccounts.churchId, churchId)),
    db.select({ key: financialCategories.key, type: financialCategories.type }).from(financialCategories).where(eq(financialCategories.churchId, churchId)),
  ]);
  const accountNames = new Set(existingAccounts.map((account) => account.name));
  const categoryKeys = new Set(existingCategories.map((category) => `${category.type}:${category.key}`));
  const missingAccounts = DEFAULT_FINANCIAL_ACCOUNTS.filter((account) => !accountNames.has(account.name));
  const missingCategories = DEFAULT_FINANCIAL_CATEGORIES.filter((category) => !categoryKeys.has(`${category.type}:${category.key}`));

  if (missingAccounts.length > 0) {
    await db.insert(financialAccounts).values(missingAccounts.map((account) => ({ churchId, ...account, openingBalanceCents: 0, active: true })));
  }
  if (missingCategories.length > 0) {
    await db.insert(financialCategories).values(missingCategories.map((category) => ({ churchId, ...category, isSystem: true, active: true })));
  }
}

export async function getFinancialAccountsByChurch(churchId: number) {
  await ensureTreasuryDefaults(churchId);
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financialAccounts).where(and(eq(financialAccounts.churchId, churchId), eq(financialAccounts.active, true))).orderBy(financialAccounts.name);
}

export async function getFinancialAccountById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(financialAccounts).where(and(eq(financialAccounts.id, id), eq(financialAccounts.churchId, churchId), eq(financialAccounts.active, true))).limit(1);
  return rows[0] ?? null;
}

export async function createFinancialAccount(data: { churchId: number; name: string; type: "caixa" | "banco" | "outro"; openingBalanceCents: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(financialAccounts).values({ ...data, active: true });
  const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
  const rows = await db.select().from(financialAccounts).where(eq(financialAccounts.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getFinancialCategoriesByChurch(churchId: number, type?: "entrada" | "saida") {
  await ensureTreasuryDefaults(churchId);
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(financialCategories.churchId, churchId), eq(financialCategories.active, true)];
  if (type) filters.push(eq(financialCategories.type, type));
  return db.select().from(financialCategories).where(and(...filters)).orderBy(financialCategories.type, financialCategories.name);
}

export async function getFinancialCategoryById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(financialCategories).where(and(eq(financialCategories.id, id), eq(financialCategories.churchId, churchId), eq(financialCategories.active, true))).limit(1);
  return rows[0] ?? null;
}

export async function createFinancialCategory(data: { churchId: number; type: "entrada" | "saida"; key: string; name: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(financialCategories).values({ ...data, isSystem: false, active: true });
  const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
  const rows = await db.select().from(financialCategories).where(eq(financialCategories.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getFinancialCategoriesForManagement(churchId: number) {
  await ensureTreasuryDefaults(churchId);
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financialCategories).where(eq(financialCategories.churchId, churchId)).orderBy(financialCategories.type, financialCategories.name);
}

export async function getFinancialCategoryForManagement(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(financialCategories).where(and(eq(financialCategories.id, id), eq(financialCategories.churchId, churchId))).limit(1);
  return rows[0] ?? null;
}

export async function hasFinancialCategoryTransactions(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: financialTransactions.id }).from(financialTransactions).where(and(eq(financialTransactions.categoryId, id), eq(financialTransactions.churchId, churchId))).limit(1);
  return rows.length > 0;
}

export async function updateFinancialCategory(data: { id: number; churchId: number; type: "entrada" | "saida"; name: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(financialCategories).set({ type: data.type, name: data.name }).where(and(eq(financialCategories.id, data.id), eq(financialCategories.churchId, data.churchId), eq(financialCategories.isSystem, false)));
  return getFinancialCategoryForManagement(data.id, data.churchId);
}

export async function setFinancialCategoryActive(data: { id: number; churchId: number; active: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(financialCategories).set({ active: data.active }).where(and(eq(financialCategories.id, data.id), eq(financialCategories.churchId, data.churchId), eq(financialCategories.isSystem, false)));
  return getFinancialCategoryForManagement(data.id, data.churchId);
}

export async function getFinancialTransactionById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(financialTransactions).where(and(eq(financialTransactions.id, id), eq(financialTransactions.churchId, churchId))).limit(1);
  return rows[0] ?? null;
}

export async function isFinancialPeriodClosed(churchId: number, transactionDate: string) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(financialPeriodClosures)
    .where(and(eq(financialPeriodClosures.churchId, churchId), eq(financialPeriodClosures.status, "fechado"), sql`DATE(${financialPeriodClosures.periodStart}) <= DATE(${transactionDate})`, sql`DATE(${financialPeriodClosures.periodEnd}) >= DATE(${transactionDate})`))
    .limit(1);
  return rows.length > 0;
}

type FinancialTransactionFilters = {
  churchId: number;
  startDate?: string;
  endDate?: string;
  accountId?: number;
  categoryId?: number;
  type?: "entrada" | "saida";
  includeDrafts?: boolean;
};

export async function getFinancialTransactions(filters: FinancialTransactionFilters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(financialTransactions.churchId, filters.churchId)];
  if (filters.startDate) conditions.push(sql`DATE(${financialTransactions.transactionDate}) >= DATE(${filters.startDate})`);
  if (filters.endDate) conditions.push(sql`DATE(${financialTransactions.transactionDate}) <= DATE(${filters.endDate})`);
  if (filters.accountId) conditions.push(eq(financialTransactions.accountId, filters.accountId));
  if (filters.categoryId) conditions.push(eq(financialTransactions.categoryId, filters.categoryId));
  if (filters.type) conditions.push(eq(financialTransactions.type, filters.type));
  if (!filters.includeDrafts) conditions.push(sql`${financialTransactions.status} <> 'rascunho'`);
  return db.select({ transaction: financialTransactions, account: financialAccounts, category: financialCategories })
    .from(financialTransactions)
    .innerJoin(financialAccounts, and(eq(financialAccounts.id, financialTransactions.accountId), eq(financialAccounts.churchId, filters.churchId)))
    .innerJoin(financialCategories, and(eq(financialCategories.id, financialTransactions.categoryId), eq(financialCategories.churchId, filters.churchId)))
    .where(and(...conditions))
    .orderBy(desc(financialTransactions.transactionDate), desc(financialTransactions.createdAt));
}

export async function getTreasuryOverview(data: { churchId: number; startDate: string; endDate: string; accountId?: number }) {
  const [allAccounts, periodRows, allRows] = await Promise.all([
    getFinancialAccountsByChurch(data.churchId),
    getFinancialTransactions({ churchId: data.churchId, startDate: data.startDate, endDate: data.endDate, accountId: data.accountId, includeDrafts: true }),
    getFinancialTransactions({ churchId: data.churchId, endDate: data.endDate, accountId: data.accountId }),
  ]);
  const accounts = data.accountId ? allAccounts.filter((account) => account.id === data.accountId) : allAccounts;
  const confirmedPeriodRows = periodRows.filter((row) => row.transaction.status === "confirmado");
  const sumByType = (type: "entrada" | "saida", rows: typeof confirmedPeriodRows) => rows.filter((row) => row.transaction.type === type).reduce((total, row) => total + row.transaction.amountCents, 0);
  const entriesCents = sumByType("entrada", confirmedPeriodRows);
  const expensesCents = sumByType("saida", confirmedPeriodRows);
  const balances = accounts.map((account) => {
    const movement = allRows.filter((row) => row.transaction.status === "confirmado" && row.transaction.accountId === account.id)
      .reduce((total, row) => total + (row.transaction.type === "entrada" ? row.transaction.amountCents : -row.transaction.amountCents), 0);
    return { account, balanceCents: account.openingBalanceCents + movement };
  });
  const categoryTotals = confirmedPeriodRows.reduce<Record<string, { categoryId: number; categoryName: string; type: "entrada" | "saida"; amountCents: number }>>((groups, row) => {
    const key = `${row.transaction.type}:${row.category.id}`;
    groups[key] ??= { categoryId: row.category.id, categoryName: row.category.name, type: row.transaction.type, amountCents: 0 };
    groups[key].amountCents += row.transaction.amountCents;
    return groups;
  }, {});
  return {
    accounts,
    transactions: periodRows,
    entriesCents,
    expensesCents,
    resultCents: entriesCents - expensesCents,
    balanceCents: balances.reduce((total, item) => total + item.balanceCents, 0),
    accountBalances: balances,
    categories: Object.values(categoryTotals).sort((a, b) => b.amountCents - a.amountCents),
  };
}

async function writeFinancialAuditLog(data: {
  churchId: number;
  transactionId?: number;
  actorChurchUserId: number;
  action: "criado" | "atualizado" | "confirmado" | "estornado" | "periodo_fechado" | "periodo_reaberto";
  beforeData?: unknown;
  afterData?: unknown;
  note?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(financialAuditLogs).values(data);
}

export async function createFinancialTransaction(data: {
  churchId: number; accountId: number; categoryId: number; type: "entrada" | "saida"; amountCents: number; transactionDate: string;
  paymentMethod: "dinheiro" | "pix" | "transferencia" | "cartao" | "cheque" | "outro"; contributorPersonId?: number; contributorName?: string; serviceId?: number; countSheetId?: number; description?: string; reference?: string; status: "rascunho" | "confirmado"; actorChurchUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.transaction(async (tx) => {
    const now = new Date();
    const insert = await tx.insert(financialTransactions).values({
      churchId: data.churchId, accountId: data.accountId, categoryId: data.categoryId, type: data.type, amountCents: data.amountCents,
      transactionDate: financialDate(data.transactionDate), paymentMethod: data.paymentMethod, contributorPersonId: data.contributorPersonId ?? null, contributorName: data.contributorName ?? null, serviceId: data.serviceId ?? null, countSheetId: data.countSheetId ?? null, description: data.description ?? null, reference: data.reference ?? null,
      status: data.status, createdByChurchUserId: data.actorChurchUserId,
      confirmedByChurchUserId: data.status === "confirmado" ? data.actorChurchUserId : null,
      confirmedAt: data.status === "confirmado" ? now : null,
    });
    const id = Number((insert[0] as { insertId?: number })?.insertId ?? 0);
    const rows = await tx.select().from(financialTransactions).where(eq(financialTransactions.id, id)).limit(1);
    const transaction = rows[0];
    if (!transaction) throw new Error("Falha ao criar lançamento financeiro");
    await tx.insert(financialAuditLogs).values({ churchId: data.churchId, transactionId: id, actorChurchUserId: data.actorChurchUserId, action: data.status === "confirmado" ? "confirmado" : "criado", afterData: transaction });
    return transaction;
  });
  return result;
}

export async function updateFinancialDraft(data: {
  id: number; churchId: number; accountId: number; categoryId: number; type: "entrada" | "saida"; amountCents: number; transactionDate: string;
  paymentMethod: "dinheiro" | "pix" | "transferencia" | "cartao" | "cheque" | "outro"; contributorPersonId?: number; contributorName?: string; serviceId?: number; countSheetId?: number; description?: string; reference?: string; actorChurchUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const previousRows = await tx.select().from(financialTransactions).where(and(eq(financialTransactions.id, data.id), eq(financialTransactions.churchId, data.churchId), eq(financialTransactions.status, "rascunho"))).limit(1);
    const previous = previousRows[0];
    if (!previous) return null;
    const result = await tx.update(financialTransactions).set({ accountId: data.accountId, categoryId: data.categoryId, type: data.type, amountCents: data.amountCents, transactionDate: financialDate(data.transactionDate), paymentMethod: data.paymentMethod, contributorPersonId: data.contributorPersonId ?? null, contributorName: data.contributorName ?? null, serviceId: data.serviceId ?? null, countSheetId: data.countSheetId ?? null, description: data.description ?? null, reference: data.reference ?? null })
      .where(and(eq(financialTransactions.id, data.id), eq(financialTransactions.churchId, data.churchId), eq(financialTransactions.status, "rascunho")));
    if (Number((result[0] as { affectedRows?: number })?.affectedRows ?? 0) !== 1) return null;
    const updatedRows = await tx.select().from(financialTransactions).where(and(eq(financialTransactions.id, data.id), eq(financialTransactions.churchId, data.churchId))).limit(1);
    const updated = updatedRows[0];
    if (!updated) return null;
    await tx.insert(financialAuditLogs).values({ churchId: data.churchId, transactionId: data.id, actorChurchUserId: data.actorChurchUserId, action: "atualizado", beforeData: previous, afterData: updated });
    return updated;
  });
}

export async function confirmFinancialTransaction(data: { id: number; churchId: number; actorChurchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const previousRows = await tx.select().from(financialTransactions).where(and(eq(financialTransactions.id, data.id), eq(financialTransactions.churchId, data.churchId), eq(financialTransactions.status, "rascunho"))).limit(1);
    const previous = previousRows[0];
    if (!previous) return null;
    const result = await tx.update(financialTransactions).set({ status: "confirmado", confirmedByChurchUserId: data.actorChurchUserId, confirmedAt: new Date() })
      .where(and(eq(financialTransactions.id, data.id), eq(financialTransactions.churchId, data.churchId), eq(financialTransactions.status, "rascunho")));
    if (Number((result[0] as { affectedRows?: number })?.affectedRows ?? 0) !== 1) return null;
    const updatedRows = await tx.select().from(financialTransactions).where(and(eq(financialTransactions.id, data.id), eq(financialTransactions.churchId, data.churchId))).limit(1);
    const updated = updatedRows[0];
    if (!updated || updated.status !== "confirmado") return null;
    await tx.insert(financialAuditLogs).values({ churchId: data.churchId, transactionId: data.id, actorChurchUserId: data.actorChurchUserId, action: "confirmado", beforeData: previous, afterData: updated });
    return updated;
  });
}

export async function reverseFinancialTransaction(data: { id: number; churchId: number; actorChurchUserId: number; reason: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const previousRows = await tx.select().from(financialTransactions).where(and(eq(financialTransactions.id, data.id), eq(financialTransactions.churchId, data.churchId), eq(financialTransactions.status, "confirmado"))).limit(1);
    const previous = previousRows[0];
    if (!previous) return null;
    const result = await tx.update(financialTransactions).set({ status: "estornado", reversedByChurchUserId: data.actorChurchUserId, reversedAt: new Date(), reversalReason: data.reason })
      .where(and(eq(financialTransactions.id, data.id), eq(financialTransactions.churchId, data.churchId), eq(financialTransactions.status, "confirmado")));
    if (Number((result[0] as { affectedRows?: number })?.affectedRows ?? 0) !== 1) return null;
    const updatedRows = await tx.select().from(financialTransactions).where(and(eq(financialTransactions.id, data.id), eq(financialTransactions.churchId, data.churchId))).limit(1);
    const updated = updatedRows[0];
    if (!updated || updated.status !== "estornado") return null;
    await tx.insert(financialAuditLogs).values({ churchId: data.churchId, transactionId: data.id, actorChurchUserId: data.actorChurchUserId, action: "estornado", beforeData: previous, afterData: updated, note: data.reason });
    return updated;
  });
}

export async function getFinancialPeriodClosure(churchId: number, periodStart: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(financialPeriodClosures).where(and(eq(financialPeriodClosures.churchId, churchId), sql`DATE(${financialPeriodClosures.periodStart}) = DATE(${periodStart})`)).limit(1);
  return rows[0] ?? null;
}

export async function getFinancialReceiptData(transactionId: number, churchId: number) {
  const transaction = await getFinancialTransactionById(transactionId, churchId);
  if (!transaction) return null;
  const db = await getDb();
  if (!db) return null;
  const [account, category, contributorRows] = await Promise.all([
    getFinancialAccountById(transaction.accountId, churchId),
    getFinancialCategoryById(transaction.categoryId, churchId),
    transaction.contributorPersonId
      ? db.select({ id: people.id, fullName: people.fullName }).from(people).where(and(eq(people.id, transaction.contributorPersonId), eq(people.churchId, churchId))).limit(1)
      : Promise.resolve([]),
  ]);
  if (!account || !category) return null;
  return { transaction, account, category, contributor: contributorRows[0] ?? null };
}

export async function getFinancialReconciliation(data: { churchId: number; accountId: number; periodStart: string }) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(financialReconciliations)
    .where(and(eq(financialReconciliations.churchId, data.churchId), eq(financialReconciliations.accountId, data.accountId), sql`DATE(${financialReconciliations.periodStart}) = DATE(${data.periodStart})`))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFinancialReconciliationById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(financialReconciliations)
    .where(and(eq(financialReconciliations.id, id), eq(financialReconciliations.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFinancialReconciliationAttachments(reconciliationId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financialReconciliationAttachments)
    .where(and(eq(financialReconciliationAttachments.reconciliationId, reconciliationId), eq(financialReconciliationAttachments.churchId, churchId)))
    .orderBy(desc(financialReconciliationAttachments.createdAt));
}

export async function createFinancialReconciliationAttachment(data: {
  churchId: number; reconciliationId: number; fileKey: string; url: string; fileName: string; mimeType: string; sizeBytes: number; uploadedByChurchUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(financialReconciliationAttachments).values(data);
  const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
  const rows = await db.select().from(financialReconciliationAttachments)
    .where(and(eq(financialReconciliationAttachments.id, id), eq(financialReconciliationAttachments.churchId, data.churchId)))
    .limit(1);
  if (!rows[0]) throw new Error("Falha ao registrar comprovante bancário");
  return rows[0];
}

/** Remove apenas o vínculo no banco; o arquivo deixa de ser referenciado pela aplicação. */
export async function removeFinancialReconciliationAttachment(data: { id: number; reconciliationId: number; churchId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(financialReconciliationAttachments)
    .where(and(
      eq(financialReconciliationAttachments.id, data.id),
      eq(financialReconciliationAttachments.reconciliationId, data.reconciliationId),
      eq(financialReconciliationAttachments.churchId, data.churchId),
    ));
  return Number((result[0] as { affectedRows?: number })?.affectedRows ?? 0) > 0;
}

export async function getBookBalanceAt(data: { churchId: number; accountId: number; endDate: string }) {
  const account = await getFinancialAccountById(data.accountId, data.churchId);
  if (!account) return null;
  const rows = await getFinancialTransactions({ churchId: data.churchId, accountId: data.accountId, endDate: data.endDate });
  const movement = rows.filter((row) => row.transaction.status === "confirmado")
    .reduce((total, row) => total + (row.transaction.type === "entrada" ? row.transaction.amountCents : -row.transaction.amountCents), 0);
  return account.openingBalanceCents + movement;
}

export async function saveFinancialReconciliation(data: {
  churchId: number; accountId: number; periodStart: string; periodEnd: string; bankClosingBalanceCents: number;
  bookBalanceCents: number; differenceCents: number; status: "em_andamento" | "conciliada" | "com_divergencia"; notes?: string; actorChurchUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getFinancialReconciliation(data);
  if (existing) {
    await db.update(financialReconciliations).set({
      periodEnd: financialDate(data.periodEnd), bankClosingBalanceCents: data.bankClosingBalanceCents, bookBalanceCents: data.bookBalanceCents,
      differenceCents: data.differenceCents, status: data.status, notes: data.notes ?? null, reconciledByChurchUserId: data.actorChurchUserId, reconciledAt: new Date(),
    }).where(and(eq(financialReconciliations.id, existing.id), eq(financialReconciliations.churchId, data.churchId)));
  } else {
    await db.insert(financialReconciliations).values({
      churchId: data.churchId, accountId: data.accountId, periodStart: financialDate(data.periodStart), periodEnd: financialDate(data.periodEnd),
      bankClosingBalanceCents: data.bankClosingBalanceCents, bookBalanceCents: data.bookBalanceCents, differenceCents: data.differenceCents,
      status: data.status, notes: data.notes ?? null, reconciledByChurchUserId: data.actorChurchUserId,
    });
  }
  return getFinancialReconciliation(data);
}

export async function closeFinancialPeriod(data: { churchId: number; periodStart: string; periodEnd: string; actorChurchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getFinancialPeriodClosure(data.churchId, data.periodStart);
  if (existing) {
    await db.update(financialPeriodClosures).set({
      periodEnd: financialDate(data.periodEnd),
      status: "fechado",
      closedByChurchUserId: data.actorChurchUserId,
      closedAt: new Date(),
    }).where(and(eq(financialPeriodClosures.id, existing.id), eq(financialPeriodClosures.churchId, data.churchId), eq(financialPeriodClosures.status, "reaberto")));
    const closedAgain = await getFinancialPeriodClosure(data.churchId, data.periodStart);
    if (!closedAgain || closedAgain.status !== "fechado") return null;
    await writeFinancialAuditLog({ churchId: data.churchId, actorChurchUserId: data.actorChurchUserId, action: "periodo_fechado", beforeData: existing, afterData: closedAgain, note: "Período fechado novamente após reabertura." });
    return closedAgain;
  }
  const result = await db.insert(financialPeriodClosures).values({ churchId: data.churchId, periodStart: financialDate(data.periodStart), periodEnd: financialDate(data.periodEnd), status: "fechado", closedByChurchUserId: data.actorChurchUserId });
  const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
  await writeFinancialAuditLog({ churchId: data.churchId, actorChurchUserId: data.actorChurchUserId, action: "periodo_fechado", afterData: { periodStart: data.periodStart, periodEnd: data.periodEnd } });
  const rows = await db.select().from(financialPeriodClosures).where(eq(financialPeriodClosures.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function reopenFinancialPeriod(data: { churchId: number; periodStart: string; actorChurchUserId: number; reason: string }) {
  const closure = await getFinancialPeriodClosure(data.churchId, data.periodStart);
  if (!closure) return null;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(financialPeriodClosures).set({ status: "reaberto", reopenedByChurchUserId: data.actorChurchUserId, reopenedAt: new Date(), reopeningReason: data.reason }).where(and(eq(financialPeriodClosures.id, closure.id), eq(financialPeriodClosures.churchId, data.churchId), eq(financialPeriodClosures.status, "fechado")));
  const updated = await getFinancialPeriodClosure(data.churchId, data.periodStart);
  if (!updated) return null;
  await writeFinancialAuditLog({ churchId: data.churchId, actorChurchUserId: data.actorChurchUserId, action: "periodo_reaberto", beforeData: closure, afterData: updated, note: data.reason });
  return updated;
}


// ─── PRESTAÇÃO DE CONTAS POR CULTO ────────────────────────────────────────────
function isDuplicateTreasuryRecord(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY";
}

export type TreasuryCountAmounts = {
  cashCents: number;
  pixCents: number;
  transferCents: number;
  cardCents: number;
  checkCents: number;
  otherCents: number;
};

export function getTreasuryCountTotal(amounts: TreasuryCountAmounts) {
  return amounts.cashCents + amounts.pixCents + amounts.transferCents + amounts.cardCents + amounts.checkCents + amounts.otherCents;
}

export async function getTreasuryServices(churchId: number, includeCancelled = false, materializeActorChurchUserId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (materializeActorChurchUserId) {
    await materializeTreasuryRecurringOccurrences({ churchId, actorChurchUserId: materializeActorChurchUserId });
  }
  return db.select().from(treasuryServices)
    .where(includeCancelled ? eq(treasuryServices.churchId, churchId) : and(eq(treasuryServices.churchId, churchId), ne(treasuryServices.status, "cancelado")))
    .orderBy(desc(treasuryServices.serviceDate), desc(treasuryServices.id));
}

export async function getTreasuryRecurringSchedules(churchId: number, includeInactive = false) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(treasuryRecurringSchedules)
    .where(includeInactive ? eq(treasuryRecurringSchedules.churchId, churchId) : and(eq(treasuryRecurringSchedules.churchId, churchId), eq(treasuryRecurringSchedules.active, true)))
    .orderBy(treasuryRecurringSchedules.weekday, treasuryRecurringSchedules.startTime, treasuryRecurringSchedules.id);
}

export async function getTreasuryRecurringScheduleById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(treasuryRecurringSchedules).where(and(eq(treasuryRecurringSchedules.id, id), eq(treasuryRecurringSchedules.churchId, churchId))).limit(1);
  return rows[0] ?? null;
}

export async function createTreasuryRecurringSchedule(data: { churchId: number; name: string; weekday: number; startTime: string; location?: string | null; notes?: string | null; createdByChurchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const result = await db.insert(treasuryRecurringSchedules).values({
      churchId: data.churchId,
      name: data.name,
      weekday: data.weekday,
      startTime: data.startTime,
      location: data.location ?? null,
      notes: data.notes ?? null,
      active: true,
      createdByChurchUserId: data.createdByChurchUserId,
    });
    const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
    return id ? getTreasuryRecurringScheduleById(id, data.churchId) : null;
  } catch (error) {
    if (isDuplicateTreasuryRecord(error)) return null;
    throw error;
  }
}

export async function updateTreasuryRecurringSchedule(data: { id: number; churchId: number; name: string; weekday: number; startTime: string; location?: string | null; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(treasuryRecurringSchedules).set({
    name: data.name,
    weekday: data.weekday,
    startTime: data.startTime,
    location: data.location ?? null,
    notes: data.notes ?? null,
  }).where(and(eq(treasuryRecurringSchedules.id, data.id), eq(treasuryRecurringSchedules.churchId, data.churchId)));
  return getTreasuryRecurringScheduleById(data.id, data.churchId);
}

export async function setTreasuryRecurringScheduleActive(data: { id: number; churchId: number; active: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(treasuryRecurringSchedules).set({ active: data.active }).where(and(eq(treasuryRecurringSchedules.id, data.id), eq(treasuryRecurringSchedules.churchId, data.churchId)));
  return getTreasuryRecurringScheduleById(data.id, data.churchId);
}

function dateToIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export async function materializeTreasuryRecurringOccurrences(data: { churchId: number; actorChurchUserId: number; fromDate?: string; toDate?: string }) {
  const db = await getDb();
  if (!db) return { created: 0 };
  const today = new Date();
  const from = new Date(`${data.fromDate ?? dateToIsoDate(addUtcDays(today, -31))}T12:00:00.000Z`);
  const to = new Date(`${data.toDate ?? dateToIsoDate(addUtcDays(today, 62))}T12:00:00.000Z`);
  const schedules = await db.select().from(treasuryRecurringSchedules).where(and(eq(treasuryRecurringSchedules.churchId, data.churchId), eq(treasuryRecurringSchedules.active, true)));
  let created = 0;
  for (let cursor = from; cursor <= to; cursor = addUtcDays(cursor, 1)) {
    const serviceDate = dateToIsoDate(cursor);
    const weekday = cursor.getUTCDay();
    for (const schedule of schedules.filter((item) => item.weekday === weekday)) {
      const existing = await db.select({ id: treasuryServices.id }).from(treasuryServices).where(and(eq(treasuryServices.churchId, data.churchId), eq(treasuryServices.recurringScheduleId, schedule.id), eq(treasuryServices.serviceDate, financialDate(serviceDate)))).limit(1);
      if (existing.length > 0) continue;
      try {
        await db.insert(treasuryServices).values({
          churchId: data.churchId,
          name: schedule.name,
          serviceDate: financialDate(serviceDate),
          startTime: schedule.startTime,
          location: schedule.location,
          notes: schedule.notes,
          origin: "recorrente",
          recurringScheduleId: schedule.id,
          occurrenceOverride: false,
          status: "aberto",
          createdByChurchUserId: data.actorChurchUserId,
        });
        created += 1;
      } catch (error) {
        if (!isDuplicateTreasuryRecord(error)) throw error;
      }
    }
  }
  return { created };
}

export async function getTreasuryServiceById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(treasuryServices).where(and(eq(treasuryServices.id, id), eq(treasuryServices.churchId, churchId))).limit(1);
  return rows[0] ?? null;
}

export async function createTreasuryService(data: { churchId: number; name: string; serviceDate: string; startTime?: string | null; location?: string | null; notes?: string | null; createdByChurchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(treasuryServices).values({
    churchId: data.churchId,
    name: data.name,
    serviceDate: financialDate(data.serviceDate),
    startTime: data.startTime ?? null,
    location: data.location ?? null,
    notes: data.notes ?? null,
    origin: "manual",
    recurringScheduleId: null,
    occurrenceOverride: false,
    status: "aberto",
    createdByChurchUserId: data.createdByChurchUserId,
  });
  const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
  return id ? getTreasuryServiceById(id, data.churchId) : null;
}

export async function updateTreasuryService(data: { id: number; churchId: number; name: string; serviceDate: string; startTime?: string | null; location?: string | null; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getTreasuryServiceById(data.id, data.churchId);
  if (!existing || existing.status !== "aberto") return null;
  await db.update(treasuryServices).set({
    name: data.name,
    serviceDate: financialDate(data.serviceDate),
    startTime: data.startTime ?? null,
    location: data.location ?? null,
    notes: data.notes ?? null,
    occurrenceOverride: existing.origin === "recorrente" ? true : existing.occurrenceOverride,
  }).where(and(eq(treasuryServices.id, data.id), eq(treasuryServices.churchId, data.churchId), eq(treasuryServices.status, "aberto")));
  return getTreasuryServiceById(data.id, data.churchId);
}

export async function cancelTreasuryService(id: number, churchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(treasuryServices).set({ status: "cancelado" }).where(and(eq(treasuryServices.id, id), eq(treasuryServices.churchId, churchId), eq(treasuryServices.status, "aberto")));
  return getTreasuryServiceById(id, churchId);
}

export async function getTreasuryCountSheetsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(treasuryCountSheets).where(eq(treasuryCountSheets.churchId, churchId)).orderBy(desc(treasuryCountSheets.updatedAt), desc(treasuryCountSheets.id));
}

export async function getTreasuryCountSheetById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(treasuryCountSheets).where(and(eq(treasuryCountSheets.id, id), eq(treasuryCountSheets.churchId, churchId))).limit(1);
  return rows[0] ?? null;
}

export async function saveTreasuryCountSheet(data: {
  id?: number;
  churchId: number;
  serviceId: number;
  counterOnePersonId: number;
  counterTwoPersonId: number;
  amounts: TreasuryCountAmounts;
  notes?: string | null;
  createdByChurchUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const totalCents = getTreasuryCountTotal(data.amounts);
  const values = {
    churchId: data.churchId,
    serviceId: data.serviceId,
    counterOnePersonId: data.counterOnePersonId,
    counterTwoPersonId: data.counterTwoPersonId,
    ...data.amounts,
    totalCents,
    notes: data.notes ?? null,
  };
  if (data.id) {
    const existing = await getTreasuryCountSheetById(data.id, data.churchId);
    if (!existing || existing.status === "fechada") return null;
    await db.update(treasuryCountSheets).set(values).where(and(eq(treasuryCountSheets.id, data.id), eq(treasuryCountSheets.churchId, data.churchId), ne(treasuryCountSheets.status, "fechada")));
    return getTreasuryCountSheetById(data.id, data.churchId);
  }
  try {
    const result = await db.insert(treasuryCountSheets).values({ ...values, status: "rascunho", createdByChurchUserId: data.createdByChurchUserId });
    const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
    return id ? getTreasuryCountSheetById(id, data.churchId) : null;
  } catch (error) {
    if (isDuplicateTreasuryRecord(error)) return null;
    throw error;
  }
}

export async function closeTreasuryCountSheet(data: { id: number; churchId: number; actorChurchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getTreasuryCountSheetById(data.id, data.churchId);
  if (!existing) return null;
  if (existing.status === "fechada") return existing;
  const service = await getTreasuryServiceById(existing.serviceId, data.churchId);
  if (!service || service.status === "cancelado") return null;
  await db.update(treasuryCountSheets).set({ status: "fechada", confirmedAt: new Date(), confirmedByChurchUserId: data.actorChurchUserId }).where(and(eq(treasuryCountSheets.id, data.id), eq(treasuryCountSheets.churchId, data.churchId), ne(treasuryCountSheets.status, "fechada")));
  await db.update(treasuryServices).set({ status: "fechado" }).where(and(eq(treasuryServices.id, service.id), eq(treasuryServices.churchId, data.churchId), eq(treasuryServices.status, "aberto")));
  return getTreasuryCountSheetById(data.id, data.churchId);
}

export async function getTreasuryDepositsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(treasuryDeposits).where(eq(treasuryDeposits.churchId, churchId)).orderBy(desc(treasuryDeposits.depositDate), desc(treasuryDeposits.id));
}

export async function getTreasuryDepositByCountSheet(countSheetId: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(treasuryDeposits).where(and(eq(treasuryDeposits.countSheetId, countSheetId), eq(treasuryDeposits.churchId, churchId))).limit(1);
  return rows[0] ?? null;
}

export async function saveTreasuryDeposit(data: { id?: number; churchId: number; countSheetId: number; accountId: number; amountCents: number; depositDate: string; reference?: string | null; notes?: string | null; actorChurchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const values = { accountId: data.accountId, amountCents: data.amountCents, depositDate: financialDate(data.depositDate), reference: data.reference ?? null, notes: data.notes ?? null, status: "depositado" as const, depositedByChurchUserId: data.actorChurchUserId, depositedAt: new Date() };
  if (data.id) {
    await db.update(treasuryDeposits).set(values).where(and(eq(treasuryDeposits.id, data.id), eq(treasuryDeposits.churchId, data.churchId), eq(treasuryDeposits.countSheetId, data.countSheetId)));
    return db.select().from(treasuryDeposits).where(and(eq(treasuryDeposits.id, data.id), eq(treasuryDeposits.churchId, data.churchId))).limit(1).then((rows) => rows[0] ?? null);
  }
  try {
    const result = await db.insert(treasuryDeposits).values({ ...values, churchId: data.churchId, countSheetId: data.countSheetId, createdByChurchUserId: data.actorChurchUserId });
    const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
    return id ? db.select().from(treasuryDeposits).where(and(eq(treasuryDeposits.id, id), eq(treasuryDeposits.churchId, data.churchId))).limit(1).then((rows) => rows[0] ?? null) : null;
  } catch (error) {
    if (isDuplicateTreasuryRecord(error)) return null;
    throw error;
  }
}

export type TreasuryReportSnapshot = {
  service: Record<string, unknown>;
  countSheet: Record<string, unknown>;
  counters: { one: string; two: string };
  deposit: Record<string, unknown> | null;
  transactions: Array<Record<string, unknown>>;
  issuedAt: string;
};

export async function getTreasuryReportsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(treasuryReports).where(eq(treasuryReports.churchId, churchId)).orderBy(desc(treasuryReports.issuedAt), desc(treasuryReports.id));
}

export async function getTreasuryReportById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(treasuryReports).where(and(eq(treasuryReports.id, id), eq(treasuryReports.churchId, churchId))).limit(1);
  return rows[0] ?? null;
}

export async function issueTreasuryReport(data: { churchId: number; serviceId: number; countSheetId: number; actorChurchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [service, countSheet, deposit, existingReports, transactions] = await Promise.all([
    getTreasuryServiceById(data.serviceId, data.churchId),
    getTreasuryCountSheetById(data.countSheetId, data.churchId),
    getTreasuryDepositByCountSheet(data.countSheetId, data.churchId),
    getTreasuryReportsByChurch(data.churchId),
    db.select().from(financialTransactions).where(and(eq(financialTransactions.churchId, data.churchId), sql`${financialTransactions.status} <> 'rascunho'`, or(eq(financialTransactions.serviceId, data.serviceId), eq(financialTransactions.countSheetId, data.countSheetId)))).orderBy(financialTransactions.transactionDate, financialTransactions.id),
  ]);
  if (!service || !countSheet || countSheet.serviceId !== data.serviceId || countSheet.status !== "fechada") return null;
  const peopleIds = [countSheet.counterOnePersonId, countSheet.counterTwoPersonId];
  const namedPeople = await db.select({ id: people.id, fullName: people.fullName }).from(people).where(and(eq(people.churchId, data.churchId), or(eq(people.id, peopleIds[0]), eq(people.id, peopleIds[1]))));
  const nameById = new Map(namedPeople.map((person) => [person.id, person.fullName]));
  const snapshot: TreasuryReportSnapshot = {
    service: service as unknown as Record<string, unknown>,
    countSheet: countSheet as unknown as Record<string, unknown>,
    counters: { one: nameById.get(peopleIds[0]) ?? "Não informado", two: nameById.get(peopleIds[1]) ?? "Não informado" },
    deposit: deposit as unknown as Record<string, unknown> | null,
    transactions: transactions as unknown as Array<Record<string, unknown>>,
    issuedAt: new Date().toISOString(),
  };
  const version = existingReports.filter((report) => report.serviceId === data.serviceId).length + 1;
  const result = await db.insert(treasuryReports).values({ churchId: data.churchId, serviceId: data.serviceId, countSheetId: data.countSheetId, reportType: "culto_diario", version, status: "emitido", snapshot, issuedByChurchUserId: data.actorChurchUserId });
  const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
  return id ? getTreasuryReportById(id, data.churchId) : null;
}

export async function signTreasuryReport(data: { id: number; churchId: number; role: "contador1" | "contador2" | "tesoureiro" | "pastor" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const report = await getTreasuryReportById(data.id, data.churchId);
  if (!report) return null;
  const field = data.role === "contador1" ? "signedByCounterOneAt" : data.role === "contador2" ? "signedByCounterTwoAt" : data.role === "tesoureiro" ? "signedByTreasurerAt" : "signedByPastorAt";
  await db.update(treasuryReports).set({ [field]: new Date(), status: "assinado" }).where(and(eq(treasuryReports.id, data.id), eq(treasuryReports.churchId, data.churchId)));
  return getTreasuryReportById(data.id, data.churchId);
}

export async function getFinancialTransactionsByService(churchId: number, serviceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financialTransactions).where(and(eq(financialTransactions.churchId, churchId), eq(financialTransactions.serviceId, serviceId))).orderBy(financialTransactions.transactionDate, financialTransactions.id);
}

export async function getFinancialTransactionsByCountSheet(churchId: number, countSheetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financialTransactions).where(and(eq(financialTransactions.churchId, churchId), eq(financialTransactions.countSheetId, countSheetId))).orderBy(financialTransactions.transactionDate, financialTransactions.id);
}

export async function getTreasuryServiceParticipantNames(churchId: number, ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  if (uniqueIds.length === 0) return [];
  return db.select({ id: people.id, fullName: people.fullName }).from(people).where(and(eq(people.churchId, churchId), or(...uniqueIds.map((id) => eq(people.id, id)))));
}
