import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./ConfirmDestructiveActionDialog.tsx", import.meta.url), "utf8");
const alertDialogSource = readFileSync(new URL("./ui/alert-dialog.tsx", import.meta.url), "utf8");

describe("ConfirmDestructiveActionDialog", () => {
  it("usa o AlertDialog acessível do design system com título e descrição associados", () => {
    expect(source).toContain("AlertDialog");
    expect(source).toContain("AlertDialogTitle");
    expect(source).toContain("AlertDialogDescription");
    expect(source).toContain("AlertDialogHeader");
    expect(source).toContain("AlertDialogFooter");
    expect(alertDialogSource).toContain("@radix-ui/react-alert-dialog");
  });

  it("é controlado e não fecha durante uma confirmação pendente", () => {
    expect(source).toContain("open={open} onOpenChange={handleOpenChange}");
    expect(source).toContain("if (!nextOpen && pending) return;");
    expect(source).toContain("disabled={pending}");
    expect(source).toContain("pending ? pendingLabel : confirmLabel");
  });

  it("mantém cancelamento separado da confirmação e impede o fechamento automático", () => {
    expect(source).toContain("onCancel");
    expect(source).toContain("onConfirm");
    expect(source).toContain("event.preventDefault()");
    expect(source).toContain("if (!pending) onCancel()");
    expect(source).toContain('type="button"');
  });

  it("preserva foco e toque confortáveis no mobile pelo componente base e pelos controles", () => {
    expect(source).toContain("min-h-11");
    expect(source).toContain("focus-visible:ring-rose-600");
    expect(source).toContain("w-full sm:w-auto");
    expect(alertDialogSource).toContain("max-w-[calc(100%-2rem)]");
    expect(alertDialogSource).toContain("max-h-[calc(100dvh-1rem)]");
    expect(alertDialogSource).toContain("overflow-y-auto overscroll-contain");
    expect(alertDialogSource).toContain("sticky bottom-0");
  });

  it("não conhece tRPC, IDs, permissões ou uma operação de domínio", () => {
    expect(source).not.toContain("trpc.");
    expect(source).not.toContain("churchId");
    expect(source).not.toContain("personId");
    expect(source).not.toContain("cellId");
    expect(source).not.toContain("pastorPersonId");
  });
});
