import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import {
  churchUsers,
  leadershipSchoolBlockProgress,
  leadershipSchoolClasses,
  leadershipSchoolEnrollments,
  leadershipSchoolLessonStudies,
  leadershipSchoolLessons,
  leadershipSchoolModules,
  leadershipSchoolQuestionAttempts,
  leadershipSchoolQuestions,
  leadershipSchoolStudies,
  leadershipSchoolStudyAdministrators,
  leadershipSchoolStudyBlocks,
  leadershipSchoolStudyMaterials,
  leadershipSchoolStudyProgress,
  libraryItems,
  people,
} from "../drizzle/schema";
import { getDb } from "./db";

export const LEADERSHIP_STUDY_STAGES = [
  "leia",
  "entenda",
  "responda",
  "aplique",
] as const;

export type LeadershipStudyStage = (typeof LEADERSHIP_STUDY_STAGES)[number];
export type LeadershipQuestionOption = { id: string; label: string };

export class LeadershipIdempotencyConflictError extends Error {
  readonly code = "LEADERSHIP_IDEMPOTENCY_CONFLICT" as const;

  constructor(message = "A mesma chave já foi usada com outro conteúdo.") {
    super(message);
    this.name = "LeadershipIdempotencyConflictError";
  }
}

export class LeadershipStudyNoteVersionConflictError extends Error {
  readonly code = "LEADERSHIP_NOTE_VERSION_CONFLICT" as const;

  constructor(message = "A anotação foi alterada em outro dispositivo.") {
    super(message);
    this.name = "LeadershipStudyNoteVersionConflictError";
  }
}

function hashPayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeOptions(options: LeadershipQuestionOption[]) {
  return options.map(option => ({
    id: option.id.trim(),
    label: option.label.trim(),
  }));
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

export async function getLeadershipModuleById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(leadershipSchoolModules)
    .innerJoin(
      leadershipSchoolClasses,
      and(
        eq(leadershipSchoolModules.classId, leadershipSchoolClasses.id),
        eq(leadershipSchoolClasses.churchId, churchId)
      )
    )
    .where(
      and(
        eq(leadershipSchoolModules.id, id),
        eq(leadershipSchoolModules.churchId, churchId)
      )
    )
    .limit(1);
  return rows[0]?.leadership_school_modules ?? null;
}

export async function getLeadershipModulesByClass(
  classId: number,
  churchId: number,
  includeInactive = true
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    eq(leadershipSchoolModules.classId, classId),
    eq(leadershipSchoolModules.churchId, churchId),
    eq(leadershipSchoolClasses.id, classId),
    eq(leadershipSchoolClasses.churchId, churchId),
  ];
  if (!includeInactive)
    conditions.push(eq(leadershipSchoolModules.active, true));
  return db
    .select({ module: leadershipSchoolModules, class: leadershipSchoolClasses })
    .from(leadershipSchoolModules)
    .innerJoin(
      leadershipSchoolClasses,
      and(
        eq(leadershipSchoolModules.classId, leadershipSchoolClasses.id),
        eq(leadershipSchoolClasses.churchId, churchId)
      )
    )
    .where(and(...conditions))
    .orderBy(
      asc(leadershipSchoolModules.position),
      asc(leadershipSchoolModules.id)
    );
}

export async function createLeadershipModule(data: {
  churchId: number;
  classId: number;
  title: string;
  description?: string | null;
  position?: number;
  createdByChurchUserId: number;
}) {
  const db = await requireDb();
  const position =
    data.position ??
    ((
      await db
        .select({ position: leadershipSchoolModules.position })
        .from(leadershipSchoolModules)
        .where(
          and(
            eq(leadershipSchoolModules.churchId, data.churchId),
            eq(leadershipSchoolModules.classId, data.classId)
          )
        )
        .orderBy(
          desc(leadershipSchoolModules.position),
          desc(leadershipSchoolModules.id)
        )
        .limit(1)
    )[0]?.position ?? -1) + 1;
  const result = await db.insert(leadershipSchoolModules).values({
    churchId: data.churchId,
    classId: data.classId,
    title: data.title.trim(),
    description: normalizeNullableText(data.description),
    position,
    active: true,
    createdByChurchUserId: data.createdByChurchUserId,
  });
  return { id: Number(result[0]?.insertId ?? 0) };
}

export async function updateLeadershipModule(data: {
  id: number;
  churchId: number;
  title?: string;
  description?: string | null;
  position?: number;
  active?: boolean;
}) {
  const db = await requireDb();
  const update: Partial<typeof leadershipSchoolModules.$inferInsert> = {};
  if (data.title !== undefined) update.title = data.title.trim();
  if (data.description !== undefined)
    update.description = normalizeNullableText(data.description);
  if (data.position !== undefined) update.position = data.position;
  if (data.active !== undefined) update.active = data.active;
  if (Object.keys(update).length > 0) {
    await db
      .update(leadershipSchoolModules)
      .set(update)
      .where(
        and(
          eq(leadershipSchoolModules.id, data.id),
          eq(leadershipSchoolModules.churchId, data.churchId)
        )
      );
  }
  return getLeadershipModuleById(data.id, data.churchId);
}

export async function moveLeadershipModule(data: {
  churchId: number;
  classId: number;
  currentId: number;
  currentPosition: number;
  targetId: number;
  targetPosition: number;
}) {
  const db = await requireDb();
  await db.transaction(async tx => {
    const scope = and(
      eq(leadershipSchoolModules.churchId, data.churchId),
      eq(leadershipSchoolModules.classId, data.classId)
    );
    await tx
      .update(leadershipSchoolModules)
      .set({ position: -1 })
      .where(and(scope, eq(leadershipSchoolModules.id, data.currentId)));
    await tx
      .update(leadershipSchoolModules)
      .set({ position: data.currentPosition })
      .where(and(scope, eq(leadershipSchoolModules.id, data.targetId)));
    await tx
      .update(leadershipSchoolModules)
      .set({ position: data.targetPosition })
      .where(and(scope, eq(leadershipSchoolModules.id, data.currentId)));
  });
}

export async function getLeadershipStudyById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(leadershipSchoolStudies)
    .innerJoin(
      leadershipSchoolClasses,
      and(
        eq(leadershipSchoolStudies.classId, leadershipSchoolClasses.id),
        eq(leadershipSchoolClasses.churchId, churchId)
      )
    )
    .leftJoin(
      leadershipSchoolModules,
      and(
        eq(leadershipSchoolStudies.moduleId, leadershipSchoolModules.id),
        eq(leadershipSchoolModules.churchId, churchId),
        eq(leadershipSchoolModules.classId, leadershipSchoolStudies.classId)
      )
    )
    .where(
      and(
        eq(leadershipSchoolStudies.id, id),
        eq(leadershipSchoolStudies.churchId, churchId)
      )
    )
    .limit(1);
  const row = rows[0];
  return row
    ? {
        study: row.leadership_school_studies,
        class: row.leadership_school_classes,
        module: row.leadership_school_modules,
      }
    : null;
}

export async function getLeadershipStudiesByClass(
  classId: number,
  churchId: number,
  includeInactive = true
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    eq(leadershipSchoolStudies.classId, classId),
    eq(leadershipSchoolStudies.churchId, churchId),
    eq(leadershipSchoolClasses.id, classId),
    eq(leadershipSchoolClasses.churchId, churchId),
  ];
  if (!includeInactive)
    conditions.push(eq(leadershipSchoolStudies.active, true));
  return db
    .select({
      study: leadershipSchoolStudies,
      class: leadershipSchoolClasses,
      module: leadershipSchoolModules,
    })
    .from(leadershipSchoolStudies)
    .innerJoin(
      leadershipSchoolClasses,
      and(
        eq(leadershipSchoolStudies.classId, leadershipSchoolClasses.id),
        eq(leadershipSchoolClasses.churchId, churchId)
      )
    )
    .leftJoin(
      leadershipSchoolModules,
      and(
        eq(leadershipSchoolStudies.moduleId, leadershipSchoolModules.id),
        eq(leadershipSchoolModules.churchId, churchId),
        eq(leadershipSchoolModules.classId, leadershipSchoolStudies.classId)
      )
    )
    .where(and(...conditions))
    .orderBy(
      asc(leadershipSchoolStudies.position),
      asc(leadershipSchoolStudies.id)
    );
}

export async function getLeadershipStudyBlocks(
  studyId: number,
  churchId: number,
  includeInactive = true
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    eq(leadershipSchoolStudyBlocks.studyId, studyId),
    eq(leadershipSchoolStudyBlocks.churchId, churchId),
    eq(leadershipSchoolStudies.id, studyId),
    eq(leadershipSchoolStudies.churchId, churchId),
  ];
  if (!includeInactive)
    conditions.push(eq(leadershipSchoolStudyBlocks.active, true));
  const rows = await db
    .select({ block: leadershipSchoolStudyBlocks })
    .from(leadershipSchoolStudyBlocks)
    .innerJoin(
      leadershipSchoolStudies,
      and(
        eq(leadershipSchoolStudyBlocks.studyId, leadershipSchoolStudies.id),
        eq(leadershipSchoolStudies.churchId, churchId)
      )
    )
    .where(and(...conditions))
    .orderBy(
      asc(leadershipSchoolStudyBlocks.position),
      asc(leadershipSchoolStudyBlocks.id)
    );
  return rows.map(row => row.block);
}

export async function getLeadershipStudyBlockById(
  id: number,
  studyId: number,
  churchId: number
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ block: leadershipSchoolStudyBlocks })
    .from(leadershipSchoolStudyBlocks)
    .innerJoin(
      leadershipSchoolStudies,
      and(
        eq(leadershipSchoolStudyBlocks.studyId, leadershipSchoolStudies.id),
        eq(leadershipSchoolStudies.churchId, churchId)
      )
    )
    .where(
      and(
        eq(leadershipSchoolStudyBlocks.id, id),
        eq(leadershipSchoolStudyBlocks.studyId, studyId),
        eq(leadershipSchoolStudyBlocks.churchId, churchId)
      )
    )
    .limit(1);
  return rows[0]?.block ?? null;
}

export async function getLeadershipStudyQuestions(
  studyId: number,
  churchId: number
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      block: leadershipSchoolStudyBlocks,
      question: leadershipSchoolQuestions,
    })
    .from(leadershipSchoolStudyBlocks)
    .innerJoin(
      leadershipSchoolQuestions,
      and(
        eq(leadershipSchoolQuestions.blockId, leadershipSchoolStudyBlocks.id),
        eq(leadershipSchoolQuestions.churchId, churchId),
        eq(leadershipSchoolQuestions.active, true)
      )
    )
    .innerJoin(
      leadershipSchoolStudies,
      and(
        eq(leadershipSchoolStudyBlocks.studyId, leadershipSchoolStudies.id),
        eq(leadershipSchoolStudies.churchId, churchId)
      )
    )
    .where(
      and(
        eq(leadershipSchoolStudyBlocks.studyId, studyId),
        eq(leadershipSchoolStudyBlocks.churchId, churchId),
        eq(leadershipSchoolStudyBlocks.active, true)
      )
    )
    .orderBy(
      asc(leadershipSchoolStudyBlocks.position),
      asc(leadershipSchoolStudyBlocks.id),
      asc(leadershipSchoolQuestions.position),
      asc(leadershipSchoolQuestions.id)
    );
}

export async function getLeadershipQuestionById(
  questionId: number,
  studyId: number,
  blockId: number,
  churchId: number
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      question: leadershipSchoolQuestions,
      block: leadershipSchoolStudyBlocks,
    })
    .from(leadershipSchoolQuestions)
    .innerJoin(
      leadershipSchoolStudyBlocks,
      and(
        eq(leadershipSchoolQuestions.blockId, leadershipSchoolStudyBlocks.id),
        eq(leadershipSchoolStudyBlocks.id, blockId),
        eq(leadershipSchoolStudyBlocks.studyId, studyId),
        eq(leadershipSchoolStudyBlocks.churchId, churchId)
      )
    )
    .where(
      and(
        eq(leadershipSchoolQuestions.id, questionId),
        eq(leadershipSchoolQuestions.churchId, churchId),
        eq(leadershipSchoolQuestions.active, true)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

async function nextPosition(
  table:
    | typeof leadershipSchoolStudies
    | typeof leadershipSchoolStudyBlocks
    | typeof leadershipSchoolQuestions,
  conditions: ReturnType<typeof and>
) {
  const db = await requireDb();
  const rows = await db
    .select({ position: table.position })
    .from(table)
    .where(conditions)
    .orderBy(desc(table.position), desc(table.id))
    .limit(1);
  return (rows[0]?.position ?? -1) + 1;
}

export async function createIdempotentLeadershipStudy(data: {
  churchId: number;
  classId: number;
  moduleId?: number | null;
  title: string;
  weekStart?: string | null;
  summary?: string | null;
  content?: string | null;
  position?: number;
  createdByChurchUserId: number;
  clientRequestId: string;
  requestSchemaVersion: number;
}) {
  const requestHash = hashPayload({
    churchId: data.churchId,
    classId: data.classId,
    moduleId: data.moduleId ?? null,
    title: data.title.trim(),
    weekStart: data.weekStart ?? null,
    summary: normalizeNullableText(data.summary),
    content: normalizeNullableText(data.content),
    position: data.position ?? null,
    requestSchemaVersion: data.requestSchemaVersion,
  });
  const db = await requireDb();
  const readExisting = async () => {
    const rows = await db
      .select({
        id: leadershipSchoolStudies.id,
        requestHash: leadershipSchoolStudies.requestHash,
      })
      .from(leadershipSchoolStudies)
      .where(
        and(
          eq(leadershipSchoolStudies.churchId, data.churchId),
          eq(
            leadershipSchoolStudies.createdByChurchUserId,
            data.createdByChurchUserId
          ),
          eq(leadershipSchoolStudies.clientRequestId, data.clientRequestId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  };
  const existing = await readExisting();
  if (existing) {
    if (existing.requestHash !== requestHash)
      throw new LeadershipIdempotencyConflictError();
    return { id: existing.id, status: "existing" as const, requestHash };
  }
  try {
    const result = await db.transaction(async tx => {
      const position =
        data.position ??
        ((
          await tx
            .select({ position: leadershipSchoolStudies.position })
            .from(leadershipSchoolStudies)
            .where(
              and(
                eq(leadershipSchoolStudies.churchId, data.churchId),
                eq(leadershipSchoolStudies.classId, data.classId),
                data.moduleId == null
                  ? isNull(leadershipSchoolStudies.moduleId)
                  : eq(leadershipSchoolStudies.moduleId, data.moduleId)
              )
            )
            .orderBy(
              desc(leadershipSchoolStudies.position),
              desc(leadershipSchoolStudies.id)
            )
            .limit(1)
        )[0]?.position ?? -1) + 1;
      const inserted = await tx.insert(leadershipSchoolStudies).values({
        churchId: data.churchId,
        classId: data.classId,
        moduleId: data.moduleId ?? null,
        title: data.title.trim(),
        weekStart: data.weekStart ?? null,
        summary: normalizeNullableText(data.summary),
        content: normalizeNullableText(data.content),
        position,
        status: "rascunho",
        active: true,
        createdByChurchUserId: data.createdByChurchUserId,
        clientRequestId: data.clientRequestId,
        requestHash,
        requestSchemaVersion: data.requestSchemaVersion,
      });
      return Number(inserted[0]?.insertId ?? 0);
    });
    return { id: result, status: "created" as const, requestHash };
  } catch (error) {
    const concurrent = await readExisting();
    if (concurrent) {
      if (concurrent.requestHash !== requestHash)
        throw new LeadershipIdempotencyConflictError();
      return { id: concurrent.id, status: "existing" as const, requestHash };
    }
    throw error;
  }
}

export async function updateLeadershipStudy(data: {
  id: number;
  churchId: number;
  moduleId?: number | null;
  title?: string;
  weekStart?: string | null;
  summary?: string | null;
  content?: string | null;
  position?: number;
  active?: boolean;
}) {
  const db = await requireDb();
  const update: Partial<typeof leadershipSchoolStudies.$inferInsert> = {};
  if (data.moduleId !== undefined) update.moduleId = data.moduleId;
  if (data.title !== undefined) update.title = data.title.trim();
  if (data.weekStart !== undefined) update.weekStart = data.weekStart;
  if (data.summary !== undefined)
    update.summary = normalizeNullableText(data.summary);
  if (data.content !== undefined)
    update.content = normalizeNullableText(data.content);
  if (data.position !== undefined) update.position = data.position;
  if (data.active !== undefined) update.active = data.active;
  if (Object.keys(update).length > 0) {
    await db
      .update(leadershipSchoolStudies)
      .set(update)
      .where(
        and(
          eq(leadershipSchoolStudies.id, data.id),
          eq(leadershipSchoolStudies.churchId, data.churchId)
        )
      );
  }
  return getLeadershipStudyById(data.id, data.churchId);
}

export async function publishLeadershipStudy(data: {
  id: number;
  churchId: number;
  publishedByChurchUserId: number;
}) {
  const blocks = await getLeadershipStudyBlocks(data.id, data.churchId, false);
  const stages = new Set(blocks.map(block => block.stageKey));
  const missingStages = LEADERSHIP_STUDY_STAGES.filter(
    stage => !stages.has(stage)
  );
  if (missingStages.length > 0) {
    throw new Error(
      `O estudo precisa de uma etapa ativa para: ${missingStages.join(", ")}.`
    );
  }
  const questions = await getLeadershipStudyQuestions(data.id, data.churchId);
  if (!questions.some(row => row.block.stageKey === "responda")) {
    throw new Error(
      "O estudo precisa de pelo menos uma pergunta ativa em Responda."
    );
  }
  const db = await requireDb();
  await db
    .update(leadershipSchoolStudies)
    .set({
      status: "publicada",
      publishedAt: new Date(),
      publishedByChurchUserId: data.publishedByChurchUserId,
      active: true,
    })
    .where(
      and(
        eq(leadershipSchoolStudies.id, data.id),
        eq(leadershipSchoolStudies.churchId, data.churchId)
      )
    );
  return getLeadershipStudyById(data.id, data.churchId);
}

export async function archiveLeadershipStudy(id: number, churchId: number) {
  const db = await requireDb();
  await db
    .update(leadershipSchoolStudies)
    .set({ status: "arquivada", active: false })
    .where(
      and(
        eq(leadershipSchoolStudies.id, id),
        eq(leadershipSchoolStudies.churchId, churchId)
      )
    );
}

export async function createLeadershipStudyBlock(data: {
  churchId: number;
  studyId: number;
  stageKey: LeadershipStudyStage;
  title: string;
  content: string;
  reflectionPrompt?: string | null;
  position?: number;
  createdByChurchUserId: number;
}) {
  const position =
    data.position ??
    (await nextPosition(
      leadershipSchoolStudyBlocks,
      and(
        eq(leadershipSchoolStudyBlocks.churchId, data.churchId),
        eq(leadershipSchoolStudyBlocks.studyId, data.studyId)
      )
    ));
  const db = await requireDb();
  const result = await db.insert(leadershipSchoolStudyBlocks).values({
    churchId: data.churchId,
    studyId: data.studyId,
    stageKey: data.stageKey,
    title: data.title.trim(),
    content: data.content.trim(),
    reflectionPrompt: normalizeNullableText(data.reflectionPrompt),
    position,
    active: true,
    createdByChurchUserId: data.createdByChurchUserId,
  });
  return { id: Number(result[0]?.insertId ?? 0) };
}

export async function updateLeadershipStudyBlock(data: {
  id: number;
  studyId: number;
  churchId: number;
  stageKey?: LeadershipStudyStage;
  title?: string;
  content?: string;
  reflectionPrompt?: string | null;
  position?: number;
  active?: boolean;
}) {
  const db = await requireDb();
  const update: Partial<typeof leadershipSchoolStudyBlocks.$inferInsert> = {};
  if (data.stageKey !== undefined) update.stageKey = data.stageKey;
  if (data.title !== undefined) update.title = data.title.trim();
  if (data.content !== undefined) update.content = data.content.trim();
  if (data.reflectionPrompt !== undefined)
    update.reflectionPrompt = normalizeNullableText(data.reflectionPrompt);
  if (data.position !== undefined) update.position = data.position;
  if (data.active !== undefined) update.active = data.active;
  if (Object.keys(update).length > 0) {
    await db
      .update(leadershipSchoolStudyBlocks)
      .set(update)
      .where(
        and(
          eq(leadershipSchoolStudyBlocks.id, data.id),
          eq(leadershipSchoolStudyBlocks.studyId, data.studyId),
          eq(leadershipSchoolStudyBlocks.churchId, data.churchId)
        )
      );
  }
  return getLeadershipStudyBlockById(data.id, data.studyId, data.churchId);
}

export async function moveLeadershipStudyBlock(data: {
  churchId: number;
  studyId: number;
  currentId: number;
  currentPosition: number;
  targetId: number;
  targetPosition: number;
}) {
  const db = await requireDb();
  await db.transaction(async tx => {
    const scope = and(
      eq(leadershipSchoolStudyBlocks.churchId, data.churchId),
      eq(leadershipSchoolStudyBlocks.studyId, data.studyId)
    );
    await tx
      .update(leadershipSchoolStudyBlocks)
      .set({ position: -1 })
      .where(and(scope, eq(leadershipSchoolStudyBlocks.id, data.currentId)));
    await tx
      .update(leadershipSchoolStudyBlocks)
      .set({ position: data.currentPosition })
      .where(and(scope, eq(leadershipSchoolStudyBlocks.id, data.targetId)));
    await tx
      .update(leadershipSchoolStudyBlocks)
      .set({ position: data.targetPosition })
      .where(and(scope, eq(leadershipSchoolStudyBlocks.id, data.currentId)));
  });
}

export async function createIdempotentLeadershipQuestion(data: {
  churchId: number;
  blockId: number;
  prompt: string;
  options: LeadershipQuestionOption[];
  correctOptionId: string;
  explanation: string;
  position?: number;
  createdByChurchUserId: number;
  clientRequestId: string;
  requestSchemaVersion: number;
}) {
  const options = normalizeOptions(data.options);
  const requestHash = hashPayload({
    churchId: data.churchId,
    blockId: data.blockId,
    prompt: data.prompt.trim(),
    options,
    correctOptionId: data.correctOptionId.trim(),
    explanation: data.explanation.trim(),
    position: data.position ?? null,
    requestSchemaVersion: data.requestSchemaVersion,
  });
  const db = await requireDb();
  const readExisting = async () => {
    const rows = await db
      .select({
        id: leadershipSchoolQuestions.id,
        requestHash: leadershipSchoolQuestions.requestHash,
      })
      .from(leadershipSchoolQuestions)
      .where(
        and(
          eq(leadershipSchoolQuestions.churchId, data.churchId),
          eq(
            leadershipSchoolQuestions.createdByChurchUserId,
            data.createdByChurchUserId
          ),
          eq(leadershipSchoolQuestions.clientRequestId, data.clientRequestId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  };
  const existing = await readExisting();
  if (existing) {
    if (existing.requestHash !== requestHash)
      throw new LeadershipIdempotencyConflictError();
    return { id: existing.id, status: "existing" as const, requestHash };
  }
  try {
    const position =
      data.position ??
      (await nextPosition(
        leadershipSchoolQuestions,
        and(
          eq(leadershipSchoolQuestions.churchId, data.churchId),
          eq(leadershipSchoolQuestions.blockId, data.blockId)
        )
      ));
    const inserted = await db.insert(leadershipSchoolQuestions).values({
      churchId: data.churchId,
      blockId: data.blockId,
      prompt: data.prompt.trim(),
      options,
      correctOptionId: data.correctOptionId.trim(),
      explanation: data.explanation.trim(),
      position,
      active: true,
      createdByChurchUserId: data.createdByChurchUserId,
      clientRequestId: data.clientRequestId,
      requestHash,
      requestSchemaVersion: data.requestSchemaVersion,
    });
    return {
      id: Number(inserted[0]?.insertId ?? 0),
      status: "created" as const,
      requestHash,
    };
  } catch (error) {
    const concurrent = await readExisting();
    if (concurrent) {
      if (concurrent.requestHash !== requestHash)
        throw new LeadershipIdempotencyConflictError();
      return { id: concurrent.id, status: "existing" as const, requestHash };
    }
    throw error;
  }
}

export async function updateLeadershipQuestion(data: {
  id: number;
  studyId: number;
  blockId: number;
  churchId: number;
  prompt?: string;
  options?: LeadershipQuestionOption[];
  correctOptionId?: string;
  explanation?: string;
  position?: number;
  active?: boolean;
}) {
  const db = await requireDb();
  const update: Partial<typeof leadershipSchoolQuestions.$inferInsert> = {};
  if (data.prompt !== undefined) update.prompt = data.prompt.trim();
  if (data.options !== undefined)
    update.options = normalizeOptions(data.options);
  if (data.correctOptionId !== undefined)
    update.correctOptionId = data.correctOptionId.trim();
  if (data.explanation !== undefined)
    update.explanation = data.explanation.trim();
  if (data.position !== undefined) update.position = data.position;
  if (data.active !== undefined) update.active = data.active;
  if (Object.keys(update).length > 0) {
    await db
      .update(leadershipSchoolQuestions)
      .set(update)
      .where(
        and(
          eq(leadershipSchoolQuestions.id, data.id),
          eq(leadershipSchoolQuestions.blockId, data.blockId),
          eq(leadershipSchoolQuestions.churchId, data.churchId)
        )
      );
  }
  return getLeadershipQuestionById(
    data.id,
    data.studyId,
    data.blockId,
    data.churchId
  );
}

export async function getLeadershipStudyMaterials(
  studyId: number,
  churchId: number
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: leadershipSchoolStudyMaterials.id,
      studyId: leadershipSchoolStudyMaterials.studyId,
      libraryItemId: leadershipSchoolStudyMaterials.libraryItemId,
      position: leadershipSchoolStudyMaterials.position,
      notes: leadershipSchoolStudyMaterials.notes,
      title: libraryItems.title,
      type: libraryItems.type,
      fileUrl: libraryItems.fileUrl,
      thumbnailUrl: libraryItems.thumbnailUrl,
      description: libraryItems.description,
    })
    .from(leadershipSchoolStudyMaterials)
    .innerJoin(
      libraryItems,
      and(
        eq(leadershipSchoolStudyMaterials.libraryItemId, libraryItems.id),
        eq(leadershipSchoolStudyMaterials.churchId, libraryItems.churchId)
      )
    )
    .where(
      and(
        eq(leadershipSchoolStudyMaterials.churchId, churchId),
        eq(leadershipSchoolStudyMaterials.studyId, studyId)
      )
    )
    .orderBy(
      asc(leadershipSchoolStudyMaterials.position),
      asc(leadershipSchoolStudyMaterials.id)
    );
}

export async function attachLeadershipStudyMaterial(data: {
  churchId: number;
  studyId: number;
  libraryItemId: number;
  position: number;
  notes?: string | null;
}) {
  const db = await requireDb();
  await db
    .insert(leadershipSchoolStudyMaterials)
    .values({ ...data, notes: normalizeNullableText(data.notes) })
    .onDuplicateKeyUpdate({
      set: {
        position: data.position,
        notes: normalizeNullableText(data.notes),
      },
    });
}

export async function updateLeadershipStudyMaterialPosition(data: {
  id: number;
  churchId: number;
  studyId: number;
  position: number;
}) {
  const db = await requireDb();
  await db
    .update(leadershipSchoolStudyMaterials)
    .set({ position: data.position })
    .where(
      and(
        eq(leadershipSchoolStudyMaterials.id, data.id),
        eq(leadershipSchoolStudyMaterials.churchId, data.churchId),
        eq(leadershipSchoolStudyMaterials.studyId, data.studyId)
      )
    );
}

export async function detachLeadershipStudyMaterial(data: {
  id: number;
  churchId: number;
  studyId: number;
}) {
  const db = await requireDb();
  await db
    .delete(leadershipSchoolStudyMaterials)
    .where(
      and(
        eq(leadershipSchoolStudyMaterials.id, data.id),
        eq(leadershipSchoolStudyMaterials.churchId, data.churchId),
        eq(leadershipSchoolStudyMaterials.studyId, data.studyId)
      )
    );
}

export async function getLeadershipStudyProgress(
  churchId: number,
  enrollmentId: number,
  studyId: number
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(leadershipSchoolStudyProgress)
    .where(
      and(
        eq(leadershipSchoolStudyProgress.churchId, churchId),
        eq(leadershipSchoolStudyProgress.enrollmentId, enrollmentId),
        eq(leadershipSchoolStudyProgress.studyId, studyId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getLeadershipBlockProgress(
  churchId: number,
  enrollmentId: number,
  studyId: number
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      progress: leadershipSchoolBlockProgress,
      block: leadershipSchoolStudyBlocks,
    })
    .from(leadershipSchoolBlockProgress)
    .innerJoin(
      leadershipSchoolStudyBlocks,
      and(
        eq(
          leadershipSchoolBlockProgress.blockId,
          leadershipSchoolStudyBlocks.id
        ),
        eq(
          leadershipSchoolBlockProgress.studyId,
          leadershipSchoolStudyBlocks.studyId
        ),
        eq(leadershipSchoolStudyBlocks.churchId, churchId),
        eq(leadershipSchoolStudyBlocks.active, true)
      )
    )
    .where(
      and(
        eq(leadershipSchoolBlockProgress.churchId, churchId),
        eq(leadershipSchoolBlockProgress.enrollmentId, enrollmentId),
        eq(leadershipSchoolBlockProgress.studyId, studyId)
      )
    )
    .orderBy(
      asc(leadershipSchoolStudyBlocks.position),
      asc(leadershipSchoolStudyBlocks.id)
    );
}

export async function getLeadershipStudentStudy(
  personId: number,
  churchId: number,
  enrollmentId: number,
  studyId: number
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      enrollment: leadershipSchoolEnrollments,
      study: leadershipSchoolStudies,
      class: leadershipSchoolClasses,
    })
    .from(leadershipSchoolEnrollments)
    .innerJoin(
      leadershipSchoolClasses,
      and(
        eq(leadershipSchoolEnrollments.classId, leadershipSchoolClasses.id),
        eq(leadershipSchoolClasses.churchId, churchId)
      )
    )
    .innerJoin(
      leadershipSchoolStudies,
      and(
        eq(
          leadershipSchoolStudies.classId,
          leadershipSchoolEnrollments.classId
        ),
        eq(leadershipSchoolStudies.churchId, churchId),
        eq(leadershipSchoolStudies.id, studyId),
        eq(leadershipSchoolStudies.status, "publicada"),
        eq(leadershipSchoolStudies.active, true)
      )
    )
    .innerJoin(people, eq(people.id, leadershipSchoolEnrollments.personId))
    .where(
      and(
        eq(leadershipSchoolEnrollments.id, enrollmentId),
        eq(leadershipSchoolEnrollments.personId, personId),
        eq(leadershipSchoolEnrollments.churchId, churchId),
        ne(leadershipSchoolEnrollments.status, "cancelado"),
        eq(people.churchId, churchId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getLeadershipStudentStudySession(data: {
  personId: number;
  churchId: number;
  enrollmentId: number;
  studyId: number;
}) {
  const resolved = await getLeadershipStudentStudy(
    data.personId,
    data.churchId,
    data.enrollmentId,
    data.studyId
  );
  if (!resolved) return null;
  const [blocks, questionRows, progress, blockProgress] = await Promise.all([
    getLeadershipStudyBlocks(data.studyId, data.churchId, false),
    getLeadershipStudyQuestions(data.studyId, data.churchId),
    getLeadershipStudyProgress(data.churchId, data.enrollmentId, data.studyId),
    getLeadershipBlockProgress(data.churchId, data.enrollmentId, data.studyId),
  ]);
  const questionsByBlock = new Map<
    number,
    Array<{
      id: number;
      prompt: string;
      options: unknown;
      position: number;
    }>
  >();
  for (const row of questionRows) {
    const list = questionsByBlock.get(row.block.id) ?? [];
    list.push({
      id: row.question.id,
      prompt: row.question.prompt,
      options: row.question.options,
      position: row.question.position,
    });
    questionsByBlock.set(row.block.id, list);
  }
  return {
    study: resolved.study,
    class: resolved.class,
    enrollment: resolved.enrollment,
    progress,
    blockProgress,
    blocks: blocks.map(block => ({
      ...block,
      questions: questionsByBlock.get(block.id) ?? [],
    })),
  };
}

export async function touchLeadershipStudyProgress(data: {
  churchId: number;
  enrollmentId: number;
  studyId: number;
  lastBlockPosition?: number;
}) {
  const db = await requireDb();
  const now = new Date();
  await db
    .insert(leadershipSchoolStudyProgress)
    .values({
      churchId: data.churchId,
      enrollmentId: data.enrollmentId,
      studyId: data.studyId,
      status: "em_andamento",
      lastBlockPosition: data.lastBlockPosition ?? 0,
      startedAt: now,
      lastAccessedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        status: sql`CASE WHEN ${leadershipSchoolStudyProgress.status} = 'concluida' THEN ${leadershipSchoolStudyProgress.status} ELSE 'em_andamento' END`,
        lastBlockPosition: data.lastBlockPosition ?? 0,
        startedAt: sql`COALESCE(${leadershipSchoolStudyProgress.startedAt}, ${now})`,
        lastAccessedAt: now,
      },
    });
  return getLeadershipStudyProgress(
    data.churchId,
    data.enrollmentId,
    data.studyId
  );
}

export async function touchLeadershipBlockProgress(data: {
  churchId: number;
  enrollmentId: number;
  studyId: number;
  blockId: number;
}) {
  const db = await requireDb();
  const now = new Date();
  await db
    .insert(leadershipSchoolBlockProgress)
    .values({
      churchId: data.churchId,
      enrollmentId: data.enrollmentId,
      studyId: data.studyId,
      blockId: data.blockId,
      status: "em_andamento",
      firstViewedAt: now,
      lastViewedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        lastViewedAt: now,
        status: sql`CASE WHEN ${leadershipSchoolBlockProgress.status} = 'concluida' THEN ${leadershipSchoolBlockProgress.status} ELSE 'em_andamento' END`,
      },
    });
}

export async function completeLeadershipBlockProgress(data: {
  churchId: number;
  enrollmentId: number;
  studyId: number;
  blockId: number;
}) {
  const db = await requireDb();
  const now = new Date();
  await db
    .insert(leadershipSchoolBlockProgress)
    .values({
      churchId: data.churchId,
      enrollmentId: data.enrollmentId,
      studyId: data.studyId,
      blockId: data.blockId,
      status: "concluida",
      firstViewedAt: now,
      lastViewedAt: now,
      completedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: { status: "concluida", lastViewedAt: now, completedAt: now },
    });
}

export async function saveLeadershipBlockReflection(data: {
  churchId: number;
  enrollmentId: number;
  studyId: number;
  blockId: number;
  reflection: string | null;
  expectedVersion: number;
}) {
  const db = await requireDb();
  const reflection = normalizeNullableText(data.reflection);
  return db.transaction(async tx => {
    const scope = and(
      eq(leadershipSchoolBlockProgress.churchId, data.churchId),
      eq(leadershipSchoolBlockProgress.enrollmentId, data.enrollmentId),
      eq(leadershipSchoolBlockProgress.studyId, data.studyId),
      eq(leadershipSchoolBlockProgress.blockId, data.blockId)
    );
    const beforeInsert = await tx
      .select({
        reflection: leadershipSchoolBlockProgress.reflection,
        reflectionVersion: leadershipSchoolBlockProgress.reflectionVersion,
      })
      .from(leadershipSchoolBlockProgress)
      .where(scope)
      .limit(1);
    if (
      !beforeInsert.length &&
      reflection === null &&
      data.expectedVersion === 0
    ) {
      return { reflection: null, reflectionVersion: 0, unchanged: true };
    }
    if (!beforeInsert.length && data.expectedVersion > 0) {
      throw new LeadershipStudyNoteVersionConflictError();
    }
    if (!beforeInsert.length) {
      await tx
        .insert(leadershipSchoolBlockProgress)
        .values({
          churchId: data.churchId,
          enrollmentId: data.enrollmentId,
          studyId: data.studyId,
          blockId: data.blockId,
          status: "em_andamento",
          reflection: null,
          reflectionVersion: 0,
        })
        .onDuplicateKeyUpdate({
          set: { id: sql`${leadershipSchoolBlockProgress.id}` },
        });
    }
    const rows = await tx
      .select({
        reflection: leadershipSchoolBlockProgress.reflection,
        reflectionVersion: leadershipSchoolBlockProgress.reflectionVersion,
      })
      .from(leadershipSchoolBlockProgress)
      .where(scope)
      .limit(1)
      .for("update");
    const current = rows[0];
    if (!current) {
      throw new Error("Leadership block progress disappeared during note save");
    }
    const currentVersion = current.reflectionVersion;
    const currentReflection = normalizeNullableText(current.reflection);
    if (
      data.expectedVersion > currentVersion ||
      (data.expectedVersion < currentVersion &&
        reflection !== currentReflection)
    ) {
      throw new LeadershipStudyNoteVersionConflictError();
    }
    if (reflection === currentReflection) {
      return {
        reflection: currentReflection,
        reflectionVersion: currentVersion,
        unchanged: true,
      };
    }
    const result = await tx
      .update(leadershipSchoolBlockProgress)
      .set({
        reflection,
        reflectionVersion: sql`${leadershipSchoolBlockProgress.reflectionVersion} + 1`,
      })
      .where(
        and(
          scope,
          eq(
            leadershipSchoolBlockProgress.reflectionVersion,
            data.expectedVersion
          )
        )
      );
    const affectedRows = Number(
      (result[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0
    );
    if (affectedRows !== 1) throw new LeadershipStudyNoteVersionConflictError();
    return {
      reflection,
      reflectionVersion: currentVersion + 1,
      unchanged: false,
    };
  });
}

export async function completeLeadershipStudy(data: {
  churchId: number;
  enrollmentId: number;
  studyId: number;
}) {
  const [blocks, blockProgress, questionRows] = await Promise.all([
    getLeadershipStudyBlocks(data.studyId, data.churchId, false),
    getLeadershipBlockProgress(data.churchId, data.enrollmentId, data.studyId),
    getLeadershipStudyQuestions(data.studyId, data.churchId),
  ]);
  const completedBlocks = new Set(
    blockProgress
      .filter(row => row.progress.status === "concluida")
      .map(row => row.block.id)
  );
  if (blocks.some(block => !completedBlocks.has(block.id))) {
    throw new Error("Conclua todas as etapas do estudo antes de finalizar.");
  }
  const questionIds = questionRows.map(row => row.question.id);
  if (questionIds.length > 0) {
    const db = await requireDb();
    const correctRows = await db
      .select({ questionId: leadershipSchoolQuestionAttempts.questionId })
      .from(leadershipSchoolQuestionAttempts)
      .where(
        and(
          eq(leadershipSchoolQuestionAttempts.churchId, data.churchId),
          eq(leadershipSchoolQuestionAttempts.enrollmentId, data.enrollmentId),
          eq(leadershipSchoolQuestionAttempts.isCorrect, true),
          inArray(leadershipSchoolQuestionAttempts.questionId, questionIds)
        )
      );
    const correct = new Set(correctRows.map(row => row.questionId));
    if (questionIds.some(questionId => !correct.has(questionId))) {
      throw new Error(
        "Responda corretamente todas as perguntas antes de finalizar."
      );
    }
  }
  const db = await requireDb();
  const now = new Date();
  await db
    .insert(leadershipSchoolStudyProgress)
    .values({
      churchId: data.churchId,
      enrollmentId: data.enrollmentId,
      studyId: data.studyId,
      status: "concluida",
      startedAt: now,
      lastAccessedAt: now,
      completedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: { status: "concluida", lastAccessedAt: now, completedAt: now },
    });
  return getLeadershipStudyProgress(
    data.churchId,
    data.enrollmentId,
    data.studyId
  );
}

export async function recordLeadershipQuestionAttempt(data: {
  churchId: number;
  enrollmentId: number;
  questionId: number;
  selectedOptionId: string;
  clientAttemptId?: string | null;
}) {
  const db = await requireDb();
  if (data.clientAttemptId) {
    const existing = await db
      .select()
      .from(leadershipSchoolQuestionAttempts)
      .where(
        and(
          eq(leadershipSchoolQuestionAttempts.churchId, data.churchId),
          eq(leadershipSchoolQuestionAttempts.enrollmentId, data.enrollmentId),
          eq(leadershipSchoolQuestionAttempts.questionId, data.questionId),
          eq(
            leadershipSchoolQuestionAttempts.clientAttemptId,
            data.clientAttemptId
          )
        )
      )
      .limit(1);
    if (existing[0]) {
      if (existing[0].selectedOptionId !== data.selectedOptionId) {
        throw new LeadershipIdempotencyConflictError();
      }
      return existing[0];
    }
  }
  const questionRows = await db
    .select()
    .from(leadershipSchoolQuestions)
    .where(
      and(
        eq(leadershipSchoolQuestions.id, data.questionId),
        eq(leadershipSchoolQuestions.churchId, data.churchId),
        eq(leadershipSchoolQuestions.active, true)
      )
    )
    .limit(1);
  const question = questionRows[0];
  if (!question) return null;
  const attempts = await db
    .select({ attemptNumber: leadershipSchoolQuestionAttempts.attemptNumber })
    .from(leadershipSchoolQuestionAttempts)
    .where(
      and(
        eq(leadershipSchoolQuestionAttempts.churchId, data.churchId),
        eq(leadershipSchoolQuestionAttempts.enrollmentId, data.enrollmentId),
        eq(leadershipSchoolQuestionAttempts.questionId, data.questionId)
      )
    )
    .orderBy(desc(leadershipSchoolQuestionAttempts.attemptNumber))
    .limit(1);
  const attemptNumber = (attempts[0]?.attemptNumber ?? 0) + 1;
  const options = Array.isArray(question.options) ? question.options : [];
  if (
    !options.some(
      option =>
        typeof option === "object" &&
        option !== null &&
        "id" in option &&
        option.id === data.selectedOptionId
    )
  ) {
    throw new Error("A alternativa selecionada não pertence à pergunta.");
  }
  const isCorrect = question.correctOptionId === data.selectedOptionId;
  const result = await db.insert(leadershipSchoolQuestionAttempts).values({
    churchId: data.churchId,
    enrollmentId: data.enrollmentId,
    questionId: data.questionId,
    selectedOptionId: data.selectedOptionId,
    isCorrect,
    attemptNumber,
    clientAttemptId: data.clientAttemptId ?? null,
  });
  return {
    id: Number(result[0]?.insertId ?? 0),
    questionId: data.questionId,
    selectedOptionId: data.selectedOptionId,
    isCorrect,
    attemptNumber,
    explanation: question.explanation,
  };
}

export async function getLeadershipStudyCreationStatus(
  studyId: number,
  churchId: number
) {
  const resolved = await getLeadershipStudyById(studyId, churchId);
  if (!resolved) return null;
  const [blocks, questions] = await Promise.all([
    getLeadershipStudyBlocks(studyId, churchId, true),
    getLeadershipStudyQuestions(studyId, churchId),
  ]);
  const activeBlocks = blocks.filter(block => block.active);
  const stageSet = new Set(activeBlocks.map(block => block.stageKey));
  const missingStages = LEADERSHIP_STUDY_STAGES.filter(
    stage => !stageSet.has(stage)
  );
  return {
    study: resolved.study,
    blockCount: blocks.length,
    activeBlockCount: activeBlocks.length,
    questionCount: questions.length,
    missingStages,
    hasQuestionInResponda: questions.some(
      row => row.block.stageKey === "responda"
    ),
    canPublish:
      missingStages.length === 0 &&
      questions.some(row => row.block.stageKey === "responda"),
  };
}

export async function getLeadershipStudyAdministrators(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: leadershipSchoolStudyAdministrators.id,
      churchUserId: leadershipSchoolStudyAdministrators.churchUserId,
      assignedByChurchUserId:
        leadershipSchoolStudyAdministrators.assignedByChurchUserId,
      createdAt: leadershipSchoolStudyAdministrators.createdAt,
      name: churchUsers.name,
      email: churchUsers.email,
      role: churchUsers.role,
      active: churchUsers.active,
    })
    .from(leadershipSchoolStudyAdministrators)
    .innerJoin(
      churchUsers,
      eq(leadershipSchoolStudyAdministrators.churchUserId, churchUsers.id)
    )
    .where(
      and(
        eq(leadershipSchoolStudyAdministrators.churchId, churchId),
        eq(churchUsers.churchId, churchId),
        eq(churchUsers.active, true)
      )
    )
    .orderBy(asc(churchUsers.name), asc(churchUsers.id));
}

export async function isLeadershipStudyAdministrator(
  churchId: number,
  churchUserId: number
) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: leadershipSchoolStudyAdministrators.id })
    .from(leadershipSchoolStudyAdministrators)
    .innerJoin(
      churchUsers,
      eq(leadershipSchoolStudyAdministrators.churchUserId, churchUsers.id)
    )
    .where(
      and(
        eq(leadershipSchoolStudyAdministrators.churchId, churchId),
        eq(leadershipSchoolStudyAdministrators.churchUserId, churchUserId),
        eq(churchUsers.churchId, churchId),
        eq(churchUsers.active, true)
      )
    )
    .limit(1);
  return Boolean(rows[0]);
}

export async function assignLeadershipStudyAdministrator(data: {
  churchId: number;
  churchUserId: number;
  assignedByChurchUserId: number;
}) {
  const db = await requireDb();
  await db
    .insert(leadershipSchoolStudyAdministrators)
    .values(data)
    .onDuplicateKeyUpdate({
      set: { assignedByChurchUserId: data.assignedByChurchUserId },
    });
}

export async function removeLeadershipStudyAdministrator(
  churchId: number,
  churchUserId: number
) {
  const db = await requireDb();
  await db
    .delete(leadershipSchoolStudyAdministrators)
    .where(
      and(
        eq(leadershipSchoolStudyAdministrators.churchId, churchId),
        eq(leadershipSchoolStudyAdministrators.churchUserId, churchUserId)
      )
    );
}

export async function linkLeadershipLessonStudy(data: {
  churchId: number;
  lessonId: number;
  studyId: number;
  createdByChurchUserId: number;
}) {
  const db = await requireDb();
  await db
    .insert(leadershipSchoolLessonStudies)
    .values(data)
    .onDuplicateKeyUpdate({
      set: { createdByChurchUserId: data.createdByChurchUserId },
    });
}

export async function unlinkLeadershipLessonStudy(data: {
  churchId: number;
  lessonId: number;
  studyId: number;
}) {
  const db = await requireDb();
  await db
    .delete(leadershipSchoolLessonStudies)
    .where(
      and(
        eq(leadershipSchoolLessonStudies.churchId, data.churchId),
        eq(leadershipSchoolLessonStudies.lessonId, data.lessonId),
        eq(leadershipSchoolLessonStudies.studyId, data.studyId)
      )
    );
}

export async function getLeadershipLessonStudyLinks(
  lessonId: number,
  churchId: number
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      link: leadershipSchoolLessonStudies,
      study: leadershipSchoolStudies,
    })
    .from(leadershipSchoolLessonStudies)
    .innerJoin(
      leadershipSchoolStudies,
      and(
        eq(leadershipSchoolLessonStudies.studyId, leadershipSchoolStudies.id),
        eq(leadershipSchoolStudies.churchId, churchId)
      )
    )
    .where(
      and(
        eq(leadershipSchoolLessonStudies.lessonId, lessonId),
        eq(leadershipSchoolLessonStudies.churchId, churchId)
      )
    )
    .orderBy(
      asc(leadershipSchoolStudies.position),
      asc(leadershipSchoolStudies.id)
    );
}

export async function getLeadershipStudiesForPerson(
  personId: number,
  churchId: number
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      study: leadershipSchoolStudies,
      enrollment: leadershipSchoolEnrollments,
      class: leadershipSchoolClasses,
      progress: leadershipSchoolStudyProgress,
    })
    .from(leadershipSchoolEnrollments)
    .innerJoin(
      leadershipSchoolClasses,
      and(
        eq(leadershipSchoolEnrollments.classId, leadershipSchoolClasses.id),
        eq(leadershipSchoolClasses.churchId, churchId)
      )
    )
    .innerJoin(
      leadershipSchoolStudies,
      and(
        eq(
          leadershipSchoolStudies.classId,
          leadershipSchoolEnrollments.classId
        ),
        eq(leadershipSchoolStudies.churchId, churchId),
        eq(leadershipSchoolStudies.status, "publicada"),
        eq(leadershipSchoolStudies.active, true)
      )
    )
    .leftJoin(
      leadershipSchoolStudyProgress,
      and(
        eq(
          leadershipSchoolStudyProgress.enrollmentId,
          leadershipSchoolEnrollments.id
        ),
        eq(leadershipSchoolStudyProgress.studyId, leadershipSchoolStudies.id),
        eq(leadershipSchoolStudyProgress.churchId, churchId)
      )
    )
    .where(
      and(
        eq(leadershipSchoolEnrollments.personId, personId),
        eq(leadershipSchoolEnrollments.churchId, churchId),
        ne(leadershipSchoolEnrollments.status, "cancelado")
      )
    )
    .orderBy(
      asc(leadershipSchoolStudies.position),
      asc(leadershipSchoolStudies.id)
    );
}

export async function getLeadershipQuestionAttemptByClientId(data: {
  churchId: number;
  enrollmentId: number;
  questionId: number;
  clientAttemptId: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(leadershipSchoolQuestionAttempts)
    .where(
      and(
        eq(leadershipSchoolQuestionAttempts.churchId, data.churchId),
        eq(leadershipSchoolQuestionAttempts.enrollmentId, data.enrollmentId),
        eq(leadershipSchoolQuestionAttempts.questionId, data.questionId),
        eq(
          leadershipSchoolQuestionAttempts.clientAttemptId,
          data.clientAttemptId
        )
      )
    )
    .limit(1);
  return rows[0] ?? null;
}
