import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getActiveChurchUserById,
  getChurchMemberByUserId,
  getLeadershipClassById,
  getLeadershipLessonById,
  getLeadershipTeachers,
  getLibraryItemById,
} from "./db";
import {
  LeadershipIdempotencyConflictError,
  LeadershipStudyNoteVersionConflictError,
  LEADERSHIP_STUDY_STAGES,
  assignLeadershipStudyAdministrator,
  archiveLeadershipStudy,
  attachLeadershipStudyMaterial,
  completeLeadershipBlockProgress,
  completeLeadershipStudy,
  createIdempotentLeadershipQuestion,
  createIdempotentLeadershipStudy,
  createLeadershipModule,
  createLeadershipStudyBlock,
  detachLeadershipStudyMaterial,
  getLeadershipLessonStudyLinks,
  getLeadershipModuleById,
  getLeadershipModulesByClass,
  getLeadershipQuestionById,
  getLeadershipStudentStudy,
  getLeadershipStudentStudySession,
  getLeadershipStudiesByClass,
  getLeadershipStudiesForPerson,
  getLeadershipStudyAdministrators,
  getLeadershipStudyBlocks,
  getLeadershipStudyById,
  getLeadershipStudyCreationStatus,
  getLeadershipStudyMaterials,
  getLeadershipStudyQuestions,
  isLeadershipStudyAdministrator,
  linkLeadershipLessonStudy,
  moveLeadershipModule,
  moveLeadershipStudyBlock,
  publishLeadershipStudy,
  recordLeadershipQuestionAttempt,
  removeLeadershipStudyAdministrator,
  saveLeadershipBlockReflection,
  touchLeadershipBlockProgress,
  touchLeadershipStudyProgress,
  unlinkLeadershipLessonStudy,
  updateLeadershipModule,
  updateLeadershipQuestion,
  updateLeadershipStudy,
  updateLeadershipStudyBlock,
  updateLeadershipStudyMaterialPosition,
} from "./leadershipSchoolStudyDb";
import { protectedProcedure, router } from "./_core/trpc";

const EXECUTIVE_ROLES = new Set([
  "pastor_presidente",
  "pastor_local",
  "secretario",
  "supervisor",
]);

const stageSchema = z.enum(LEADERSHIP_STUDY_STAGES);
const idempotencySchema = z.string().uuid();
const requestSchemaVersion = z.number().int().min(1).max(10).default(1);
const questionOptionsSchema = z
  .array(
    z.object({
      id: z.string().trim().min(1).max(80),
      label: z.string().trim().min(1).max(500),
    })
  )
  .min(2)
  .max(6);
const questionFields = {
  prompt: z.string().trim().min(3).max(4000),
  options: questionOptionsSchema,
  correctOptionId: z.string().trim().min(1).max(80),
  explanation: z.string().trim().min(1).max(4000),
};
const questionUpdateFields = {
  prompt: questionFields.prompt.optional(),
  options: questionFields.options.optional(),
  correctOptionId: questionFields.correctOptionId.optional(),
  explanation: questionFields.explanation.optional(),
};

function throwBusinessError(error: unknown, fallback: string): never {
  if (error instanceof LeadershipIdempotencyConflictError) {
    throw new TRPCError({ code: "CONFLICT", message: error.message });
  }
  if (error instanceof LeadershipStudyNoteVersionConflictError) {
    throw new TRPCError({ code: "CONFLICT", message: error.message });
  }
  if (error instanceof TRPCError) throw error;
  if (
    error instanceof Error &&
    error.message &&
    !/database not available/i.test(error.message)
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fallback });
}

function ensureCorrectOption(
  options: Array<{ id: string }>,
  correctOptionId: string
) {
  if (!options.some(option => option.id === correctOptionId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A resposta correta precisa corresponder a uma alternativa.",
    });
  }
}

async function resolveChurchActor(userId: number, churchId: number) {
  if (userId < 0) {
    const churchUser = await getActiveChurchUserById(Math.abs(userId));
    if (!churchUser || churchUser.churchId !== churchId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Acesso negado a esta igreja.",
      });
    }
    return {
      churchUserId: Math.abs(userId),
      personId: churchUser.personId ?? null,
      role: churchUser.role,
      churchUser,
    };
  }
  const member = await getChurchMemberByUserId(userId, churchId);
  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso negado a esta igreja.",
    });
  }
  return {
    churchUserId: userId,
    personId: member.personId ?? null,
    role: member.role,
    churchUser: member,
  };
}

async function requireLeadershipContentAccess(
  userId: number,
  churchId: number,
  classId?: number
) {
  const actor = await resolveChurchActor(userId, churchId);
  const executive = EXECUTIVE_ROLES.has(actor.role);
  const delegated = await isLeadershipStudyAdministrator(
    churchId,
    actor.churchUserId
  );
  let assigned = false;
  if (classId !== undefined && !executive && !delegated) {
    assigned = (await getLeadershipTeachers(classId, churchId)).some(
      row => row.assignment.churchUserId === actor.churchUserId
    );
  }
  if (!executive && !delegated && !assigned) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Você não tem permissão para administrar os estudos desta turma.",
    });
  }
  return { ...actor, canManage: executive || delegated, assigned };
}

async function requireClassAccess(
  userId: number,
  churchId: number,
  classId: number
) {
  const schoolClass = await getLeadershipClassById(classId, churchId);
  if (!schoolClass) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Turma de Líderes não encontrada nesta igreja.",
    });
  }
  const access = await requireLeadershipContentAccess(
    userId,
    churchId,
    classId
  );
  return { schoolClass, access };
}

async function requireStudyAccess(
  userId: number,
  churchId: number,
  studyId: number
) {
  const resolved = await getLeadershipStudyById(studyId, churchId);
  if (!resolved) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Estudo não encontrado nesta igreja.",
    });
  }
  const access = await requireLeadershipContentAccess(
    userId,
    churchId,
    resolved.study.classId
  );
  return { resolved, access };
}

async function requireStudentStudy(
  userId: number,
  churchId: number,
  enrollmentId: number,
  studyId: number
) {
  const actor = await resolveChurchActor(userId, churchId);
  if (!actor.personId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sua conta ainda não está vinculada a uma Pessoa.",
    });
  }
  const resolved = await getLeadershipStudentStudy(
    actor.personId,
    churchId,
    enrollmentId,
    studyId
  );
  if (!resolved) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Este estudo não está disponível para a sua matrícula.",
    });
  }
  return { actor, resolved };
}

async function validateModuleForClass(
  moduleId: number | null | undefined,
  classId: number,
  churchId: number
) {
  if (moduleId == null) return null;
  const module = await getLeadershipModuleById(moduleId, churchId);
  if (!module || module.classId !== classId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "O módulo precisa pertencer à mesma turma do estudo.",
    });
  }
  return module;
}

async function validateStudyBlock(
  studyId: number,
  blockId: number,
  churchId: number
) {
  const block = await getLeadershipStudyBlocks(studyId, churchId, true);
  const resolved = block.find(item => item.id === blockId);
  if (!resolved) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Etapa não encontrada neste estudo.",
    });
  }
  return resolved;
}

export const leadershipStudyRouter = router({
  modules: router({
    list: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          classId: z.number().int().positive(),
          includeInactive: z.boolean().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        await requireClassAccess(ctx.user.id, input.churchId, input.classId);
        return getLeadershipModulesByClass(
          input.classId,
          input.churchId,
          input.includeInactive ?? true
        );
      }),
    create: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          classId: z.number().int().positive(),
          title: z.string().trim().min(2).max(160),
          description: z.string().trim().max(500).nullable().optional(),
          position: z.number().int().min(0).max(999).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { access } = await requireClassAccess(
          ctx.user.id,
          input.churchId,
          input.classId
        );
        return createLeadershipModule({
          ...input,
          createdByChurchUserId: access.churchUserId,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          classId: z.number().int().positive(),
          id: z.number().int().positive(),
          title: z.string().trim().min(2).max(160).optional(),
          description: z.string().trim().max(500).nullable().optional(),
          position: z.number().int().min(0).max(999).optional(),
          active: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireClassAccess(ctx.user.id, input.churchId, input.classId);
        const module = await getLeadershipModuleById(input.id, input.churchId);
        if (!module || module.classId !== input.classId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Módulo não encontrado nesta turma.",
          });
        }
        return updateLeadershipModule(input);
      }),
    move: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          classId: z.number().int().positive(),
          currentId: z.number().int().positive(),
          currentPosition: z.number().int().min(0).max(999),
          targetId: z.number().int().positive(),
          targetPosition: z.number().int().min(0).max(999),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireClassAccess(ctx.user.id, input.churchId, input.classId);
        const modules = await getLeadershipModulesByClass(
          input.classId,
          input.churchId,
          true
        );
        if (
          !modules.some(row => row.module.id === input.currentId) ||
          !modules.some(row => row.module.id === input.targetId)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Os módulos precisam pertencer à turma informada.",
          });
        }
        await moveLeadershipModule(input);
        return { success: true } as const;
      }),
  }),
  studies: router({
    list: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          classId: z.number().int().positive(),
          includeInactive: z.boolean().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        await requireClassAccess(ctx.user.id, input.churchId, input.classId);
        return getLeadershipStudiesByClass(
          input.classId,
          input.churchId,
          input.includeInactive ?? true
        );
      }),
    get: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          id: z.number().int().positive(),
        })
      )
      .query(async ({ input, ctx }) => {
        await requireStudyAccess(ctx.user.id, input.churchId, input.id);
        const resolved = await getLeadershipStudyById(input.id, input.churchId);
        if (!resolved)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Estudo não encontrado.",
          });
        const [blocks, questions, materials, status] = await Promise.all([
          getLeadershipStudyBlocks(input.id, input.churchId, true),
          getLeadershipStudyQuestions(input.id, input.churchId),
          getLeadershipStudyMaterials(input.id, input.churchId),
          getLeadershipStudyCreationStatus(input.id, input.churchId),
        ]);
        return { ...resolved, blocks, questions, materials, status };
      }),
    create: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          classId: z.number().int().positive(),
          moduleId: z.number().int().positive().nullable().optional(),
          title: z.string().trim().min(3).max(160),
          weekStart: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .nullable()
            .optional(),
          summary: z.string().trim().max(500).nullable().optional(),
          content: z.string().trim().max(12000).nullable().optional(),
          position: z.number().int().min(0).max(999).optional(),
          clientRequestId: idempotencySchema,
          requestSchemaVersion,
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { access } = await requireClassAccess(
          ctx.user.id,
          input.churchId,
          input.classId
        );
        await validateModuleForClass(
          input.moduleId,
          input.classId,
          input.churchId
        );
        try {
          return await createIdempotentLeadershipStudy({
            ...input,
            createdByChurchUserId: access.churchUserId,
          });
        } catch (error) {
          throwBusinessError(error, "Não foi possível criar o estudo.");
        }
      }),
    update: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          id: z.number().int().positive(),
          moduleId: z.number().int().positive().nullable().optional(),
          title: z.string().trim().min(3).max(160).optional(),
          weekStart: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .nullable()
            .optional(),
          summary: z.string().trim().max(500).nullable().optional(),
          content: z.string().trim().max(12000).nullable().optional(),
          position: z.number().int().min(0).max(999).optional(),
          active: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { resolved } = await requireStudyAccess(
          ctx.user.id,
          input.churchId,
          input.id
        );
        await validateModuleForClass(
          input.moduleId,
          resolved.study.classId,
          input.churchId
        );
        return updateLeadershipStudy(input);
      }),
    publish: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          id: z.number().int().positive(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { access } = await requireStudyAccess(
          ctx.user.id,
          input.churchId,
          input.id
        );
        try {
          const updated = await publishLeadershipStudy({
            ...input,
            publishedByChurchUserId: access.churchUserId,
          });
          return { success: true as const, study: updated?.study ?? null };
        } catch (error) {
          throwBusinessError(error, "Não foi possível publicar o estudo.");
        }
      }),
    archive: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          id: z.number().int().positive(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireStudyAccess(ctx.user.id, input.churchId, input.id);
        await archiveLeadershipStudy(input.id, input.churchId);
        return { success: true } as const;
      }),
    creationStatus: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          id: z.number().int().positive(),
        })
      )
      .query(async ({ input, ctx }) => {
        await requireStudyAccess(ctx.user.id, input.churchId, input.id);
        return getLeadershipStudyCreationStatus(input.id, input.churchId);
      }),
  }),
  blocks: router({
    list: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          studyId: z.number().int().positive(),
          includeInactive: z.boolean().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        await requireStudyAccess(ctx.user.id, input.churchId, input.studyId);
        return getLeadershipStudyBlocks(
          input.studyId,
          input.churchId,
          input.includeInactive ?? true
        );
      }),
    create: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          studyId: z.number().int().positive(),
          stageKey: stageSchema,
          title: z.string().trim().min(2).max(160),
          content: z.string().trim().min(1).max(12000),
          reflectionPrompt: z.string().trim().max(2000).nullable().optional(),
          position: z.number().int().min(0).max(999).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { resolved, access } = await requireStudyAccess(
          ctx.user.id,
          input.churchId,
          input.studyId
        );
        return createLeadershipStudyBlock({
          ...input,
          createdByChurchUserId: access.churchUserId,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          studyId: z.number().int().positive(),
          id: z.number().int().positive(),
          stageKey: stageSchema.optional(),
          title: z.string().trim().min(2).max(160).optional(),
          content: z.string().trim().min(1).max(12000).optional(),
          reflectionPrompt: z.string().trim().max(2000).nullable().optional(),
          position: z.number().int().min(0).max(999).optional(),
          active: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireStudyAccess(ctx.user.id, input.churchId, input.studyId);
        await validateStudyBlock(input.studyId, input.id, input.churchId);
        return updateLeadershipStudyBlock(input);
      }),
    move: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          studyId: z.number().int().positive(),
          currentId: z.number().int().positive(),
          currentPosition: z.number().int().min(0).max(999),
          targetId: z.number().int().positive(),
          targetPosition: z.number().int().min(0).max(999),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireStudyAccess(ctx.user.id, input.churchId, input.studyId);
        await validateStudyBlock(
          input.studyId,
          input.currentId,
          input.churchId
        );
        await validateStudyBlock(input.studyId, input.targetId, input.churchId);
        await moveLeadershipStudyBlock(input);
        return { success: true } as const;
      }),
  }),
  questions: router({
    list: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          studyId: z.number().int().positive(),
        })
      )
      .query(async ({ input, ctx }) => {
        await requireStudyAccess(ctx.user.id, input.churchId, input.studyId);
        return getLeadershipStudyQuestions(input.studyId, input.churchId);
      }),
    create: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          studyId: z.number().int().positive(),
          blockId: z.number().int().positive(),
          ...questionFields,
          position: z.number().int().min(0).max(999).optional(),
          clientRequestId: idempotencySchema,
          requestSchemaVersion,
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { access } = await requireStudyAccess(
          ctx.user.id,
          input.churchId,
          input.studyId
        );
        const block = await validateStudyBlock(
          input.studyId,
          input.blockId,
          input.churchId
        );
        if (block.stageKey !== "responda") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Perguntas devem pertencer à etapa Responda.",
          });
        }
        ensureCorrectOption(input.options, input.correctOptionId);
        try {
          return await createIdempotentLeadershipQuestion({
            ...input,
            createdByChurchUserId: access.churchUserId,
          });
        } catch (error) {
          throwBusinessError(error, "Não foi possível criar a pergunta.");
        }
      }),
    update: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          studyId: z.number().int().positive(),
          blockId: z.number().int().positive(),
          id: z.number().int().positive(),
          ...questionUpdateFields,
          position: z.number().int().min(0).max(999).optional(),
          active: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireStudyAccess(ctx.user.id, input.churchId, input.studyId);
        const block = await validateStudyBlock(
          input.studyId,
          input.blockId,
          input.churchId
        );
        if (block.stageKey !== "responda") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Perguntas devem pertencer à etapa Responda.",
          });
        }
        if (input.options && input.correctOptionId)
          ensureCorrectOption(input.options, input.correctOptionId);
        if (input.options && !input.correctOptionId) {
          const current = await getLeadershipQuestionById(
            input.id,
            input.studyId,
            input.blockId,
            input.churchId
          );
          if (current)
            ensureCorrectOption(
              input.options,
              current.question.correctOptionId
            );
        }
        return updateLeadershipQuestion(input);
      }),
  }),
  materials: router({
    list: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          studyId: z.number().int().positive(),
        })
      )
      .query(async ({ input, ctx }) => {
        await requireStudyAccess(ctx.user.id, input.churchId, input.studyId);
        return getLeadershipStudyMaterials(input.studyId, input.churchId);
      }),
    attach: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          studyId: z.number().int().positive(),
          libraryItemId: z.number().int().positive(),
          position: z.number().int().min(0).max(999),
          notes: z.string().trim().max(2000).nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireStudyAccess(ctx.user.id, input.churchId, input.studyId);
        const item = await getLibraryItemById(
          input.libraryItemId,
          input.churchId
        );
        if (!item)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Material não pertence a esta igreja.",
          });
        await attachLeadershipStudyMaterial(input);
        return { success: true } as const;
      }),
    move: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          studyId: z.number().int().positive(),
          id: z.number().int().positive(),
          position: z.number().int().min(0).max(999),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireStudyAccess(ctx.user.id, input.churchId, input.studyId);
        await updateLeadershipStudyMaterialPosition(input);
        return { success: true } as const;
      }),
    detach: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          studyId: z.number().int().positive(),
          id: z.number().int().positive(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireStudyAccess(ctx.user.id, input.churchId, input.studyId);
        await detachLeadershipStudyMaterial(input);
        return { success: true } as const;
      }),
  }),
  administrators: router({
    list: protectedProcedure
      .input(z.object({ churchId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await requireLeadershipContentAccess(ctx.user.id, input.churchId);
        return getLeadershipStudyAdministrators(input.churchId);
      }),
    assign: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          churchUserId: z.number().int().positive(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const actor = await resolveChurchActor(ctx.user.id, input.churchId);
        if (!EXECUTIVE_ROLES.has(actor.role))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Somente a liderança executiva pode delegar esta função.",
          });
        const candidate = await getActiveChurchUserById(input.churchUserId);
        if (!candidate || candidate.churchId !== input.churchId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A conta precisa pertencer a esta igreja.",
          });
        await assignLeadershipStudyAdministrator({
          ...input,
          assignedByChurchUserId: actor.churchUserId,
        });
        return { success: true } as const;
      }),
    remove: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          churchUserId: z.number().int().positive(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const actor = await resolveChurchActor(ctx.user.id, input.churchId);
        if (!EXECUTIVE_ROLES.has(actor.role))
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Somente a liderança executiva pode remover esta delegação.",
          });
        await removeLeadershipStudyAdministrator(
          input.churchId,
          input.churchUserId
        );
        return { success: true } as const;
      }),
  }),
  lessonStudies: router({
    list: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          lessonId: z.number().int().positive(),
        })
      )
      .query(async ({ input, ctx }) => {
        const lesson = await getLeadershipLessonById(
          input.lessonId,
          input.churchId
        );
        if (!lesson)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aula não encontrada nesta igreja.",
          });
        await requireLeadershipContentAccess(
          ctx.user.id,
          input.churchId,
          lesson.classId
        );
        return getLeadershipLessonStudyLinks(input.lessonId, input.churchId);
      }),
    link: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          lessonId: z.number().int().positive(),
          studyId: z.number().int().positive(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const lesson = await getLeadershipLessonById(
          input.lessonId,
          input.churchId
        );
        const study = await getLeadershipStudyById(
          input.studyId,
          input.churchId
        );
        if (!lesson || !study || lesson.classId !== study.study.classId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A aula e o estudo precisam pertencer à mesma turma.",
          });
        const access = await requireLeadershipContentAccess(
          ctx.user.id,
          input.churchId,
          lesson.classId
        );
        await linkLeadershipLessonStudy({
          ...input,
          createdByChurchUserId: access.churchUserId,
        });
        return { success: true } as const;
      }),
    unlink: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          lessonId: z.number().int().positive(),
          studyId: z.number().int().positive(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const lesson = await getLeadershipLessonById(
          input.lessonId,
          input.churchId
        );
        if (!lesson)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aula não encontrada nesta igreja.",
          });
        await requireLeadershipContentAccess(
          ctx.user.id,
          input.churchId,
          lesson.classId
        );
        await unlinkLeadershipLessonStudy(input);
        return { success: true } as const;
      }),
  }),
  student: router({
    history: protectedProcedure
      .input(z.object({ churchId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const actor = await resolveChurchActor(ctx.user.id, input.churchId);
        if (!actor.personId) return [];
        return getLeadershipStudiesForPerson(actor.personId, input.churchId);
      }),
    session: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          enrollmentId: z.number().int().positive(),
          studyId: z.number().int().positive(),
        })
      )
      .query(async ({ input, ctx }) => {
        const { actor } = await requireStudentStudy(
          ctx.user.id,
          input.churchId,
          input.enrollmentId,
          input.studyId
        );
        return getLeadershipStudentStudySession({
          ...input,
          personId: actor.personId!,
        });
      }),
    start: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          enrollmentId: z.number().int().positive(),
          studyId: z.number().int().positive(),
          lastBlockPosition: z.number().int().min(0).max(999).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireStudentStudy(
          ctx.user.id,
          input.churchId,
          input.enrollmentId,
          input.studyId
        );
        return touchLeadershipStudyProgress(input);
      }),
    viewBlock: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          enrollmentId: z.number().int().positive(),
          studyId: z.number().int().positive(),
          blockId: z.number().int().positive(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireStudentStudy(
          ctx.user.id,
          input.churchId,
          input.enrollmentId,
          input.studyId
        );
        await validateStudyBlock(input.studyId, input.blockId, input.churchId);
        await touchLeadershipBlockProgress(input);
        return { success: true } as const;
      }),
    completeBlock: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          enrollmentId: z.number().int().positive(),
          studyId: z.number().int().positive(),
          blockId: z.number().int().positive(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireStudentStudy(
          ctx.user.id,
          input.churchId,
          input.enrollmentId,
          input.studyId
        );
        await validateStudyBlock(input.studyId, input.blockId, input.churchId);
        await completeLeadershipBlockProgress(input);
        return { success: true } as const;
      }),
    answerQuestion: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          enrollmentId: z.number().int().positive(),
          studyId: z.number().int().positive(),
          blockId: z.number().int().positive(),
          questionId: z.number().int().positive(),
          selectedOptionId: z.string().trim().min(1).max(80),
          clientAttemptId: z.string().trim().min(8).max(80).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireStudentStudy(
          ctx.user.id,
          input.churchId,
          input.enrollmentId,
          input.studyId
        );
        const block = await validateStudyBlock(
          input.studyId,
          input.blockId,
          input.churchId
        );
        if (block.stageKey !== "responda")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Perguntas só podem ser respondidas na etapa Responda.",
          });
        const question = await getLeadershipQuestionById(
          input.questionId,
          input.studyId,
          input.blockId,
          input.churchId
        );
        if (!question)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Pergunta não encontrada neste estudo.",
          });
        try {
          return await recordLeadershipQuestionAttempt(input);
        } catch (error) {
          throwBusinessError(error, "Não foi possível registrar a resposta.");
        }
      }),
    saveReflection: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          enrollmentId: z.number().int().positive(),
          studyId: z.number().int().positive(),
          blockId: z.number().int().positive(),
          reflection: z.string().trim().max(4000).nullable(),
          expectedVersion: z.number().int().min(0),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireStudentStudy(
          ctx.user.id,
          input.churchId,
          input.enrollmentId,
          input.studyId
        );
        await validateStudyBlock(input.studyId, input.blockId, input.churchId);
        try {
          return await saveLeadershipBlockReflection(input);
        } catch (error) {
          throwBusinessError(error, "Não foi possível salvar a anotação.");
        }
      }),
    complete: protectedProcedure
      .input(
        z.object({
          churchId: z.number().int().positive(),
          enrollmentId: z.number().int().positive(),
          studyId: z.number().int().positive(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await requireStudentStudy(
          ctx.user.id,
          input.churchId,
          input.enrollmentId,
          input.studyId
        );
        try {
          return await completeLeadershipStudy(input);
        } catch (error) {
          throwBusinessError(error, "Não foi possível concluir o estudo.");
        }
      }),
  }),
});
