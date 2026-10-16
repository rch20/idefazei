import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ComponentType,
  type ErrorInfo,
  type LazyExoticComponent,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

export type TreasuryBookFilter = "todos" | "entrada" | "saida";

export type TreasuryQuickAction =
  | "livro-caixa"
  | "contribuicoes-online"
  | "pix"
  | "programacao"
  | "relatorios-culto"
  | "conciliacao"
  | "relatorios"
  | "categorias-contas"
  | "fechamento"
  | "contas-a-pagar"
  | "doacoes-publicas";

export type TreasuryAccountOption = {
  id: number;
  name: string;
  type: "caixa" | "banco" | "outro";
};

export type TreasuryServiceContext = {
  serviceId: number;
  countSheetId?: number;
  serviceDate: string;
};

export type TreasuryCategoryOption = {
  id: number;
  name: string;
  key?: string | null;
};

export type TreasuryPersonOption = {
  id: number;
  fullName: string;
};

export type TreasuryPanelProps = {
  churchId: number;
  canManageStructure: boolean;
  initialView?: "today" | "reports";
  canManageThankYouMessage: boolean;
  accounts: TreasuryAccountOption[];
  entryCategories: TreasuryCategoryOption[];
  people: TreasuryPersonOption[];
  bookFilter: TreasuryBookFilter;
  onBookFilterChange: (filter: TreasuryBookFilter) => void;
  onRequestClose: () => void;
  onRequestEntry?: (context: TreasuryServiceContext) => void;
  onBusyChange?: (busy: boolean) => void;
};

export type TreasuryPanelComponent = ComponentType<TreasuryPanelProps>;
export type TreasuryPanelLoader = () => Promise<{
  default: TreasuryPanelComponent;
}>;
export type TreasuryPanelErrorReporter = (issue: {
  action: TreasuryQuickAction;
  error: Error;
  componentStack?: string;
}) => void;

export type TreasuryQuickActionHostProps = {
  action: TreasuryQuickAction | null;
  onClose: () => void;
  churchId: number;
  canManageStructure: boolean;
  canManageThankYouMessage: boolean;
  accounts: TreasuryAccountOption[];
  entryCategories: TreasuryCategoryOption[];
  people: TreasuryPersonOption[];
  bookFilter?: TreasuryBookFilter;
  onBookFilterChange?: (filter: TreasuryBookFilter) => void;
  onRequestEntry?: (context: TreasuryServiceContext) => void;
  releaseId?: string;
  isBusy?: boolean;
  onBusyChange?: (busy: boolean) => void;
  loaders?: Partial<Record<TreasuryQuickAction, TreasuryPanelLoader>>;
  onError?: TreasuryPanelErrorReporter;
  onReload?: () => void;
};

const ACTION_LABELS: Record<TreasuryQuickAction, string> = {
  "livro-caixa": "Livro-caixa",
  "contribuicoes-online": "Contribuições de membros",
  pix: "Chave PIX e mensagem",
  programacao: "Programação de cultos",
  "relatorios-culto": "Relatórios de culto",
  conciliacao: "Conciliação bancária",
  relatorios: "Relatórios / PDF",
  "categorias-contas": "Categorias e contas",
  fechamento: "Fechamento mensal",
  "contas-a-pagar": "Contas a pagar",
  "doacoes-publicas": "Doações pela página pública",
};

const ACTION_DESCRIPTIONS: Record<TreasuryQuickAction, string> = {
  "livro-caixa":
    "Consulte os lançamentos, saldos por conta e categorias do período.",
  "contribuicoes-online":
    "Confira contribuições e comprovantes enviados pelo aplicativo.",
  pix: "Configure a chave PIX e a mensagem exibida após o envio.",
  programacao: "Gerencie os cultos fixos e as ocorrências recorrentes.",
  "relatorios-culto":
    "Consulte fichas financeiras, filtre por data ou culto e compartilhe novamente.",
  conciliacao:
    "Compare o saldo do banco com o saldo registrado no livro-caixa.",
  relatorios: "Gere o resumo ou o relatório detalhado da Tesouraria.",
  "categorias-contas":
    "Crie contas financeiras e gerencie categorias sem apagar o histórico.",
  fechamento: "Feche ou reabra o período com a justificativa necessária.",
  "contas-a-pagar": "Consulte obrigações, valores e vencimentos da igreja.",
  "doacoes-publicas":
    "Revise envios e comprovantes da página pública e aprove ou recuse cada doação.",
};

const DEFAULT_PANEL_LOADERS: Partial<
  Record<TreasuryQuickAction, TreasuryPanelLoader>
> = {
  "contribuicoes-online": async () => {
    const { OnlineContributionsSection } = await import(
      "@/components/OnlineContributionsSection"
    );

    return {
      default: props => (
        <OnlineContributionsSection
          churchId={props.churchId}
          accounts={props.accounts.map(({ id, name }) => ({ id, name }))}
          entryCategories={props.entryCategories}
        />
      ),
    };
  },

  pix: async () => {
    const { TreasuryPixSettingsSection } = await import(
      "@/components/TreasuryPixSettingsSection"
    );

    return {
      default: props => (
        <TreasuryPixSettingsSection
          churchId={props.churchId}
          canManageStructure={props.canManageStructure}
          canManageThankYouMessage={props.canManageThankYouMessage}
        />
      ),
    };
  },

  programacao: async () => {
    const { TreasuryServiceSection } = await import(
      "@/components/TreasuryServiceSection"
    );

    return {
      default: props => (
        <TreasuryServiceSection
          churchId={props.churchId}
          canManageStructure={props.canManageStructure}
          people={props.people}
          accounts={props.accounts}
          onRequestEntry={props.onRequestEntry}
        />
      ),
    };
  },

  "relatorios-culto": async () => {
    const { TreasuryEntrySheetHistorySection } = await import(
      "@/components/TreasuryEntrySheetHistorySection"
    );

    return {
      default: props => (
        <TreasuryEntrySheetHistorySection
          churchId={props.churchId}
          accounts={props.accounts}
          onRequestClose={props.onRequestClose}
          onRequestEntry={props.onRequestEntry}
        />
      ),
    };
  },

  "doacoes-publicas": async () => {
    const { PublicDonationsSection } = await import(
      "@/components/PublicDonationsSection"
    );

    return {
      default: props => (
        <PublicDonationsSection
          churchId={props.churchId}
          accounts={props.accounts.map(({ id, name }) => ({ id, name }))}
          entryCategories={props.entryCategories}
        />
      ),
    };
  },

  "contas-a-pagar": async () => {
    const { TreasuryPayablesSection } = await import(
      "@/components/TreasuryPayablesSection"
    );

    return {
      default: props => (
        <TreasuryPayablesSection
          churchId={props.churchId}
          onBusyChange={props.onBusyChange}
        />
      ),
    };
  },
};

const lazyPanelCache = new WeakMap<
  TreasuryPanelLoader,
  Map<number, LazyExoticComponent<TreasuryPanelComponent>>
>();

function getLazyPanel(
  loader: TreasuryPanelLoader,
  retryKey: number
): LazyExoticComponent<TreasuryPanelComponent> {
  let byRetryKey = lazyPanelCache.get(loader);
  if (!byRetryKey) {
    byRetryKey = new Map();
    lazyPanelCache.set(loader, byRetryKey);
  }

  const cached = byRetryKey.get(retryKey);
  if (cached) return cached;

  const created = lazy(loader);
  byRetryKey.set(retryKey, created);
  return created;
}

type TreasuryPanelErrorBoundaryProps = {
  children: ReactNode;
  action: TreasuryQuickAction;
  onError: TreasuryPanelErrorReporter;
  resetKey: string;
  onRetry: () => void;
  onClose: () => void;
  onReload: () => void;
};

type TreasuryPanelErrorBoundaryState = {
  error: Error | null;
};

export class TreasuryPanelErrorBoundary extends Component<
  TreasuryPanelErrorBoundaryProps,
  TreasuryPanelErrorBoundaryState
> {
  state: TreasuryPanelErrorBoundaryState = { error: null };

  static getDerivedStateFromError(
    error: Error
  ): TreasuryPanelErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError({
      action: this.props.action,
      error,
      componentStack: errorInfo.componentStack ?? undefined,
    });

    if (import.meta.env.DEV) {
      console.error("[TreasuryQuickActionHost] painel falhou", {
        message: error.message,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  componentDidUpdate(previousProps: TreasuryPanelErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-900"
      >
        <p className="font-semibold">
          Não foi possível carregar este módulo da Tesouraria.
        </p>
        <p className="max-w-md text-sm text-rose-800/80">
          Os quatro saldos continuam preservados. Tente carregar o módulo
          novamente ou feche esta janela para voltar ao Acesso rápido.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-rose-300 bg-white text-rose-900 hover:bg-rose-100"
            onClick={this.props.onRetry}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-rose-900 hover:bg-rose-100"
            onClick={this.props.onClose}
          >
            Fechar
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-rose-900 hover:bg-rose-100"
            onClick={this.props.onReload}
          >
            Atualizar aplicação
          </Button>
        </div>
      </div>
    );
  }
}

function TreasuryPanelSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando módulo da Tesouraria"
      className="space-y-4 p-1 sm:p-2"
    >
      <div className="flex items-center gap-3">
        <Loader2
          className="h-5 w-5 animate-spin text-gold"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-muted-foreground">
          Carregando módulo…
        </p>
      </div>
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

function TreasuryPanelUnavailable({ action }: { action: TreasuryQuickAction }) {
  return (
    <div
      role="region"
      aria-label={`Painel ${ACTION_LABELS[action]}`}
      className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
    >
      <p className="font-semibold">Painel ainda não conectado</p>
      <p className="mt-1">
        O host já está preparado para carregar {ACTION_LABELS[action]} sob
        demanda. O painel específico deve ser extraído em um componente e
        fornecido pelo prop <code>loaders</code>.
      </p>
    </div>
  );
}

export function TreasuryQuickActionHost({
  action,
  onClose,
  churchId,
  canManageStructure,
  canManageThankYouMessage,
  accounts,
  entryCategories,
  people,
  bookFilter = "todos",
  onBookFilterChange = () => undefined,
  onRequestEntry,
  isBusy = false,
  onBusyChange,
  loaders,
  onError = () => undefined,
  onReload = () => window.location.reload(),
}: TreasuryQuickActionHostProps) {
  const [retryKey, setRetryKey] = useState(0);

  const effectiveAction = action;
  const loader = effectiveAction
    ? (loaders?.[effectiveAction] ?? DEFAULT_PANEL_LOADERS[effectiveAction])
    : undefined;
  const resetKey = `${effectiveAction ?? "closed"}:${retryKey}`;
  const panelProps: TreasuryPanelProps = {
    churchId,
    canManageStructure,
    canManageThankYouMessage,
    accounts,
    entryCategories,
    people,
    bookFilter,
    onBookFilterChange,
    onRequestEntry,
    onRequestClose: onClose,
    onBusyChange,
  };

  const closeIfAllowed = useCallback(() => {
    if (isBusy) return;
    setRetryKey(0);
    onClose();
  }, [isBusy, onClose]);

  const handleRetry = useCallback(() => {
    setRetryKey(current => current + 1);
  }, []);

  const handleReload = useCallback(() => {
    onReload();
  }, [onReload]);

  if (!effectiveAction) return null;

  const content = loader ? (
    <LazyPanelContent
      key={resetKey}
      loader={loader}
      retryKey={retryKey}
      panelProps={panelProps}
    />
  ) : (
    <TreasuryPanelUnavailable action={effectiveAction} />
  );

  return (
    <Dialog
      open={Boolean(effectiveAction)}
      onOpenChange={open => {
        if (!open) closeIfAllowed();
      }}
    >
      <DialogContent
        className="!flex z-[200] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 flex-col overflow-hidden p-4 sm:max-h-[calc(100dvh-2rem)] sm:max-w-6xl sm:p-6"
        onEscapeKeyDown={event => {
          if (isBusy) event.preventDefault();
        }}
        onPointerDownOutside={event => {
          if (isBusy) event.preventDefault();
        }}
        onInteractOutside={event => {
          if (isBusy) event.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="font-display text-2xl text-navy">
            {ACTION_LABELS[effectiveAction]}
          </DialogTitle>
          <DialogDescription>
            {ACTION_DESCRIPTIONS[effectiveAction]} Ao fechar, você retornará ao Acesso
            rápido.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
          <TreasuryPanelErrorBoundary
            key={resetKey}
            action={effectiveAction}
            onError={onError}
            resetKey={resetKey}
            onRetry={handleRetry}
            onClose={closeIfAllowed}
            onReload={handleReload}
          >
            <Suspense fallback={<TreasuryPanelSkeleton />}>{content}</Suspense>
          </TreasuryPanelErrorBoundary>
        </div>

        <div className="mt-4 flex shrink-0 justify-end border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            disabled={isBusy}
            onClick={closeIfAllowed}
          >
            Fechar e voltar ao Acesso rápido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type LazyPanelContentProps = {
  loader: TreasuryPanelLoader;
  retryKey: number;
  panelProps: TreasuryPanelProps;
};

function LazyPanelContent({
  loader,
  retryKey,
  panelProps,
}: LazyPanelContentProps) {
  const LazyPanel = getLazyPanel(loader, retryKey);
  return <LazyPanel {...panelProps} />;
}
