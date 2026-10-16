import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

type Row = {
  enrollment: {
    id: number;
    personId: number;
    courseId: number;
    status: string;
    enrolledAt: Date;
  };
  course: { id: number; churchId: number; active: boolean; name: string };
  personChurchId: number;
};
const fixture = vi.hoisted(() => ({
  rows: [] as Row[],
  clauses: [] as string[],
  queries: 0,
}));

// Apenas o adaptador é simulado: o helper e as condições Drizzle são reais.
// O avaliador aceita somente os predicados e a ordenação usados pelo resolvedor.
vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: () => ({
    select: () => {
      let predicates: Array<{
        table: string;
        column: string;
        op: string;
        value: unknown;
      }> = [];
      const builder: any = {
        from: () => builder,
        innerJoin: () => builder,
        where: (condition: any) => {
          const compiled = new MySqlDialect().sqlToQuery(condition);
          fixture.clauses.push(compiled.sql);
          const comparisons = [
            ...compiled.sql.matchAll(/`([^`]+)`\.`([^`]+)`\s*(=|<>)\s*\?/g),
          ];
          if (comparisons.length !== compiled.params.length)
            throw Error("PREDICADO_NAO_SUPORTADO_NA_FIXTURE");
          predicates = comparisons.map((match, index) => ({
            table: match[1],
            column: match[2],
            op: match[3],
            value: compiled.params[index],
          }));
          return builder;
        },
        orderBy: (...order: any[]) => {
          const sql = order
            .map(item => new MySqlDialect().sqlToQuery(item).sql)
            .join(",");
          expect(sql).toBe(
            "`course_enrollments`.`enrolledAt` desc,`course_enrollments`.`id` desc"
          );
          return builder;
        },
        limit: async (limit: number) => {
          fixture.queries++;
          return fixture.rows
            .filter(row =>
              predicates.every(p => {
                const record =
                  p.table === "course_enrollments"
                    ? row.enrollment
                    : p.table === "courses"
                      ? row.course
                      : p.table === "people"
                        ? { churchId: row.personChurchId }
                        : null;
                if (!record) throw Error("TABELA_NAO_SUPORTADA_NA_FIXTURE");
                const actual = (record as Record<string, unknown>)[p.column];
                return p.op === "=" ? actual === p.value : actual !== p.value;
              })
            )
            .sort(
              (a, b) =>
                b.enrollment.enrolledAt.getTime() -
                  a.enrollment.enrolledAt.getTime() ||
                b.enrollment.id - a.enrollment.id
            )
            .slice(0, limit)
            .map(({ enrollment, course }) => ({ enrollment, course }));
        },
      };
      return builder;
    },
  }),
}));

import {
  getFoundationActiveEnrollmentForPerson,
  getFoundationEnrollmentForPerson,
  resolveFoundationEnrollmentForPerson,
} from "./db";

const scope = { personId: 77, churchId: 100, courseId: 55 };
function row(
  id: number,
  overrides: Partial<Row["enrollment"]> = {},
  course: Partial<Row["course"]> = {}
): Row {
  return {
    enrollment: {
      id,
      personId: 77,
      courseId: 55,
      status: "em_andamento",
      enrolledAt: new Date("2026-10-01T12:00:00Z"),
      ...overrides,
    },
    course: {
      id: 55,
      churchId: 100,
      active: true,
      name: "Turma sintética",
      ...course,
    },
    personChurchId: 100,
  };
}
beforeAll(() =>
  vi.stubEnv(
    "DATABASE_URL",
    "mysql://synthetic:synthetic@127.0.0.1:1/never_connected"
  )
);
afterAll(() => vi.unstubAllEnvs());
beforeEach(() => {
  fixture.rows = [];
  fixture.clauses = [];
  fixture.queries = 0;
});

describe("resolvedor real — adaptador de banco em memória, sem rede", () => {
  it("prefere a matrícula ativa recente sem considerar o progresso de outra", async () => {
    fixture.rows = [
      row(11, { status: "concluido" }),
      row(22, { enrolledAt: new Date("2026-10-02T12:00:00Z") }),
    ];
    const snapshot = JSON.stringify(fixture.rows);
    expect(
      (await resolveFoundationEnrollmentForPerson(scope))?.enrollment.id
    ).toBe(22);
    expect(JSON.stringify(fixture.rows)).toBe(snapshot);
  });
  it("usa o ID como desempate de datas iguais", async () => {
    fixture.rows = [row(11), row(22)];
    expect(
      (await resolveFoundationEnrollmentForPerson(scope))?.enrollment.id
    ).toBe(22);
  });
  it("não aceita ID antigo mesmo se a matrícula antiga ainda estiver ativa", async () => {
    fixture.rows = [row(11), row(22)];
    expect(
      await resolveFoundationEnrollmentForPerson({ ...scope, enrollmentId: 11 })
    ).toBeNull();
    expect(
      (
        await resolveFoundationEnrollmentForPerson({
          ...scope,
          enrollmentId: 22,
        })
      )?.enrollment.id
    ).toBe(22);
  });
  it("isola Pessoa, igreja da turma e igreja da Pessoa", async () => {
    fixture.rows = [
      row(33, { personId: 88 }),
      row(34, {}, { churchId: 200 }),
      { ...row(35), personChurchId: 200 },
    ];
    expect(await resolveFoundationEnrollmentForPerson(scope)).toBeNull();
  });
  it("turma explícita não troca para outra turma da Pessoa", async () => {
    fixture.rows = [
      row(11),
      row(
        99,
        { courseId: 56, enrolledAt: new Date("2026-10-03T12:00:00Z") },
        { id: 56 }
      ),
    ];
    expect(
      (await resolveFoundationEnrollmentForPerson(scope))?.enrollment.id
    ).toBe(11);
    expect(
      (
        await resolveFoundationEnrollmentForPerson({
          personId: 77,
          churchId: 100,
        })
      )?.enrollment.id
    ).toBe(99);
  });
  it("não usa turma inativa nem matrícula concluída no percurso atual", async () => {
    fixture.rows = [
      row(11, { status: "concluido" }),
      row(22, {}, { active: false }),
    ];
    expect(await resolveFoundationEnrollmentForPerson(scope)).toBeNull();
  });
  it("leitura histórica recupera o ID explícito concluído e não altera registros", async () => {
    fixture.rows = [
      row(11, { status: "concluido" }, { active: false }),
      row(22),
    ];
    const snapshot = JSON.stringify(fixture.rows);
    expect(
      (
        await resolveFoundationEnrollmentForPerson({
          ...scope,
          enrollmentId: 11,
          context: "historical",
        })
      )?.enrollment.id
    ).toBe(11);
    expect(JSON.stringify(fixture.rows)).toBe(snapshot);
  });
  it("leitura histórica não aceita matrícula de outra pessoa/igreja", async () => {
    fixture.rows = [row(11, { personId: 88 }), row(22, {}, { churchId: 200 })];
    expect(
      await resolveFoundationEnrollmentForPerson({
        ...scope,
        enrollmentId: 11,
        context: "historical",
      })
    ).toBeNull();
    expect(
      await resolveFoundationEnrollmentForPerson({
        ...scope,
        enrollmentId: 22,
        context: "historical",
      })
    ).toBeNull();
  });
  it("os dois helpers legados delegam ao mesmo resolvedor", async () => {
    fixture.rows = [row(11), row(22)];
    expect(
      (await getFoundationActiveEnrollmentForPerson(77, 100))?.enrollment.id
    ).toBe(22);
    expect((await getFoundationEnrollmentForPerson(55, 77, 100))?.id).toBe(22);
    expect(fixture.queries).toBe(2);
  });
  it("não encontra ID inexistente e não cria uma matrícula substituta", async () => {
    fixture.rows = [row(22)];
    expect(
      await resolveFoundationEnrollmentForPerson({
        ...scope,
        enrollmentId: 999,
      })
    ).toBeNull();
    expect(fixture.rows).toHaveLength(1);
  });
});
