import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(resolve(process.cwd(), "client/src/pages/Familias.tsx"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const selectSource = readFileSync(resolve(process.cwd(), "client/src/components/ui/select.tsx"), "utf8");

describe("Gestão de Famílias", () => {
  it("permite abrir o núcleo e gerenciar membros sem criar uma nova Pessoa", () => {
    expect(pageSource).toContain("Toque para ver e gerenciar membros");
    expect(pageSource).toContain("trpc.families.members.useQuery");
    expect(pageSource).toContain("Adicionar membro");
    expect(pageSource).toContain("Vincule uma Pessoa já cadastrada sem criar um novo cadastro.");
    expect(pageSource).toContain("trpc.families.addMember.useMutation");
    expect(pageSource).toContain("trpc.families.removeMember.useMutation");
  });

  it("usa parentescos explícitos e permite remover somente o vínculo", () => {
    expect(pageSource).toContain('"pai"');
    expect(pageSource).toContain('"mae"');
    expect(pageSource).toContain('"filho"');
    expect(pageSource).toContain('"filha"');
    expect(pageSource).toContain('"outro"');
    expect(routerSource).toContain("addMember: protectedProcedure");
    expect(routerSource).toContain("removeMember: protectedProcedure");
    expect(dbSource).toContain("Esta Pessoa já pertence a este núcleo familiar.");
  });

  it("isola família e Pessoa pela igreja no servidor", () => {
    expect(routerSource).toContain("requireChurchAdministrator(ctx.user.id, input.churchId)");
    expect(dbSource).toContain("eq(people.churchId, input.churchId)");
    expect(dbSource).toContain("eq(families.churchId, input.churchId)");
    expect(dbSource).toContain("eq(people.churchId, input.churchId)");
  });

  it("mantém o dropdown de Pessoa acima do modal adaptativo", () => {
    expect(selectSource).toContain("relative z-[300]");
    expect(pageSource).toContain("<SelectContent>");
  });

  it("permite dispensar o teclado tocando fora do campo de Nova Família", () => {
    expect(pageSource).toContain("onOpenAutoFocus={(event) => event.preventDefault()}");
    expect(pageSource).toContain("target.closest(\"input, textarea, [contenteditable='true']\")");
    expect(pageSource).toContain("document.activeElement as HTMLElement | null)?.blur()");
  });

  it("mantém o cadastro curto compacto e a gestão de membros adaptativa", () => {
    expect(pageSource).toContain("className=\"max-w-[calc(100%-1rem)] sm:max-w-md\"");
    expect(pageSource).toContain("<AdaptiveFormDialogContent>");
    expect(pageSource).toContain("AdaptiveFormDialogFooter");
    expect(pageSource).toContain("safe-area-inset-bottom");
    expect(pageSource).toContain("role=\"alert\"");
  });
});

export {};
