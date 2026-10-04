import { and, desc, eq, sql } from "drizzle-orm";
import {
  financialAccounts,
  financialAuditLogs,
  financialCategories,
  financialPeriodClosures,
  financialTransactions,
  onlineContributions,
  people,
  treasuryPixSettings,
} from "../drizzle/schema";
import { getDb } from "./db";
import { onlineContributionProofReferenceUrl } from "./onlineContributionProofStorage";
import { MAX_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE_LENGTH } from "../shared/onlineContribution";

function financialDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

export async function getTreasuryPixSettingsByChurch(churchId: number, includeInactive = false) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(treasuryPixSettings)
    .where(
      includeInactive
        ? eq(treasuryPixSettings.churchId, churchId)
        : and(eq(treasuryPixSettings.churchId, churchId), eq(treasuryPixSettings.active, true)),
    )
    .orderBy(desc(treasuryPixSettings.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertTreasuryPixSettings(data: {
  churchId: number;
  pixKeyType: "cpf" | "cnpj" | "email" | "telefone" | "aleatoria" | "outro";
  pixKey: string;
  recipientName: string;
  institutionName?: string | null;
  qrCodeFileKey?: string | null;
  qrCodeUrl?: string | null;
  thankYouMessage?: string | null;
  actorChurchUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const previousRows = await tx
      .select()
      .from(treasuryPixSettings)
      .where(eq(treasuryPixSettings.churchId, data.churchId))
      .limit(1)
      .for("update");
    const previous = previousRows[0] ?? null;

    if (previous) {
      await tx
        .update(treasuryPixSettings)
        .set({
          pixKeyType: data.pixKeyType,
          pixKey: data.pixKey,
          recipientName: data.recipientName,
          institutionName: data.institutionName ?? null,
          qrCodeFileKey: data.qrCodeFileKey ?? previous.qrCodeFileKey,
          qrCodeUrl: data.qrCodeUrl ?? previous.qrCodeUrl,
          thankYouMessage: data.thankYouMessage ?? previous.thankYouMessage,
          active: true,
          version: previous.version + 1,
          updatedByChurchUserId: data.actorChurchUserId,
        })
        .where(and(eq(treasuryPixSettings.id, previous.id), eq(treasuryPixSettings.churchId, data.churchId)));
    } else {
      await tx.insert(treasuryPixSettings).values({
        churchId: data.churchId,
        pixKeyType: data.pixKeyType,
        pixKey: data.pixKey,
        recipientName: data.recipientName,
        institutionName: data.institutionName ?? null,
        qrCodeFileKey: data.qrCodeFileKey ?? null,
        qrCodeUrl: data.qrCodeUrl ?? null,
        thankYouMessage: data.thankYouMessage ?? null,
        active: true,
        version: 1,
        createdByChurchUserId: data.actorChurchUserId,
        updatedByChurchUserId: data.actorChurchUserId,
      });
    }

    const rows = await tx
      .select()
      .from(treasuryPixSettings)
      .where(and(eq(treasuryPixSettings.churchId, data.churchId), eq(treasuryPixSettings.active, true)))
      .limit(1);
    const settings = rows[0];
    if (!settings) throw new Error("Falha ao salvar a configuração PIX");

    await tx.insert(financialAuditLogs).values({
      churchId: data.churchId,
      pixSettingsId: settings.id,
      actorChurchUserId: data.actorChurchUserId,
      action: previous ? "pix_atualizada" : "pix_configurada",
      beforeData: previous,
      afterData: settings,
    });
    return settings;
  });
}

export async function updateTreasuryPixThankYouMessage(data: {
  churchId: number;
  thankYouMessage?: string | null;
  actorChurchUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalizedMessage = data.thankYouMessage?.trim() || null;
  if (normalizedMessage && normalizedMessage.length > MAX_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE_LENGTH) {
    throw new Error(`A mensagem deve ter no máximo ${MAX_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE_LENGTH} caracteres.`);
  }
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(treasuryPixSettings)
      .where(eq(treasuryPixSettings.churchId, data.churchId))
      .limit(1)
      .for("update");
    const previous = rows[0];
    if (!previous) throw new Error("Esta igreja ainda não configurou uma chave PIX ativa");
    await tx
      .update(treasuryPixSettings)
      .set({
        thankYouMessage: normalizedMessage,
        version: previous.version + 1,
        updatedByChurchUserId: data.actorChurchUserId,
      })
      .where(and(eq(treasuryPixSettings.id, previous.id), eq(treasuryPixSettings.churchId, data.churchId)));
    const updatedRows = await tx
      .select()
      .from(treasuryPixSettings)
      .where(and(eq(treasuryPixSettings.id, previous.id), eq(treasuryPixSettings.churchId, data.churchId)))
      .limit(1);
    const settings = updatedRows[0];
    if (!settings) throw new Error("Falha ao salvar a mensagem de agradecimento");
    await tx.insert(financialAuditLogs).values({
      churchId: data.churchId,
      pixSettingsId: settings.id,
      actorChurchUserId: data.actorChurchUserId,
      action: "pix_atualizada",
      beforeData: previous,
      afterData: settings,
      note: "Mensagem de agradecimento da contribuição on-line atualizada.",
    });
    return settings;
  });
}

export async function getOnlineContributionsByChurch(data: {
  churchId: number;
  status?: "pendente" | "aprovada" | "recusada";
  personId?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(onlineContributions.churchId, data.churchId)];
  if (data.status) conditions.push(eq(onlineContributions.status, data.status));
  if (data.personId) conditions.push(eq(onlineContributions.personId, data.personId));
  return db
    .select({ contribution: onlineContributions, person: { id: people.id, fullName: people.fullName } })
    .from(onlineContributions)
    .innerJoin(people, and(eq(people.id, onlineContributions.personId), eq(people.churchId, data.churchId)))
    .where(and(...conditions))
    .orderBy(desc(onlineContributions.submittedAt))
    .limit(Math.min(data.limit ?? 100, 200));
}

export async function getOnlineContributionById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ contribution: onlineContributions, person: { id: people.id, fullName: people.fullName } })
    .from(onlineContributions)
    .innerJoin(people, and(eq(people.id, onlineContributions.personId), eq(people.churchId, churchId)))
    .where(and(eq(onlineContributions.id, id), eq(onlineContributions.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createOnlineContribution(data: {
  churchId: number;
  personId: number;
  submittedByChurchUserId: number;
  type: "dizimo" | "oferta" | "primicias";
  informedAmountCents: number;
  paymentDate?: string | null;
  proofFileKey: string;
  proofFileName: string;
  proofMimeType: string;
  proofSizeBytes: number;
  proofSha256: string;
  idempotencyKey: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(onlineContributions)
      .where(
        and(
          eq(onlineContributions.churchId, data.churchId),
          eq(onlineContributions.submittedByChurchUserId, data.submittedByChurchUserId),
          eq(onlineContributions.idempotencyKey, data.idempotencyKey),
        ),
      )
      .limit(1);
    if (existingRows[0]) return existingRows[0];

    const personRows = await tx
      .select({ id: people.id, fullName: people.fullName })
      .from(people)
      .where(and(eq(people.id, data.personId), eq(people.churchId, data.churchId), eq(people.active, true)))
      .limit(1);
    if (!personRows[0]) throw new Error("A Pessoa vinculada não pertence a esta igreja ou está inativa");

    const settingsRows = await tx
      .select()
      .from(treasuryPixSettings)
      .where(and(eq(treasuryPixSettings.churchId, data.churchId), eq(treasuryPixSettings.active, true)))
      .limit(1);
    const settings = settingsRows[0];
    if (!settings) throw new Error("Esta igreja ainda não configurou uma chave PIX ativa");

    const result = await tx.insert(onlineContributions).values({
      churchId: data.churchId,
      personId: data.personId,
      submittedByChurchUserId: data.submittedByChurchUserId,
      pixSettingsId: settings.id,
      type: data.type,
      paymentMethod: "pix",
      informedAmountCents: data.informedAmountCents,
      paymentDate: data.paymentDate ? financialDate(data.paymentDate) : null,
      status: "pendente",
      proofFileKey: data.proofFileKey,
      proofUrl: onlineContributionProofReferenceUrl(data.proofFileKey),
      proofFileName: data.proofFileName,
      proofMimeType: data.proofMimeType,
      proofSizeBytes: data.proofSizeBytes,
      proofSha256: data.proofSha256,
      pixKeySnapshot: settings.pixKey,
      pixKeyTypeSnapshot: settings.pixKeyType,
      pixRecipientNameSnapshot: settings.recipientName,
      pixInstitutionNameSnapshot: settings.institutionName,
      idempotencyKey: data.idempotencyKey,
    });
    const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
    const rows = await tx
      .select()
      .from(onlineContributions)
      .where(and(eq(onlineContributions.id, id), eq(onlineContributions.churchId, data.churchId)))
      .limit(1);
    const contribution = rows[0];
    if (!contribution) throw new Error("Falha ao registrar a contribuição");

    await tx.insert(financialAuditLogs).values({
      churchId: data.churchId,
      onlineContributionId: contribution.id,
      pixSettingsId: settings.id,
      actorChurchUserId: data.submittedByChurchUserId,
      action: "contribuicao_enviada",
      afterData: contribution,
    });
    return contribution;
  });
}

export async function approveOnlineContribution(data: {
  id: number;
  churchId: number;
  actorChurchUserId: number;
  accountId?: number;
  categoryId?: number;
  confirmedAmountCents: number;
  paymentDate: string;
  reviewNotes?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const contributionRows = await tx
      .select()
      .from(onlineContributions)
      .where(and(eq(onlineContributions.id, data.id), eq(onlineContributions.churchId, data.churchId)))
      .limit(1)
      .for("update");
    const previous = contributionRows[0];
    if (!previous) return null;
    if (previous.status === "aprovada") return previous;
    if (previous.status === "recusada") throw new Error("Contribuição recusada não pode ser aprovada");

    const [accountRows, categoryRows] = await Promise.all([
      data.accountId
        ? tx.select().from(financialAccounts).where(and(eq(financialAccounts.id, data.accountId), eq(financialAccounts.churchId, data.churchId), eq(financialAccounts.active, true))).limit(1)
        : tx.select().from(financialAccounts).where(and(eq(financialAccounts.churchId, data.churchId), eq(financialAccounts.active, true))).orderBy(financialAccounts.id).limit(1),
      data.categoryId
        ? tx.select().from(financialCategories).where(and(eq(financialCategories.id, data.categoryId), eq(financialCategories.churchId, data.churchId), eq(financialCategories.active, true), eq(financialCategories.type, "entrada"))).limit(1)
        : tx.select().from(financialCategories).where(and(eq(financialCategories.churchId, data.churchId), eq(financialCategories.active, true), eq(financialCategories.type, "entrada"), eq(financialCategories.key, previous.type))).limit(1),
    ]);
    const account = accountRows[0];
    const category = categoryRows[0];
    if (!account || !category) throw new Error("Configure uma conta e uma categoria de entrada antes de aprovar");

    const closedRows = await tx
      .select({ id: financialPeriodClosures.id })
      .from(financialPeriodClosures)
      .where(
        and(
          eq(financialPeriodClosures.churchId, data.churchId),
          eq(financialPeriodClosures.status, "fechado"),
          sql`DATE(${financialPeriodClosures.periodStart}) <= DATE(${data.paymentDate})`,
          sql`DATE(${financialPeriodClosures.periodEnd}) >= DATE(${data.paymentDate})`,
        ),
      )
      .limit(1);
    if (closedRows[0]) throw new Error("O período financeiro da data informada está fechado");

    const transactionInsert = await tx.insert(financialTransactions).values({
      churchId: data.churchId,
      accountId: account.id,
      categoryId: category.id,
      type: "entrada",
      amountCents: data.confirmedAmountCents,
      transactionDate: financialDate(data.paymentDate),
      paymentMethod: "pix",
      contributorPersonId: previous.personId,
      description: `Contribuição on-line aprovada #${previous.id}`,
      reference: `online_contribution:${previous.id}`,
      status: "confirmado",
      createdByChurchUserId: data.actorChurchUserId,
      confirmedByChurchUserId: data.actorChurchUserId,
      confirmedAt: new Date(),
    });
    const transactionId = Number((transactionInsert[0] as { insertId?: number })?.insertId ?? 0);
    if (!transactionId) throw new Error("Falha ao criar o lançamento financeiro da contribuição");

    await tx
      .update(onlineContributions)
      .set({
        status: "aprovada",
        confirmedAmountCents: data.confirmedAmountCents,
        paymentDate: financialDate(data.paymentDate),
        reviewNotes: data.reviewNotes ?? null,
        reviewedByChurchUserId: data.actorChurchUserId,
        reviewedAt: new Date(),
        financialTransactionId: transactionId,
      })
      .where(and(eq(onlineContributions.id, data.id), eq(onlineContributions.churchId, data.churchId), eq(onlineContributions.status, "pendente")));
    const updatedRows = await tx
      .select()
      .from(onlineContributions)
      .where(and(eq(onlineContributions.id, data.id), eq(onlineContributions.churchId, data.churchId)))
      .limit(1);
    const contribution = updatedRows[0];
    if (!contribution || contribution.status !== "aprovada") throw new Error("Falha ao atualizar a contribuição aprovada");

    await tx.insert(financialAuditLogs).values([
      { churchId: data.churchId, onlineContributionId: contribution.id, transactionId, actorChurchUserId: data.actorChurchUserId, action: "contribuicao_aprovada", beforeData: previous, afterData: contribution },
      { churchId: data.churchId, onlineContributionId: contribution.id, transactionId, actorChurchUserId: data.actorChurchUserId, action: "confirmado", afterData: { transactionId, amountCents: data.confirmedAmountCents } },
    ]);
    return contribution;
  });
}

export async function rejectOnlineContribution(data: {
  id: number;
  churchId: number;
  actorChurchUserId: number;
  rejectionReason: string;
  reviewNotes?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const previousRows = await tx
      .select()
      .from(onlineContributions)
      .where(and(eq(onlineContributions.id, data.id), eq(onlineContributions.churchId, data.churchId)))
      .limit(1)
      .for("update");
    const previous = previousRows[0];
    if (!previous) return null;
    if (previous.status === "aprovada") throw new Error("Contribuição aprovada não pode ser recusada");
    if (previous.status === "recusada") return previous;

    await tx
      .update(onlineContributions)
      .set({
        status: "recusada",
        rejectionReason: data.rejectionReason,
        reviewNotes: data.reviewNotes ?? null,
        reviewedByChurchUserId: data.actorChurchUserId,
        reviewedAt: new Date(),
      })
      .where(and(eq(onlineContributions.id, data.id), eq(onlineContributions.churchId, data.churchId), eq(onlineContributions.status, "pendente")));
    const rows = await tx
      .select()
      .from(onlineContributions)
      .where(and(eq(onlineContributions.id, data.id), eq(onlineContributions.churchId, data.churchId)))
      .limit(1);
    const contribution = rows[0];
    if (!contribution || contribution.status !== "recusada") throw new Error("Falha ao recusar a contribuição");

    await tx.insert(financialAuditLogs).values({
      churchId: data.churchId,
      onlineContributionId: contribution.id,
      actorChurchUserId: data.actorChurchUserId,
      action: "contribuicao_recusada",
      beforeData: previous,
      afterData: contribution,
      note: data.rejectionReason,
    });
    return contribution;
  });
}
