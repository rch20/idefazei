import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "client/src/pages/Eventos.tsx"), "utf8");
const publicPage = readFileSync(resolve(process.cwd(), "client/src/pages/EventoInscricaoPublica.tsx"), "utf8");
const tenantPage = readFileSync(resolve(process.cwd(), "client/src/pages/TenantPublicPage.tsx"), "utf8");
const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const mediaRoute = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "drizzle/0051_faithful_longshot.sql"), "utf8");
const flyerMigration = readFileSync(resolve(process.cwd(), "drizzle/0052_event_flyer.sql"), "utf8");
const paymentMigration = readFileSync(resolve(process.cwd(), "drizzle/0053_event_payment.sql"), "utf8");

const eventRouter = () => router.slice(router.indexOf("const eventsRouter"), router.indexOf("const familiesRouter"));

describe("Eventos — inscrições e presença", () => {
  it("oferece modelos de inscrição individual, casal ou sem inscrição", () => {
    expect(page).toContain('value: "individual"');
    expect(page).toContain('value: "casal"');
    expect(page).toContain("Inscrição individual");
    expect(page).toContain("Inscrição de casal");
    expect(page).toContain("Sem inscrição online");
  });

  it("identifica os dois participantes do casal sem repetir o nome", () => {
    expect(publicPage).toContain("Nome do primeiro participante");
    expect(publicPage).toContain("Nome do segundo participante");
    expect(publicPage).not.toContain("Nome do casal");
    expect(publicPage).toContain("Dados do casal");
    expect(publicPage).toContain("responsável pelo contato do casal");
  });

  it("gera e compartilha um link público por evento", () => {
    expect(page).toContain("registrationToken");
    expect(page).toContain("publicEventUrl");
    expect(page).toContain("Copiar link");
    expect(page).toContain("WhatsApp");
    expect(publicPage).toContain("publicRegistration.get.useQuery");
    expect(publicPage).toContain("publicRegistration.submit.useMutation");
    expect(publicPage).toContain("Você não precisa criar conta nem fazer login");
  });

  it("distingue casal como duas pessoas sem criar uma Pessoa fictícia", () => {
    expect(schema).toContain('registrationMode: mysqlEnum("registrationMode", ["none", "individual", "casal"])');
    expect(schema).toContain('companionName: varchar("companionName"');
    expect(schema).toContain('attendeeCount: int("attendeeCount").default(1).notNull()');
    expect(db).toContain("personId: null");
    expect(db).toContain('const attendeeCount = event.registrationMode === "casal" ? 2 : 1');
  });

  it("mantém o Mural como canal de divulgação e exibe a inscrição no evento público", () => {
    expect(page).toContain("O Mural apenas divulga o link");
    expect(tenantPage).toContain("registrationHref");
    expect(tenantPage).toContain("Inscreva-se");
  });

  it("associa o flyer ao Evento, oferece os três formatos e tenta o compartilhamento nativo", () => {
    expect(schema).toContain('purpose: mysqlEnum("purpose"');
    expect(schema).toContain('"event_flyer"');
    expect(schema).toContain('flyerMediaAssetId: int("flyerMediaAssetId")');
    expect(schema).toContain('flyerFormat: mysqlEnum("flyerFormat", ["mobile", "screen", "stories"])');
    expect(page).toContain('purpose: "event_flyer"');
    expect(page).toContain('label: "Celular — 4:5"');
    expect(page).toContain('label: "Tela — 16:9"');
    expect(page).toContain('label: "Stories — 9:16"');
    expect(page).toContain("Compartilhar convite");
    expect(page).toContain("navigator.canShare");
    expect(publicPage).toContain("resolved.flyer.optimizedUrl");
    expect(eventRouter()).toContain("validateEventFlyerAsset");
    expect(eventRouter()).toContain("setFlyer: protectedProcedure");
    expect(db).toContain("setEventFlyer");
    expect(mediaRoute).toContain('"event_flyer"');
    expect(mediaRoute).toContain("O flyer deve ter no máximo 4 MB");
    expect(mediaRoute).toContain("adminRoles.has(churchUser.role)");
    expect(flyerMigration).toContain("event_flyer");
    expect(flyerMigration).toContain("flyerMediaAssetId");
    expect(flyerMigration).toContain("flyerFormat");
  });

  it("configura cobrança sem misturar inscrição com Tesouraria", () => {
    expect(schema).toContain('registrationFeeCents: int("registrationFeeCents").default(0).notNull()');
    expect(schema).toContain('paymentStatus: mysqlEnum("paymentStatus", ["pendente", "pago", "isento", "reembolsado"])');
    expect(schema).toContain('amountCents: int("amountCents").default(0).notNull()');
    expect(page).toContain("Inscrição e pagamento");
    expect(page).toContain("Evento gratuito");
    expect(page).toContain("Salvar pagamento");
    expect(page).toContain("setPaymentStatus.useMutation");
    expect(page).toContain("Valor previsto");
    expect(page).toContain("Recebido");
    expect(page).toContain("Pendente");
    expect(publicPage).toContain("Pagamento da inscrição");
    expect(publicPage).toContain("A equipe da igreja confirmará o pagamento manualmente.");
    expect(router).toContain("Ative uma inscrição individual ou de casal antes de cobrar.");
    expect(router).toContain("updateEventRegistrationPayment");
    expect(db).toContain("paidAmountCents");
    expect(db).toContain("amountCents: event.registrationFeeCents ?? 0");
    expect(paymentMigration).toContain("registrationFeeCents");
    expect(paymentMigration).toContain("paymentStatus");
    expect(paymentMigration).not.toContain("financial_transactions");
  });

  it("permite editar os dados principais do Evento e atualizar a descrição", () => {
    expect(page).toContain("trpc.events.update.useMutation");
    expect(page).toContain('title="Editar evento"');
    expect(page).toContain("Editar evento");
    expect(page).toContain("Descrição");
    expect(page).toContain("Salvar alterações");
    expect(eventRouter()).toContain("update: protectedProcedure");
    expect(eventRouter()).toContain("A data de fim não pode ser anterior à data de início.");
    expect(db).toContain("export async function updateEvent");
    expect(db).toContain("eq(events.id, data.eventId), eq(events.churchId, data.churchId)");
  });

  it("remove sem destruir histórico: exclui sem inscrições e arquiva com inscrições", () => {
    expect(page).toContain("trpc.events.remove.useMutation");
    expect(page).toContain('title="Excluir ou arquivar evento"');
    expect(page).toContain("Se ele já tiver inscrições, será arquivado para preservar o histórico.");
    expect(eventRouter()).toContain("remove: protectedProcedure");
    expect(db).toContain("export async function removeEvent");
    expect(db).toContain('mode: "archived"');
    expect(db).toContain('mode: "deleted"');
    expect(db).toContain("registrationToken: null");
  });

  it("controla presença e separa pendentes de quem não compareceu", () => {
    expect(page).toContain("events.setPresence.useMutation");
    expect(page).toContain("Não compareceu");
    expect(page).toContain("Pendentes");
    expect(db).toContain('const absent = registrations.filter((row) => row.presenceStatus === "ausente")');
    expect(db).toContain("pendingAttendeeCount");
  });

  it("protege o fluxo por tenant no backend", () => {
    const source = eventRouter();
    expect(source).toContain("requireChurchAdministrator(ctx.user.id, input.churchId)");
    expect(source).toContain("ctx.tenantChurchId");
    expect(source).toContain("ctx.tenantSlug");
    expect(source).toContain("getPublicEventRegistrationByToken");
    expect(db).toContain("eq(events.churchId, data.churchId)");
    expect(schema).toContain("event_registrations_event_status_idx");
  });

  it("mantém a migration restrita ao delta de Eventos", () => {
    expect(migration).toContain("event_registrations");
    expect(migration).toContain("registrationMode");
    expect(migration).toContain("registrationToken");
    expect(migration).toContain("participantName");
    expect(migration).toContain("companionName");
    expect(migration).not.toContain("consolidation_referrals");
  });
});
