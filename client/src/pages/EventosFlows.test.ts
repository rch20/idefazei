import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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

const page = compactSource(
  readFileSync(resolve(process.cwd(), "client/src/pages/Eventos.tsx"), "utf8")
);
const publicPage = compactSource(
  readFileSync(
    resolve(process.cwd(), "client/src/pages/EventoInscricaoPublica.tsx"),
    "utf8"
  )
);
const tenantPage = compactSource(
  readFileSync(
    resolve(process.cwd(), "client/src/pages/TenantPublicPage.tsx"),
    "utf8"
  )
);
const router = compactSource(
  readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8")
);
const db = compactSource(
  readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8")
);
const schema = compactSource(
  readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8")
);
const mediaRoute = compactSource(
  readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8")
);
const migration = compactSource(
  readFileSync(
    resolve(process.cwd(), "drizzle/0051_faithful_longshot.sql"),
    "utf8"
  )
);
const flyerMigration = compactSource(
  readFileSync(resolve(process.cwd(), "drizzle/0052_event_flyer.sql"), "utf8")
);
const paymentMigration = compactSource(
  readFileSync(resolve(process.cwd(), "drizzle/0053_event_payment.sql"), "utf8")
);
const eventPdf = compactSource(
  readFileSync(
    resolve(process.cwd(), "client/src/lib/eventReportPdf.ts"),
    "utf8"
  )
);

const eventRouter = () =>
  router.slice(
    router.indexOf("const eventsRouter"),
    router.indexOf("const familiesRouter")
  );

describe("Eventos — inscrições e presença", () => {
  it("oferece modelos de inscrição individual, casal ou sem inscrição", () => {
    expect(page).toContain(compactSource('value: "individual"'));
    expect(page).toContain(compactSource('value: "casal"'));
    expect(page).toContain(compactSource("Inscrição individual"));
    expect(page).toContain(compactSource("Inscrição de casal"));
    expect(page).toContain(compactSource("Sem inscrição online"));
  });

  it("identifica os dois participantes do casal sem repetir o nome", () => {
    expect(publicPage).toContain(
      compactSource("Nome do primeiro participante")
    );
    expect(publicPage).toContain(compactSource("Nome do segundo participante"));
    expect(publicPage).not.toContain(compactSource("Nome do casal"));
    expect(publicPage).toContain(compactSource("Dados do casal"));
    expect(publicPage).toContain(
      compactSource("responsável pelo contato do casal")
    );
  });

  it("gera e compartilha um link público por evento", () => {
    expect(page).toContain(compactSource("registrationToken"));
    expect(page).toContain(compactSource("publicEventUrl"));
    expect(page).toContain(compactSource("Copiar link"));
    expect(page).toContain(compactSource("WhatsApp"));
    expect(publicPage).toContain(
      compactSource("publicRegistration.get.useQuery")
    );
    expect(publicPage).toContain(
      compactSource("publicRegistration.submit.useMutation")
    );
    expect(publicPage).toContain(
      compactSource("Você não precisa criar conta nem fazer login")
    );
  });

  it("mantém um único link no texto do convite", () => {
    expect(page).toContain(compactSource("function invitationText()"));
    expect(page).toContain(
      compactSource(
        'return `${invitationText()}\\n\\n${registrationUrl ?? ""}`.trim();'
      )
    );
    expect(page).toContain(
      compactSource("text: invitationText(), url: registrationUrl")
    );
  });

  it("distingue casal como duas pessoas sem criar uma Pessoa fictícia", () => {
    expect(schema).toContain(
      compactSource(
        'registrationMode: mysqlEnum("registrationMode", ["none", "individual", "casal"])'
      )
    );
    expect(schema).toContain(
      compactSource('companionName: varchar("companionName"')
    );
    expect(schema).toContain(
      compactSource('attendeeCount: int("attendeeCount").default(1).notNull()')
    );
    expect(db).toContain(compactSource("personId: null"));
    expect(db).toContain(
      compactSource(
        'const attendeeCount = event.registrationMode === "casal" ? 2 : 1'
      )
    );
  });

  it("mantém o Mural como canal de divulgação e exibe a inscrição no evento público", () => {
    expect(page).toContain(compactSource("O Mural apenas divulga o link"));
    expect(tenantPage).toContain(compactSource("registrationHref"));
    expect(tenantPage).toContain(compactSource("Inscreva-se"));
  });

  it("trata a data do Evento como data civil sem exibir o dia anterior", () => {
    expect(router).toContain(compactSource("parseCivilDateAsUtcNoon"));
    expect(router).not.toContain(
      compactSource("const startDate = new Date(input.startDate)")
    );
    expect(page).toContain(compactSource("getCivilDateParts(event.startDate)"));
    expect(tenantPage).toContain(
      compactSource("formatDatePtBr(event.startDate)")
    );
    expect(publicPage).toContain(compactSource("formatDateLongPtBr(value)"));
  });

  it("mantém data civil e exibe o horário real do Evento", () => {
    expect(schema).toContain(
      compactSource('startTime: varchar("startTime", { length: 5 })')
    );
    expect(schema).toContain(
      compactSource('endTime: varchar("endTime", { length: 5 })')
    );
    expect(page).toContain(compactSource("Horário de início"));
    expect(page).toContain(compactSource("Horário de término"));
    expect(page).toContain(
      compactSource("formatEventTimeRange(event.startTime, event.endTime)")
    );
    expect(page).toContain(compactSource("getTodayCivilDateInput"));
    expect(router).toContain(compactSource("normalizeCivilTime"));
    expect(tenantPage).toContain(
      compactSource("formatEventTimeRange(event.startTime, event.endTime)")
    );
    expect(publicPage).toContain(
      compactSource(
        "formatEventTimeRange(resolved.event.startTime, resolved.event.endTime)"
      )
    );
    expect(db).toContain(compactSource("currentCivilDateAsUtcNoon()"));
  });

  it("associa o flyer ao Evento, oferece os três formatos e tenta o compartilhamento nativo", () => {
    expect(schema).toContain(compactSource('purpose: mysqlEnum("purpose"'));
    expect(schema).toContain(compactSource('"event_flyer"'));
    expect(schema).toContain(
      compactSource('flyerMediaAssetId: int("flyerMediaAssetId")')
    );
    expect(schema).toContain(
      compactSource(
        'flyerFormat: mysqlEnum("flyerFormat", ["mobile", "screen", "stories"])'
      )
    );
    expect(page).toContain(compactSource('purpose: "event_flyer"'));
    expect(page).toContain(compactSource('label: "Celular — 4:5"'));
    expect(page).toContain(compactSource('label: "Tela — 16:9"'));
    expect(page).toContain(compactSource('label: "Stories — 9:16"'));
    expect(page).toContain(compactSource("Compartilhar convite"));
    expect(page).toContain(compactSource("navigator.canShare"));
    expect(publicPage).toContain(compactSource("resolved.flyer.optimizedUrl"));
    expect(eventRouter()).toContain(compactSource("validateEventFlyerAsset"));
    expect(eventRouter()).toContain(
      compactSource("setFlyer: protectedProcedure")
    );
    expect(db).toContain(compactSource("setEventFlyer"));
    expect(mediaRoute).toContain(compactSource('"event_flyer"'));
    expect(mediaRoute).toContain(
      compactSource("O flyer deve ter no máximo 4 MB")
    );
    expect(mediaRoute).toContain(
      compactSource("adminRoles.has(churchUser.role)")
    );
    expect(flyerMigration).toContain(compactSource("event_flyer"));
    expect(flyerMigration).toContain(compactSource("flyerMediaAssetId"));
    expect(flyerMigration).toContain(compactSource("flyerFormat"));
  });

  it("configura cobrança sem misturar inscrição com Tesouraria", () => {
    expect(schema).toContain(
      compactSource(
        'registrationFeeCents: int("registrationFeeCents").default(0).notNull()'
      )
    );
    expect(schema).toContain(
      compactSource(
        'paymentStatus: mysqlEnum("paymentStatus", ["pendente", "pago", "isento", "reembolsado"])'
      )
    );
    expect(schema).toContain(
      compactSource('amountCents: int("amountCents").default(0).notNull()')
    );
    expect(page).toContain(compactSource("Inscrição e pagamento"));
    expect(page).toContain(compactSource("Evento gratuito"));
    expect(page).toContain(compactSource("Salvar pagamento"));
    expect(page).toContain(compactSource("setPaymentStatus.useMutation"));
    expect(page).toContain(compactSource("Valor previsto"));
    expect(page).toContain(compactSource("Recebido"));
    expect(page).toContain(compactSource("Pendente"));
    expect(publicPage).toContain(compactSource("Pagamento da inscrição"));
    expect(publicPage).toContain(
      compactSource("A equipe da igreja confirmará o pagamento manualmente.")
    );
    expect(router).toContain(
      compactSource(
        "Ative uma inscrição individual ou de casal antes de cobrar."
      )
    );
    expect(router).toContain(compactSource("updateEventRegistrationPayment"));
    expect(db).toContain(compactSource("paidAmountCents"));
    expect(db).toContain(
      compactSource("amountCents: event.registrationFeeCents ?? 0")
    );
    expect(paymentMigration).toContain(compactSource("registrationFeeCents"));
    expect(paymentMigration).toContain(compactSource("paymentStatus"));
    expect(paymentMigration).not.toContain(
      compactSource("financial_transactions")
    );
  });

  it("abre o relatório dentro do app com PDF, impressão e compartilhamento", () => {
    expect(page).toContain(compactSource("openEventReportPreview"));
    expect(page).toContain(compactSource("<TreasuryPdfPreview"));
    expect(page).toContain(compactSource("eventReportPdfFileName"));
    expect(page).toContain(compactSource("Compartilhar"));
    expect(page).toContain(compactSource("Abrir relatório / PDF"));
    expect(eventPdf).toContain(compactSource("PDFDocument.create"));
    expect(eventPdf).toContain(compactSource("application/pdf"));
    expect(page).not.toContain(compactSource('window.open("", "_blank"'));
  });

  it("oferece inscrição assistida na mesma lista de inscrições públicas", () => {
    expect(page).toContain(compactSource("Inscrição assistida"));
    expect(page).toContain(compactSource("Adicionar inscrição manual"));
    expect(page).toContain(
      compactSource("trpc.events.createManualRegistration.useMutation")
    );
    expect(page).toContain(compactSource("Adicionada pelo painel"));
    expect(router).toContain(
      compactSource("createManualRegistration: protectedProcedure")
    );
    expect(router).toContain(
      compactSource("requireChurchAdministrator(ctx.user.id, input.churchId)")
    );
    expect(router).toContain(
      compactSource('registrationMode: z.enum(["individual", "casal"])')
    );
    expect(db).toContain(
      compactSource("export async function createManualEventRegistration")
    );
    expect(db).toContain(compactSource('source: "manual"'));
    expect(db).toContain(compactSource("attendeeCount"));
    expect(db).toContain(compactSource("eq(events.churchId, data.churchId)"));
  });

  it("usa o Formulário Adaptativo nos fluxos longos e não gera QR Code de evento", () => {
    expect(
      page.match(/<AdaptiveFormDialogContent/g)?.length
    ).toBeGreaterThanOrEqual(3);
    expect(page).toContain(compactSource("AdaptiveFormDialogBody"));
    expect(page).toContain(compactSource("AdaptiveFormDialogFooter"));
    expect(page).toContain(compactSource("Novo Evento"));
    expect(page).toContain(compactSource("Gestão —"));
    expect(page).toContain(compactSource("Editar evento"));
    expect(page).toContain(compactSource("Salvar alterações"));
    expect(page).not.toContain(compactSource("generateQrCode"));
  });

  it("oferece WhatsApp contextual por inscrição sem misturar pagamento e presença", () => {
    expect(page).toContain(compactSource("getWhatsAppLinkWithMessage"));
    expect(page).toContain(compactSource("getEventRegistrationWhatsAppLink"));
    expect(page).toContain(
      compactSource("Conversar com ${registration.displayName} pelo WhatsApp")
    );
    expect(page).toContain(compactSource('title="Conversar no WhatsApp"'));
    expect(page).toContain(compactSource("registration.participantPhone"));
    expect(page).toContain(compactSource("registration.companionName"));
    expect(page).toContain(compactSource("setPaymentStatus.mutate"));
    expect(page).toContain(compactSource("setPresence.mutate"));
  });

  it("mantém a gestão operacional extensa com inscrição assistida, flyer e relatório", () => {
    expect(page).toContain(compactSource("Gestão —"));
    expect(page).toContain(compactSource("Inscrição pública"));
    expect(page).toContain(compactSource("Inscrição assistida"));
    expect(page).toContain(compactSource("Flyer do convite"));
    expect(page).toContain(compactSource("Abrir relatório / PDF"));
    expect(page).toContain(compactSource("Atualizar lista"));
  });

  it("permite editar os dados principais do Evento e atualizar a descrição", () => {
    expect(page).toContain(compactSource("trpc.events.update.useMutation"));
    expect(page).toContain(compactSource('title="Editar evento"'));
    expect(page).toContain(compactSource("Editar evento"));
    expect(page).toContain(compactSource("Descrição"));
    expect(page).toContain(compactSource("Salvar alterações"));
    expect(eventRouter()).toContain(
      compactSource("update: protectedProcedure")
    );
    expect(eventRouter()).toContain(
      compactSource("A data de fim não pode ser anterior à data de início.")
    );
    expect(db).toContain(compactSource("export async function updateEvent"));
    expect(db).toContain(
      compactSource(
        "eq(events.id, data.eventId), eq(events.churchId, data.churchId)"
      )
    );
  });

  it("remove sem destruir histórico e não trava em confirmação nativa", () => {
    expect(page).toContain(compactSource("trpc.events.remove.useMutation"));
    expect(page).toContain(compactSource('title="Excluir ou arquivar evento"'));
    expect(page).toContain(compactSource("AlertDialog"));
    expect(page).toContain(compactSource("removeConfirmOpen"));
    expect(page).toContain(compactSource("removeError"));
    expect(page).toContain(compactSource("clickEvent.preventDefault()"));
    expect(page).not.toContain(compactSource("window.confirm("));
    expect(page).toContain(
      compactSource(
        "Se já houver inscrições, ele será arquivado para preservar participantes, pagamentos e histórico."
      )
    );
    expect(eventRouter()).toContain(
      compactSource("remove: protectedProcedure")
    );
    expect(db).toContain(compactSource("export async function removeEvent"));
    expect(db).toContain(compactSource('mode: "archived"'));
    expect(db).toContain(compactSource('mode: "deleted"'));
    expect(db).toContain(compactSource("registrationToken: null"));
  });

  it("controla presença e separa pendentes de quem não compareceu", () => {
    expect(page).toContain(compactSource("events.setPresence.useMutation"));
    expect(page).toContain(compactSource("Não compareceu"));
    expect(page).toContain(compactSource("Pendentes"));
    expect(db).toContain(
      compactSource(
        'const absent = registrations.filter((row) => row.presenceStatus === "ausente")'
      )
    );
    expect(db).toContain(compactSource("pendingAttendeeCount"));
  });

  it("protege o fluxo por tenant no backend", () => {
    const source = eventRouter();
    expect(source).toContain(
      compactSource("requireChurchAdministrator(ctx.user.id, input.churchId)")
    );
    expect(source).toContain(compactSource("ctx.tenantChurchId"));
    expect(source).toContain(compactSource("ctx.tenantSlug"));
    expect(source).toContain(
      compactSource("getPublicEventRegistrationByToken")
    );
    expect(db).toContain(compactSource("eq(events.churchId, data.churchId)"));
    expect(schema).toContain(
      compactSource("event_registrations_event_status_idx")
    );
  });

  it("mantém a migration restrita ao delta de Eventos", () => {
    expect(migration).toContain(compactSource("event_registrations"));
    expect(migration).toContain(compactSource("registrationMode"));
    expect(migration).toContain(compactSource("registrationToken"));
    expect(migration).toContain(compactSource("participantName"));
    expect(migration).toContain(compactSource("companionName"));
    expect(migration).not.toContain(compactSource("consolidation_referrals"));
  });
});
