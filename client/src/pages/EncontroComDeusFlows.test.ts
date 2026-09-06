import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const listSource = readFileSync(resolve(root, "client/src/pages/EncontroComDeus.tsx"), "utf8");
const detailSource = readFileSync(resolve(root, "client/src/pages/EncontroComDeusDetalhe.tsx"), "utf8");
const adaptiveSource = readFileSync(resolve(root, "client/src/components/AdaptiveFormDialog.tsx"), "utf8");

 describe("Modais adaptativos de Encontro com Deus", () => {
  it("migra o cadastro de Novo Encontro com erro interno e ações fixas", () => {
    expect(listSource).toContain("AdaptiveFormDialogContent");
    expect(listSource).toContain("AdaptiveFormDialogBody");
    expect(listSource).toContain("AdaptiveFormDialogFooter");
    expect(listSource).toContain("createError");
    expect(listSource).toContain("Novo Encontro com Deus");
    expect(listSource).toContain("Criar encontro");
  });

  it("migra Ficha, Atribuir servo e Pendência sem remover as mutações existentes", () => {
    expect(detailSource.match(/<AdaptiveFormDialogContent/g)?.length).toBe(3);
    expect(detailSource.match(/<AdaptiveFormDialogFooter/g)?.length).toBe(3);
    expect(detailSource).toContain("Ficha do discípulo");
    expect(detailSource).toContain("Atribuir servo");
    expect(detailSource).toContain("Adicionar pendência");
    expect(detailSource).toContain("reviewDiscipleForm");
    expect(detailSource).toContain("assignServant");
    expect(detailSource).toContain("createChecklistItem");
    expect(detailSource).toContain("reviewError");
    expect(detailSource).toContain("servantError");
    expect(detailSource).toContain("checklistError");
  });

  it("mantém inscrições, nova equipe e compartilhamento como modais compactos", () => {
    expect(detailSource).toContain("Inscrever discípulo");
    expect(detailSource).toContain("Adicionar equipe ou frente");
    expect(detailSource).toContain("Compartilhar ficha do discípulo");
    expect(detailSource).toContain("<DialogContent>");
    expect(detailSource).toContain("<DialogContent className=\"max-w-md\">");
  });

  it("preserva a camada superior e a rolagem isolada do padrão global", () => {
    expect(adaptiveSource).toContain("z-[200]");
    expect(adaptiveSource).toContain("h-[100dvh]");
    expect(adaptiveSource).toContain("overscroll-contain");
    expect(adaptiveSource).toContain("env(safe-area-inset-bottom)");
  });
});

export {};
