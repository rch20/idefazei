import { randomUUID } from "node:crypto";
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

const fixture = vi.hoisted(() => ({ pool: null as any }));
// Só o endereço/constructor do adaptador é substituído; helpers, SQL,
// transações e índice único executam no MySQL 8 real descartável.
vi.mock("drizzle-orm/mysql2", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm/mysql2")>(
      "drizzle-orm/mysql2"
    );
  return {
    ...actual,
    drizzle: () => {
      if (!fixture.pool) throw new Error("DISPOSABLE_MYSQL_NOT_INITIALIZED");
      return actual.drizzle(fixture.pool);
    },
  };
});

const enabled = process.env.FOUNDATION_DISPOSABLE_MYSQL === "sandbox-only";
const integration = enabled ? describe : describe.skip;

integration("criação idempotente — MySQL 8 real descartável, sem TCP", () => {
  let db: typeof import("./db");
  beforeAll(async () => {
    const socket = process.env.FOUNDATION_DISPOSABLE_SOCKET ?? "";
    if (!/^\/tmp\/idefazei-idempotency-mysql8-[^/]+\/mysql\.sock$/.test(socket))
      throw new Error("DISPOSABLE_SOCKET_REQUIRED_NO_NETWORK_FALLBACK");
    fixture.pool = createPool({
      socketPath: socket,
      user: "root",
      database: "foundation_idempotency_test",
      connectionLimit: 6,
    });
    const [rows] = await fixture.pool.query(
      "SELECT @@socket AS socket, DATABASE() AS db, VERSION() AS version"
    );
    expect(rows[0].socket).toBe(socket);
    expect(rows[0].db).toBe("foundation_idempotency_test");
    expect(rows[0].version).toMatch(/^8\.0\./);
    vi.stubEnv(
      "DATABASE_URL",
      "mysql://synthetic@127.0.0.1:1/socket_adapter_only"
    );
    db = await import("./db");
  });
  afterAll(async () => {
    await fixture.pool?.end();
    vi.unstubAllEnvs();
  });
  beforeEach(async () => {
    await fixture.pool.query("DROP TRIGGER IF EXISTS qa_fail_block");
    await fixture.pool.query("DELETE FROM foundation_questions");
    await fixture.pool.query("DELETE FROM foundation_study_blocks");
    await fixture.pool.query("DELETE FROM foundation_studies");
  });

  const study = (extra: Record<string, unknown> = {}) => ({
    churchId: 100,
    courseId: 55,
    moduleId: null,
    title: "Estudo sintético idempotente",
    weekStart: "2026-10-19",
    summary: "Resumo sintético",
    content: "Leitura de QA local",
    template: "biblico" as const,
    createdByChurchUserId: 42,
    clientRequestId: randomUUID(),
    requestSchemaVersion: 1 as const,
    ...extra,
  });
  const question = (extra: Record<string, unknown> = {}) => ({
    churchId: 100,
    studyId: 77,
    blockId: 12,
    prompt: "Qual atitude edifica?",
    options: [
      { id: "a", label: "Apoiar" },
      { id: "b", label: "Ignorar" },
    ],
    correctOptionId: "a",
    explanation: "Apoiar contribui para edificar.",
    createdByChurchUserId: 42,
    clientRequestId: randomUUID(),
    requestSchemaVersion: 1 as const,
    ...extra,
  });
  const counts = async () => {
    const [rows] = await fixture.pool.query(
      "SELECT (SELECT COUNT(*) FROM foundation_studies) AS studies, (SELECT COUNT(*) FROM foundation_study_blocks) AS blocks, (SELECT COUNT(*) FROM foundation_questions) AS questions"
    );
    return rows[0] as { studies: number; blocks: number; questions: number };
  };
  const createStudy = (input: ReturnType<typeof study>) =>
    db.createIdempotentFoundationStudy(input as any);
  const createQuestion = (input: ReturnType<typeof question>) =>
    db.createIdempotentFoundationQuestion(input as any);

  it("reenvio de estudo retorna o mesmo ID e mantém somente quatro blocos", async () => {
    const input = study();
    const first = await createStudy(input);
    const second = await createStudy(input);
    expect(first).toMatchObject({ replayed: false });
    expect(second).toMatchObject({ id: first.id, replayed: true });
    expect(await counts()).toMatchObject({ studies: 1, blocks: 4 });
  });
  it("quatro criações simultâneas têm um ID e um único estudo completo", async () => {
    const input = study();
    const rows = await Promise.all(
      Array.from({ length: 4 }, () => createStudy(input))
    );
    expect(new Set(rows.map(r => r.id)).size).toBe(1);
    expect(rows.filter(r => !r.replayed)).toHaveLength(1);
    expect(await counts()).toMatchObject({ studies: 1, blocks: 4 });
  });
  it("resposta perdida depois do commit recupera ID, sem nova inserção", async () => {
    const input = study();
    const confirmed = await createStudy(input);
    // O consumidor descarta o resultado recebido e reenfileira o mesmo pedido.
    const recovered = await createStudy(JSON.parse(JSON.stringify(input)));
    expect(recovered).toMatchObject({ id: confirmed.id, replayed: true });
    expect(await counts()).toMatchObject({ studies: 1, blocks: 4 });
  });
  it("falha nos blocos desfaz o estudo; reenvio recuperado cria só uma vez", async () => {
    await fixture.pool.query(
      "CREATE TRIGGER qa_fail_block BEFORE INSERT ON foundation_study_blocks FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='SYNTHETIC_FAIL_BEFORE_COMMIT'"
    );
    const input = study();
    await expect(createStudy(input)).rejects.toThrow();
    expect(await counts()).toMatchObject({ studies: 0, blocks: 0 });
    await fixture.pool.query("DROP TRIGGER qa_fail_block");
    await createStudy(input);
    expect(await counts()).toMatchObject({ studies: 1, blocks: 4 });
  });
  it("mesma chave e título diferente conflita sem modificar o original", async () => {
    const input = study();
    const first = await createStudy(input);
    await expect(
      createStudy({ ...input, title: "Outro conteúdo sintético" })
    ).rejects.toMatchObject({ reason: "IDEMPOTENCY_PAYLOAD_MISMATCH" });
    const [rows] = await fixture.pool.query(
      "SELECT title FROM foundation_studies WHERE id=?",
      [first.id]
    );
    expect(rows[0].title).toBe(input.title);
    expect(await counts()).toMatchObject({ studies: 1, blocks: 4 });
  });
  it("a edição posterior não muda a identidade do pedido original", async () => {
    const input = study();
    const first = await createStudy(input);
    await fixture.pool.query(
      "UPDATE foundation_studies SET title='Título editado depois' WHERE id=?",
      [first.id]
    );
    expect(await createStudy(input)).toMatchObject({
      id: first.id,
      replayed: true,
    });
    expect(await counts()).toMatchObject({ studies: 1, blocks: 4 });
  });
  it("posição derivada não muda o hash quando existem novos estudos", async () => {
    const input = study();
    const first = await createStudy(input);
    await createStudy(study());
    expect(await createStudy(input)).toMatchObject({
      id: first.id,
      replayed: true,
    });
    expect(await counts()).toMatchObject({ studies: 2, blocks: 8 });
  });
  it("chave nova permite outra criação deliberada com mesmo conteúdo", async () => {
    const input = study();
    const first = await createStudy(input);
    const second = await createStudy({
      ...input,
      clientRequestId: randomUUID(),
    });
    expect(second.id).not.toBe(first.id);
    expect(await counts()).toMatchObject({ studies: 2 });
  });
  it("igrejas e autores distintos não compartilham o registro de reenvio", async () => {
    const input = study();
    const first = await createStudy(input);
    const otherChurch = await createStudy({ ...input, churchId: 200 });
    const otherAuthor = await createStudy({
      ...input,
      createdByChurchUserId: 43,
    });
    expect(new Set([first.id, otherChurch.id, otherAuthor.id]).size).toBe(3);
    expect(await counts()).toMatchObject({ studies: 3, blocks: 12 });
  });
  it("pergunta guarda alternativas e explicação uma vez no mesmo registro", async () => {
    const input = question();
    const first = await createQuestion(input);
    const retry = await createQuestion(input);
    expect(retry).toMatchObject({ id: first.id, replayed: true });
    const [rows] = await fixture.pool.query(
      "SELECT options,correctOptionId,explanation FROM foundation_questions WHERE id=?",
      [first.id]
    );
    const options =
      typeof rows[0].options === "string"
        ? JSON.parse(rows[0].options)
        : rows[0].options;
    expect(options).toEqual(input.options);
    expect(rows[0].explanation).toBe(input.explanation);
    expect(await counts()).toMatchObject({ questions: 1 });
  });
  it("perguntas simultâneas usam a restrição única real", async () => {
    const input = question();
    const rows = await Promise.all(
      Array.from({ length: 4 }, () => createQuestion(input))
    );
    expect(new Set(rows.map(r => r.id)).size).toBe(1);
    expect(rows.filter(r => !r.replayed)).toHaveLength(1);
    expect(await counts()).toMatchObject({ questions: 1 });
  });
  it("gabarito ou ordem de alternativas diferentes conflitam", async () => {
    const input = question();
    await createQuestion(input);
    await expect(
      createQuestion({ ...input, correctOptionId: "b" })
    ).rejects.toMatchObject({ reason: "IDEMPOTENCY_PAYLOAD_MISMATCH" });
    await expect(
      createQuestion({ ...input, options: [...input.options].reverse() })
    ).rejects.toMatchObject({ reason: "IDEMPOTENCY_PAYLOAD_MISMATCH" });
    expect(await counts()).toMatchObject({ questions: 1 });
  });
  it("chaves ASCII e collation do índice são binárias no schema físico", async () => {
    const [rows] = await fixture.pool.query(
      "SELECT TABLE_NAME,COLLATION_NAME,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND COLUMN_NAME='clientRequestId' ORDER BY TABLE_NAME"
    );
    expect(rows).toHaveLength(2);
    expect(
      rows.every(
        (r: any) => r.COLLATION_NAME === "ascii_bin" && r.IS_NULLABLE === "YES"
      )
    ).toBe(true);
  });
  it("linhas legadas com chave NULL coexistem sem deduplicação por título", async () => {
    await fixture.pool.query(
      "INSERT INTO foundation_studies (churchId,courseId,title,createdByChurchUserId) VALUES (100,55,'Legado preservado',42),(100,55,'Legado preservado',42)"
    );
    const [rows] = await fixture.pool.query(
      "SELECT title,clientRequestId,requestHash FROM foundation_studies ORDER BY id"
    );
    expect(rows).toHaveLength(2);
    expect(
      rows.every(
        (r: any) => r.clientRequestId === null && r.requestHash === null
      )
    ).toBe(true);
    await createStudy(study());
    expect(await counts()).toMatchObject({ studies: 3, blocks: 4 });
  });
});
