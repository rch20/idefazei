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
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

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
  acceptedByPersonId: int("acceptedByPersonId"),
  reason: varchar("reason", { length: 255 }).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["pendente", "aceito", "em_acompanhamento", "encerrado", "cancelado"])
    .default("pendente")
    .notNull(),
  referredAt: timestamp("referredAt").defaultNow().notNull(),
  careDueAt: timestamp("careDueAt"),
  acceptedAt: timestamp("acceptedAt"),
  firstContactAt: timestamp("firstContactAt"),
  closedAt: timestamp("closedAt"),
  closeNotes: text("closeNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConsolidationReferral = typeof consolidationReferrals.$inferSelect;

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
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EncounterEvent = typeof encounterEvents.$inferSelect;

export const encounterEnrollments = mysqlTable("encounter_enrollments", {
  id: int("id").autoincrement().primaryKey(),
  encounterEventId: int("encounterEventId").notNull(),
  personId: int("personId").notNull(),
  churchId: int("churchId").notNull(),
  status: mysqlEnum("status", ["inscrito", "confirmado", "participou", "concluiu", "cancelado"]).default("inscrito").notNull(),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type EncounterEnrollment = typeof encounterEnrollments.$inferSelect;

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
