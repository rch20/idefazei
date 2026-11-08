import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Rede de segurança anti-IDOR (2026-11).
 *
 * Invariante do sistema: toda procedure autenticada que recebe `input.churchId` precisa
 * amarrar esse churchId à sessão — ou passando `ctx.user.id` a um guard
 * (requireChurchMember/requirePastor/getAccessiblePersonIds/…), ou comparando com o tenant
 * resolvido (`ctx.tenantChurchId`). Uma procedure que usa `input.churchId` sem nenhum dos
 * dois confiaria no churchId cru do cliente = IDOR imediato.
 *
 * Este teste percorre o código das procedures e FALHA o CI se alguma procedure nova
 * esquecer o guard. É uma tripwire: hoje passa com zero violações (todas as 442 procedures
 * que usam input.churchId referenciam a sessão). Não substitui revisão, mas garante que o
 * padrão não regrida silenciosamente.
 */

const read = (path: string) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");

const FILES = ["server/routers.ts", "server/leadershipSchoolStudyRouter.ts"];

// Exceções explícitas e justificadas. Vazio hoje. Para adicionar, inclua
// "arquivo::procedure" e um comentário explicando por que é seguro.
const ALLOWLIST = new Set<string>([]);

const PROCEDURE_RE =
  /^(\s*)([A-Za-z0-9_]+):\s*(publicProcedure|protectedProcedure|tenantProcedure|adminProcedure)\b/gm;

function collectUnguarded() {
  const offenders: string[] = [];
  let totalUsingChurchId = 0;

  for (const file of FILES) {
    const src = read(file);
    const marks: Array<{ name: string; type: string; idx: number }> = [];
    let m: RegExpExecArray | null;
    PROCEDURE_RE.lastIndex = 0;
    while ((m = PROCEDURE_RE.exec(src))) {
      marks.push({ name: m[2], type: m[3], idx: m.index });
    }

    for (let i = 0; i < marks.length; i++) {
      const block = src.slice(marks[i].idx, i + 1 < marks.length ? marks[i + 1].idx : src.length);
      if (!/input\.churchId/.test(block)) continue; // só as que recebem churchId do cliente
      totalUsingChurchId++;

      // publicProcedure deriva churchId do subdomínio; adminProcedure exige role=admin.
      if (marks[i].type === "publicProcedure" || marks[i].type === "adminProcedure") continue;

      const boundToSession = /ctx\.user\.id/.test(block) || /ctx\.tenantChurchId/.test(block);
      if (!boundToSession) {
        offenders.push(`${file}::${marks[i].name} (${marks[i].type})`);
      }
    }
  }

  return { offenders: offenders.filter((o) => !ALLOWLIST.has(o.split(" ")[0])), totalUsingChurchId };
}

describe("isolamento multi-salão: rede de segurança de guard", () => {
  it("toda procedure autenticada que usa input.churchId amarra à sessão (ctx.user/ctx.tenantChurchId)", () => {
    const { offenders, totalUsingChurchId } = collectUnguarded();
    // Sanidade: garante que o parser está realmente encontrando as procedures.
    expect(totalUsingChurchId).toBeGreaterThan(100);
    expect(
      offenders,
      offenders.length
        ? `Procedures recebem input.churchId sem amarrar à sessão (possível IDOR). ` +
            `Adicione um guard com ctx.user.id ou compare com ctx.tenantChurchId:\n- ${offenders.join("\n- ")}`
        : ""
    ).toEqual([]);
  });

  it("updateCourseEnrollment exige churchId e confere a posse antes de escrever", () => {
    const db = read("server/db.ts");
    const start = db.indexOf("export async function updateCourseEnrollment(");
    expect(start).toBeGreaterThan(-1);
    const fn = db.slice(start, db.indexOf("\n}", start) + 2);
    // Assinatura passa a exigir churchId.
    expect(fn).toMatch(/updateCourseEnrollment\(id:\s*number,\s*churchId:\s*number,/);
    // Escopo por igreja antes do UPDATE (reaproveita o read já escopado, fail-closed).
    expect(fn).toContain("getCourseEnrollmentById(id, churchId)");
    expect(fn).toMatch(/if\s*\(!owned\)\s*return/);
  });
});
