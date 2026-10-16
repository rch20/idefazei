import {
  AdaptiveFormDialogBody,
  AdaptiveFormDialogContent,
  AdaptiveFormDialogFooter,
  adaptiveFormDialogHeaderClassName,
} from "@/components/AdaptiveFormDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { FOUNDATION_STAGES } from "./studyStage";

export type FoundationStudyPart = {
  id: number;
  title: string;
  content: string;
  reflectionPrompt?: string | null;
  position: number;
  active: boolean;
};

type StudyPartValues = Pick<
  FoundationStudyPart,
  "title" | "content" | "reflectionPrompt" | "active"
>;

export function StudyPartEditor({
  open,
  mode,
  part,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  part: FoundationStudyPart | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: StudyPartValues) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [reflectionPrompt, setReflectionPrompt] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setTitle(part?.title ?? "");
    setContent(part?.content ?? "");
    setReflectionPrompt(part?.reflectionPrompt ?? "");
    setActive(part?.active ?? true);
  }, [open, part?.id]);

  const titleIsValid = title.trim().length >= 3;
  const contentIsValid = content.trim().length > 0;
  const canSubmit = titleIsValid && contentIsValid && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AdaptiveFormDialogContent className="sm:max-w-2xl">
        <DialogHeader className={adaptiveFormDialogHeaderClassName}>
          <DialogTitle>
            {mode === "create" ? "Nova etapa do estudo" : "Editar etapa"}
          </DialogTitle>
          <DialogDescription className="mt-1">
            Monte o conteúdo na mesma ordem em que o aluno vai estudar. O espaço
            de anotação do aluno já é automático e não precisa ser criado aqui.
          </DialogDescription>
        </DialogHeader>
        <AdaptiveFormDialogBody>
          <form
            id="foundation-study-part-editor"
            className="space-y-5"
            onSubmit={event => {
              event.preventDefault();
              if (!canSubmit) return;
              onSubmit({ title, content, reflectionPrompt, active });
            }}
          >
            <div className="rounded-xl border border-[#c9a84c]/30 bg-[#fdfaf1] p-3">
              <p className="text-sm font-semibold text-[#1e3a5f]">
                As quatro etapas
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FOUNDATION_STAGES.map(stage => (
                  <div key={stage.key} className="rounded-lg bg-white p-2">
                    <p className="text-xs font-semibold text-[#1e3a5f]">
                      {stage.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                      {stage.description}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Use o nome da etapa no início do título, por exemplo: “Leia — A
                promessa de Deus”.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="foundation-part-title">Nome da etapa</Label>
              <Input
                id="foundation-part-title"
                value={title}
                onChange={event => setTitle(event.target.value)}
                maxLength={160}
                placeholder="Ex.: Leia — A promessa de Deus"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                O nome aparece para o professor e para o aluno.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="foundation-part-content">Conteúdo da etapa</Label>
              <Textarea
                id="foundation-part-content"
                value={content}
                onChange={event => setContent(event.target.value)}
                maxLength={12000}
                rows={10}
                className="min-h-48 resize-y"
                placeholder="Escreva a leitura, explicação, pergunta-guia ou aplicação desta etapa."
              />
              <p className="text-right text-xs text-muted-foreground">
                {content.length}/12000
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="foundation-part-reflection-prompt">
                Para refletir{" "}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Textarea
                id="foundation-part-reflection-prompt"
                value={reflectionPrompt}
                onChange={event => setReflectionPrompt(event.target.value)}
                maxLength={1000}
                rows={3}
                className="resize-y"
                placeholder="Ex.: O que Deus está ensinando a você nesta etapa?"
              />
              <p className="text-xs text-muted-foreground">
                É a pergunta-guia que o aluno verá antes de escrever sua
                anotação. A anotação continua sendo do aluno.
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-input accent-[#1e3a5f]"
                checked={active}
                onChange={event => setActive(event.target.checked)}
              />
              <span>
                <span className="block font-medium text-[#1e3a5f]">
                  Etapa disponível para o aluno
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Desmarque somente se quiser manter esta etapa oculta enquanto
                  prepara o estudo.
                </span>
              </span>
            </label>
          </form>
        </AdaptiveFormDialogBody>
        <AdaptiveFormDialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="foundation-study-part-editor"
            className="bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90"
            disabled={!canSubmit}
          >
            {isPending
              ? "Salvando…"
              : mode === "create"
                ? "Criar etapa"
                : "Salvar etapa"}
          </Button>
        </AdaptiveFormDialogFooter>
      </AdaptiveFormDialogContent>
    </Dialog>
  );
}
