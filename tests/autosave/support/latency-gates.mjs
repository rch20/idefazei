export const VIEWPORTS = Object.freeze([
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 800 },
]);

export const PROFILES = Object.freeze([
  { name: "P0", delayMs: 0 },
  { name: "P1", delayMs: 150 },
  { name: "P2", delayMs: 600 },
  { name: "P3", delayMs: 1500 },
  { name: "P4", delayMs: 5000 },
]);

export const CASES = Object.freeze([
  "A01",
  "A02",
  "A03",
  "A04",
  "A05",
  "A06",
  "A07",
  "A08",
]);

export const FIXTURE_IDS = Object.freeze({
  churchId: 100,
  courseId: 11,
  enrollmentId: 22,
  studyId: 77,
  blockIds: Object.freeze([84, 85, 86, 87]),
  questionId: 901,
});

export const ALLOWED_PROCEDURES = Object.freeze([
  "studentPath",
  "learningPath",
  "studySession",
  "studyClass",
  "studentHistory",
  "listStudyMaterials",
  "getNoteSnapshot",
  "startLesson",
  "viewStudyBlock",
  "answerQuestion",
  "completeStudyBlock",
  "saveBlockReflection",
  "saveReflection",
  "completeLesson",
]);

const QUERY_PROCEDURES = new Set([
  "studentPath",
  "learningPath",
  "studySession",
  "studyClass",
  "studentHistory",
  "listStudyMaterials",
  "getNoteSnapshot",
]);
const MUTATION_PROCEDURES = new Set(
  ALLOWED_PROCEDURES.filter(name => !QUERY_PROCEDURES.has(name))
);

const hasOwn = (value, key) =>
  Boolean(value && typeof value === "object" && Object.hasOwn(value, key));
const isId = value => Number.isInteger(value) && value > 0;

export function identityKey(input) {
  return [
    input?.churchId,
    input?.courseId,
    input?.enrollmentId,
    input?.studyId,
  ].join(":");
}

function makeBlocks() {
  return [
    [84, "Leia"],
    [85, "Entenda"],
    [86, "Responda"],
    [87, "Aplique"],
  ].map(([id, title], position) => ({
    id,
    title,
    content: `Conteúdo sintético da etapa ${title}.`,
    position,
    status: "atual",
    reflection: `Nota inicial sintética ${title}`,
    reflectionPrompt: `Pergunta sintética para ${title}.`,
    questions: position === 2 ? [] : [],
  }));
}

export function buildInitialIdentity() {
  const blocks = makeBlocks();
  const study = {
    id: FIXTURE_IDS.studyId,
    courseId: FIXTURE_IDS.courseId,
    title: "Estudo sintético de versionamento",
    weekStart: "2026-10-17",
    summary: "Fixture local sem dados de aluno.",
    content: "Introdução sintética preservada para o teste.",
    active: true,
  };
  const item = {
    study,
    enrollmentId: FIXTURE_IDS.enrollmentId,
    progress: null,
    available: true,
  };
  return {
    key: identityKey(FIXTURE_IDS),
    ids: FIXTURE_IDS,
    path: {
      course: { id: FIXTURE_IDS.courseId, name: "Turma sintética" },
      enrollment: { id: FIXTURE_IDS.enrollmentId },
      items: [item],
    },
    session: {
      enrollmentId: FIXTURE_IDS.enrollmentId,
      study,
      progress: { status: "em_andamento", lastBlockPosition: 0, reflection: null },
      resume: { blockId: FIXTURE_IDS.blockIds[0], position: 0, label: "Leia" },
      blocks,
    },
    history: {
      items: [
        {
          study,
          progress: { status: "em_andamento", reflection: null },
          stageReflections: blocks.map(block => ({
            blockId: block.id,
            title: block.title,
            reflectionPrompt: block.reflectionPrompt,
            reflection: block.reflection,
          })),
        },
      ],
    },
    classInfo: {
      course: { id: FIXTURE_IDS.courseId, name: "Turma sintética" },
      study,
      enrollment: { id: FIXTURE_IDS.enrollmentId },
    },
    materials: [],
    versions: Object.fromEntries(FIXTURE_IDS.blockIds.map(id => [id, 0])),
    legacyVersion: 0,
  };
}

export function isAllowedProcedure(procedure, method) {
  if (!ALLOWED_PROCEDURES.includes(procedure)) return false;
  if (method === "GET") return QUERY_PROCEDURES.has(procedure);
  if (method === "POST") return MUTATION_PROCEDURES.has(procedure);
  return false;
}

export function isAllowedFixtureInput(procedure, input, { allowExpectedVersion = true } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  if (hasOwn(input, "expectedVersion") && !allowExpectedVersion) return false;
  if (
    hasOwn(input, "expectedVersion") &&
    (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0)
  )
    return false;
  if (hasOwn(input, "churchId") && input.churchId !== FIXTURE_IDS.churchId) return false;
  if (hasOwn(input, "courseId") && input.courseId !== FIXTURE_IDS.courseId) return false;
  if (hasOwn(input, "studyId") && input.studyId !== FIXTURE_IDS.studyId) return false;
  if (
    hasOwn(input, "enrollmentId") &&
    input.enrollmentId !== FIXTURE_IDS.enrollmentId
  )
    return false;
  if (hasOwn(input, "blockId") && !FIXTURE_IDS.blockIds.includes(input.blockId)) return false;
  if (hasOwn(input, "questionId") && input.questionId !== FIXTURE_IDS.questionId) return false;
  if (hasOwn(input, "selectedOptionId") && input.selectedOptionId !== "synthetic") return false;

  const requiredChurch = [
    "studentPath",
    "learningPath",
    "studentHistory",
    "studyClass",
    "listStudyMaterials",
    "studySession",
    "getNoteSnapshot",
    "startLesson",
    "viewStudyBlock",
    "answerQuestion",
    "completeStudyBlock",
    "saveBlockReflection",
    "saveReflection",
    "completeLesson",
  ].includes(procedure);
  if (requiredChurch && input.churchId !== FIXTURE_IDS.churchId) return false;
  if (["learningPath"].includes(procedure) && input.courseId !== FIXTURE_IDS.courseId) return false;
  if (
    [
      "studySession",
      "startLesson",
      "viewStudyBlock",
      "answerQuestion",
      "completeStudyBlock",
      "saveBlockReflection",
      "saveReflection",
      "completeLesson",
    ].includes(procedure) &&
    input.courseId !== FIXTURE_IDS.courseId
  )
    return false;
  if (["studySession", "getNoteSnapshot"].includes(procedure) && input.studyId !== FIXTURE_IDS.studyId)
    return false;
  if (
    [
      "studySession",
      "startLesson",
      "viewStudyBlock",
      "answerQuestion",
      "completeStudyBlock",
      "saveBlockReflection",
      "saveReflection",
      "completeLesson",
    ].includes(procedure) &&
    input.enrollmentId !== FIXTURE_IDS.enrollmentId
  )
    return false;
  if (procedure === "getNoteSnapshot" && !FIXTURE_IDS.blockIds.includes(input.blockId)) return false;
  if (["viewStudyBlock", "completeStudyBlock", "saveBlockReflection"].includes(procedure)) {
    if (!FIXTURE_IDS.blockIds.includes(input.blockId)) return false;
  }
  if (procedure === "saveBlockReflection" || procedure === "saveReflection") {
    if (!(input.reflection === null || typeof input.reflection === "string")) return false;
    if (typeof input.reflection === "string" && input.reflection.length > 4000) return false;
  }
  return true;
}

export function guardRequest({ url, origin, method, procedure, input }) {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== origin) return { allowed: false, reason: "ORIGIN_NOT_ALLOWLISTED" };
  } catch {
    return { allowed: false, reason: "INVALID_URL" };
  }
  if (!isAllowedProcedure(procedure, method))
    return { allowed: false, reason: "METHOD_OR_PROCEDURE_NOT_ALLOWLISTED" };
  if (!isAllowedFixtureInput(procedure, input))
    return { allowed: false, reason: "FIXTURE_ID_OR_INPUT_NOT_ALLOWLISTED" };
  return { allowed: true };
}

export function expectedMatrixCount(profileCount = PROFILES.length, viewportCount = VIEWPORTS.length) {
  return CASES.length * profileCount * viewportCount;
}
