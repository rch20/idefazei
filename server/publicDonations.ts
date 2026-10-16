import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import {
  financialAccounts,
  financialAuditLogs,
  financialCategories,
  financialPeriodClosures,
  financialTransactions,
  publicDonationSubmissions,
  type PublicDonationSubmission,
  treasuryPixSettings,
} from "../drizzle/schema";
import { getDb } from "./db";
import { getOnlineContributionProofSignedUrl, onlineContributionProofReferenceUrl } from "./onlineContributionProofStorage";
import { DEFAULT_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE, MAX_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE_LENGTH } from "../shared/onlineContribution";

function financialDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function safeThankYouMessage(value: string | null | undefined) {
  return value?.trim().slice(0, MAX_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE_LENGTH) || DEFAULT_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE;
}

const ACTIVE_PUBLIC_DONATION_STATUSES = ["pendente", "aprovada"] as const;

const PUBLIC_DONATION_DUPLICATE_MESSAGE =
  "Este comprovante já foi recebido e está aguardando ou já passou por conferência nesta igreja.";

type PublicDonationWithDuplicateCount = PublicDonationSubmission & { duplicateProofCount?: number };

export async function getPublicDonationSettingsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: treasuryPixSettings.id,
      pixKeyType: treasuryPixSettings.pixKeyType,
      pixKey: treasuryPixSettings.pixKey,
      recipientName: treasuryPixSettings.recipientName,
      institutionName: treasuryPixSettings.institutionName,
      qrCodeUrl: treasuryPixSettings.qrCodeUrl,
      thankYouMessage: treasuryPixSettings.thankYouMessage,
      publicDonationEnabled: treasuryPixSettings.publicDonationEnabled,
      version: treasuryPixSettings.version,
    })
    .from(treasuryPixSettings)
    .where(and(eq(treasuryPixSettings.churchId, churchId), eq(treasuryPixSettings.active, true)))
    .limit(1);
  const settings = rows[0];
  if (!settings) return null;
  return {
    ...settings,
    thankYouMessage: safeThankYouMessage(settings.thankYouMessage),
  };
}

export async function setPublicDonationEnabled(data: {
  churchId: number;
  enabled: boolean;
  actorChurchUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const rows = await tx
      .select()
      .from(treasuryPixSettings)
      .where(and(eq(treasuryPixSettings.churchId, data.churchId), eq(treasuryPixSettings.active, true)))
      .limit(1)
      .for("update");
    const previous = rows[0];
    if (!previous) throw new Error("Cadastre uma chave PIX antes de ativar a doação pública.");
    if (previous.publicDonationEnabled === data.enabled) return previous;
    await tx
      .update(treasuryPixSettings)
      .set({
        publicDonationEnabled: data.enabled,
        version: previous.version + 1,
        updatedByChurchUserId: data.actorChurchUserId,
      })
      .where(and(eq(treasuryPixSettings.id, previous.id), eq(treasuryPixSettings.churchId, data.churchId)));
    const updatedRows = await tx
      .select()
      .from(treasuryPixSettings)
      .where(eq(treasuryPixSettings.id, previous.id))
      .limit(1);
    const updated = updatedRows[0];
    if (!updated) throw new Error("Falha ao atualizar a disponibilidade da doação pública.");
    await tx.insert(financialAuditLogs).values({
      churchId: data.churchId,
      pixSettingsId: updated.id,
      actorChurchUserId: data.actorChurchUserId,
      action: data.enabled ? "doacao_publica_ativada" : "doacao_publica_desativada",
      beforeData: previous,
      afterData: updated,
    });
    return updated;
  });
}

export async function createPublicDonation(data: {
  churchId: number;
  donorName: string;
  donorPhone?: string | null;
  donorEmail?: string | null;
  type: "doacao" | "dizimo" | "oferta" | "primicias";
  informedAmountCents: number;
  paymentDate?: string | null;
  prayerRequest?: string | null;
  proofFileKey: string;
  proofFileName: string;
  proofMimeType: string;
  proofSizeBytes: number;
  proofSha256: string;
  idempotencyKey: string;
  privacyConsentAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const existingRows = await tx
      .select()
      .from(publicDonationSubmissions)
      .where(and(eq(publicDonationSubmissions.churchId, data.churchId), eq(publicDonationSubmissions.idempotencyKey, data.idempotencyKey)))
      .limit(1);
    if (existingRows[0]) return existingRows[0];

    // A configuração PIX é única por tenant. Locking this row serializes
    // submissions for the same church and closes the race between the
    // duplicate check and the insert without changing the schema.
    const settingsRows = await tx
      .select()
      .from(treasuryPixSettings)
      .where(and(eq(treasuryPixSettings.churchId, data.churchId), eq(treasuryPixSettings.active, true)))
      .limit(1)
      .for("update");
    const settings = settingsRows[0];
    if (!settings || !settings.publicDonationEnabled) throw new Error("A doação pública está temporariamente indisponível nesta igreja.");

    const duplicateRows = await tx
      .select()
      .from(publicDonationSubmissions)
      .where(and(
        eq(publicDonationSubmissions.churchId, data.churchId),
        eq(publicDonationSubmissions.proofSha256, data.proofSha256),
        inArray(publicDonationSubmissions.status, ACTIVE_PUBLIC_DONATION_STATUSES),
      ))
      .limit(1);
    if (duplicateRows[0]) throw new Error(PUBLIC_DONATION_DUPLICATE_MESSAGE);

    const result = await tx.insert(publicDonationSubmissions).values({
      churchId: data.churchId,
      pixSettingsId: settings.id,
      donorName: data.donorName,
      donorPhone: data.donorPhone || null,
      donorEmail: data.donorEmail || null,
      type: data.type,
      paymentMethod: "pix",
      informedAmountCents: data.informedAmountCents,
      paymentDate: data.paymentDate ? financialDate(data.paymentDate) : null,
      prayerRequest: data.prayerRequest || null,
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
      privacyConsentAt: data.privacyConsentAt,
      status: "pendente",
    });
    const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
    const rows = await tx
      .select()
      .from(publicDonationSubmissions)
      .where(and(eq(publicDonationSubmissions.id, id), eq(publicDonationSubmissions.churchId, data.churchId)))
      .limit(1);
    const submission = rows[0];
    if (!submission) throw new Error("Falha ao registrar a doação.");
    return submission;
  });
}

export async function getPublicDonationsByChurch(data: {
  churchId: number;
  status?: "pendente" | "aprovada" | "recusada";
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(publicDonationSubmissions.churchId, data.churchId)];
  if (data.status) conditions.push(eq(publicDonationSubmissions.status, data.status));
  const rows = await db
    .select({ donation: publicDonationSubmissions })
    .from(publicDonationSubmissions)
    .where(and(...conditions))
    .orderBy(desc(publicDonationSubmissions.submittedAt))
    .limit(Math.min(data.limit ?? 200, 200));

  const proofHashes = Array.from(new Set(rows.map(row => row.donation.proofSha256)));
  if (!proofHashes.length) return rows;
  const duplicateRows = await db
    .select({ proofSha256: publicDonationSubmissions.proofSha256, count: sql<number>`count(*)` })
    .from(publicDonationSubmissions)
    .where(and(
      eq(publicDonationSubmissions.churchId, data.churchId),
      inArray(publicDonationSubmissions.status, ACTIVE_PUBLIC_DONATION_STATUSES),
      inArray(publicDonationSubmissions.proofSha256, proofHashes),
    ))
    .groupBy(publicDonationSubmissions.proofSha256);
  const duplicateCounts = new Map(duplicateRows.map(row => [row.proofSha256, Number(row.count)]));
  return rows.map(row => ({
    donation: {
      ...row.donation,
      duplicateProofCount: duplicateCounts.get(row.donation.proofSha256) ?? 0,
    },
  }));
}

export async function getPublicDonationById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ donation: publicDonationSubmissions })
    .from(publicDonationSubmissions)
    .where(and(eq(publicDonationSubmissions.id, id), eq(publicDonationSubmissions.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function presentPublicDonation(row: { donation: PublicDonationWithDuplicateCount } | null) {
  if (!row) return null;
  let signedProofUrl: string | null = null;
  try {
    signedProofUrl = await getOnlineContributionProofSignedUrl(row.donation.proofFileKey, row.donation.churchId);
  } catch {
    // Uma falha temporária de assinatura não impede a leitura da fila.
  }
  const { proofFileKey: _proofFileKey, proofUrl: _proofUrl, ...donation } = row.donation;
  return { donation: { ...donation, signedProofUrl } };
}

export async function approvePublicDonation(data: {
  id: number;
  churchId: number;
  actorChurchUserId: number;
  accountId: number;
  categoryId: number;
  confirmedAmountCents: number;
  paymentDate: string;
  reviewNotes?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const settingsRows = await tx
      .select({ id: treasuryPixSettings.id })
      .from(treasuryPixSettings)
      .where(and(eq(treasuryPixSettings.churchId, data.churchId), eq(treasuryPixSettings.active, true)))
      .limit(1)
      .for("update");
    if (!settingsRows[0]) throw new Error("A configuração PIX desta igreja não está disponível.");

    const rows = await tx
      .select()
      .from(publicDonationSubmissions)
      .where(and(eq(publicDonationSubmissions.id, data.id), eq(publicDonationSubmissions.churchId, data.churchId)))
      .limit(1)
      .for("update");
    const previous = rows[0];
    if (!previous) return null;
    if (previous.status === "aprovada") return previous;
    if (previous.status === "recusada") throw new Error("Doação recusada não pode ser aprovada.");

    const duplicateRows = await tx
      .select({ id: publicDonationSubmissions.id, status: publicDonationSubmissions.status })
      .from(publicDonationSubmissions)
      .where(and(
        eq(publicDonationSubmissions.churchId, data.churchId),
        eq(publicDonationSubmissions.proofSha256, previous.proofSha256),
        ne(publicDonationSubmissions.id, data.id),
        inArray(publicDonationSubmissions.status, ACTIVE_PUBLIC_DONATION_STATUSES),
      ))
      .limit(1);
    if (duplicateRows[0]) throw new Error("Resolva a possível duplicidade do comprovante antes de aprovar esta doação.");

    const [accountRows, categoryRows] = await Promise.all([
      tx.select().from(financialAccounts).where(and(eq(financialAccounts.id, data.accountId), eq(financialAccounts.churchId, data.churchId), eq(financialAccounts.active, true))).limit(1),
      tx.select().from(financialCategories).where(and(eq(financialCategories.id, data.categoryId), eq(financialCategories.churchId, data.churchId), eq(financialCategories.active, true), eq(financialCategories.type, "entrada"))).limit(1),
    ]);
    const account = accountRows[0];
    const category = categoryRows[0];
    if (!account || !category) throw new Error("Selecione uma conta e uma categoria de entrada válidas desta igreja.");

    const closedRows = await tx
      .select({ id: financialPeriodClosures.id })
      .from(financialPeriodClosures)
      .where(and(
        eq(financialPeriodClosures.churchId, data.churchId),
        eq(financialPeriodClosures.status, "fechado"),
        sql`DATE(${financialPeriodClosures.periodStart}) <= DATE(${data.paymentDate})`,
        sql`DATE(${financialPeriodClosures.periodEnd}) >= DATE(${data.paymentDate})`,
      ))
      .limit(1);
    if (closedRows[0]) throw new Error("O período financeiro da data informada está fechado.");

    const transactionInsert = await tx.insert(financialTransactions).values({
      churchId: data.churchId,
      accountId: account.id,
      categoryId: category.id,
      type: "entrada",
      amountCents: data.confirmedAmountCents,
      transactionDate: financialDate(data.paymentDate),
      paymentMethod: "pix",
      description: `Doação pública aprovada #${previous.id}`,
      reference: `public_donation:${previous.id}`,
      status: "confirmado",
      createdByChurchUserId: data.actorChurchUserId,
      confirmedByChurchUserId: data.actorChurchUserId,
      confirmedAt: new Date(),
    });
    const transactionId = Number((transactionInsert[0] as { insertId?: number })?.insertId ?? 0);
    if (!transactionId) throw new Error("Falha ao criar o lançamento financeiro da doação.");

    await tx.update(publicDonationSubmissions).set({
      status: "aprovada",
      confirmedAmountCents: data.confirmedAmountCents,
      paymentDate: financialDate(data.paymentDate),
      reviewNotes: data.reviewNotes ?? null,
      reviewedByChurchUserId: data.actorChurchUserId,
      reviewedAt: new Date(),
      financialTransactionId: transactionId,
    }).where(and(eq(publicDonationSubmissions.id, data.id), eq(publicDonationSubmissions.churchId, data.churchId), eq(publicDonationSubmissions.status, "pendente")));

    const updatedRows = await tx.select().from(publicDonationSubmissions).where(and(eq(publicDonationSubmissions.id, data.id), eq(publicDonationSubmissions.churchId, data.churchId))).limit(1);
    const donation = updatedRows[0];
    if (!donation || donation.status !== "aprovada") throw new Error("Falha ao atualizar a doação aprovada.");
    await tx.insert(financialAuditLogs).values([
      { churchId: data.churchId, publicDonationId: donation.id, transactionId, actorChurchUserId: data.actorChurchUserId, action: "doacao_publica_aprovada", beforeData: previous, afterData: donation },
      { churchId: data.churchId, publicDonationId: donation.id, transactionId, actorChurchUserId: data.actorChurchUserId, action: "confirmado", afterData: { transactionId, amountCents: data.confirmedAmountCents } },
    ]);
    return donation;
  });
}

export async function rejectPublicDonation(data: {
  id: number;
  churchId: number;
  actorChurchUserId: number;
  rejectionReason: string;
  reviewNotes?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const previousRows = await tx.select().from(publicDonationSubmissions).where(and(eq(publicDonationSubmissions.id, data.id), eq(publicDonationSubmissions.churchId, data.churchId))).limit(1).for("update");
    const previous = previousRows[0];
    if (!previous) return null;
    if (previous.status === "aprovada") throw new Error("Doação aprovada não pode ser recusada.");
    if (previous.status === "recusada") return previous;
    await tx.update(publicDonationSubmissions).set({
      status: "recusada",
      rejectionReason: data.rejectionReason,
      reviewNotes: data.reviewNotes ?? null,
      reviewedByChurchUserId: data.actorChurchUserId,
      reviewedAt: new Date(),
    }).where(and(eq(publicDonationSubmissions.id, data.id), eq(publicDonationSubmissions.churchId, data.churchId), eq(publicDonationSubmissions.status, "pendente")));
    const rows = await tx.select().from(publicDonationSubmissions).where(and(eq(publicDonationSubmissions.id, data.id), eq(publicDonationSubmissions.churchId, data.churchId))).limit(1);
    const donation = rows[0];
    if (!donation || donation.status !== "recusada") throw new Error("Falha ao recusar a doação.");
    await tx.insert(financialAuditLogs).values({
      churchId: data.churchId,
      publicDonationId: donation.id,
      actorChurchUserId: data.actorChurchUserId,
      action: "doacao_publica_recusada",
      beforeData: previous,
      afterData: donation,
      note: data.rejectionReason,
    });
    return donation;
  });
}
