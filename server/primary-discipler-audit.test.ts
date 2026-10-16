import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const compactSource = (source: string) =>
  source
    .replace(/\s+/g, " ")
    .replace(/\basync\s+\(\s*([A-Za-z_$][\w$]*)\s*\)/g, "async $1")
    .replace(/\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>/g, "$1 =>")
    .replace(/\s+\./g, ".")
    .replace(/\.\s+/g, ".")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/,\s*}/g, "}")
    .replace(/\s+}/g, "}")
    .trim();

const root = resolve(__dirname, "..");
const schema = compactSource(
  readFileSync(resolve(root, "drizzle/schema.ts"), "utf8")
);
const migrationPath = resolve(
  root,
  "drizzle/0083_primary_discipler_events.sql"
);
const migration = readFileSync(migrationPath, "utf8");
const ledger = JSON.parse(
  readFileSync(resolve(root, "drizzle/custom-migrations.json"), "utf8")
) as {
  entries: Array<{ id: string; file: string; kind: string; sha256: string }>;
};
const db = compactSource(readFileSync(resolve(root, "server/db.ts"), "utf8"));
const router = compactSource(
  readFileSync(resolve(root, "server/routers.ts"), "utf8")
);
const peoplePage = compactSource(
  readFileSync(resolve(root, "client/src/pages/Pessoas.tsx"), "utf8")
);

function blockBetween(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start, `${startMarker} precisa existir`).toBeGreaterThanOrEqual(0);
  expect(
    end,
    `${endMarker} precisa existir depois de ${startMarker}`
  ).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("histórico auditável do discipulador principal", () => {
  it("declara uma entidade append-only com de/para, autor, motivo e tenant", () => {
    expect(schema).toContain(
      compactSource('mysqlTable("primary_discipler_events"')
    );
    expect(schema).toContain(compactSource("previousDisciplerPersonId"));
    expect(schema).toContain(compactSource("nextDisciplerPersonId"));
    expect(schema).toContain(compactSource('reason: text("reason").notNull()'));
    expect(schema).toContain(compactSource("changedByChurchUserId"));
    expect(schema).toContain(
      compactSource("primary_discipler_events_church_person_created_idx")
    );
  });

  it("registra a migration aditiva com checksum verificável", () => {
    const entry = ledger.entries.find(candidate => candidate.id === "0083");
    expect(entry).toMatchObject({
      file: "drizzle/0083_primary_discipler_events.sql",
      kind: "custom-additive",
    });
    expect(entry?.sha256).toBe(
      createHash("sha256").update(migration).digest("hex")
    );
    expect(migration).toContain(
      compactSource("CREATE TABLE IF NOT EXISTS primary_discipler_events")
    );
    expect(migration).toContain(
      compactSource("action ENUM('definido', 'alterado', 'removido')")
    );
    expect(migration).not.toMatch(
      /DROP\s+(TABLE|COLUMN|INDEX)|DELETE\s+FROM|UPDATE\s+/i
    );
    expect(migration).not.toMatch(
      /DATABASE_URL|JWT_SECRET|Bearer|Authorization|PRIVATE KEY/i
    );
  });

  it("grava o evento dentro da transação que mantém people e care_assignments coerentes", () => {
    const block = blockBetween(
      db,
      "export async function setPrimaryDiscipler",
      "export async function findPossiblePeopleByIdentity"
    );
    expect(block).toContain(
      compactSource("return db.transaction(async (tx) => {")
    );
    expect(block).toContain(compactSource('.for("update")'));
    expect(block).toContain(compactSource(".update(people)"));
    expect(block).toContain(compactSource(".update(careAssignments)"));
    expect(block).toContain(compactSource("tx.insert(primaryDisciplerEvents)"));
    expect(block).toContain(
      compactSource("previousDisciplerPersonId: previousDisciplerId")
    );
    expect(block).toContain(
      compactSource("nextDisciplerPersonId: data.disciplerPersonId")
    );
    expect(block).toContain(
      compactSource("changedByChurchUserId: data.changedByChurchUserId")
    );
    expect(block).toContain(compactSource("reason: data.notes?.trim()"));
  });

  it("classifica definição, troca e remoção sem criar eventos em chamadas sem mudança", () => {
    const block = blockBetween(
      db,
      "export async function setPrimaryDiscipler",
      "export async function findPossiblePeopleByIdentity"
    );
    expect(block).toContain(compactSource("if (!changed)"));
    expect(block).toContain(compactSource('"definido" as const'));
    expect(block).toContain(compactSource('"alterado" as const'));
    expect(block).toContain(compactSource('"removido" as const'));
    expect(block).toContain(compactSource("changed: false"));
  });

  it("protege escrita e leitura pelo tenant e pelo guard da Pessoa", () => {
    const peopleBlock = blockBetween(
      router,
      "const peopleRouter = router({",
      "const soulsRouter = router({"
    );
    expect(peopleBlock).toContain(
      compactSource(
        "requirePrimaryDisciplerPermission(ctx.user.id, input.churchId)"
      )
    );
    expect(peopleBlock).toContain(
      compactSource("changedByChurchUserId: actor.id")
    );
    expect(peopleBlock).toContain(
      compactSource("primaryDisciplerHistory: protectedProcedure")
    );
    expect(peopleBlock).toContain(
      compactSource(
        "await requireScopedPersonRead(ctx.user.id, input.churchId, input.personId)"
      )
    );
    expect(peopleBlock).toContain(
      compactSource(
        "getPrimaryDisciplerHistory(input.personId, input.churchId)"
      )
    );
    expect(router).toContain(
      compactSource(
        "return getOperationalCareHistoryByPerson(input.personId, input.churchId)"
      )
    );

    const historyBlock = blockBetween(
      db,
      "export async function getPrimaryDisciplerHistory",
      "/** Retorna a fila objetiva"
    );
    expect(historyBlock).toContain(
      compactSource("eq(primaryDisciplerEvents.churchId, churchId)")
    );
    expect(historyBlock).toContain(
      compactSource("eq(primaryDisciplerEvents.personId, personId)")
    );
    expect(historyBlock).toContain(
      compactSource("eq(previousDiscipler.churchId, churchId)")
    );
    expect(historyBlock).toContain(
      compactSource("eq(nextDiscipler.churchId, churchId)")
    );
    expect(historyBlock).toContain(
      compactSource("eq(churchUsers.churchId, churchId)")
    );
    const operationalHistoryBlock = blockBetween(
      db,
      "export async function getOperationalCareHistoryByPerson",
      "export async function getPrimaryDisciplerHistory"
    );
    expect(operationalHistoryBlock).toContain(
      compactSource('ne(careAssignments.role, "discipulador")')
    );
  });

  it("apresenta o histórico na mesma timeline da ficha, sem criar uma segunda área", () => {
    expect(peoplePage).toContain(
      compactSource("trpc.people.primaryDisciplerHistory.useQuery")
    );
    expect(peoplePage).toContain(
      compactSource("primary-discipler-${event.id}")
    );
    expect(peoplePage).toContain(
      compactSource('De ${event.previousDisciplerName ?? "Sem discipulador"}')
    );
    expect(peoplePage).toContain(compactSource("linha do tempo"));
    expect(peoplePage).toContain(
      compactSource("Consolidação e Célula mantêm seus próprios registros")
    );
  });
});
