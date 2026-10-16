import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FoundationStageNotes({
  prompt,
  stageTitle,
  value,
  onChange,
  primaryColor,
  preview = false,
  isSaving = false,
  disabled = false,
}: {
  prompt?: string | null;
  stageTitle?: string;
  value: string;
  onChange: (value: string) => void;
  primaryColor: string;
  preview?: boolean;
  isSaving?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
      {prompt?.trim() ? (
        <div className="mb-4 rounded-xl bg-muted/30 p-3">
          <p className="font-semibold" style={{ color: primaryColor }}>
            Para refletir
          </p>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
            {prompt}
          </p>
        </div>
      ) : null}
      <Label
        htmlFor={id}
        className="font-semibold"
        style={{ color: primaryColor }}
      >
        {stageTitle
          ? `Minha anotação em ${stageTitle}`
          : "Anotação geral do estudo"}
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        rows={6}
        maxLength={4000}
        placeholder="Escreva sua anotação pessoal."
        className="mt-3 min-h-36 resize-y bg-[#fcfbf8] leading-6"
      />
      <p className="mt-2 text-xs text-muted-foreground" role="status">
        {preview
          ? "Somente prévia: esta anotação não será salva."
          : isSaving
            ? "Salvando…"
            : "Salvo automaticamente"}
      </p>
    </section>
  );
}
