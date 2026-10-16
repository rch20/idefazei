import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import compactHandoutUrl from "@/documents/foundation/gabarito-fundamentos-simplificado.pdf?url";
import completeHandoutUrl from "@/documents/foundation/gabarito-fundamentos-completo.pdf?url";
import type { FoundationTheme } from "./FoundationTheme";

export const FOUNDATION_STUDY_HANDOUTS = [
  {
    label: "Simplificado — 2 páginas",
    description:
      "Para um estudo curto com uma pergunta. Imprima frente e verso.",
    href: compactHandoutUrl,
    filename: "gabarito-fundamentos-simplificado-2-paginas.pdf",
    pages: 2,
  },
  {
    label: "Completo — 6 páginas",
    description: "Mais espaço para escrever, com uma folha por etapa.",
    href: completeHandoutUrl,
    filename: "gabarito-fundamentos-completo-6-paginas.pdf",
    pages: 6,
  },
] as const;

/** Blank generic handouts only. No tenant, student, or study data is included. */
export function FoundationStudyHandouts({ theme }: { theme: FoundationTheme }) {
  return (
    <details className="group rounded-xl border border-border bg-background text-foreground">
      <summary
        className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--handout-focus)] focus-visible:ring-offset-2"
        style={{ "--handout-focus": theme.focusRing } as React.CSSProperties}
      >
        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
        Gabaritos para imprimir
        <span className="ml-auto shrink-0 text-xs font-normal text-muted-foreground group-open:hidden">
          Ver modelos
        </span>
      </summary>
      <div className="space-y-3 border-t border-border p-4">
        <p className="text-sm text-muted-foreground">
          O professor prepara no papel; o administrador preenche no sistema.
          Estes PDFs não são importados automaticamente.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {FOUNDATION_STUDY_HANDOUTS.map(handout => (
            <div
              key={handout.filename}
              className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-3"
            >
              <p className="text-sm text-muted-foreground">
                {handout.description}
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-auto h-auto min-h-11 w-full whitespace-normal py-2"
                style={{
                  backgroundColor: theme.primarySoft,
                  color: "#172033",
                  borderColor: theme.primary,
                }}
              >
                <a
                  href={handout.href}
                  download={handout.filename}
                  type="application/pdf"
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{handout.label}</span>
                  <span className="text-xs">PDF</span>
                </a>
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          “Minhas anotações” continua sendo preenchido pelo aluno.
        </p>
      </div>
    </details>
  );
}
