import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const migrationPath = resolve(root, "drizzle/0083_primary_discipler_events.sql");
const migration = readFileSync(migrationPath, "utf8");
const ledger = JSON.parse(readFileSync(resolve(root, "drizzle/custom-migrations.json"), "utf8")) as {
  entries: Array<{ id: string; file: string; kind: string; sha256: string }>;
};
const db = readFileSync(resolve(root, "server/db.ts"), "utf8");
const router = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const peoplePage = readFileSync(resolve(root, "client/src/pages/Pessoas.tsx"), "utf8");

function blockBetween(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start, `${startMarker} precisa existir`).toBeGreaterThanOrEqual(0);
  expect(end, `${endMarker} precisa existir depois de ${startMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("histórico auditável do discipulador principal", () => {
  it("declara uma entidade append-only com de/para, autor, motivo e tenant", () => {
    expect(schema).toContain('mysqlTable("primary_discipler_events"');
    expect(schema).toContain("previousDisciplerPersonId");
    expect(schema).toContain("nextDisciplerPersonId");
    expect(schema).toContain('reason: text("reason").notNull()');
    expect(schema).toContain("changedByChurchUserId");
    expect(schema).toContain("primary_discipler_events_church_person_created_idx");
  });

  it("registra a migration aditiva com checksum verificável", () => {
    const entry = ledger.entries.find((candidate) => candidate.id === "0083");
    expect(entry).toMatchObject({
      file: "drizzle/0083_primary_discipler_events.sql",
      kind: "custom-additive",
    });
    expect(entry?.sha256).toBe(createHash("sha256").update(migration).digest("hex"));
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS primary_discipler_events");
    expect(migration).toContain("action ENUM('definido', 'alterado', 'removido')");
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|INDEX)|DELETE\s+FROM|UPDATE\s+/i);
    expect(migration).not.toMatch(/DATABASE_URL|JWT_SECRET|Bearer|Authorization|PRIVATE KEY/i);
  });

  it("grava o evento dentro da transação que mantém people e care_assignments coerentes", () => {
    const block = blockBetween(db, "export async function setPrimaryDiscipler", "export async function findPossiblePeopleByIdentity");
    expect(block).toContain("return db.transaction(async (tx) => {");
    expect(block).toContain('.for("update")');
    expect(block).toContain(".update(people)");
    expect(block).toContain(".update(careAssignments)");
    expect(block).toContain("tx.insert(primaryDisciplerEvents)");
    expect(block).toContain("previousDisciplerPersonId: previousDisciplerId");
    expect(block).toContain("nextDisciplerPersonId: data.disciplerPersonId");
    expect(block).toContain("changedByChurchUserId: data.changedByChurchUserId");
    expect(block).toContain("reason: data.notes?.trim()");
  });

  it("classifica definição, troca e remoção sem criar eventos em chamadas sem mudança", () => {
    const block = blockBetween(db, "export async function setPrimaryDiscipler", "export async function findPossiblePeopleByIdentity");
    expect(block).toContain("if (!changed)");
    expect(block).toContain('"definido" as const');
    expect(block).toContain('"alterado" as const');
    expect(block).toContain('"removido" as const');
    expect(block).toContain("changed: false");
  });

  it("protege escrita e leitura pelo tenant e pelo guard da Pessoa", () => {
    const peopleBlock = blockBetween(router, "const peopleRouter = router({", "const soulsRouter = router({");
    expect(peopleBlock).toContain("requirePrimaryDisciplerPermission(ctx.user.id, input.churchId)");
    expect(peopleBlock).toContain("changedByChurchUserId: actor.id");
    expect(peopleBlock).toContain("primaryDisciplerHistory: protectedProcedure");
    expect(peopleBlock).toContain("await requireScopedPersonRead(ctx.user.id, input.churchId, input.personId)");
    expect(peopleBlock).toContain("getPrimaryDisciplerHistory(input.personId, input.churchId)");
    expect(router).toContain("return getOperationalCareHistoryByPerson(input.personId, input.churchId)");

    const historyBlock = blockBetween(db, "export async function getPrimaryDisciplerHistory", "/** Retorna a fila objetiva");
    expect(historyBlock).toContain("eq(primaryDisciplerEvents.churchId, churchId)");
    expect(historyBlock).toContain("eq(primaryDisciplerEvents.personId, personId)");
    expect(historyBlock).toContain("eq(previousDiscipler.churchId, churchId)");
    expect(historyBlock).toContain("eq(nextDiscipler.churchId, churchId)");
    expect(historyBlock).toContain("eq(churchUsers.churchId, churchId)");
    const operationalHistoryBlock = blockBetween(db, "export async function getOperationalCareHistoryByPerson", "export async function getPrimaryDisciplerHistory");
    expect(operationalHistoryBlock).toContain('ne(careAssignments.role, "discipulador")');
  });

  it("apresenta o histórico na mesma timeline da ficha, sem criar uma segunda área", () => {
    expect(peoplePage).toContain("trpc.people.primaryDisciplerHistory.useQuery");
    expect(peoplePage).toContain("primary-discipler-${event.id}");
    expect(peoplePage).toContain("De ${event.previousDisciplerName ?? \"Sem discipulador\"}");
    expect(peoplePage).toContain("linha do tempo");
    expect(peoplePage).toContain("Consolidação e Célula mantêm seus próprios registros");
  });
});
