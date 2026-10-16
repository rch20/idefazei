import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const pageSource = readFileSync(resolve(root, "client/src/pages/Ministerios.tsx"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const roleSource = readFileSync(resolve(root, "shared/ministryRoles.ts"), "utf8");

describe("Vice-líder de Ministério", () => {
  it("exibe atribuição dedicada e mantém funções operacionais separadas", () => {
    expect(pageSource).toContain("MINISTRY_VICE_LEADER_LABEL");
    expect(pageSource).toContain("selected-ministry-vice-leader");
    expect(pageSource).toContain("Sem vice-líder definido");
    expect(pageSource).toContain("role.key !== MINISTRY_VICE_LEADER_ROLE_KEY");
    expect(pageSource).toContain("Apoia a rotina deste Ministério sem receber permissões administrativas gerais.");
  });

  it("protege a regra no servidor e preserva a atribuição anterior no histórico", () => {
    expect(roleSource).toContain('MINISTRY_VICE_LEADER_ROLE_KEY = "vice_lider_ministerio"');
    expect(routerSource).toContain("MINISTRY_VICE_LEADER_ROLE_KEY");
    expect(routerSource).toContain("Somente o Pastor ou o líder principal pode atribuir o vice-líder");
    expect(routerSource).toContain("O vice-líder precisa participar ativamente deste Ministério.");
    expect(routerSource).toContain("canManageViceLeader");
    expect(dbSource).toContain("endedAt: new Date()");
    expect(dbSource).toContain("MINISTRY_VICE_LEADER_ROLE_KEY");
  });
});
