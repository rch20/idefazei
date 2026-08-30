import {
  boolean,
  date,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── CORE AUTH ───────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── MULTI-TENANT: IGREJAS ────────────────────────────────────────────────────

export const churches = mysqlTable("churches", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // subdomínio
  logoUrl: text("logoUrl"),
  pwaIconAssetId: int("pwaIconAssetId"),
  pwaIcon192Url: text("pwaIcon192Url"),
  pwaIcon512Url: text("pwaIcon512Url"),
  // custom = upload manual ativo; derived = composição automática a partir da logo.
  pwaIconSource: mysqlEnum("pwaIconSource", ["custom", "derived"]).default("derived").notNull(),
  primaryColor: varchar("primaryColor", { length: 7 }).default("#1e3a5f"),
  secondaryColor: varchar("secondaryColor", { length: 7 }).default("#c9a84c"),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 9 }),
  phone: varchar("phone", { length: 20 }),
  whatsapp: varchar("whatsapp", { length: 20 }),
  email: varchar("email", { length: 320 }),
  website: text("website"),
  socialMedia: json("socialMedia"), // { instagram, facebook, youtube }
  pastoralSupport: json("pastoralSupport"), // { url, label, enabled, showPublic, showAuthenticated }
  publicRegistrationEnabled: boolean("publicRegistrationEnabled").notNull().default(true),
  publicRegistrationTitle: varchar("publicRegistrationTitle", { length: 140 }).notNull().default("Cadastre-se e fique por perto"),
  publicRegistrationMessage: varchar("publicRegistrationMessage", { length: 500 }).notNull().default("Faça seu cadastro e acompanhe tudo o que sua igreja tem preparado para você."),
  vision: text("vision"),
  mission: text("mission"),
  values: text("values"),
  active: boolean("active").default(true).notNull(),
  // Personalização de certificados
  certPastorName: varchar("certPastorName", { length: 255 }),
  certLogoUrl: text("certLogoUrl"),
  certVerseFundamentos: text("certVerseFundamentos"),
  certVerseBatismo: text("certVerseBatismo"),
  certVerseLideres: text("certVerseLideres"),
  certSignatureLabel: varchar("certSignatureLabel", { length: 100 }).default("Pastor(a) Presidente"),
  // Stripe
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripePlan: mysqlEnum("stripePlan", ["basic", "pro", "enterprise"]),
  stripeStatus: varchar("stripeStatus", { length: 50 }), // active, trialing, past_due, canceled
  stripeCurrentPeriodEnd: timestamp("stripeCurrentPeriodEnd"),
  trialEndsAt: timestamp("trialEndsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Church = typeof churches.$inferSelect;
export type InsertChurch = typeof churches.$inferInsert;

// ─── SITE PÚBLICO MULTI-TENANT ─────────────────────────────────────────────────
// A apresentação pública fica separada do cadastro operacional da igreja. Todas as
// entidades carregam churchId para que tema, conteúdo e revisões nunca atravessem
// o limite do tenant.
export const tenantPublicSites = mysqlTable("tenant_public_sites", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  templateKey: varchar("templateKey", { length: 80 }).notNull().default("ministerial_base"),
  status: mysqlEnum("status", ["draft", "published"]).notNull().default("draft"),
  publishedRevisionId: int("publishedRevisionId"),
  seoTitle: varchar("seoTitle", { length: 255 }),
  seoDescription: varchar("seoDescription", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("tenant_public_sites_church_unique").on(table.churchId)]);

export const tenantThemes = mysqlTable("tenant_themes", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  primaryColor: varchar("primaryColor", { length: 7 }).notNull().default("#1e3a5f"),
  secondaryColor: varchar("secondaryColor", { length: 7 }).notNull().default("#c9a84c"),
  accentColor: varchar("accentColor", { length: 7 }),
  fontPair: varchar("fontPair", { length: 80 }).notNull().default("sacred_serif"),
  logoUrl: text("logoUrl"),
  faviconUrl: text("faviconUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("tenant_themes_church_unique").on(table.churchId)]);

export const mediaAssets = mysqlTable("media_assets", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  provider: mysqlEnum("provider", ["cloudinary", "manus_storage"]).notNull(),
  resourceType: mysqlEnum("resourceType", ["image", "video", "raw"]).notNull().default("image"),
  purpose: mysqlEnum("purpose", ["tenant_logo", "tenant_pwa_icon", "tenant_public_gallery", "tenant_public_hero", "certificate_logo", "treasury_attachment", "public_video", "announcement_image", "other"]).notNull().default("other"),
  publicId: varchar("publicId", { length: 512 }),
  storageKey: varchar("storageKey", { length: 512 }),
  url: text("url").notNull(),
  secureUrl: text("secureUrl"),
  originalFilename: varchar("originalFilename", { length: 255 }),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  bytes: int("bytes").notNull().default(0),
  width: int("width"),
  height: int("height"),
  durationSeconds: int("durationSeconds"),
  entityType: varchar("entityType", { length: 80 }),
  entityId: int("entityId"),
  uploadedByChurchUserId: int("uploadedByChurchUserId"),
  status: mysqlEnum("status", ["active", "deleted"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("media_assets_church_idx").on(table.churchId),
  index("media_assets_church_purpose_idx").on(table.churchId, table.purpose),
  index("media_assets_provider_public_id_idx").on(table.provider, table.publicId),
]);

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type InsertMediaAsset = typeof mediaAssets.$inferInsert;

export const tenantPageSections = mysqlTable("tenant_page_sections", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  siteId: int("siteId").notNull(),
  sectionType: mysqlEnum("sectionType", ["hero", "welcome", "about", "schedule", "events", "ministries", "gallery", "contact", "footer"]).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: int("sortOrder").notNull().default(0),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("tenant_page_sections_church_site_idx").on(table.churchId, table.siteId),
  uniqueIndex("tenant_page_sections_site_type_unique").on(table.siteId, table.sectionType),
]);

export const tenantPageRevisions = mysqlTable("tenant_page_revisions", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  siteId: int("siteId").notNull(),
  version: int("version").notNull(),
  snapshot: json("snapshot").notNull(),
  createdByChurchUserId: int("createdByChurchUserId"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("tenant_page_revisions_church_site_idx").on(table.churchId, table.siteId),
  uniqueIndex("tenant_page_revisions_site_version_unique").on(table.siteId, table.version),
]);

export type TenantPublicSite = typeof tenantPublicSites.$inferSelect;
export type TenantTheme = typeof tenantThemes.$inferSelect;
export type TenantPageSection = typeof tenantPageSections.$inferSelect;
export type TenantPageRevision = typeof tenantPageRevisions.$inferSelect;

// ─── MEMBROS DA IGREJA (PERFIS E HIERARQUIA) ──────────────────────────────────

export const churchRoleEnum = mysqlEnum("churchRole", [
  "pastor_presidente",
  "pastor_local",
  "supervisor",
  "lider",
  "consolidador",
  "diacono",
  "secretario",
  "tesoureiro",
  "membro",
]);

export const churchMembers = mysqlTable("church_members", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  userId: int("userId"), // null = pessoa sem login
  personId: int("personId"), // referência à tabela people
  role: mysqlEnum("role", [
    "pastor_presidente",
    "pastor_local",
    "supervisor",
    "lider",
    "consolidador",
    "diacono",
    "secretario",
    "tesoureiro",
    "membro",
  ])
    .default("membro")
    .notNull(),
  active: boolean("active").default(true).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChurchMember = typeof churchMembers.$inferSelect;

// ─── PESSOAS ──────────────────────────────────────────────────────────────────

export const people = mysqlTable("people", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  // Dados pessoais
  photoUrl: text("photoUrl"),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }),
  rg: varchar("rg", { length: 20 }),
  birthDate: date("birthDate"),
  gender: mysqlEnum("gender", ["masculino", "feminino", "outro"]),
  maritalStatus: mysqlEnum("maritalStatus", [
    "solteiro",
    "casado",
    "divorciado",
    "viuvo",
    "uniao_estavel",
  ]),
  profession: varchar("profession", { length: 100 }),
  education: varchar("education", { length: 100 }),
  // Contato
  phone: varchar("phone", { length: 20 }),
  whatsapp: varchar("whatsapp", { length: 20 }),
  email: varchar("email", { length: 320 }),
  // Endereço
  zipCode: varchar("zipCode", { length: 9 }),
  street: varchar("street", { length: 255 }),
  number: varchar("number", { length: 10 }),
  neighborhood: varchar("neighborhood", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  // Dados espirituais
  conversionDate: date("conversionDate"),
  baptismDate: date("baptismDate"),
  previousChurch: varchar("previousChurch", { length: 255 }),
  pastoralNotes: text("pastoralNotes"),
  // Funil de discipulado
  discipleshipStage: mysqlEnum("discipleshipStage", [
    "nova_alma",
    "consolidacao",
    "fundamentos",
    "celula",
    "batismo",
    "encontro_com_deus",
    "escola_de_lideres",
    "lideranca",
    "multiplicador",
  ]).default("nova_alma"),
  // Rastreamento
  wonById: int("wonById"), // quem ganhou esta pessoa
  discipledById: int("discipledById"), // quem discipula esta pessoa
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

// ─── FAMÍLIAS ─────────────────────────────────────────────────────────────────

export const families = mysqlTable("families", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  familyName: varchar("familyName", { length: 255 }).notNull(),
  fatherId: int("fatherId"),
  motherId: int("motherId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const familyMembers = mysqlTable("family_members", {
  id: int("id").autoincrement().primaryKey(),
  familyId: int("familyId").notNull(),
  personId: int("personId").notNull(),
  relation: mysqlEnum("relation", ["pai", "mae", "filho", "filha", "outro"]).notNull(),
});

// ─── GANHAR ALMAS ─────────────────────────────────────────────────────────────

export const souls = mysqlTable("souls", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  personId: int("personId"), // referência à pessoa após cadastro completo
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  decisionDate: date("decisionDate").notNull(),
  origin: mysqlEnum("origin", [
    "culto",
    "evangelismo",
    "celula",
    "evento",
    "redes_sociais",
    "indicacao",
    "visita_espontanea",
  ]).notNull(),
  acceptedJesus: boolean("acceptedJesus").default(false),
  reconciliation: boolean("reconciliation").default(false),
  firstVisit: boolean("firstVisit").default(false),
  wonById: int("wonById"), // quem ganhou; opcional para visita espontânea
  notes: text("notes"),
  status: mysqlEnum("status", ["nova_alma", "em_consolidacao", "consolidado"])
    .default("nova_alma")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Soul = typeof souls.$inferSelect;

// ─── CONSOLIDAÇÃO ─────────────────────────────────────────────────────────────

export const consolidations = mysqlTable("consolidations", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  soulId: int("soulId").notNull(),
  consolidatorId: int("consolidatorId").notNull(), // churchMember
  // Checklist
  callMade: boolean("callMade").default(false),
  callDate: timestamp("callDate"),
  messageSent: boolean("messageSent").default(false),
  messageDate: timestamp("messageDate"),
  visitMade: boolean("visitMade").default(false),
  visitDate: timestamp("visitDate"),
  bibleDelivered: boolean("bibleDelivered").default(false),
  bibleDate: timestamp("bibleDate"),
  whatsappGroupAdded: boolean("whatsappGroupAdded").default(false),
  whatsappDate: timestamp("whatsappDate"),
  prayerMade: boolean("prayerMade").default(false),
  prayerDate: timestamp("prayerDate"),
  addedToCell: boolean("addedToCell").default(false),
  cellDate: timestamp("cellDate"),
  notes: text("notes"),
  status: mysqlEnum("status", ["em_consolidacao", "consolidado"])
    .default("em_consolidacao")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── RESPONSABILIDADE DE CUIDADO ───────────────────────────────────────────────

/**
 * Mantém quem responde pelo cuidado de uma Pessoa em cada momento da jornada.
 * Somente um vínculo ativo deve existir por Pessoa; os anteriores são encerrados,
 * preservando o histórico de transições pastorais.
 */
export const careAssignments = mysqlTable("care_assignments", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  personId: int("personId").notNull(),
  responsiblePersonId: int("responsiblePersonId").notNull(),
  role: mysqlEnum("role", ["quem_ganhou", "consolidador", "lider_celula", "discipulador", "pastor"])
    .notNull(),
  notes: text("notes"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CareAssignment = typeof careAssignments.$inferSelect;

// ─── CÉLULAS ──────────────────────────────────────────────────────────────────

export const cells = mysqlTable("cells", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  leaderId: int("leaderId").notNull(),
  supervisorId: int("supervisorId"),
  hostId: int("hostId"),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  neighborhood: varchar("neighborhood", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  meetingDay: mysqlEnum("meetingDay", [
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
    "domingo",
  ]),
  meetingTime: varchar("meetingTime", { length: 5 }), // HH:MM
  publicVisible: boolean("publicVisible").default(false).notNull(),
  publicLocationMode: mysqlEnum("publicLocationMode", ["approximate", "exact"]).default("approximate").notNull(),
  publicLeaderContact: boolean("publicLeaderContact").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Cell = typeof cells.$inferSelect;

export const cellMembers = mysqlTable("cell_members", {
  id: int("id").autoincrement().primaryKey(),
  cellId: int("cellId").notNull(),
  personId: int("personId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  leftAt: timestamp("leftAt"),
  active: boolean("active").default(true).notNull(),
});

export const cellMeetings = mysqlTable("cell_meetings", {
  id: int("id").autoincrement().primaryKey(),
  cellId: int("cellId").notNull(),
  churchId: int("churchId").notNull(),
  meetingDate: date("meetingDate").notNull(),
  topic: varchar("topic", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const cellAttendance = mysqlTable("cell_attendance", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  personId: int("personId"),
  visitorName: varchar("visitorName", { length: 255 }),
  status: mysqlEnum("status", ["presente", "ausente", "visitante"]).notNull(),
  isNewSoul: boolean("isNewSoul").default(false),
});

// ─── EVENTOS ──────────────────────────────────────────────────────────────────

export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", [
    "congresso",
    "conferencia",
    "vigilia",
    "retiro",
    "seminario",
    "culto",
    "outro",
  ]).notNull(),
  description: text("description"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  location: text("location"),
  maxCapacity: int("maxCapacity"),
  qrCode: text("qrCode"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const eventRegistrations = mysqlTable("event_registrations", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  personId: int("personId").notNull(),
  registeredAt: timestamp("registeredAt").defaultNow().notNull(),
  checkedIn: boolean("checkedIn").default(false),
  checkedInAt: timestamp("checkedInAt"),
  status: mysqlEnum("status", ["inscrito", "participou", "cancelado"]).default("inscrito"),
});

// ─── MINISTÉRIOS ──────────────────────────────────────────────────────────────

export const ministries = mysqlTable("ministries", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", [
    "louvor",
    "infantil",
    "recepcao",
    "midia",
    "intercessao",
    "evangelismo",
    "casais",
    "jovens",
    "consolidacao",
    "visitas",
    "outro",
  ]).notNull(),
  leaderId: int("leaderId"),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const ministryMembers = mysqlTable("ministry_members", {
  id: int("id").autoincrement().primaryKey(),
  ministryId: int("ministryId").notNull(),
  personId: int("personId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  active: boolean("active").default(true).notNull(),
});

/**
 * Função que uma Pessoa exerce em um Ministério. A chave é extensível e suas
 * permissões são resolvidas pelo catálogo central de funções do servidor.
 */
export const ministryRoleAssignments = mysqlTable("ministry_role_assignments", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  ministryId: int("ministryId").notNull(),
  personId: int("personId").notNull(),
  roleKey: varchar("roleKey", { length: 100 }).notNull(),
  active: boolean("active").default(true).notNull(),
  assignedByChurchUserId: int("assignedByChurchUserId"),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});

export type MinistryRoleAssignment = typeof ministryRoleAssignments.$inferSelect;

// ─── DEPARTAMENTOS ────────────────────────────────────────────────────────────

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  ministryId: int("ministryId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  systemKey: mysqlEnum("systemKey", ["consolidacao", "visitas"]),
  leaderId: int("leaderId"),
  supervisorId: int("supervisorId"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("department_ministry_name_idx").on(table.ministryId, table.name),
  index("department_church_ministry_idx").on(table.churchId, table.ministryId),
  index("department_church_leader_idx").on(table.churchId, table.leaderId),
  index("department_church_supervisor_idx").on(table.churchId, table.supervisorId),
  uniqueIndex("department_ministry_system_key_idx").on(table.ministryId, table.systemKey),
]);

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

export const departmentMembers = mysqlTable("department_members", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  departmentId: int("departmentId").notNull(),
  personId: int("personId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  leftAt: timestamp("leftAt"),
  active: boolean("active").default(true).notNull(),
}, (table) => [
  index("department_member_department_idx").on(table.churchId, table.departmentId, table.active),
  index("department_member_person_idx").on(table.churchId, table.personId, table.active),
]);

export const departmentRoleAssignments = mysqlTable("department_role_assignments", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  departmentId: int("departmentId").notNull(),
  personId: int("personId").notNull(),
  roleKey: varchar("roleKey", { length: 100 }).notNull(),
  active: boolean("active").default(true).notNull(),
  assignedByChurchUserId: int("assignedByChurchUserId"),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
}, (table) => [
  index("department_role_department_idx").on(table.churchId, table.departmentId, table.active),
  index("department_role_person_idx").on(table.churchId, table.personId, table.active),
]);

export const ministryRoleDefinitions = mysqlTable("ministry_role_definitions", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  ministryId: int("ministryId"),
  key: varchar("key", { length: 100 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  permissionPackage: mysqlEnum("permissionPackage", ["member", "cell_leader", "consolidator", "visitor", "treasurer", "ministry_leader", "communication_leader"]).notNull(),
  active: boolean("active").default(true).notNull(),
  createdByChurchUserId: int("createdByChurchUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("ministry_role_definition_key_idx").on(table.churchId, table.key)]);

// ─── ESCALAS ──────────────────────────────────────────────────────────────────

export const scheduleItems = mysqlTable("schedule_items", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  ministryId: int("ministryId").notNull(),
  departmentId: int("departmentId"),
  personId: int("personId").notNull(),
  scheduledDate: date("scheduledDate").notNull(),
  startTime: varchar("startTime", { length: 5 }),
  endTime: varchar("endTime", { length: 5 }),
  role: varchar("role", { length: 100 }), // função na escala
  status: mysqlEnum("status", ["agendada", "cancelada"]).default("agendada").notNull(),
  cancelledAt: timestamp("cancelledAt"),
  cancelledByChurchUserId: int("cancelledByChurchUserId"),
  cancelReason: varchar("cancelReason", { length: 500 }),
  notified: boolean("notified").default(false),
  confirmed: boolean("confirmed").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── PEDIDOS DE ORAÇÃO ────────────────────────────────────────────────────────

export const prayerRequests = mysqlTable("prayer_requests", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  personId: int("personId"),
  visitorName: varchar("visitorName", { length: 255 }),
  visitorPhone: varchar("visitorPhone", { length: 20 }),
  type: mysqlEnum("type", ["pedido", "testemunho"]).default("pedido").notNull(),
  content: text("content").notNull(),
  isPrivate: boolean("isPrivate").default(false),
  answered: boolean("answered").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── MURAL / AVISOS ───────────────────────────────────────────────────────────

export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["aviso", "evento", "comunicado", "devocional"]).default("aviso"),
  imageUrl: text("imageUrl"),
  pinned: boolean("pinned").default(false),
  publicVisible: boolean("publicVisible").notNull().default(false),
  publicStatus: mysqlEnum("publicStatus", ["rascunho", "publicado", "agendado", "arquivado"]).notNull().default("rascunho"),
  publicStartsAt: timestamp("publicStartsAt"),
  expiresAt: timestamp("expiresAt"),
  ctaLabel: varchar("ctaLabel", { length: 80 }),
  ctaHref: varchar("ctaHref", { length: 500 }),
  mediaAssetId: int("mediaAssetId"),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("announcements_church_public_idx").on(table.churchId, table.publicVisible, table.publicStatus, table.pinned),
]);

// ─── BIBLIOTECA DIGITAL ───────────────────────────────────────────────────────

export const libraryItems = mysqlTable("library_items", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["pdf", "video", "apostila", "devocional"]).notNull(),
  fileUrl: text("fileUrl"),
  thumbnailUrl: text("thumbnailUrl"),
  description: text("description"),
  requiredRole: mysqlEnum("requiredRole", [
    "pastor_presidente",
    "pastor_local",
    "supervisor",
    "lider",
    "consolidador",
    "diacono",
    "secretario",
    "tesoureiro",
    "membro",
  ]).default("membro"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── ACONSELHAMENTO PASTORAL ──────────────────────────────────────────────────

export const counselingSessions = mysqlTable("counseling_sessions", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  personId: int("personId").notNull(),
  counselorId: int("counselorId").notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  notes: text("notes"), // acesso restrito
  status: mysqlEnum("status", ["agendado", "realizado", "cancelado"]).default("agendado"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── ESCOLA DE FUNDAMENTOS ────────────────────────────────────────────────────

export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", [
    "salvacao",
    "oracao",
    "biblia",
    "igreja",
    "espirito_santo",
    "batismo",
    "outro",
  ]).notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const courseEnrollments = mysqlTable("course_enrollments", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  personId: int("personId").notNull(),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  certificateUrl: text("certificateUrl"),
  status: mysqlEnum("status", ["matriculado", "em_andamento", "concluido"]).default("matriculado"),
});

/** Conteúdo pedagógico de cada turma de Fundamentos, sempre isolado pela igreja. */
export const foundationStudies = mysqlTable("foundation_studies", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  courseId: int("courseId").notNull(),
  moduleId: int("moduleId"),
  title: varchar("title", { length: 160 }).notNull(),
  summary: varchar("summary", { length: 500 }),
  content: text("content"),
  position: int("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdByChurchUserId: int("createdByChurchUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("foundation_studies_church_course_position_idx").on(table.churchId, table.courseId, table.position),
  index("foundation_studies_church_module_position_idx").on(table.churchId, table.moduleId, table.position),
]);

/** Etapas visuais de uma jornada de Fundamentos; cada módulo organiza estudos de uma turma. */
export const foundationModules = mysqlTable("foundation_modules", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  courseId: int("courseId").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  description: varchar("description", { length: 500 }),
  position: int("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdByChurchUserId: int("createdByChurchUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("foundation_modules_church_course_position_idx").on(table.churchId, table.courseId, table.position),
]);

/** Referências ordenadas a materiais do acervo, sem copiar arquivos para cada estudo ou turma. */
export const foundationStudyMaterials = mysqlTable("foundation_study_materials", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  studyId: int("studyId").notNull(),
  libraryItemId: int("libraryItemId").notNull(),
  position: int("position").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("foundation_study_materials_church_study_position_idx").on(table.churchId, table.studyId, table.position),
  uniqueIndex("foundation_study_materials_study_library_unique").on(table.churchId, table.studyId, table.libraryItemId),
]);

/** Delegação explícita do Pastor para administrar estudos da Escola de Fundamentos. */
export const foundationStudyAdministrators = mysqlTable("foundation_study_administrators", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  churchUserId: int("churchUserId").notNull(),
  assignedByChurchUserId: int("assignedByChurchUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("foundation_study_administrators_church_idx").on(table.churchId),
  uniqueIndex("foundation_study_administrators_church_user_unique").on(table.churchId, table.churchUserId),
]);

// ─── AUTENTICAÇÃO PRÓPRIA DA PLATAFORMA ──────────────────────────────────────

/** Usuários das igrejas (login próprio, sem Manus OAuth) */
export const churchUsers = mysqlTable("church_users", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: mysqlEnum("role", [
    "pastor_presidente",
    "pastor_local",
    "supervisor",
    "lider",
    "consolidador",
    "diacono",
    "secretario",
    "tesoureiro",
    "membro",
  ]).default("membro").notNull(),
  personId: int("personId"), // vínculo com tabela people
  active: boolean("active").default(true).notNull(),
  registrationStatus: mysqlEnum("registrationStatus", ["approved", "pending", "rejected"]).default("approved").notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedByChurchUserId: int("approvedByChurchUserId"),
  rejectionReason: text("rejectionReason"),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChurchUser = typeof churchUsers.$inferSelect;
export type InsertChurchUser = typeof churchUsers.$inferInsert;

/** Atribuições adicionais de serviço; não substituem a função principal de hierarquia. */
export const churchUserComplementaryRoleEnum = mysqlEnum("churchUserComplementaryRole", [
  "consolidador",
  "diacono",
  "tesoureiro",
  "levita",
]);

export const churchUserComplementaryRoles = mysqlTable("church_user_complementary_roles", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  churchUserId: int("churchUserId").notNull(),
  role: churchUserComplementaryRoleEnum.notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChurchUserComplementaryRole = typeof churchUserComplementaryRoles.$inferSelect;

/** Super Admins da plataforma SaaS */
export const superAdmins = mysqlTable("super_admins", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SuperAdmin = typeof superAdmins.$inferSelect;

/** Estado singleton que impede duas criações concorrentes do primeiro Super Admin. */
export const superAdminBootstrap = mysqlTable("super_admin_bootstrap", {
  id: int("id").primaryKey(),
  configuredAt: timestamp("configuredAt").defaultNow().notNull(),
});

// ─── PLANOS E ASSINATURAS ─────────────────────────────────────────────────────

export const plans = mysqlTable("plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // Básico, Pro, Enterprise
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  description: text("description"),
  priceMonthly: decimal("priceMonthly", { precision: 10, scale: 2 }),
  priceYearly: decimal("priceYearly", { precision: 10, scale: 2 }),
  maxMembers: int("maxMembers"), // null = ilimitado
  maxCells: int("maxCells"),
  features: json("features"), // lista de features habilitadas
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Plan = typeof plans.$inferSelect;

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull().unique(),
  planId: int("planId").notNull(),
  status: mysqlEnum("status", ["trial", "active", "suspended", "cancelled", "pending"]).default("pending").notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelledAt: timestamp("cancelledAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Consolidation = typeof consolidations.$inferSelect;

// ─── ENCAMINHAMENTOS PARA CONSOLIDAÇÃO ─────────────────────────────────────────

/**
 * Solicitações de resgate enviadas por Líderes, Supervisores ou Pastores quando
 * uma Pessoa precisa de acompanhamento adicional. Não substitui a Consolidação
 * inicial de Nova Alma nem cria uma nova ficha de Pessoa.
 */
export const consolidationReferrals = mysqlTable("consolidation_referrals", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  personId: int("personId").notNull(),
  referredByPersonId: int("referredByPersonId").notNull(),
  preferredConsolidatorId: int("preferredConsolidatorId"),
  assignedToPersonId: int("assignedToPersonId"),
  assignedByChurchUserId: int("assignedByChurchUserId"),
  assignedAt: timestamp("assignedAt"),
  acceptedByPersonId: int("acceptedByPersonId"),
  approvedByPersonId: int("approvedByPersonId"),
  departmentId: int("departmentId"),
  sourceType: mysqlEnum("sourceType", ["pastoral", "celula", "ministerio", "departamento"]).default("pastoral").notNull(),
  sourceCellId: int("sourceCellId"),
  sourceMinistryId: int("sourceMinistryId"),
  sourceDepartmentId: int("sourceDepartmentId"),
  priority: mysqlEnum("priority", ["baixa", "normal", "alta", "urgente"]).default("normal").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["pendente", "aprovado", "aceito", "em_acompanhamento", "encerrado", "cancelado"])
    .default("pendente")
    .notNull(),
  referredAt: timestamp("referredAt").defaultNow().notNull(),
  careDueAt: timestamp("careDueAt"),
  acceptedAt: timestamp("acceptedAt"),
  approvedAt: timestamp("approvedAt"),
  firstContactAt: timestamp("firstContactAt"),
  closedAt: timestamp("closedAt"),
  closeNotes: text("closeNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("consolidation_referral_queue_idx").on(table.churchId, table.status, table.careDueAt),
  index("consolidation_referral_assignee_idx").on(table.churchId, table.assignedToPersonId, table.status),
  index("consolidation_referral_department_idx").on(table.churchId, table.departmentId, table.status),
  index("consolidation_referral_person_idx").on(table.churchId, table.personId, table.status),
]);

export type ConsolidationReferral = typeof consolidationReferrals.$inferSelect;

/** Histórico imutável de atribuição e reatribuição dos casos de Consolidação. */
export const consolidationCaseAssignments = mysqlTable("consolidation_case_assignments", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  referralId: int("referralId").notNull(),
  action: mysqlEnum("action", ["atribuido", "reatribuido", "aprovado", "aceito", "devolvido_fila"]).notNull(),
  fromPersonId: int("fromPersonId"),
  toPersonId: int("toPersonId"),
  performedByChurchUserId: int("performedByChurchUserId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("consolidation_case_assignment_referral_idx").on(table.churchId, table.referralId, table.createdAt),
]);

/** Histórico imutável de contatos e ações executadas durante um encaminhamento de resgate. */
export const consolidationFollowUps = mysqlTable("consolidation_follow_ups", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  referralId: int("referralId").notNull(),
  recordedByPersonId: int("recordedByPersonId").notNull(),
  contactChannel: mysqlEnum("contactChannel", ["whatsapp", "ligacao", "mensagem", "visita", "presencial", "outro"]).notNull(),
  outcome: mysqlEnum("outcome", ["conversou", "sem_resposta", "retornar", "agendou_visita", "visitou", "recusou_contato", "outro"]).notNull(),
  notes: text("notes").notNull(),
  nextAction: varchar("nextAction", { length: 255 }),
  nextActionAt: timestamp("nextActionAt"),
  visitStatus: mysqlEnum("visitStatus", ["nao_necessaria", "solicitada", "agendada", "realizada", "cancelada"]).default("nao_necessaria").notNull(),
  visitAssigneePersonId: int("visitAssigneePersonId"),
  visitScheduledAt: timestamp("visitScheduledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConsolidationFollowUp = typeof consolidationFollowUps.$inferSelect;

// ─── VISITAS DO CUIDADO ────────────────────────────────────────────────────────

/** Visita pastoral ou de Consolidação com identidade e ciclo de vida próprios. */
export const careVisits = mysqlTable("care_visits", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  referralId: int("referralId").notNull(),
  departmentId: int("departmentId"),
  requestedByPersonId: int("requestedByPersonId").notNull(),
  assignedToPersonId: int("assignedToPersonId"),
  assignedByChurchUserId: int("assignedByChurchUserId"),
  priority: mysqlEnum("priority", ["baixa", "normal", "alta", "urgente"]).default("normal").notNull(),
  status: mysqlEnum("status", ["solicitada", "agendada", "em_andamento", "realizada", "cancelada"]).default("solicitada").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  address: text("address"),
  scheduledAt: timestamp("scheduledAt"),
  assignedAt: timestamp("assignedAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  cancelledAt: timestamp("cancelledAt"),
  completionNotes: text("completionNotes"),
  cancellationReason: text("cancellationReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("care_visit_queue_idx").on(table.churchId, table.status, table.scheduledAt),
  index("care_visit_assignee_idx").on(table.churchId, table.assignedToPersonId, table.status),
  index("care_visit_referral_idx").on(table.churchId, table.referralId),
  index("care_visit_department_idx").on(table.churchId, table.departmentId, table.status),
]);

export type CareVisit = typeof careVisits.$inferSelect;

/** Trilha imutável de atribuição, agenda, cancelamento e conclusão da Visita. */
export const careVisitEvents = mysqlTable("care_visit_events", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  visitId: int("visitId").notNull(),
  action: mysqlEnum("action", ["criada", "atribuida", "aceita", "reatribuida", "agendada", "reagendada", "iniciada", "concluida", "cancelada"]).notNull(),
  fromPersonId: int("fromPersonId"),
  toPersonId: int("toPersonId"),
  performedByChurchUserId: int("performedByChurchUserId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("care_visit_event_visit_idx").on(table.churchId, table.visitId, table.createdAt),
]);

// ─── STATUS DE APROVAÇÃO DA IGREJA ───────────────────────────────────────────

/** Estende a tabela churches com campos de aprovação */
export const churchRegistrations = mysqlTable("church_registrations", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull().unique(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "suspended"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"), // superAdminId
  reviewedAt: timestamp("reviewedAt"),
  rejectionReason: text("rejectionReason"),
  suspensionReason: text("suspensionReason"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

export type ChurchRegistration = typeof churchRegistrations.$inferSelect;

// ─── PORTAL DO VISITANTE ──────────────────────────────────────────────────────

export const visitorLeads = mysqlTable("visitor_leads", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  type: mysqlEnum("type", [
    "pedido_oracao",
    "visita_pastoral",
    "primeira_visita",
    "interesse_participar",
  ]).notNull(),
  message: text("message"),
  status: mysqlEnum("status", ["novo", "em_contato", "convertido", "encerrado"]).default("novo").notNull(),
  assignedTo: int("assignedTo"), // personId do responsável
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VisitorLead = typeof visitorLeads.$inferSelect;

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

export const onboardingProgress = mysqlTable("onboarding_progress", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  stepWelcome: boolean("stepWelcome").default(false).notNull(),
  stepImportMembers: boolean("stepImportMembers").default(false).notNull(),
  stepCreateCell: boolean("stepCreateCell").default(false).notNull(),
  stepInviteLeaders: boolean("stepInviteLeaders").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type InsertOnboardingProgress = typeof onboardingProgress.$inferInsert;

// ─── BATISMO ──────────────────────────────────────────────────────────────────

export const baptismClasses = mysqlTable("baptism_classes", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  date: date("date").notNull(),
  location: varchar("location", { length: 255 }),
  pastor: varchar("pastor", { length: 255 }),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BaptismClass = typeof baptismClasses.$inferSelect;

export const baptismEnrollments = mysqlTable("baptism_enrollments", {
  id: int("id").autoincrement().primaryKey(),
  baptismClassId: int("baptismClassId").notNull(),
  personId: int("personId").notNull(),
  churchId: int("churchId").notNull(),
  status: mysqlEnum("status", ["inscrito", "participou", "concluiu", "cancelado"]).default("inscrito").notNull(),
  certificateUrl: text("certificateUrl"),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type BaptismEnrollment = typeof baptismEnrollments.$inferSelect;

// ─── ENCONTRO COM DEUS ────────────────────────────────────────────────────────

export const encounterEvents = mysqlTable("encounter_events", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  date: date("date").notNull(),
  endDate: date("endDate"),
  location: varchar("location", { length: 255 }),
  maxParticipants: int("maxParticipants"),
  description: text("description"),
  status: mysqlEnum("status", ["rascunho", "planejamento", "confirmado", "em_andamento", "encerrado", "cancelado"]).default("planejamento").notNull(),
  responsiblePersonId: int("responsiblePersonId"),
  generalNotes: text("generalNotes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("encounter_events_church_status_idx").on(table.churchId, table.status),
  index("encounter_events_responsible_idx").on(table.churchId, table.responsiblePersonId),
]);

export type EncounterEvent = typeof encounterEvents.$inferSelect;

export const encounterEnrollments = mysqlTable("encounter_enrollments", {
  id: int("id").autoincrement().primaryKey(),
  encounterEventId: int("encounterEventId").notNull(),
  personId: int("personId").notNull(),
  churchId: int("churchId").notNull(),
  status: mysqlEnum("status", ["inscrito", "confirmado", "participou", "concluiu", "cancelado"]).default("inscrito").notNull(),
  source: mysqlEnum("source", ["manual", "public_form"]).default("manual").notNull(),
  notes: text("notes"),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
  completedAt: timestamp("completedAt"),
  cancelledAt: timestamp("cancelledAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("encounter_enrollments_event_person_unique").on(table.churchId, table.encounterEventId, table.personId),
  index("encounter_enrollments_event_status_idx").on(table.churchId, table.encounterEventId, table.status),
]);

export type EncounterEnrollment = typeof encounterEnrollments.$inferSelect;

/** Link público revogável usado somente para receber fichas daquele encontro. */
export const encounterPublicForms = mysqlTable("encounter_public_forms", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  encounterEventId: int("encounterEventId").notNull(),
  publicToken: varchar("publicToken", { length: 96 }).notNull(),
  active: boolean("active").default(true).notNull(),
  expiresAt: timestamp("expiresAt"),
  revokedAt: timestamp("revokedAt"),
  createdByPersonId: int("createdByPersonId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("encounter_public_forms_token_unique").on(table.publicToken),
  index("encounter_public_forms_event_active_idx").on(table.churchId, table.encounterEventId, table.active),
]);

export type EncounterPublicForm = typeof encounterPublicForms.$inferSelect;

/** Dados privados enviados pelo discípulo para uma edição específica do encontro. */
export const encounterDiscipleForms = mysqlTable("encounter_disciple_forms", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  encounterEventId: int("encounterEventId").notNull(),
  encounterEnrollmentId: int("encounterEnrollmentId").notNull(),
  personId: int("personId").notNull(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  age: int("age").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  guardianName: varchar("guardianName", { length: 255 }).notNull(),
  guardianPhone: varchar("guardianPhone", { length: 20 }).notNull(),
  friendName: varchar("friendName", { length: 255 }).notNull(),
  friendPhone: varchar("friendPhone", { length: 20 }).notNull(),
  attendingChurch: varchar("attendingChurch", { length: 255 }).notNull(),
  invitedByName: varchar("invitedByName", { length: 255 }).notNull(),
  reviewStatus: mysqlEnum("reviewStatus", ["recebida", "em_analise", "confirmada", "precisa_correcao", "rejeitada"]).default("recebida").notNull(),
  reviewNotes: text("reviewNotes"),
  consentAccepted: boolean("consentAccepted").notNull(),
  consentVersion: varchar("consentVersion", { length: 20 }).default("v1").notNull(),
  consentAcceptedAt: timestamp("consentAcceptedAt").defaultNow().notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewedByPersonId: int("reviewedByPersonId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("encounter_disciple_forms_enrollment_unique").on(table.churchId, table.encounterEnrollmentId),
  index("encounter_disciple_forms_event_review_idx").on(table.churchId, table.encounterEventId, table.reviewStatus),
]);

export type EncounterDiscipleForm = typeof encounterDiscipleForms.$inferSelect;

/** Equipes eventuais do encontro; não alteram Ministérios permanentes da igreja. */
export const encounterTeams = mysqlTable("encounter_teams", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  encounterEventId: int("encounterEventId").notNull(),
  parentTeamId: int("parentTeamId"),
  name: varchar("name", { length: 120 }).notNull(),
  category: mysqlEnum("category", ["lideranca", "espiritual", "apoio", "operacional", "manual"]).default("operacional").notNull(),
  source: mysqlEnum("source", ["padrao", "manual"]).default("padrao").notNull(),
  requiredCount: int("requiredCount"),
  notes: text("notes"),
  sortOrder: int("sortOrder").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("encounter_teams_event_name_unique").on(table.churchId, table.encounterEventId, table.name),
  index("encounter_teams_parent_idx").on(table.churchId, table.encounterEventId, table.parentTeamId),
]);

export type EncounterTeam = typeof encounterTeams.$inferSelect;

/** Servo e função contextual do encontro, predefinida ou informada manualmente. */
export const encounterServantAssignments = mysqlTable("encounter_servant_assignments", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  encounterEventId: int("encounterEventId").notNull(),
  teamId: int("teamId"),
  personId: int("personId").notNull(),
  roleKey: varchar("roleKey", { length: 64 }),
  roleName: varchar("roleName", { length: 120 }).notNull(),
  roleSource: mysqlEnum("roleSource", ["catalogo", "manual"]).default("catalogo").notNull(),
  assignmentType: mysqlEnum("assignmentType", ["responsavel", "membro", "substituto"]).default("membro").notNull(),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("encounter_servants_event_person_idx").on(table.churchId, table.encounterEventId, table.personId),
  index("encounter_servants_event_team_idx").on(table.churchId, table.encounterEventId, table.teamId, table.active),
]);

export type EncounterServantAssignment = typeof encounterServantAssignments.$inferSelect;

export const encounterChecklistItems = mysqlTable("encounter_checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  encounterEventId: int("encounterEventId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["estrutura", "discipulos", "servos", "intercessao", "alimentacao", "logistica", "comunicacao", "pos_encontro", "outro"]).default("outro").notNull(),
  assignedPersonId: int("assignedPersonId"),
  dueAt: timestamp("dueAt"),
  status: mysqlEnum("status", ["pendente", "em_andamento", "concluida", "cancelada"]).default("pendente").notNull(),
  notes: text("notes"),
  sortOrder: int("sortOrder").default(0).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("encounter_checklist_event_status_idx").on(table.churchId, table.encounterEventId, table.status),
  index("encounter_checklist_assignee_idx").on(table.churchId, table.assignedPersonId, table.dueAt),
]);

export type EncounterChecklistItem = typeof encounterChecklistItems.$inferSelect;

/** Trilha imutável das mudanças operacionais importantes do encontro. */
export const encounterHistory = mysqlTable("encounter_history", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  encounterEventId: int("encounterEventId").notNull(),
  actorPersonId: int("actorPersonId"),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: mysqlEnum("entityType", ["encontro", "discipulo", "ficha", "equipe", "servo", "checklist", "link_publico"]).notNull(),
  entityId: int("entityId"),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("encounter_history_event_created_idx").on(table.churchId, table.encounterEventId, table.createdAt),
]);

export type EncounterHistory = typeof encounterHistory.$inferSelect;

// ─── ESCOLA DE LÍDERES ────────────────────────────────────────────────────────

export const leadershipSchoolClasses = mysqlTable("leadership_school_classes", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  period: varchar("period", { length: 100 }), // ex: "1º Semestre 2025"
  startDate: date("startDate"),
  endDate: date("endDate"),
  pastor: varchar("pastor", { length: 255 }),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeadershipSchoolClass = typeof leadershipSchoolClasses.$inferSelect;

export const leadershipSchoolEnrollments = mysqlTable("leadership_school_enrollments", {
  id: int("id").autoincrement().primaryKey(),
  classId: int("classId").notNull(),
  personId: int("personId").notNull(),
  churchId: int("churchId").notNull(),
  status: mysqlEnum("status", ["matriculado", "lider_em_formacao", "concluido", "cancelado"]).default("matriculado").notNull(),
  grade: decimal("grade", { precision: 4, scale: 2 }),
  attendance: int("attendance").default(0), // % presença
  certificateUrl: text("certificateUrl"),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type LeadershipSchoolEnrollment = typeof leadershipSchoolEnrollments.$inferSelect;

// ─── HISTÓRICO DE LIDERANÇA ───────────────────────────────────────────────────

export const leadershipHistory = mysqlTable("leadership_history", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  personId: int("personId").notNull(),
  role: mysqlEnum("role", [
    "pastor_presidente",
    "pastor_local",
    "supervisor",
    "lider",
    "consolidador",
    "diacono",
    "secretario",
    "tesoureiro",
    "membro",
  ]).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  ministry: varchar("ministry", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeadershipHistory = typeof leadershipHistory.$inferSelect;

// ─── ACONSELHAMENTO PASTORAL (NOTAS) ─────────────────────────────────────────

export const counselingNotes = mysqlTable("counseling_notes", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  churchId: int("churchId").notNull(),
  authorId: int("authorId").notNull(), // churchUserId do pastor
  content: text("content").notNull(),
  confidential: boolean("confidential").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CounselingNote = typeof counselingNotes.$inferSelect;

// ─── COMUNICAÇÃO ──────────────────────────────────────────────────────────────

export const communicationLogs = mysqlTable("communication_logs", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  type: mysqlEnum("type", ["push", "email", "whatsapp", "sms"]).notNull(),
  category: mysqlEnum("category", [
    "boas_vindas",
    "aniversario",
    "lembrete_evento",
    "lembrete_celula",
    "convite",
    "aviso",
    "outro",
  ]).notNull(),
  recipientPersonId: int("recipientPersonId"),
  recipientName: varchar("recipientName", { length: 255 }),
  title: varchar("title", { length: 255 }),
  message: text("message"),
  status: mysqlEnum("status", ["enviado", "entregue", "falhou"]).default("enviado").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type CommunicationLog = typeof communicationLogs.$inferSelect;

// ─── NOTIFICAÇÕES MULTI-CANAL ─────────────────────────────────────────────────

/**
 * Evento de negócio independente do canal. A mesma ocorrência pode gerar uma
 * entrega interna hoje e, no futuro, uma entrega pela API oficial do WhatsApp.
 */
export const notificationEvents = mysqlTable("notification_events", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  type: mysqlEnum("type", [
    "cadastro_pendente",
    "pessoa_aprovada",
    "visita_agendada",
    "lembrete_visita",
    "visita_nao_realizada",
    "responsabilidade_atribuida",
    "funcao_ministerial_atribuida",
    "evento_igreja",
    "comunicado_lideranca",
    "encaminhamento_sem_aceite",
    "lembrete_escala",
    "escala_alterada",
    "escala_cancelada",
  ]).notNull(),
  entityType: varchar("entityType", { length: 80 }),
  entityId: int("entityId"),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  metadata: json("metadata"),
  dedupeKey: varchar("dedupeKey", { length: 190 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("notification_events_church_created_idx").on(table.churchId, table.createdAt),
  uniqueIndex("notification_events_church_dedupe_unique").on(table.churchId, table.dedupeKey),
]);

export type NotificationEvent = typeof notificationEvents.$inferSelect;

/**
 * Registro individual de entrega por destinatário e canal. O canal WhatsApp
 * permanece apenas como estrutura de dados até a integração oficial futura.
 */
export const notificationDeliveries = mysqlTable("notification_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  eventId: int("eventId").notNull(),
  recipientChurchUserId: int("recipientChurchUserId").notNull(),
  channel: mysqlEnum("channel", ["sistema", "whatsapp"]).notNull(),
  status: mysqlEnum("status", ["pendente", "entregue", "lida", "ignorada", "falhou"]).default("pendente").notNull(),
  deliveredAt: timestamp("deliveredAt"),
  readAt: timestamp("readAt"),
  providerMessageId: varchar("providerMessageId", { length: 255 }),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("notification_deliveries_recipient_status_idx").on(table.churchId, table.recipientChurchUserId, table.status),
  uniqueIndex("notification_deliveries_event_recipient_channel_unique").on(table.eventId, table.recipientChurchUserId, table.channel),
]);

export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;

/** Preferências por igreja; ausência de registro usa Sistema ativo e WhatsApp inativo. */
export const churchNotificationPreferences = mysqlTable("church_notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  eventType: mysqlEnum("eventType", [
    "cadastro_pendente",
    "pessoa_aprovada",
    "visita_agendada",
    "lembrete_visita",
    "visita_nao_realizada",
    "responsabilidade_atribuida",
    "funcao_ministerial_atribuida",
    "evento_igreja",
    "comunicado_lideranca",
    "encaminhamento_sem_aceite",
    "lembrete_escala",
    "escala_alterada",
    "escala_cancelada",
  ]).notNull(),
  channel: mysqlEnum("channel", ["sistema", "whatsapp"]).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("church_notification_preferences_unique").on(table.churchId, table.eventType, table.channel),
]);

export type ChurchNotificationPreference = typeof churchNotificationPreferences.$inferSelect;

// ─── DIAGNÓSTICOS DE INICIALIZAÇÃO ────────────────────────────────────────────

/**
 * Falhas técnicas de bootstrap informadas pelo cliente. Não armazena tokens,
 * e-mails, conteúdo de formulários, IP ou outros dados pessoais.
 */
export const startupDiagnostics = mysqlTable("startup_diagnostics", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId"),
  kind: mysqlEnum("kind", ["error", "unhandled_rejection", "resource_load", "startup_timeout", "recovery"]).notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  fingerprint: varchar("fingerprint", { length: 96 }).notNull(),
  path: varchar("path", { length: 255 }).notNull(),
  userAgent: varchar("userAgent", { length: 500 }).notNull(),
  platform: varchar("platform", { length: 120 }),
  appVersion: varchar("appVersion", { length: 80 }),
  clientId: varchar("clientId", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("startup_diagnostics_created_idx").on(table.createdAt),
  index("startup_diagnostics_church_created_idx").on(table.churchId, table.createdAt),
  index("startup_diagnostics_fingerprint_created_idx").on(table.fingerprint, table.createdAt),
]);

export type StartupDiagnostic = typeof startupDiagnostics.$inferSelect;

// ─── TESOURARIA DA IGREJA ──────────────────────────────────────────────────────

/** Programações fixas semanais que geram ocorrências de culto sob demanda. */
export const treasuryRecurringSchedules = mysqlTable(
  "treasury_recurring_schedules",
  {
    id: int("id").autoincrement().primaryKey(),
    churchId: int("churchId").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    weekday: int("weekday").notNull(), // 0 = domingo ... 6 = sábado
    startTime: varchar("startTime", { length: 5 }).notNull(),
    location: varchar("location", { length: 160 }),
    notes: text("notes"),
    active: boolean("active").default(true).notNull(),
    createdByChurchUserId: int("createdByChurchUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("treasury_recurring_schedules_church_slot_unique").on(table.churchId, table.weekday, table.startTime, table.name),
    index("treasury_recurring_schedules_church_active_idx").on(table.churchId, table.active),
  ]
);

export type TreasuryRecurringSchedule = typeof treasuryRecurringSchedules.$inferSelect;

/** Cultos/serviços que podem originar uma prestação de contas financeira. */
export const treasuryServices = mysqlTable(
  "treasury_services",
  {
    id: int("id").autoincrement().primaryKey(),
    churchId: int("churchId").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    serviceDate: date("serviceDate").notNull(),
    startTime: varchar("startTime", { length: 5 }),
    location: varchar("location", { length: 160 }),
    notes: text("notes"),
    origin: mysqlEnum("origin", ["manual", "recorrente"]).default("manual").notNull(),
    recurringScheduleId: int("recurringScheduleId"),
    occurrenceOverride: boolean("occurrenceOverride").default(false).notNull(),
    status: mysqlEnum("status", ["aberto", "fechado", "cancelado"]).default("aberto").notNull(),
    createdByChurchUserId: int("createdByChurchUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("treasury_services_church_date_idx").on(table.churchId, table.serviceDate),
    uniqueIndex("treasury_services_church_schedule_date_unique").on(table.churchId, table.recurringScheduleId, table.serviceDate),
  ]
);

export type TreasuryService = typeof treasuryServices.$inferSelect;

/** Folha de contagem por culto, com dupla conferência e totais por meio de pagamento. */
export const treasuryCountSheets = mysqlTable(
  "treasury_count_sheets",
  {
    id: int("id").autoincrement().primaryKey(),
    churchId: int("churchId").notNull(),
    serviceId: int("serviceId").notNull(),
    counterOnePersonId: int("counterOnePersonId").notNull(),
    counterTwoPersonId: int("counterTwoPersonId").notNull(),
    cashCents: int("cashCents").default(0).notNull(),
    pixCents: int("pixCents").default(0).notNull(),
    transferCents: int("transferCents").default(0).notNull(),
    cardCents: int("cardCents").default(0).notNull(),
    checkCents: int("checkCents").default(0).notNull(),
    otherCents: int("otherCents").default(0).notNull(),
    totalCents: int("totalCents").default(0).notNull(),
    status: mysqlEnum("status", ["rascunho", "conferida", "fechada"]).default("rascunho").notNull(),
    notes: text("notes"),
    confirmedAt: timestamp("confirmedAt"),
    confirmedByChurchUserId: int("confirmedByChurchUserId"),
    createdByChurchUserId: int("createdByChurchUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("treasury_count_sheets_church_service_unique").on(table.churchId, table.serviceId)]
);

export type TreasuryCountSheet = typeof treasuryCountSheets.$inferSelect;

/** Depósito relacionado a uma folha de contagem; não substitui a conciliação bancária. */
export const treasuryDeposits = mysqlTable(
  "treasury_deposits",
  {
    id: int("id").autoincrement().primaryKey(),
    churchId: int("churchId").notNull(),
    countSheetId: int("countSheetId").notNull(),
    accountId: int("accountId").notNull(),
    amountCents: int("amountCents").notNull(),
    depositDate: date("depositDate").notNull(),
    reference: varchar("reference", { length: 160 }),
    notes: text("notes"),
    status: mysqlEnum("status", ["pendente", "depositado", "conferido"]).default("pendente").notNull(),
    depositedByChurchUserId: int("depositedByChurchUserId"),
    depositedAt: timestamp("depositedAt"),
    createdByChurchUserId: int("createdByChurchUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("treasury_deposits_church_count_sheet_unique").on(table.churchId, table.countSheetId)]
);

export type TreasuryDeposit = typeof treasuryDeposits.$inferSelect;

/** Histórico imutável de relatórios emitidos a partir de um snapshot do fechamento. */
export const treasuryReports = mysqlTable(
  "treasury_reports",
  {
    id: int("id").autoincrement().primaryKey(),
    churchId: int("churchId").notNull(),
    serviceId: int("serviceId").notNull(),
    countSheetId: int("countSheetId").notNull(),
    reportType: mysqlEnum("reportType", ["culto_diario"]).default("culto_diario").notNull(),
    version: int("version").default(1).notNull(),
    status: mysqlEnum("status", ["emitido", "assinado"]).default("emitido").notNull(),
    snapshot: json("snapshot").notNull(),
    issuedByChurchUserId: int("issuedByChurchUserId").notNull(),
    issuedAt: timestamp("issuedAt").defaultNow().notNull(),
    signedByCounterOneAt: timestamp("signedByCounterOneAt"),
    signedByCounterTwoAt: timestamp("signedByCounterTwoAt"),
    signedByTreasurerAt: timestamp("signedByTreasurerAt"),
    signedByPastorAt: timestamp("signedByPastorAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("treasury_reports_church_service_idx").on(table.churchId, table.serviceId)]
);

export type TreasuryReport = typeof treasuryReports.$inferSelect;

/** Contas operacionais da igreja, como Caixa e Banco principal. */
export const financialAccounts = mysqlTable(
  "financial_accounts",
  {
    id: int("id").autoincrement().primaryKey(),
    churchId: int("churchId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    type: mysqlEnum("type", ["caixa", "banco", "outro"]).notNull(),
    openingBalanceCents: int("openingBalanceCents").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("financial_accounts_church_name_unique").on(table.churchId, table.name)]
);

export type FinancialAccount = typeof financialAccounts.$inferSelect;

/** Categorias de entrada e saída, com suporte a itens padrão e personalizados. */
export const financialCategories = mysqlTable(
  "financial_categories",
  {
    id: int("id").autoincrement().primaryKey(),
    churchId: int("churchId").notNull(),
    type: mysqlEnum("type", ["entrada", "saida"]).notNull(),
    key: varchar("key", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    isSystem: boolean("isSystem").default(false).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("financial_categories_church_type_key_unique").on(table.churchId, table.type, table.key)]
);

export type FinancialCategory = typeof financialCategories.$inferSelect;

/** Livro-caixa por regime de caixa. Valores são sempre gravados em centavos. */
export const financialTransactions = mysqlTable("financial_transactions", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  accountId: int("accountId").notNull(),
  categoryId: int("categoryId").notNull(),
  type: mysqlEnum("type", ["entrada", "saida"]).notNull(),
  amountCents: int("amountCents").notNull(),
  transactionDate: date("transactionDate").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["dinheiro", "pix", "transferencia", "cartao", "cheque", "outro"])
    .default("dinheiro")
    .notNull(),
  contributorPersonId: int("contributorPersonId"),
  contributorName: varchar("contributorName", { length: 255 }),
  serviceId: int("serviceId"),
  countSheetId: int("countSheetId"),
  description: text("description"),
  reference: varchar("reference", { length: 160 }),
  status: mysqlEnum("status", ["rascunho", "confirmado", "estornado"]).default("rascunho").notNull(),
  createdByChurchUserId: int("createdByChurchUserId").notNull(),
  confirmedByChurchUserId: int("confirmedByChurchUserId"),
  confirmedAt: timestamp("confirmedAt"),
  reversedByChurchUserId: int("reversedByChurchUserId"),
  reversedAt: timestamp("reversedAt"),
  reversalReason: text("reversalReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FinancialTransaction = typeof financialTransactions.$inferSelect;

/** Fechamento mensal opcional; preserva a referência do período e quem o bloqueou. */
export const financialPeriodClosures = mysqlTable(
  "financial_period_closures",
  {
    id: int("id").autoincrement().primaryKey(),
    churchId: int("churchId").notNull(),
    periodStart: date("periodStart").notNull(),
    periodEnd: date("periodEnd").notNull(),
    status: mysqlEnum("status", ["fechado", "reaberto"]).default("fechado").notNull(),
    closedByChurchUserId: int("closedByChurchUserId").notNull(),
    closedAt: timestamp("closedAt").defaultNow().notNull(),
    reopenedByChurchUserId: int("reopenedByChurchUserId"),
    reopenedAt: timestamp("reopenedAt"),
    reopeningReason: text("reopeningReason"),
  },
  (table) => [uniqueIndex("financial_period_closures_church_period_unique").on(table.churchId, table.periodStart)]
);

export type FinancialPeriodClosure = typeof financialPeriodClosures.$inferSelect;

/** Conciliação mensal por conta bancária, sem alterar o livro-caixa ou o fechamento do período. */
export const financialReconciliations = mysqlTable(
  "financial_reconciliations",
  {
    id: int("id").autoincrement().primaryKey(),
    churchId: int("churchId").notNull(),
    accountId: int("accountId").notNull(),
    periodStart: date("periodStart").notNull(),
    periodEnd: date("periodEnd").notNull(),
    bankClosingBalanceCents: int("bankClosingBalanceCents").notNull(),
    bookBalanceCents: int("bookBalanceCents").notNull(),
    differenceCents: int("differenceCents").notNull(),
    status: mysqlEnum("status", ["em_andamento", "conciliada", "com_divergencia"]).default("em_andamento").notNull(),
    notes: text("notes"),
    reconciledByChurchUserId: int("reconciledByChurchUserId").notNull(),
    reconciledAt: timestamp("reconciledAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("financial_reconciliations_church_account_period_unique").on(table.churchId, table.accountId, table.periodStart)]
);

export type FinancialReconciliation = typeof financialReconciliations.$inferSelect;

/** Metadados dos comprovantes armazenados em S3, vinculados à conciliação da mesma igreja. */
export const financialReconciliationAttachments = mysqlTable(
  "financial_reconciliation_attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    churchId: int("churchId").notNull(),
    reconciliationId: int("reconciliationId").notNull(),
    fileKey: varchar("fileKey", { length: 512 }).notNull(),
    url: varchar("url", { length: 1024 }).notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    uploadedByChurchUserId: int("uploadedByChurchUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("financial_reconciliation_attachments_reconciliation_idx").on(table.churchId, table.reconciliationId)]
);

export type FinancialReconciliationAttachment = typeof financialReconciliationAttachments.$inferSelect;

/** Histórico imutável de ações financeiras relevantes. */
export const financialAuditLogs = mysqlTable("financial_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  churchId: int("churchId").notNull(),
  transactionId: int("transactionId"),
  actorChurchUserId: int("actorChurchUserId").notNull(),
  action: mysqlEnum("action", ["criado", "atualizado", "confirmado", "estornado", "periodo_fechado", "periodo_reaberto"])
    .notNull(),
  beforeData: json("beforeData"),
  afterData: json("afterData"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FinancialAuditLog = typeof financialAuditLogs.$inferSelect;
