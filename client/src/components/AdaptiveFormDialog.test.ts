import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(new URL("./AdaptiveFormDialog.tsx", import.meta.url), "utf8");
const baseDialogSource = readFileSync(new URL("./ui/dialog.tsx", import.meta.url), "utf8");

 describe("Formulário Adaptativo", () => {
  it("é opt-in e não altera o Dialog global", () => {
    expect(componentSource).toContain("export function AdaptiveFormDialogContent");
    expect(componentSource).toContain("DialogContent");
    expect(baseDialogSource).not.toContain("AdaptiveFormDialogContent");
  });

  it("ocupa a viewport inteira no mobile e volta ao modal centralizado no desktop", () => {
    expect(componentSource).toContain("inset-0 z-[200] h-[100dvh] max-h-[100dvh]");
    expect(componentSource).toContain("rounded-none border-0");
    expect(componentSource).toContain("sm:top-[50%]");
    expect(componentSource).toContain("sm:translate-x-[-50%] sm:translate-y-[-50%]");
    expect(componentSource).toContain("sm:rounded-lg sm:border");
  });

  it("fica acima da barra inferior de acesso rápido", () => {
    const layoutSource = readFileSync(new URL("./ChurchLayout.tsx", import.meta.url), "utf8");
    expect(layoutSource).toContain("fixed inset-x-3 bottom-3 z-[100]");
    expect(componentSource).toContain("z-[200]");
  });

  it("isola a rolagem e mantém o rodapé acima da safe area", () => {
    expect(componentSource).toContain("overflow-y-auto overscroll-contain touch-manipulation");
    expect(componentSource).toContain("sticky bottom-0");
    expect(componentSource).toContain("env(safe-area-inset-bottom)");
    expect(componentSource).toContain("[&>button]:min-h-11");
  });
});
