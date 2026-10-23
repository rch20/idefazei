import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("Estudo de batismo público", () => {
  it("expõe uma página pública read-only por tenant", () => {
    const page = read("client/src/pages/EstudoPublico.tsx");
    expect(page).toContain("trpc.tenantPublic.study.useQuery");
    expect(page).toContain("TenantPublicShell");
    const app = read("client/src/App.tsx");
    expect(app).toContain('<Route path="/estudo/:studyId" component={EstudoPublico} />');
  });

  it("só retorna o estudo quando ativo e público", () => {
    const routers = read("server/routers.ts");
    const start = routers.indexOf("study: publicProcedure");
    expect(start).toBeGreaterThan(-1);
    const slice = routers.slice(start, start + 700);
    expect(slice).toContain("!study.active || !study.isPublic");
    expect(slice).toContain("getFoundationStudyBlocks(church.id, study.id, true)");
  });

  it("guarda a coluna isPublic no schema e a migração", () => {
    expect(read("drizzle/schema.ts")).toContain('isPublic: boolean("isPublic").notNull().default(false)');
    expect(read("drizzle/0108_foundation_study_public.sql")).toContain("ADD COLUMN `isPublic`");
  });

  it("permite ao gestor alternar a leitura pública no editor", () => {
    const editor = read("client/src/pages/foundation/FoundationStudyEditor.tsx");
    expect(editor).toContain("togglePublicReading");
    expect(editor).toContain("Tornar leitura pública");
    expect(editor).toContain("Copiar link público");
  });
});

export {};
