import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { CHURCH_SETUP_STEPS, type ChurchSetupStepKey } from "@shared/churchSetup";

/**
 * Trilho de configuração do primeiro acesso. Tudo é opcional: cada passo é marcado como feito
 * pelos próprios dados da igreja, e quem pula fica como "pendente" sem bloquear nada.
 */
export function ChurchSetupTrail({ churchId }: { churchId: number }) {
  const utils = trpc.useUtils();
  const status = trpc.onboarding.setup.useQuery({ churchId }, { staleTime: 30_000, retry: false });
  const [open, setOpen] = useState<boolean | null>(null);
  const toggleSkip = trpc.onboarding.setSetupStepSkipped.useMutation({
    onSuccess: () => utils.onboarding.setup.invalidate({ churchId }),
    onError: (error) => toast.error(error.message),
  });
  if (!status.data) return null;

  const steps = status.data;
  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length) return null;
  const pending = steps.filter((step) => !step.done);
  const nextStep = pending.find((step) => !step.skipped) ?? pending[0];
  const percent = Math.round((doneCount / steps.length) * 100);
  const skippedCount = pending.filter((step) => step.skipped).length;
  const expanded = open ?? doneCount === 0;

  return (
    <section className="rounded-2xl border border-gold/35 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="setup-trail-title">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold"><Sparkles className="h-5 w-5" aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <h2 id="setup-trail-title" className="font-display text-lg font-semibold text-navy">Configure sua igreja</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{doneCount} de {steps.length} passos feitos. Nada é obrigatório: pule o que quiser e volte depois.</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Progresso da configuração">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${percent}%` }} />
          </div>
          {nextStep && !expanded ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link href={CHURCH_SETUP_STEPS[nextStep.key].path} className="inline-flex min-h-10 items-center rounded-lg bg-navy px-4 text-sm font-semibold text-white">Próximo: {CHURCH_SETUP_STEPS[nextStep.key].title}</Link>
              {skippedCount > 0 ? <span className="text-xs text-muted-foreground">{skippedCount} {skippedCount === 1 ? "pulado" : "pulados"} para depois</span> : null}
            </div>
          ) : null}
        </div>
        <button type="button" onClick={() => setOpen(!expanded)} aria-expanded={expanded} aria-label={expanded ? "Recolher passos" : "Ver todos os passos"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-navy hover:bg-navy/5">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true"><path d="m5 8 5 5 5-5" /></svg>
        </button>
      </div>
      {expanded ? (
        <ol className="mt-4 space-y-2">
          {steps.map((step) => {
            const info = CHURCH_SETUP_STEPS[step.key as ChurchSetupStepKey];
            return (
              <li key={step.key} className={`rounded-xl border p-3 ${step.done ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50/60"}`}>
                <div className="flex items-start gap-3">
                  {step.done ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-label="Feito" /> : step.skipped ? <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-label="Pulado" /> : <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" role="img" aria-label="Pendente" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy">{info.title}{step.skipped ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">Pulado</span> : null}</p>
                    {!step.done ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{info.description}</p> : null}
                    {!step.done ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link href={info.path} className="inline-flex min-h-9 items-center rounded-lg bg-navy px-3 text-xs font-semibold text-white">{info.action}</Link>
                        <button type="button" disabled={toggleSkip.isPending} onClick={() => toggleSkip.mutate({ churchId, stepKey: step.key, skipped: !step.skipped })} className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700">
                          {step.skipped ? "Voltar a mostrar" : "Pular por enquanto"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
