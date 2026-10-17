// Pure lazy view: React/Radix primitives are injected by the adapter.
// Keep runtime imports limited to versioned assets to avoid ESM cycles.
import type { PreviewProps, PreviewRuntime } from "./FoundationHandoutPreview";
import compactPage1 from "@/documents/foundation/handout-previews/simplificado-1.webp?url";
import compactPage2 from "@/documents/foundation/handout-previews/simplificado-2.webp?url";
import completePage1 from "@/documents/foundation/handout-previews/completo-1.webp?url";
import completePage2 from "@/documents/foundation/handout-previews/completo-2.webp?url";
import completePage3 from "@/documents/foundation/handout-previews/completo-3.webp?url";
import completePage4 from "@/documents/foundation/handout-previews/completo-4.webp?url";
import completePage5 from "@/documents/foundation/handout-previews/completo-5.webp?url";
import completePage6 from "@/documents/foundation/handout-previews/completo-6.webp?url";

const pages = {
  2: [compactPage1, compactPage2],
  6: [
    completePage1,
    completePage2,
    completePage3,
    completePage4,
    completePage5,
    completePage6,
  ],
} as const;

export default {
  pages,
  render(runtime: PreviewRuntime, props: PreviewProps) {
    const {
      h,
      Dialog,
      DialogContent,
      DialogTitle,
      DialogDescription,
      Button,
      ArrowLeft,
      X,
      Download,
    } = runtime;
    const { handout, theme, onClose, onRestoreFocus } = props;
    const icon = (Icon: PreviewRuntime["ArrowLeft"]) =>
      h(Icon, { className: "h-4 w-4", "aria-hidden": true });
    const controls = [
      ["Voltar à Escola", "Voltar", ArrowLeft],
      ["Fechar gabarito", "Fechar", X],
    ] as const;
    return h(
      Dialog,
      {
        open: true,
        onOpenChange: (open: boolean) => {
          if (!open) onClose();
        },
      },
      h(
        DialogContent,
        {
          showCloseButton: false,
          className:
            "!flex z-[200] h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none min-w-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-[94dvh] sm:!w-[94vw] sm:!max-w-5xl sm:rounded-2xl sm:border",
          onCloseAutoFocus: (event: Event) => {
            event.preventDefault();
            onRestoreFocus();
          },
        },
        h(
          "header",
          {
            className:
              "min-w-0 shrink-0 border-b border-border bg-background px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-3 sm:px-5",
          },
          h(
            "div",
            { className: "flex items-center justify-between gap-2" },
            ...controls.map(([label, text, Icon]) =>
              h(
                Button,
                {
                  key: label,
                  type: "button",
                  variant: "ghost",
                  className: "min-h-11 gap-2",
                  "aria-label": label,
                  onClick: onClose,
                },
                icon(Icon),
                text
              )
            )
          ),
          h(
            "div",
            { className: "mt-1 flex min-w-0 flex-wrap items-center gap-2" },
            h(
              DialogTitle,
              { className: "min-w-0 flex-1 text-base leading-snug" },
              `Gabarito ${handout.label.toLowerCase()}`
            ),
            h(
              Button,
              {
                asChild: true,
                variant: "outline",
                className: "min-h-11 shrink-0 gap-2",
                style: {
                  backgroundColor: theme.primarySoft,
                  color: "#172033",
                  borderColor: theme.primary,
                },
              },
              h(
                "a",
                {
                  href: handout.href,
                  download: handout.filename,
                  type: "application/pdf",
                  target: "_blank",
                  rel: "noopener noreferrer",
                },
                icon(Download),
                "Baixar PDF"
              )
            )
          ),
          h(
            DialogDescription,
            { className: "mt-2 text-xs" },
            "Prévia das páginas do PDF. Baixe o arquivo original para imprimir. Voltar ou fechar mantém sua tela da Escola."
          )
        ),
        h(
          "div",
          {
            role: "region",
            "aria-label": "Páginas do gabarito",
            tabIndex: 0,
            className:
              "min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-muted p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5",
          },
          ...pages[handout.pages].map((src, index) =>
            h(
              "figure",
              { key: src, className: "mx-auto w-full max-w-3xl" },
              h("img", {
                src,
                alt: `Página ${index + 1} de ${handout.pages} do gabarito ${handout.label.toLowerCase()}`,
                width: 1241,
                height: 1754,
                loading: index === 0 ? "eager" : "lazy",
                decoding: "async",
                className: "block h-auto w-full rounded-sm bg-white shadow-sm",
              }),
              h(
                "figcaption",
                { className: "mt-1 text-center text-xs text-muted-foreground" },
                `Página ${index + 1} de ${handout.pages}`
              )
            )
          )
        )
      )
    );
  },
};
