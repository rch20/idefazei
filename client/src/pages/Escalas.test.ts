import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const schedulesSource = readFileSync(resolve(root, "client/src/pages/Escalas.tsx"), "utf8");
const dialogSource = readFileSync(resolve(root, "client/src/components/ui/dialog.tsx"), "utf8");

describe("Modal de Escalas em telas pequenas", () => {
  it("mantém o formulário rolável e respeita a altura da viewport", () => {
    expect(schedulesSource).toContain("max-h-[calc(100dvh-0.75rem)]");
    expect(schedulesSource).toContain("overflow-y-auto");
    expect(schedulesSource).toContain("overscroll-contain");
    expect(schedulesSource).toContain("[-webkit-overflow-scrolling:touch]");
    expect(dialogSource).toContain("max-h-[calc(100dvh-1rem)]");
    expect(dialogSource).toContain("overflow-y-auto");
  });

  it("mantém as ações acessíveis acima da barra inferior e da safe area", () => {
    expect(schedulesSource).toContain("sticky bottom-0");
    expect(schedulesSource).toContain("env(safe-area-inset-bottom)");
    expect(schedulesSource).toContain("min-h-11 w-full sm:w-auto");
    expect(schedulesSource).toContain("Criar Escala");
  });

  it("mostra o erro dentro do formulário quando o salvamento falha", () => {
    expect(schedulesSource).toContain("const [formError, setFormError]");
    expect(schedulesSource).toContain("setFormError(error.message)");
    expect(schedulesSource).toContain('Não foi possível salvar a Escala.');
    expect(schedulesSource).toContain('role="alert"');
    expect(schedulesSource).toContain('aria-live="assertive"');
  });

  it("limpa o erro quando o usuário corrige o formulário", () => {
    expect(schedulesSource).toContain("function updateForm(patch: Partial<ScheduleForm>)");
    expect(schedulesSource).toContain("setFormError(null);");
    expect(schedulesSource).toContain("disabled={createMutation.isPending || updateMutation.isPending || formConflict}");
  });
});

export {};
