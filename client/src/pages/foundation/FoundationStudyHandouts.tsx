import { useRef, useState } from "react";
import HandoutPreview from "./FoundationHandoutPreview";
import type previewData from "./foundationHandoutPages";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import excelTemplateUrl from "@/documents/foundation/gabarito-escola-fundamentos-v2-vazio.xlsx?url";
import completeHandoutUrl from "@/documents/foundation/gabarito-fundamentos-completo.pdf?url";
import type { FoundationTheme } from "./FoundationTheme";

export const FOUNDATION_STUDY_EXCEL_TEMPLATE = {
  href: excelTemplateUrl,
  filename: "gabarito-escola-fundamentos-v2.xlsx",
} as const;

export const FOUNDATION_STUDY_HANDOUTS = [
  {
    label: "Completo — 6 páginas",
    description: "Mais espaço para escrever, com uma folha por etapa.",
    href: completeHandoutUrl,
    filename: "gabarito-fundamentos-completo-6-paginas.pdf",
    pages: 6,
  },
] as const;

export type StudyHandout = (typeof FOUNDATION_STUDY_HANDOUTS)[number];

/** Blank generic templates only. No tenant, student, or study data is included. */
export function FoundationStudyHandouts({ theme }: { theme: FoundationTheme }) {
  const [selected, setSelected] = useState<StudyHandout | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [data, setData] = useState<typeof previewData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const request = useRef(0);
  const close = () => {
    request.current += 1;
    setSelected(null);
  };
  const openPreview = async (handout: StudyHandout) => {
    const token = ++request.current;
    setSelected(handout);
    setLoadFailed(false);
    if (data) return;
    try {
      const module = await import("./foundationHandoutPages");
      if (request.current === token) setData(module.default);
    } catch {
      if (request.current === token) setLoadFailed(true);
    }
  };
  const restoreFocus = () => opener.current?.focus({ preventScroll: true });
  const buttonStyle = {
    backgroundColor: theme.primarySoft,
    color: "#172033",
    borderColor: theme.primary,
  };

  return (
    <>
      <details className="group rounded-xl border border-border bg-background text-foreground">
        <summary
          className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--handout-focus)] focus-visible:ring-offset-2"
          style={{ "--handout-focus": theme.focusRing } as React.CSSProperties}
        >
          <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
          Gabaritos para preparar estudos
          <span className="ml-auto shrink-0 text-xs font-normal text-muted-foreground group-open:hidden">
            Ver modelos
          </span>
        </summary>
        <div className="space-y-3 border-t border-border p-4">
          <p className="text-sm text-muted-foreground">
            Preencha o Excel e importe pela opção “Preencher por Excel”. O PDF
            completo continua disponível para preparar no papel.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-3">
              <p className="text-sm text-muted-foreground">
                Modelo editável com as quatro etapas, perguntas e reflexões.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-auto h-auto min-h-11 w-full whitespace-normal py-2"
                style={buttonStyle}
              >
                <a
                  href={FOUNDATION_STUDY_EXCEL_TEMPLATE.href}
                  download={FOUNDATION_STUDY_EXCEL_TEMPLATE.filename}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Baixar gabarito Excel v2
                </a>
              </Button>
            </div>
            {FOUNDATION_STUDY_HANDOUTS.map(handout => (
              <div
                key={handout.filename}
                className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-3"
              >
                <p className="text-sm text-muted-foreground">
                  {handout.description}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-auto h-auto min-h-11 w-full whitespace-normal py-2"
                  style={buttonStyle}
                  aria-haspopup="dialog"
                  onClick={event => {
                    opener.current = event.currentTarget;
                    void openPreview(handout);
                  }}
                >
                  <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{handout.label}</span>
                  <span className="text-xs">PDF</span>
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            “Minhas anotações” continua sendo preenchido pelo aluno.
          </p>
        </div>
      </details>
      {selected &&
        (data ? (
          <HandoutPreview
            handout={selected}
            data={data}
            theme={theme}
            onClose={close}
            onRestoreFocus={restoreFocus}
          />
        ) : (
          <div
            role={loadFailed ? "alert" : "status"}
            className="rounded-lg border p-3 text-sm"
          >
            {loadFailed
              ? "Não foi possível carregar o gabarito. Você pode fechar e tentar novamente."
              : "Abrindo gabarito…"}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                close();
                restoreFocus();
              }}
            >
              Voltar à Escola
            </Button>
          </div>
        ))}
    </>
  );
}
