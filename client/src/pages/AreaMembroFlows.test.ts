import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "AreaMembro.tsx"), "utf8");

describe("Área do Membro — contato e login", () => {
  it("oferece edição do próprio telefone e WhatsApp", () => {
    expect(source).toContain("updateMyContact");
    expect(source).toContain("Editar contato");
    expect(source).toContain('id="member-phone"');
    expect(source).toContain('id="member-whatsapp"');
  });

  it("explica que o contato cadastrado pode ser usado no login", () => {
    expect(source).toContain("Telefone para login");
    expect(source).toContain("Este número será aceito como identificador de login.");
    expect(source).toContain("O WhatsApp também pode ser usado no login.");
    expect(source).toContain("O e-mail continua sendo o mesmo.");
  });

  it("oferece contribuição on-line a qualquer usuário autenticado com Pessoa vinculada sem expor histórico pessoal", () => {
    expect(source).toContain("canSubmitOnlineContribution");
    expect(source).not.toContain("isMemberSession");
    expect(source).toContain("treasury.pixForMember.useQuery");
    expect(source).not.toContain("treasury.myOnlineContributions.useQuery");
    expect(source).toContain("Enviar contribuição");
    expect(source).toContain("Envie sua própria contribuição");
    expect(source).not.toContain("Meus envios recentes");
  });

  it("envia tipo, valor, data, hash do comprovante e chave de idempotência", () => {
    expect(source).toContain("uploadOnlineContributionProof");
    expect(source).toContain("treasury.submitOnlineContribution.useMutation");
    expect(source).toContain("informedAmountCents: amountCents");
    expect(source).toContain("proofSha256: proof.sha256");
    expect(source).toContain("idempotencyKey");
    expect(source).toContain('id="online-contribution-proof"');
  });
  it("mostra uma confirmação de gratidão após o envio sem expor o status interno Em análise", () => {
    expect(source).toContain("contributionThankYouOpen");
    expect(source).toContain("Obrigado por sua contribuição");
    expect(source).toContain("contributionThankYouMessage");
    expect(source).not.toContain('"Em análise"');
  });

  it("prioriza um próximo passo único sem criar uma nova consulta ou mutation", () => {
    expect(source).toContain("const memberNextStep");
    expect(source).toContain("Próximo passo");
    expect(source).toContain("Complete seu contato");
    expect(source).toContain("Continue sua jornada");
    expect(source).toContain('memberNextStep.action === "events"');
    expect(source).toContain("updateMyContact");
    expect(source).toContain("submitOnlineContribution");
  });

  it("mantém abas navegáveis em telas estreitas e ações primárias em largura confortável", () => {
    expect(source).toContain('aria-label="Navegação da Área do Membro"');
    expect(source).toContain("w-full justify-start overflow-x-auto");
    expect(source).toContain("flex-none items-center gap-2");
    expect(source).toContain("w-full shrink-0 sm:w-auto");
    expect(source).toContain("max-h-[calc(100dvh-1rem)] overflow-y-auto");
  });

  it("mostra célula, ministérios e cursos da própria Pessoa sem expor endereço", () => {
    const serverSource = readFileSync(new URL("../../../server/db.ts", import.meta.url), "utf8");
    const fn = serverSource.slice(serverSource.indexOf("export async function getMemberJourneyOverview"), serverSource.indexOf("export async function getPrayerRequestsByPerson"));
    expect(source).toContain("people.myJourney.useQuery");
    expect(source).toContain("Minha caminhada");
    expect(fn).toContain("eq(cellMembers.personId, personId)");
    expect(fn).toContain("eq(cells.churchId, churchId)");
    expect(fn).toContain("eq(ministries.churchId, churchId)");
    expect(fn).toContain("eq(courses.churchId, churchId)");
    expect(fn).toContain("eq(scheduleItems.personId, personId)");
    expect(fn).toContain("eq(scheduleItems.churchId, churchId)");
    expect(fn).not.toContain("address");
    expect(fn).not.toContain("hostId");
  });

  it("permite confirmar a própria escala e reflete a confirmação para a gestão", () => {
    const dbSource = readFileSync(new URL("../../../server/db.ts", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("../../../server/routers.ts", import.meta.url), "utf8");
    const escalasSource = readFileSync(new URL("./Escalas.tsx", import.meta.url), "utf8");
    const fn = dbSource.slice(dbSource.indexOf("export async function confirmOwnScheduleItem"), dbSource.indexOf("export async function cancelScheduleItem"));
    expect(source).toContain("schedules.confirmMine.useMutation");
    expect(source).toContain("Confirmar presença");
    expect(routerSource).toContain("confirmMine: protectedProcedure");
    expect(routerSource).toContain("personId: actor.personId");
    expect(fn).toContain("eq(scheduleItems.personId, data.personId)");
    expect(fn).toContain("eq(scheduleItems.churchId, data.churchId)");
    expect(fn).toContain('eq(scheduleItems.status, "agendada")');
    expect(dbSource).toContain("confirmed: false");
    expect(escalasSource).toContain("Presença confirmada");
    expect(escalasSource).toContain("Aguardando confirmação");
  });

  it("avisa pastores e líder do ministério quando a pessoa confirma a escala", () => {
    const routerSource = readFileSync(new URL("../../../server/routers.ts", import.meta.url), "utf8");
    const block = routerSource.slice(routerSource.indexOf("confirmMine: protectedProcedure"), routerSource.indexOf("confirmMine: protectedProcedure") + 3000);
    expect(block).toContain("Presença confirmada na Escala");
    expect(block).toContain('type: "escala_confirmada"');
    expect(block).toContain("PASTOR_ROLES.has(account.role)");
    expect(block).toContain("ministry.leaderId");
    expect(block).toContain("account.id !== actor.id");
    expect(block).toContain("dedupeKey: `escala-confirmada:");
    expect(block).toContain("catch (error)");
  });
});
