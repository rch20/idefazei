import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type StudentNoteConflictProps = {
  localText: string;
  remoteText: string;
  remoteVersion: number;
  primaryColor: string;
  primaryForeground?: string;
  onUseRemote: () => void;
  onKeepMine: () => void;
  onCombine: (text: string) => void;
  disabled?: boolean;
};

/** Decisão explícita de uma anotação; nunca concatena ou sobrescreve automaticamente. */
export function StudentNoteConflict({
  localText,
  remoteText,
  remoteVersion,
  primaryColor,
  primaryForeground = "white",
  onUseRemote,
  onKeepMine,
  onCombine,
  disabled = false,
}: StudentNoteConflictProps) {
  const [combining, setCombining] = useState(false);
  const [combinedText, setCombinedText] = useState(localText);
  const [copied, setCopied] = useState(false);
  const copyLocal = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(localText);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* A conveniência de cópia não interfere na decisão. */
    }
  };
  const actions: { label: string; run: () => void; primary?: boolean }[] = [
    { label: copied ? "Texto copiado" : "Copiar meu texto", run: copyLocal },
    { label: "Usar o texto salvo", run: onUseRemote },
    { label: "Manter meu texto", run: onKeepMine, primary: true },
    { label: "Combinar textos", run: () => setCombining(value => !value) },
  ];
  const primaryStyle = {
    backgroundColor: primaryColor,
    color: primaryForeground,
  };
  return (
    <section
      role="alertdialog"
      aria-labelledby="foundation-note-conflict-title"
      className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm sm:p-5"
    >
      <div>
        <h4 id="foundation-note-conflict-title" className="font-semibold">
          Esta anotação foi alterada em outro aparelho. Seu texto foi
          preservado.
        </h4>
        <p className="mt-1 text-sm">
          Escolha qual texto continuar usando. O texto salvo está na revisão{" "}
          {remoteVersion}.
        </p>
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {[
          ["Meu texto", localText],
          ["Texto salvo", remoteText],
        ].map(([label, text]) => (
          <div
            key={label}
            className="min-w-0 rounded-xl border border-amber-200 bg-white p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              {label}
            </p>
            <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6">
              {text || "(vazio)"}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map(action => (
          <Button
            key={action.label}
            type="button"
            variant={action.primary ? "default" : "outline"}
            disabled={disabled}
            style={action.primary ? primaryStyle : undefined}
            onClick={action.run}
          >
            {action.label}
          </Button>
        ))}
      </div>
      {combining && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-white p-3">
          <label
            htmlFor="foundation-note-combined-text"
            className="text-sm font-semibold"
          >
            Texto final (será salvo contra a revisão {remoteVersion})
          </label>
          <Textarea
            id="foundation-note-combined-text"
            value={combinedText}
            onChange={event => setCombinedText(event.target.value)}
            maxLength={4000}
            rows={5}
            className="bg-[#fcfbf8]"
            disabled={disabled}
          />
          <Button
            type="button"
            disabled={disabled}
            style={primaryStyle}
            onClick={() => onCombine(combinedText)}
          >
            Confirmar texto final
          </Button>
        </div>
      )}
    </section>
  );
}
