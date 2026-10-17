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
vi.mock("drizzle-orm/mysql2", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm/mysql2")>(
      "drizzle-orm/mysql2"
    );
  return {
    ...actual,
    drizzle: () => {
      if (!fixture.pool) throw Error("DISPOSABLE_NOTE_MYSQL_NOT_INITIALIZED");
      return actual.drizzle(fixture.pool);
    },
  };
});
const enabled = process.env.FOUNDATION_NOTE_DISPOSABLE_MYSQL === "sandbox-only";
const integration = enabled ? describe : describe.skip;
integration("versões de notas — helpers reais / MySQL 8 descartável", () => {
  let db: typeof import("./db");
  beforeAll(async () => {
    const socket = process.env.FOUNDATION_DISPOSABLE_SOCKET ?? "";
    if (
      !/^\/tmp\/idefazei-note-versions-mysql8-[^/]+\/mysql\.sock$/.test(socket)
    )
      throw Error("DISPOSABLE_SOCKET_REQUIRED_NO_NETWORK_FALLBACK");
    fixture.pool = createPool({
      socketPath: socket,
      user: "root",
      database: "foundation_note_versions_test",
      connectionLimit: 6,
    });
    const [rows] = await fixture.pool.query(
      "SELECT @@socket AS socket, DATABASE() AS db, VERSION() AS version"
    );
    expect(rows[0].socket).toBe(socket);
    expect(rows[0].db).toBe("foundation_note_versions_test");
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
    await fixture.pool.query("DROP TRIGGER IF EXISTS qa_note_fail");
    await fixture.pool.query("DELETE FROM foundation_block_progress");
    await fixture.pool.query("DELETE FROM foundation_lesson_progress");
  });
  const note = (extra: Record<string, unknown> = {}) => ({
    churchId: 100,
    enrollmentId: 22,
    studyId: 77,
    blockId: 84,
    reflection: "Texto sintético A",
    expectedVersion: 0,
    ...extra,
  });
  const blockSave = (input = note()) =>
    db.saveFoundationBlockReflection(input as any);
  const generalSave = (input = note()) =>
    db.saveFoundationLessonReflection(input as any);
  const snapshot = (extra: Record<string, unknown> = {}) =>
    db.getFoundationNoteSnapshot({
      churchId: 100,
      enrollmentId: 22,
      studyId: 77,
      blockId: 84,
      ...extra,
    } as any);
  const count = async (table = "foundation_block_progress") => {
    if (
      !["foundation_block_progress", "foundation_lesson_progress"].includes(
        table
      )
    )
      throw Error("FIXTURE_TABLE_REQUIRED");
    const [rows] = await fixture.pool.query(
      `SELECT COUNT(*) AS n FROM ${table}`
    );
    return Number(rows[0].n);
  };
  const conflict = async (promise: Promise<unknown>) => {
    try {
      await promise;
      throw Error("CONFLICT_NOT_RAISED");
    } catch (error: any) {
      expect([error?.reason, error?.message, error?.code]).toContain(
        "NOTE_VERSION_CONFLICT"
      );
      expect(String(error?.message)).not.toContain("Texto sintético");
    }
  };
  it("schema aditivo aplica versão zero e preserva conteúdo legado", async () => {
    const [cols] = await fixture.pool.query(
      "SELECT TABLE_NAME,IS_NULLABLE,COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND COLUMN_NAME='reflectionVersion' ORDER BY TABLE_NAME"
    );
    expect(cols).toHaveLength(2);
    expect(
      cols.every(
        (c: any) => c.IS_NULLABLE === "NO" && String(c.COLUMN_DEFAULT) === "0"
      )
    ).toBe(true);
    await fixture.pool.query(
      "INSERT INTO foundation_block_progress(churchId,enrollmentId,studyId,blockId,reflection,status) VALUES(100,22,77,84,'Nota histórica original','concluida')"
    );
    expect(await snapshot()).toMatchObject({
      reflection: "Nota histórica original",
      reflectionVersion: 0,
    });
    const saved = await blockSave(
      note({ reflection: "Nota histórica revisada" })
    );
    expect(saved).toMatchObject({ success: true, reflectionVersion: 1 });
    const [rows] = await fixture.pool.query(
      "SELECT status FROM foundation_block_progress"
    );
    expect(rows[0].status).toBe("concluida");
  });
  it("primeiro salvamento cria somente uma nota e confirma revisão1", async () => {
    expect(await snapshot()).toMatchObject({
      reflection: null,
      reflectionVersion: 0,
    });
    expect(await blockSave()).toMatchObject({
      success: true,
      reflection: "Texto sintético A",
      reflectionVersion: 1,
      unchanged: false,
    });
    expect(await count()).toBe(1);
  });
  it("quatro aparelhos na primeira nota: um vencedor e três conflitos de domínio", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, (_, i) =>
        blockSave(note({ reflection: `Texto sintético ${i}` }))
      )
    );
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const errors = results.filter(
      r => r.status === "rejected"
    ) as PromiseRejectedResult[];
    expect(errors).toHaveLength(3);
    for (const r of errors)
      expect([r.reason?.reason, r.reason?.message, r.reason?.code]).toContain(
        "NOTE_VERSION_CONFLICT"
      );
    expect(await count()).toBe(1);
    expect((await snapshot()).reflectionVersion).toBe(1);
  });
  it("reenvios simultâneos de mesmo texto são no-op e não incrementam novamente", async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () => blockSave())
    );
    expect(results.filter(r => !r.unchanged)).toHaveLength(1);
    expect(results.every(r => r.reflectionVersion === 1)).toBe(true);
    expect(await count()).toBe(1);
  });
  it("resposta descartada após commit pode ser recuperada com o mesmo conteúdo/base", async () => {
    await blockSave();
    expect(await blockSave()).toMatchObject({
      success: true,
      unchanged: true,
      reflectionVersion: 1,
    });
    expect(await count()).toBe(1);
  });
  it("pedido antigo diferente não substitui o conteúdo já confirmado", async () => {
    await blockSave();
    await blockSave(
      note({ reflection: "Texto sintético B", expectedVersion: 1 })
    );
    await conflict(
      blockSave(
        note({ reflection: "Texto sintético antigo", expectedVersion: 0 })
      )
    );
    expect(await snapshot()).toMatchObject({
      reflection: "Texto sintético B",
      reflectionVersion: 2,
    });
  });
  it("normalização idêntica é no-op, mas versão futura é recusada", async () => {
    await blockSave();
    expect(
      await blockSave(
        note({ reflection: "  Texto sintético A  ", expectedVersion: 0 })
      )
    ).toMatchObject({ unchanged: true, reflectionVersion: 1 });
    await expect(blockSave(note({ expectedVersion: 9 }))).rejects.toThrow();
    expect((await snapshot()).reflectionVersion).toBe(1);
  });
  it.each([undefined, -1, 1.5, NaN])(
    "versão inválida %s não inicia escrita",
    async expectedVersion => {
      await expect(blockSave(note({ expectedVersion }))).rejects.toThrow();
      expect(await count()).toBe(0);
    }
  );
  it("limpeza de uma nota usa a versão atual e preserva a linha/progresso", async () => {
    await blockSave();
    await conflict(blockSave(note({ reflection: null, expectedVersion: 0 })));
    expect(
      await blockSave(note({ reflection: "  ", expectedVersion: 1 }))
    ).toMatchObject({ reflection: null, reflectionVersion: 2 });
    expect(await count()).toBe(1);
  });
  it("notas de etapas distintas não disputam a mesma revisão", async () => {
    const results = await Promise.all([
      blockSave(),
      blockSave(note({ blockId: 85, reflection: "Outra etapa" })),
    ]);
    expect(results.every(r => r.reflectionVersion === 1)).toBe(true);
    expect(await count()).toBe(2);
  });
  it("igrejas e matrículas distintas não compartilham a linha de anotação", async () => {
    await Promise.all([
      blockSave(),
      blockSave(note({ churchId: 200 })),
      blockSave(note({ enrollmentId: 23 })),
    ]);
    expect(await count()).toBe(3);
    expect((await snapshot()).reflectionVersion).toBe(1);
  });
  it("nota geral de estudo antigo também recebe CAS e no-op", async () => {
    expect(await generalSave()).toMatchObject({ reflectionVersion: 1 });
    expect(await generalSave()).toMatchObject({
      reflectionVersion: 1,
      unchanged: true,
    });
    await conflict(generalSave(note({ reflection: "Outra nota geral" })));
    expect(await count("foundation_lesson_progress")).toBe(1);
    expect(await snapshot({ blockId: null })).toMatchObject({
      reflection: "Texto sintético A",
      reflectionVersion: 1,
    });
  });
  it("concluir estudo não regrava a nota geral por um caminho paralelo", async () => {
    await generalSave();
    await db.completeFoundationLesson({
      churchId: 100,
      enrollmentId: 22,
      studyId: 77,
      lastBlockPosition: 3,
      reflection: "Não deve substituir",
    } as any);
    expect(await snapshot({ blockId: null })).toMatchObject({
      reflection: "Texto sintético A",
      reflectionVersion: 1,
    });
    const [rows] = await fixture.pool.query(
      "SELECT status FROM foundation_lesson_progress"
    );
    expect(rows[0].status).toBe("concluida");
  });
  it("falha SQL desfaz linha-base e alteração de versão na mesma transação", async () => {
    await fixture.pool.query(
      "CREATE TRIGGER qa_note_fail BEFORE UPDATE ON foundation_block_progress FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='SYNTHETIC_FAIL_BEFORE_COMMIT'"
    );
    await expect(blockSave()).rejects.toThrow();
    expect(await count()).toBe(0);
  });
});
