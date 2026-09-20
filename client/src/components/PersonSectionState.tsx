import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle, Info, Loader2, RefreshCw } from "lucide-react";

export type PersonSectionStateKind = "loading" | "empty" | "error" | "unavailable" | "refreshing";

export type PersonSectionStateProps = {
  kind: PersonSectionStateKind;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  className?: string;
};

export type PersonSectionViewState = PersonSectionStateKind | "ready";

export type PersonSectionQueryState = {
  enabled?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  isFetching?: boolean;
  hasData?: boolean;
  isEmpty?: boolean;
};

export function resolvePersonSectionState({
  enabled = true,
  isLoading = false,
  isError = false,
  isFetching = false,
  hasData = false,
  isEmpty = false,
}: PersonSectionQueryState): PersonSectionViewState {
  if (!enabled) return "unavailable";
  if (isLoading && !hasData) return "loading";
  if (isError && !hasData) return "error";
  if (isFetching && hasData) return "refreshing";
  if (isEmpty) return "empty";
  return "ready";
}

const DEFAULT_COPY: Record<PersonSectionStateKind, { title: string; description: string }> = {
  loading: {
    title: "Carregando informação…",
    description: "A ficha está consultando os dados mais recentes.",
  },
  empty: {
    title: "Nenhum registro encontrado",
    description: "Ainda não há informações registradas neste contexto.",
  },
  error: {
    title: "Não foi possível carregar esta informação",
    description: "Tente novamente. Se o problema continuar, verifique sua conexão.",
  },
  unavailable: {
    title: "Informação indisponível",
    description: "Esta informação não está disponível para o seu perfil.",
  },
  refreshing: {
    title: "Atualizando informação…",
    description: "O último conteúdo válido continua visível enquanto a atualização termina.",
  },
};

export function PersonSectionState({
  kind,
  title,
  description,
  onRetry,
  retryLabel = "Tentar novamente",
  retrying = false,
  className,
}: PersonSectionStateProps) {
  const copy = DEFAULT_COPY[kind];
  const isBusy = kind === "loading" || kind === "refreshing" || retrying;
  const role = kind === "error" ? "alert" : "status";
  const Icon = kind === "error" ? AlertCircle : kind === "loading" || kind === "refreshing" ? Loader2 : Info;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        kind === "error" && "border-rose-200 bg-rose-50/70 text-rose-900",
        kind === "unavailable" && "border-amber-200 bg-amber-50/70 text-amber-900",
        kind === "empty" && "border-dashed border-border bg-muted/20 text-muted-foreground",
        (kind === "loading" || kind === "refreshing") && "border-border bg-muted/20 text-muted-foreground",
        className,
      )}
      role={role}
      aria-live={kind === "error" ? "assertive" : "polite"}
      aria-busy={isBusy}
      data-state-kind={kind}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", (kind === "loading" || kind === "refreshing") && "animate-spin")} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{title ?? copy.title}</p>
          {(description ?? copy.description) && <p className="mt-1 text-xs leading-relaxed opacity-80">{description ?? copy.description}</p>}
          {kind === "error" && onRetry && (
            <Button
              type="button"
              variant="outline"
              className="mt-3 min-h-11 border-current/20 bg-background/70 text-xs text-current hover:bg-background focus-visible:ring-2 focus-visible:ring-gold/70"
              onClick={onRetry}
              disabled={retrying}
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", retrying && "animate-spin")} aria-hidden="true" />
              {retrying ? "Tentando novamente…" : retryLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PersonSectionState;
