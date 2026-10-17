import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createPool } from "mysql2/promise";
import { readFileSync } from "node:fs";
import { parseFoundationWorkbook } from "./foundationImport";
import type {
  FoundationImportPayload,
  FoundationImportSummary,
} from "./foundationImport";

const fixture = vi.hoisted(() => ({ pool: null as any }));

// getDb() is deliberately activated with an inert URL, while drizzle uses only
// the already validated disposable Unix socket pool below. No TCP fallback is
// possible in this test.
vi.mock("drizzle-orm/mysql2", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm/mysql2")>(
      "drizzle-orm/mysql2"
    );
  return {
    ...actual,
    drizzle: () => {
      if (!fixture.pool)
        throw new Error("DISPOSABLE_IMPORT_MYSQL_NOT_INITIALIZED");
      return actual.drizzle(fixture.pool);
    },
  };
});

const enabled =
  process.env.FOUNDATION_IMPORT_DISPOSABLE_MYSQL === "sandbox-only";
const integration = enabled ? describe : describe.skip;

type Row = Record<string, any>;

function jsonArrayLength(value: unknown) {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? parsed.length : 0;
}

integration("Excel v2 — helpers reais / MySQL 8 descartável", () => {
  let db: typeof import("./db");

  async function query<T extends Row = Row>(sql: string, values?: unknown[]) {
    const [rows] = await fixture.pool.query(sql, values);
    return rows as T[];
  }

  async function count(table: string) {
    const allowed = new Set([
      "foundation_import_drafts",
      "foundation_studies",
      "foundation_study_blocks",
      "foundation_questions",
      "foundation_study_materials",
      "foundation_classes",
      "foundation_question_attempts",
      "foundation_lesson_progress",
      "foundation_block_progress",
      "foundation_class_attendance",
    ]);
    if (!allowed.has(table)) throw new Error("FIXTURE_TABLE_REQUIRED");
    const rows = await query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM ${table}`
    );
    return Number(rows[0].n);
  }

  async function expectCode(promise: Promise<unknown>, code: string) {
    try {
      await promise;
      throw new Error(`EXPECTED_${code}`);
    } catch (error: any) {
      expect(error?.code).toBe(code);
    }
  }

  function summaryFor(
    payload: FoundationImportPayload,
    errors = 0
  ): FoundationImportSummary {
    return {
      templateVersion: payload.templateVersion,
      studyTitle: payload.study.title,
      weekStart: payload.study.weekStart,
      counts: {
        blocks: payload.blocks.length,
        questions: payload.questions.length,
        materials: payload.materials.length,
      },
      classIncluded: Boolean(payload.class),
      publishStudy: payload.study.publish,
      errors,
      warnings: 0,
      problems: [],
    };
  }

  function v2Payload(weekStart = "2026-10-12"): FoundationImportPayload {
    return {
      templateVersion: 2,
      courseId: 100,
      courseName: "Turma V2",
      study: {
        title: "Semana de fundamentos",
        weekStart,
        moduleTitle: null,
        summary: null,
        content: null,
        publish: false,
      },
      blocks: [
        {
          position: 0,
          title: "Leia",
          content: "Texto de leitura inicial.",
          reflectionPrompt: "O que chamou sua atenção?",
          publish: true,
        },
        {
          position: 1,
          title: "Entenda",
          content: "Explicação do fundamento.",
          reflectionPrompt: "",
          publish: true,
        },
        {
          position: 2,
          title: "Responda",
          content: "Teste o que foi compreendido.",
          reflectionPrompt: null,
          publish: true,
        },
        {
          position: 3,
          title: "Aplique",
          content: "Leve o aprendizado para a prática.",
          reflectionPrompt: "Como você aplicará isso?",
          publish: true,
        },
      ],
      questions: [
        {
          position: 0,
          blockTitle: "Responda",
          blockPosition: 2,
          prompt: "Qual é a resposta principal?",
          options: [
            { id: "a", label: "Primeira resposta" },
            { id: "b", label: "Segunda resposta" },
          ],
          correctOptionId: "a",
          explanation: "A primeira resposta corresponde ao texto.",
          publish: true,
        },
        {
          position: 1,
          blockTitle: "Responda",
          blockPosition: 2,
          prompt: "Qual alternativa reúne o ensino?",
          options: [
            { id: "a", label: "Alternativa A" },
            { id: "b", label: "Alternativa B" },
            { id: "c", label: "Alternativa C" },
            { id: "d", label: "Alternativa D" },
            { id: "e", label: "Alternativa E" },
            { id: "f", label: "Alternativa F" },
          ],
          correctOptionId: "f",
          explanation: "A sexta opção é a correta neste exemplo.",
          publish: true,
        },
      ],
      class: null,
      materials: [],
    };
  }

  function legacyPayload(weekStart = "2026-10-19"): FoundationImportPayload {
    return {
      courseId: 100,
      courseName: "Turma V2",
      study: {
        title: "Estudo legado",
        weekStart,
        moduleTitle: null,
        summary: "Resumo legado",
        content: "Conteúdo legado",
        publish: true,
      },
      blocks: [
        {
          position: 0,
          title: "Bloco legado",
          content: "Leitura legada",
          reflectionPrompt: null,
          publish: false,
        },
        {
          position: 1,
          title: "Segundo bloco",
          content: "Outra leitura",
          publish: true,
        },
      ],
      questions: [
        {
          blockTitle: "Bloco legado",
          blockPosition: 0,
          prompt: "Pergunta legada?",
          options: [
            { id: "a", label: "Sim" },
            { id: "b", label: "Não" },
          ],
          correctOptionId: "a",
          explanation: "Explicação legada.",
          publish: false,
        },
      ],
      class: null,
      materials: [],
    };
  }

  async function createDraft(
    payload: FoundationImportPayload,
    options: {
      churchId?: number;
      courseId?: number;
      createdByChurchUserId?: number;
      errors?: number;
    } = {}
  ) {
    const result = await db.createFoundationImportDraft({
      churchId: options.churchId ?? 10,
      courseId: options.courseId ?? 100,
      createdByChurchUserId: options.createdByChurchUserId ?? 7,
      sourceFilename: "fundamentos-v2.xlsx",
      fileSha256: "a".repeat(64),
      payload,
      summary: summaryFor(payload, options.errors ?? 0),
    });
    return result.id;
  }

  async function confirm(
    draftId: number,
    options: { churchId?: number; createdByChurchUserId?: number } = {}
  ) {
    return db.confirmFoundationImportDraft({
      churchId: options.churchId ?? 10,
      draftId,
      createdByChurchUserId: options.createdByChurchUserId ?? 7,
    });
  }

  async function seedCourseFixtures() {
    await query(
      "INSERT INTO courses(id,churchId,name,type,description,active) VALUES (100,10,'Turma V2','salvacao',NULL,1),(101,10,'Outra turma','salvacao',NULL,1),(200,20,'Turma de outra igreja','salvacao',NULL,1)"
    );
  }

  async function clearFixture() {
    await query("DROP TRIGGER IF EXISTS qa_import_question_fail");
    for (const table of [
      "foundation_question_attempts",
      "foundation_class_attendance",
      "foundation_block_progress",
      "foundation_lesson_progress",
      "foundation_study_materials",
      "foundation_questions",
      "foundation_study_blocks",
      "foundation_classes",
      "foundation_studies",
      "foundation_import_drafts",
      "foundation_modules",
      "library_items",
      "courses",
    ]) {
      await query(`DELETE FROM ${table}`);
    }
    await seedCourseFixtures();
  }

  beforeAll(async () => {
    const socket = process.env.FOUNDATION_DISPOSABLE_SOCKET ?? "";
    if (!/^\/tmp\/idefazei-import-v2-mysql8-[^/]+\/mysql\.sock$/.test(socket)) {
      throw new Error("DISPOSABLE_SOCKET_REQUIRED_NO_NETWORK_FALLBACK");
    }
    fixture.pool = createPool({
      socketPath: socket,
      user: "root",
      database: "foundation_import_v2_test",
      connectionLimit: 12,
      waitForConnections: true,
    });
    const rows = await query<{ socket: string; db: string; version: string }>(
      "SELECT @@socket AS socket, DATABASE() AS db, VERSION() AS version"
    );
    expect(rows[0].socket).toBe(socket);
    expect(rows[0].db).toBe("foundation_import_v2_test");
    expect(rows[0].version).toMatch(/^8\.0\./);

    vi.stubEnv(
      "DATABASE_URL",
      "mysql://synthetic@127.0.0.1:1/socket_adapter_only"
    );
    db = await import("./db");
  });

  beforeEach(async () => {
    await clearFixture();
  });

  afterAll(async () => {
    await fixture.pool
      ?.query("DROP TRIGGER IF EXISTS qa_import_question_fail")
      .catch(() => undefined);
    await fixture.pool?.end();
    vi.unstubAllEnvs();
  });

  it("preenche o XLSX oficial, valida a prévia e confirma nas entidades existentes", async () => {
    const filename = process.env.FOUNDATION_IMPORT_FILLED_FIXTURE ?? "";
    if (
      !/^\/tmp\/idefazei-import-v2-mysql8-[^/]+\/modelo-preenchido-sintetico\.xlsx$/.test(
        filename
      )
    )
      throw Error("DISPOSABLE_FILLED_WORKBOOK_REQUIRED");
    const preview = await parseFoundationWorkbook(readFileSync(filename), {
      courseId: 100,
      courseName: "Turma V2",
      moduleTitles: [],
      materials: [],
      existingWeekStarts: [],
    });
    expect(preview.summary.errors).toBe(0);
    expect(preview.payload.templateVersion).toBe(2);
    expect(preview.payload.study).toMatchObject({
      weekStart: "2026-10-19",
      publish: false,
      summary: null,
      content: null,
      moduleTitle: null,
    });
    const draftId = await createDraft(preview.payload);
    expect(await count("foundation_studies")).toBe(0);
    const result = await confirm(draftId);
    expect(result).toMatchObject({
      blockCount: 4,
      questionCount: 1,
      classId: null,
      materialCount: 0,
    });
    const blocks = await query<Row>(
      "SELECT content,reflectionPrompt FROM foundation_study_blocks ORDER BY position"
    );
    expect(blocks[0]).toMatchObject({
      content:
        "Conteúdo sintético da etapa 1.\n\nSegundo parágrafo preservado.",
      reflectionPrompt: "Como esse ensino orienta suas atitudes?",
    });
    expect(
      blocks.slice(1).every(block => block.reflectionPrompt === null)
    ).toBe(true);
    expect(
      (
        await query<Row>(
          "SELECT correctOptionId,explanation FROM foundation_questions"
        )
      )[0]
    ).toMatchObject({
      correctOptionId: "a",
      explanation: "Ouvir é uma atitude de cuidado.",
    });
    expect(await count("foundation_question_attempts")).toBe(0);
    expect(await count("foundation_lesson_progress")).toBe(0);
    expect(await count("foundation_class_attendance")).toBe(0);
  });

  it("confirma v2 com quatro blocos, reflexões vazias/nulas e 2–6 opções sem criar aula ou efeitos de aluno", async () => {
    const payload = v2Payload();
    const draftId = await createDraft(payload);
    const result = await confirm(draftId);

    expect(result).toMatchObject({
      draftId,
      blockCount: 4,
      questionCount: 2,
      materialCount: 0,
      classId: null,
    });
    expect(await count("foundation_import_drafts")).toBe(1);
    expect(await count("foundation_studies")).toBe(1);
    expect(await count("foundation_study_blocks")).toBe(4);
    expect(await count("foundation_questions")).toBe(2);
    expect(await count("foundation_classes")).toBe(0);
    expect(await count("foundation_study_materials")).toBe(0);
    expect(await count("foundation_question_attempts")).toBe(0);
    expect(await count("foundation_lesson_progress")).toBe(0);
    expect(await count("foundation_block_progress")).toBe(0);
    expect(await count("foundation_class_attendance")).toBe(0);

    const studies = await query<Row>(
      "SELECT id,courseId,moduleId,title,weekStart,summary,content,position,active FROM foundation_studies"
    );
    expect(studies[0]).toMatchObject({
      courseId: 100,
      moduleId: null,
      title: "Semana de fundamentos",
      summary: null,
      content: null,
      position: 0,
      active: 0,
    });
    expect(studies[0].weekStart.toISOString().slice(0, 10)).toBe("2026-10-12");
    const blocks = await query<Row>(
      "SELECT title,content,reflectionPrompt,position,active FROM foundation_study_blocks ORDER BY position"
    );
    expect(blocks.map(row => row.title)).toEqual([
      "Leia",
      "Entenda",
      "Responda",
      "Aplique",
    ]);
    expect(blocks.map(row => row.active)).toEqual([1, 1, 1, 1]);
    expect(blocks.map(row => row.reflectionPrompt)).toEqual([
      "O que chamou sua atenção?",
      null,
      null,
      "Como você aplicará isso?",
    ]);
    const questions = await query<Row>(
      "SELECT position,options,active FROM foundation_questions ORDER BY position"
    );
    expect(questions.map(row => row.position)).toEqual([0, 1]);
    expect(questions.map(row => row.active)).toEqual([1, 1]);
    expect(jsonArrayLength(questions[0].options)).toBe(2);
    expect(jsonArrayLength(questions[1].options)).toBe(6);
    const drafts = await query<Row>(
      "SELECT status,confirmedAt FROM foundation_import_drafts WHERE id=?",
      [draftId]
    );
    expect(drafts[0].status).toBe("confirmado");
    expect(drafts[0].confirmedAt).not.toBeNull();
  });

  it("preserva o contrato legado sem templateVersion, incluindo active/publish", async () => {
    const payload = legacyPayload();
    const draftId = await createDraft(payload);
    await confirm(draftId);

    const studies = await query<Row>("SELECT active FROM foundation_studies");
    expect(studies[0].active).toBe(1);
    const blocks = await query<Row>(
      "SELECT active FROM foundation_study_blocks ORDER BY position"
    );
    expect(blocks.map(row => row.active)).toEqual([0, 1]);
    const questions = await query<Row>(
      "SELECT active FROM foundation_questions"
    );
    expect(questions[0].active).toBe(0);
  });

  it("resolve módulo e material somente no tenant/curso corretos e cria aula quando presente", async () => {
    await query(
      "INSERT INTO foundation_modules(id,churchId,courseId,title,description,position,active,createdByChurchUserId) VALUES (11,10,100,'Módulo 1',NULL,0,1,7)"
    );
    await query(
      "INSERT INTO library_items(id,churchId,title,type,fileUrl,thumbnailUrl,description) VALUES (21,10,'Guia da semana','apostila',NULL,NULL,NULL)"
    );
    const payload = v2Payload("2026-10-12");
    payload.study.moduleTitle = "  módulo 1 ";
    payload.study.summary = "Resumo preenchido";
    payload.study.content = "Introdução preenchida";
    payload.class = {
      classDate: "2026-10-18",
      status: "planejada",
      notes: "  levar exemplares  ",
    };
    payload.materials = [
      { position: 0, title: "  guia da semana ", notes: "  apoio  " },
    ];
    const draftId = await createDraft(payload);
    const result = await confirm(draftId);

    expect(result.classId).toEqual(expect.any(Number));
    expect(result.materialCount).toBe(1);
    expect(
      (
        await query<Row>(
          "SELECT moduleId,active,summary,content FROM foundation_studies"
        )
      )[0]
    ).toMatchObject({
      moduleId: 11,
      active: 0,
      summary: "Resumo preenchido",
      content: "Introdução preenchida",
    });
    expect(
      (
        await query<Row>(
          "SELECT libraryItemId,notes FROM foundation_study_materials"
        )
      )[0]
    ).toMatchObject({
      libraryItemId: 21,
      notes: "apoio",
    });
    expect(
      (
        await query<Row>(
          "SELECT classDate,notes,status FROM foundation_classes"
        )
      )[0]
    ).toMatchObject({
      notes: "levar exemplares",
      status: "planejada",
    });
    expect(
      (
        await query<Row>("SELECT classDate FROM foundation_classes")
      )[0].classDate
        .toISOString()
        .slice(0, 10)
    ).toBe("2026-10-18");
  });

  it("rejeita módulo e material que só existem em outro tenant", async () => {
    await query(
      "INSERT INTO foundation_modules(id,churchId,courseId,title,description,position,active,createdByChurchUserId) VALUES (12,20,200,'Módulo isolado',NULL,0,1,8)"
    );
    const modulePayload = v2Payload("2026-10-26");
    modulePayload.study.moduleTitle = "Módulo isolado";
    const moduleDraft = await createDraft(modulePayload);
    await expectCode(confirm(moduleDraft), "PRECONDITION_FAILED");
    expect(await count("foundation_studies")).toBe(0);

    await query(
      "INSERT INTO library_items(id,churchId,title,type,fileUrl,thumbnailUrl,description) VALUES (22,20,'Material isolado','apostila',NULL,NULL,NULL)"
    );
    const materialPayload = v2Payload("2026-11-02");
    materialPayload.materials = [
      { position: 0, title: "Material isolado", notes: null },
    ];
    const materialDraft = await createDraft(materialPayload);
    await expectCode(confirm(materialDraft), "PRECONDITION_FAILED");
    expect(await count("foundation_studies")).toBe(0);
    expect(
      await query<Row>(
        "SELECT status FROM foundation_import_drafts ORDER BY id"
      )
    ).toEqual([{ status: "pendente" }, { status: "pendente" }]);
  });

  it("bloqueia summary.errors antes de qualquer escrita", async () => {
    const draftId = await createDraft(v2Payload(), { errors: 1 });
    await expectCode(confirm(draftId), "PRECONDITION_FAILED");
    expect(await count("foundation_studies")).toBe(0);
    expect(
      (
        await query<Row>(
          "SELECT status FROM foundation_import_drafts WHERE id=?",
          [draftId]
        )
      )[0].status
    ).toBe("pendente");
  });

  it("rejeita payload com courseId forjado diferente do courseId do draft", async () => {
    const payload = v2Payload();
    payload.courseId = 101;
    payload.courseName = "Outra turma";
    const draftId = await createDraft(payload, { courseId: 100 });
    await expectCode(confirm(draftId), "PRECONDITION_FAILED");
    expect(await count("foundation_studies")).toBe(0);
    expect(
      (
        await query<Row>(
          "SELECT status FROM foundation_import_drafts WHERE id=?",
          [draftId]
        )
      )[0].status
    ).toBe("pendente");
  });

  it.each([
    [
      "study.publish",
      (payload: FoundationImportPayload) => {
        payload.study.publish = true;
      },
    ],
    [
      "block.publish",
      (payload: FoundationImportPayload) => {
        payload.blocks[0].publish = false;
      },
    ],
    [
      "question.publish",
      (payload: FoundationImportPayload) => {
        payload.questions[0].publish = false;
      },
    ],
  ])("não aceita %s forjado em v2", async (_label, forge) => {
    const payload = v2Payload("2026-11-09");
    forge(payload);
    const draftId = await createDraft(payload);
    await expectCode(confirm(draftId), "PRECONDITION_FAILED");
    expect(await count("foundation_studies")).toBe(0);
  });

  it("não permite confirmação após alteração de tenant ou autor", async () => {
    const draftId = await createDraft(v2Payload());
    await expectCode(confirm(draftId, { churchId: 20 }), "NOT_FOUND");
    await expectCode(
      confirm(draftId, { createdByChurchUserId: 8 }),
      "NOT_FOUND"
    );
    expect(await count("foundation_studies")).toBe(0);
    expect(
      (
        await query<Row>(
          "SELECT status FROM foundation_import_drafts WHERE id=?",
          [draftId]
        )
      )[0].status
    ).toBe("pendente");
  });

  it("recusa draft expirado sem publicar conteúdo", async () => {
    const draftId = await createDraft(v2Payload());
    await query(
      "UPDATE foundation_import_drafts SET expiresAt=DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE id=?",
      [draftId]
    );
    await expectCode(confirm(draftId), "PRECONDITION_FAILED");
    expect(await count("foundation_studies")).toBe(0);
    expect(await count("foundation_study_blocks")).toBe(0);
    expect(
      (
        await query<Row>(
          "SELECT expiresAt FROM foundation_import_drafts WHERE id=?",
          [draftId]
        )
      )[0].expiresAt.getTime()
    ).toBeLessThan(Date.now());
  });

  it("duplo confirm do mesmo draft não é replay de sucesso", async () => {
    const draftId = await createDraft(v2Payload());
    const first = await confirm(draftId);
    await expectCode(confirm(draftId), "CONFLICT");
    expect(first.studyId).toEqual(expect.any(Number));
    expect(await count("foundation_studies")).toBe(1);
    expect(
      (
        await query<Row>(
          "SELECT status FROM foundation_import_drafts WHERE id=?",
          [draftId]
        )
      )[0].status
    ).toBe("confirmado");
  });

  it("concorrência de confirmações do mesmo draft produz um vencedor e um CONFLICT", async () => {
    const draftId = await createDraft(v2Payload());
    const outcomes = await Promise.allSettled([
      confirm(draftId),
      confirm(draftId),
    ]);
    expect(outcomes.filter(item => item.status === "fulfilled")).toHaveLength(
      1
    );
    const rejected = outcomes.filter(
      item => item.status === "rejected"
    ) as PromiseRejectedResult[];
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason?.code).toBe("CONFLICT");
    expect(await count("foundation_studies")).toBe(1);
  });

  it("drafts diferentes da mesma turma/semana têm um vencedor e um CONFLICT", async () => {
    const first = await createDraft(v2Payload("2026-11-16"));
    const secondPayload = v2Payload("2026-11-16");
    secondPayload.study.title = "Outro título da mesma semana";
    const second = await createDraft(secondPayload);
    const outcomes = await Promise.allSettled([
      confirm(first),
      confirm(second),
    ]);
    expect(outcomes.filter(item => item.status === "fulfilled")).toHaveLength(
      1
    );
    const rejected = outcomes.filter(
      item => item.status === "rejected"
    ) as PromiseRejectedResult[];
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason?.code).toBe("CONFLICT");
    expect(await count("foundation_studies")).toBe(1);
    expect(
      (
        await query<Row>(
          "SELECT status FROM foundation_import_drafts ORDER BY id"
        )
      )
        .map(row => row.status)
        .sort()
    ).toEqual(["confirmado", "pendente"]);
  });

  it("falha de trigger em pergunta faz rollback de estudo, blocos, aula, material e draft pendente", async () => {
    await query(
      "INSERT INTO foundation_modules(id,churchId,courseId,title,description,position,active,createdByChurchUserId) VALUES (13,10,100,'Módulo rollback',NULL,0,1,7)"
    );
    await query(
      "INSERT INTO library_items(id,churchId,title,type,fileUrl,thumbnailUrl,description) VALUES (23,10,'Material rollback','apostila',NULL,NULL,NULL)"
    );
    await query(
      "CREATE TRIGGER qa_import_question_fail BEFORE INSERT ON foundation_questions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='SYNTHETIC_IMPORT_QUESTION_FAILURE'"
    );
    const payload = v2Payload("2026-11-23");
    payload.study.moduleTitle = "Módulo rollback";
    payload.materials = [
      { position: 0, title: "Material rollback", notes: null },
    ];
    payload.class = {
      classDate: "2026-11-29",
      status: "planejada",
      notes: null,
    };
    payload.questions[0].prompt = "TRIGGER_FAIL";
    const draftId = await createDraft(payload);

    await expect(confirm(draftId)).rejects.toThrow();
    for (const table of [
      "foundation_studies",
      "foundation_study_blocks",
      "foundation_questions",
      "foundation_study_materials",
      "foundation_classes",
    ]) {
      expect(await count(table)).toBe(0);
    }
    expect(
      (
        await query<Row>(
          "SELECT status,confirmedAt FROM foundation_import_drafts WHERE id=?",
          [draftId]
        )
      )[0]
    ).toMatchObject({
      status: "pendente",
      confirmedAt: null,
    });
  });
});
