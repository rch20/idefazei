import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const pageSource = readFileSync(resolve(root, "client/src/pages/Pessoas.tsx"), "utf8");

describe("Diretório operacional de Pessoas", () => {
  it("usa procedure protegida e resolve o escopo pela identidade autenticada", () => {
    const start = routerSource.indexOf("directory: protectedProcedure");
    const end = routerSource.indexOf("birthdays: protectedProcedure", start);
    const block = routerSource.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(block).toContain("getAccessiblePersonIds(ctx.user.id, input.churchId)");
    expect(block).toContain("getPeopleDirectoryByChurch(input.churchId, input.search");
    expect(block).not.toContain("publicProcedure");
    expect(block).not.toContain("input.personIds");
    expect(block).not.toContain("input.role");
  });

  it("mantém as relações derivadas isoladas pelo churchId", () => {
    const start = dbSource.indexOf("export async function getPeopleDirectoryByChurch");
    const end = dbSource.indexOf("export async function getBirthdaysByChurch", start);
    const block = dbSource.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(block).toContain("eq(people.churchId, churchId)");
    expect(block).toContain("eq(careAssignments.churchId, churchId)");
    expect(block).toContain("eq(consolidationReferrals.churchId, churchId)");
    expect(block).toContain("eq(cells.churchId, churchId)");
    expect(block).toContain("inArray(careAssignments.personId, personIds)");
    expect(block).toContain("inArray(consolidationReferrals.personId, personIds)");
    expect(block).not.toContain("people.cpf");
    expect(block).not.toContain("people.rg");
    expect(block).not.toContain("people.street");
    expect(block).not.toContain("people.pastoralNotes");
    expect(block).toContain("sem_responsavel");
    expect(block).toContain("na_fila");
    expect(block).toContain("atrasado");
  });

  it("deixa a lista compacta e as ações de leitura separadas da ficha única", () => {
    expect(pageSource).toContain("filteredDirectory.map(({ person, care, cell })");
    expect(pageSource).toContain("aria-label={`Abrir jornada de cuidado de ${person.fullName}`}");
    expect(pageSource).toContain("DIRECTORY_CARE_LABELS[care.status]");
    expect(pageSource).toContain("setPersonSection(\"cuidado\")");
    expect(pageSource).toContain("Uma Pessoa, várias participações e um histórico único de cuidado.");
  });
});
