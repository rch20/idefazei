import { z } from "zod";
import { parseCivilDateAsUtcNoon } from "./civilDate";
import {
  FoundationImportError,
  type FoundationImportPayload,
} from "./foundationImport";

const civilDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(value => Boolean(parseCivilDateAsUtcNoon(value)));
const optionalText = (max: number) => z.string().max(max).nullable();
const editorialV2 = z.object({
  templateVersion: z.literal(2),
  courseId: z.number().int().positive(),
  courseName: z.string(),
  study: z.object({
    title: z.string().trim().min(3).max(160),
    weekStart: civilDate,
    moduleTitle: optionalText(160),
    summary: optionalText(500),
    content: optionalText(12000),
    publish: z.literal(false),
  }),
  blocks: z
    .array(
      z.object({
        position: z.number().int().min(0).max(3),
        title: z.string(),
        content: z.string().trim().min(1).max(12000),
        reflectionPrompt: optionalText(1000).optional(),
        publish: z.literal(true),
      })
    )
    .length(4),
  questions: z
    .array(
      z.object({
        blockTitle: z.literal("Responda"),
        blockPosition: z.literal(2),
        prompt: z.string().trim().min(3).max(4000),
        options: z
          .array(
            z.object({
              id: z.enum(["a", "b", "c", "d", "e", "f"]),
              label: z.string().trim().min(1).max(500),
            })
          )
          .min(2)
          .max(6),
        correctOptionId: z.enum(["a", "b", "c", "d", "e", "f"]),
        explanation: z.string().trim().min(1).max(4000),
        publish: z.literal(true),
        position: z.number().int().nonnegative().optional(),
      })
    )
    .max(20),
  class: z
    .object({
      classDate: civilDate,
      status: z.enum(["planejada", "realizada", "cancelada"]),
      notes: optionalText(2000),
    })
    .nullable(),
  materials: z
    .array(
      z.object({
        position: z.number().int().nonnegative(),
        title: z.string().trim().min(1),
        notes: optionalText(2000),
      })
    )
    .max(20),
});

/** Revalida o draft persistido; nem o browser nem as fórmulas são autoridade. */
export function assertFoundationImportPayload(
  payload: FoundationImportPayload,
  draftCourseId: number
): void {
  if (!payload || payload.courseId !== draftCourseId) {
    throw new FoundationImportError(
      "A turma desta prévia não corresponde ao conteúdo. Envie o gabarito novamente.",
      "PRECONDITION_FAILED"
    );
  }
  const version = (payload as { templateVersion?: number }).templateVersion;
  if (version === undefined || version === 1) return; // Drafts anteriores mantêm seu contrato.
  const invalid = () => {
    throw new FoundationImportError(
      "O conteúdo da prévia não corresponde ao modelo Excel aceito. Corrija o arquivo e gere uma nova prévia.",
      "PRECONDITION_FAILED"
    );
  };
  if (version !== 2) return invalid();
  const result = editorialV2.safeParse(payload);
  if (!result.success) return invalid();
  const value = result.data;
  const names = ["Leia", "Entenda", "Responda", "Aplique"];
  const ordered = [...value.blocks].sort(
    (left, right) => left.position - right.position
  );
  if (
    ordered.some(
      (block, index) => block.position !== index || block.title !== names[index]
    )
  )
    return invalid();
  if (
    value.questions.some(
      question =>
        question.options.some(
          (option, index) => option.id !== "abcdef"[index]
        ) ||
        !question.options.some(option => option.id === question.correctOptionId)
    )
  )
    return invalid();
  if (
    value.class &&
    (parseCivilDateAsUtcNoon(value.class.classDate)?.getUTCDay() !== 0 ||
      value.class.classDate < value.study.weekStart)
  )
    return invalid();
  if (
    new Set(value.materials.map(material => material.position)).size !==
    value.materials.length
  )
    return invalid();
}
