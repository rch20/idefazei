import { AlertTriangle, Bell, BellOff, BellRing, CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { useWebPush, type WebPushState } from "@/hooks/useWebPush";

const stateCopy: Record<WebPushState, { label: string; description: string }> = {
  loading: { label: "Verificando alertas", description: "Consultando este dispositivo…" },
  subscribed: { label: "Alertas ativos neste dispositivo", description: "Você receberá avisos da sua igreja aqui." },
  available: { label: "Ativar alertas neste dispositivo", description: "Receba avisos importantes sem depender de e-mail." },
  denied: { label: "Permissão bloqueada", description: "Libere as notificações nas configurações do navegador para ativar." },
  disabled: { label: "Alertas indisponíveis", description: "A configuração de notificações ainda não foi habilitada para esta plataforma." },
  unsupported: { label: "Não compatível neste navegador", description: "Use um navegador compatível ou instale o Ide Fazei na Tela de Início." },
  error: { label: "Não foi possível verificar alertas", description: "Tente novamente. O sino interno continua funcionando normalmente." },
};

function StatusIcon({ state }: { state: WebPushState }) {
  if (state === "loading") return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
  if (state === "subscribed") return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
  if (state === "denied" || state === "error") return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
  if (state === "unsupported") return <Smartphone className="h-4 w-4" aria-hidden="true" />;
  return <BellRing className="h-4 w-4" aria-hidden="true" />;
}

export function WebPushControl({ churchId }: { churchId: number }) {
  const { state, busy, errorMessage, isIosHomeScreenApp, activate, deactivate } = useWebPush(churchId);
  const copy = stateCopy[state];
  const shouldShowIosHint = !isIosHomeScreenApp && /iPad|iPhone|iPod/.test(typeof navigator !== "undefined" ? navigator.userAgent : "");

  return (
    <div className="border-b border-border bg-muted/25 px-4 py-3" data-web-push-state={state} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${state === "subscribed" ? "bg-emerald-100 text-emerald-700" : state === "denied" || state === "error" ? "bg-rose-100 text-rose-700" : state === "available" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`} aria-hidden="true">
          <StatusIcon state={state} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy">{copy.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{copy.description}</p>
          {shouldShowIosHint && state === "available" && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">No iPhone, instale o Ide Fazei na Tela de Início antes de ativar.</p>}
          {errorMessage && <p role="alert" className="mt-1 text-[11px] font-medium leading-relaxed text-rose-700">{errorMessage}</p>}
        </div>
      </div>
      {(state === "available" || state === "error") && <button type="button" disabled={busy} onClick={() => void activate()} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-60"><Bell className="h-4 w-4" aria-hidden="true" />{busy ? "Ativando…" : state === "error" ? "Tentar novamente" : "Ativar notificações"}</button>}
      {state === "subscribed" && <button type="button" disabled={busy} onClick={() => void deactivate()} className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-60"><BellOff className="h-4 w-4" aria-hidden="true" />{busy ? "Desativando…" : "Desativar neste dispositivo"}</button>}
    </div>
  );
}
