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

const eventRouter = () => router.slice(router.indexOf("const eventsRouter"), router.indexOf("const familiesRouter"));

describe("Eventos — inscrições e presença", () => {
  it("oferece modelos de inscrição individual, casal ou sem inscrição", () => {
    expect(page).toContain('value: "individual"');
    expect(page).toContain('value: "casal"');
    expect(page).toContain("Inscrição individual");
    expect(page).toContain("Inscrição de casal");
    expect(page).toContain("Sem inscrição online");
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
