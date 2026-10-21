import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

/**
 * Faixa de aviso de vencimento e, se o Super Admin ligar o bloqueio, a tela de assinatura vencida.
 * Em caso de erro ao consultar, nada é bloqueado.
 */
export function BillingNotice({ churchId, canPay, children }: { churchId: number; canPay: boolean; children: ReactNode }) {
  const [location] = useLocation();
  const gate = trpc.billing.gate.useQuery({ churchId }, { enabled: churchId > 0, staleTime: 5 * 60_000, retry: false });
  const state = gate.data;
  if (!state) return <>{children}</>;
  const onBillingPage = location.startsWith("/app/assinatura");

  if (state.phase === "vencida" && state.enforce && !onBillingPage) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center p-4">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center">
          <h1 className="font-display text-xl font-semibold text-navy">Assinatura vencida</h1>
          <p className="mt-2 text-sm leading-6 text-slate-700">O período de acesso desta igreja terminou. Os dados estão guardados e o acesso volta assim que o pagamento for confirmado.</p>
          {canPay ? <Link href="/app/assinatura" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-navy px-5 text-sm font-semibold text-white">Ver assinatura e pagar</Link> : <p className="mt-3 text-sm font-medium text-navy">Avise o pastor ou o administrador da sua igreja.</p>}
        </div>
      </div>
    );
  }

  const showTrial = state.phase === "teste" && state.daysLeft <= 7;
  const showActive = state.phase === "ativa" && state.daysLeft <= 7;
  const showGrace = state.phase === "carencia" || state.phase === "vencida";
  const message = showGrace
    ? state.phase === "carencia" ? `Assinatura vencida. Restam ${state.daysLeft} ${state.daysLeft === 1 ? "dia" : "dias"} de carência.` : "Assinatura vencida."
    : showTrial ? `Seu teste grátis termina em ${state.daysLeft} ${state.daysLeft === 1 ? "dia" : "dias"}.`
    : showActive ? `Sua assinatura vence em ${state.daysLeft} ${state.daysLeft === 1 ? "dia" : "dias"}.` : null;

  return (
    <>
      {message && canPay && !onBillingPage ? (
        <div role="status" className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${showGrace ? "border-amber-300 bg-amber-50 text-amber-900" : "border-gold/35 bg-gold/5 text-navy"}`}>
          <span>{message}</span>
          <Link href="/app/assinatura" className="font-semibold underline">Ver assinatura</Link>
        </div>
      ) : null}
      {children}
    </>
  );
}
