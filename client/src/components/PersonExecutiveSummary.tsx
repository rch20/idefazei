import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ChevronDown, CircleCheck, CircleHelp, UsersRound } from "lucide-react";
import { useId, useState } from "react";

export type PersonExecutiveSummaryAttention = {
  priority?: string | null;
  nextStep?: string | null;
  reasons?: string[] | null;
};

export type PersonExecutiveSummaryProps = {
  stageLabel: string;
  currentCellName?: string | null;
  cellStatus?: string | null;
  hasCellHistory?: boolean;
  responsibleName?: string | null;
  attention?: PersonExecutiveSummaryAttention | null;
  canActOnNextStep: boolean;
  nextStepLabel?: string | null;
  onPrimaryAction?: () => void;
};

function getAttentionTone(priority?: string | null) {
  if (priority === "alta") {
    return {
      section: "border-rose-200 bg-rose-50/60",
      icon: "text-rose-600",
      badge: "border-rose-200 bg-rose-100 text-rose-800",
    };
  }
  if (priority === "media") {
    return {
      section: "border-amber-200 bg-amber-50/60",
      icon: "text-amber-600",
      badge: "border-amber-200 bg-amber-100 text-amber-800",
    };
  }
  if (priority === "normal") {
    return {
      section: "border-emerald-200 bg-emerald-50/60",
      icon: "text-emerald-600",
      badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
    };
  }
  return {
    section: "border-border bg-muted/20",
    icon: "text-navy",
    badge: "border-border bg-background text-muted-foreground",
  };
}

export function PersonExecutiveSummary({
  stageLabel,
  currentCellName,
  cellStatus,
  hasCellHistory = false,
  responsibleName,
  attention,
  canActOnNextStep,
  nextStepLabel,
  onPrimaryAction,
}: PersonExecutiveSummaryProps) {
  const [contextOpen, setContextOpen] = useState(false);
  const contextId = useId();
  const tone = getAttentionTone(attention?.priority);
  const nextStep = attention?.nextStep ?? "Nenhum próximo passo definido";
  const reasons = attention?.reasons ?? [];
  const reasonText = attention
    ? reasons.length > 0
      ? reasons.join(" · ")
      : "Não há pendências críticas no momento."
    : "A ficha ainda não possui uma pendência de cuidado registrada.";
  const isCellIntegrated = cellStatus === "integrada" || Boolean(currentCellName);
  const cellLabel = currentCellName ?? "Sem Célula";

  return (
    <section aria-label="Resumo executivo da ficha da Pessoa" className="space-y-3">
      <section className={`rounded-xl border p-3.5 sm:p-4 ${tone.section}`} aria-label="Próximo passo da Pessoa">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {attention?.nextStep && attention.nextStep !== "Acompanhamento em dia" ? (
              <ArrowRight className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon}`} aria-hidden="true" />
            ) : (
              <CircleCheck className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon}`} aria-hidden="true" />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Próximo passo</p>
                {attention?.priority && <Badge variant="outline" className={`text-[10px] ${tone.badge}`}>{attention.priority === "alta" ? "Atenção alta" : attention.priority === "media" ? "Atenção" : "Em dia"}</Badge>}
              </div>
              <p className="mt-1 text-sm font-semibold text-navy">{nextStep}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{reasonText}</p>
            </div>
          </div>
          {canActOnNextStep && nextStepLabel && onPrimaryAction && (
            <Button type="button" variant="outline" className="min-h-11 w-full shrink-0 gap-2 sm:min-h-10 sm:w-auto" onClick={onPrimaryAction}>
              {nextStepLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Indicadores principais da Pessoa">
        <article className="min-w-0 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Jornada</p>
          <p className="mt-1 truncate text-sm font-semibold text-navy" title={stageLabel}>{stageLabel}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Etapa principal</p>
        </article>
        <article className="min-w-0 rounded-lg border border-indigo-200 bg-indigo-50/45 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Célula atual</p>
            <UsersRound className="h-4 w-4 shrink-0 text-indigo-700" aria-hidden="true" />
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-navy" title={cellLabel}>{cellLabel}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{isCellIntegrated ? "Participação integrada" : "Participação pendente"}</p>
        </article>
        <article className="col-span-2 min-w-0 rounded-lg border border-border bg-muted/30 p-3 sm:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Acompanhado por</p>
          <p className="mt-1 truncate text-sm font-semibold text-navy" title={responsibleName ?? "Não definido"}>{responsibleName ?? "Não definido"}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Responsável pelo cuidado</p>
        </article>
      </div>

      <Collapsible open={contextOpen} onOpenChange={setContextOpen} className="rounded-xl border border-border bg-background/70">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-controls={contextId}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-navy transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 sm:px-4"
          >
            <span className="flex min-w-0 items-center gap-2">
              <CircleHelp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>Contexto do cuidado e da Célula</span>
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${contextOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent id={contextId} className="border-t border-border px-3.5 pb-3.5 pt-3 text-xs leading-relaxed text-muted-foreground sm:px-4 sm:pb-4">
          <p>Jornada representa o progresso geral da Pessoa. Participação em Célula representa a integração comunitária atual e não altera a etapa principal.</p>
          <p className="mt-2">Pendente significa apenas que não há vínculo ativo no momento; não altera nem retrocede a Jornada.</p>
          <p className="mt-2">{isCellIntegrated ? `A Pessoa participa atualmente da Célula ${cellLabel}.` : hasCellHistory ? "A Pessoa está sem Célula no momento, mas o histórico de participações anteriores foi preservado." : "A Pessoa ainda não possui uma Célula atual. Isso é uma situação válida e não representa erro no cadastro."}</p>
          {reasons.length > 0 && (
            <div className="mt-3 rounded-lg border border-border/70 bg-muted/30 p-2.5">
              <p className="font-semibold text-navy">Motivos considerados</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
