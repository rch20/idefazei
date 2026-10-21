import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useChurchAuth } from "@/hooks/useChurchAuth";
import { BILLING_PLAN_KEYS, BILLING_PLANS, GRACE_DAYS, TRIAL_DAYS, billingAmountCents, formatBrl, type BillingCycle, type BillingMode, type BillingPlanKey } from "@shared/billing";

const PHASE_TEXT: Record<string, string> = {
  teste: "Período de teste",
  ativa: "Assinatura ativa",
  carencia: "Vencida — em carência",
  vencida: "Vencida",
};
const STATUS_LABEL: Record<string, string> = { pendente: "Aguardando pagamento", pago: "Pago", falhou: "Não concluído", cancelado: "Cancelado" };

function dateBr(value: string | Date | null | undefined) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "—";
}

export default function Assinatura() {
  const { user } = useChurchAuth();
  const churchId = user?.churchId ?? 0;
  const overview = trpc.billing.overview.useQuery({ churchId }, { enabled: churchId > 0 });
  const [plan, setPlan] = useState<BillingPlanKey>("basico");
  const [cycle, setCycle] = useState<BillingCycle>("mensal");
  const [mode, setMode] = useState<BillingMode>("pontual");
  const checkout = trpc.billing.startCheckout.useMutation({
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (error) => toast.error(error.message),
  });
  if (!overview.data) return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-label="Carregando assinatura" />;

  const { state, payments, checkoutAvailable, recurring } = overview.data;
  const amount = billingAmountCents(plan, cycle);
  const warn = state.phase === "carencia" || state.phase === "vencida";
  const justPaid = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pagamento") === "ok";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className={`rounded-2xl border p-5 ${warn ? "border-amber-300 bg-amber-50" : "border-gold/35 bg-white"}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gold">Sua assinatura</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-navy">{PHASE_TEXT[state.phase]}</h1>
        <p className="mt-1 text-sm text-slate-700">
          {state.phase === "teste" && `Seu teste grátis de ${TRIAL_DAYS} dias termina em ${dateBr(state.trialEndsAt)} (${state.daysLeft} ${state.daysLeft === 1 ? "dia" : "dias"}).`}
          {state.phase === "ativa" && `Paga até ${dateBr(state.paidUntil)} (${state.daysLeft} ${state.daysLeft === 1 ? "dia" : "dias"}).${overview.data.plan ? ` Plano ${BILLING_PLANS[overview.data.plan as BillingPlanKey]?.name ?? overview.data.plan}.` : ""}${recurring ? " Renovação automática no cartão." : ""}`}
          {state.phase === "carencia" && `O período acabou, mas você tem mais ${state.daysLeft} ${state.daysLeft === 1 ? "dia" : "dias"} de carência (até ${dateBr(state.graceEndsAt)}). Pague para não perder o acesso.`}
          {state.phase === "vencida" && `A carência de ${GRACE_DAYS} dias terminou em ${dateBr(state.graceEndsAt)}. Seus dados estão guardados: ao pagar, o acesso volta na hora.`}
        </p>
        {justPaid ? <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Recebemos o seu retorno do pagamento. A confirmação pode levar alguns instantes; atualize esta página em seguida.</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-navy">Escolha seu plano</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {BILLING_PLAN_KEYS.map((key) => (
            <button key={key} type="button" onClick={() => setPlan(key)} aria-pressed={plan === key} className={`rounded-xl border p-3 text-left ${plan === key ? "border-navy bg-navy/5 ring-2 ring-navy/20" : "border-slate-200"}`}>
              <span className="block text-sm font-semibold text-navy">{BILLING_PLANS[key].name}</span>
              <span className="mt-1 block text-lg font-semibold">{formatBrl(cycle === "anual" ? BILLING_PLANS[key].anualPorMesCents : BILLING_PLANS[key].mensalCents)}<span className="text-xs font-normal text-muted-foreground"> /mês</span></span>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <fieldset>
            <legend className="text-sm font-medium text-navy">Período</legend>
            <div className="mt-1 flex gap-2">
              {([["mensal", "Mensal"], ["anual", "Anual (economiza)"]] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setCycle(value)} aria-pressed={cycle === value} className={`min-h-10 flex-1 rounded-lg border px-3 text-sm ${cycle === value ? "border-navy bg-navy text-white" : "border-slate-300"}`}>{label}</button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium text-navy">Como pagar</legend>
            <div className="mt-1 flex gap-2">
              {([["pontual", "Pagar agora"], ["recorrente", "Renovar no cartão"]] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setMode(value)} aria-pressed={mode === value} className={`min-h-10 flex-1 rounded-lg border px-3 text-sm ${mode === value ? "border-navy bg-navy text-white" : "border-slate-300"}`}>{label}</button>
              ))}
            </div>
          </fieldset>
        </div>
        <p className="mt-3 text-sm text-slate-700">
          {mode === "pontual"
            ? "Você paga uma vez por Pix, cartão ou boleto e ganha o período escolhido. Na hora de renovar, é só pagar de novo."
            : "A cobrança se repete sozinha no cartão (ou boleto) a cada período. Pix não está disponível na renovação automática."}
        </p>
        <button type="button" disabled={!checkoutAvailable || checkout.isPending} onClick={() => checkout.mutate({ churchId, plan, cycle, mode })} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-navy px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">
          {checkout.isPending ? "Abrindo pagamento…" : `Pagar ${formatBrl(amount)}${cycle === "anual" ? " (12 meses)" : " (1 mês)"}`}
        </button>
        {!checkoutAvailable ? <p className="mt-2 text-sm text-amber-700">O pagamento on-line ainda não está ativo. Fale com o suporte do Ide Fazei para ativar sua assinatura.</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-navy">Histórico</h2>
        {payments.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p> : (
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {payments.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{BILLING_PLANS[item.planKey as BillingPlanKey]?.name ?? item.planKey} · {item.cycle}</span>
                <span className="text-muted-foreground">{dateBr(item.paidAt ?? item.createdAt)}</span>
                <span>{formatBrl(item.amountCents)}</span>
                <span className={item.status === "pago" ? "font-medium text-emerald-700" : "text-slate-600"}>{STATUS_LABEL[item.status] ?? item.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
