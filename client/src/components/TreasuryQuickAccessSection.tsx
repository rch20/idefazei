import { Badge } from "@/components/ui/badge";
import { type LucideIcon } from "lucide-react";
import type { TreasuryQuickAction } from "@/components/TreasuryQuickActionHost";

export type TreasuryQuickActionTile = {
  action: TreasuryQuickAction;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

export type TreasuryQuickActionGroup = {
  id: string;
  label: string;
  description: string;
  actions: TreasuryQuickAction[];
};

type TreasuryQuickAccessSectionProps = {
  tiles: TreasuryQuickActionTile[];
  groups: TreasuryQuickActionGroup[];
  onSelect: (action: TreasuryQuickAction) => void;
};

export function TreasuryQuickAccessSection({ tiles, groups, onSelect }: TreasuryQuickAccessSectionProps) {
  return (
    <section
      aria-labelledby="treasury-quick-access-title"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Navegação simples</p>
          <h2 id="treasury-quick-access-title" className="mt-1 font-display text-2xl text-navy">Acesso rápido</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha uma ação para abrir seu painel de foco. Ao fechar, você volta para esta visão.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-600">
          {tiles.length} ações disponíveis
        </Badge>
      </div>
      <div className="mt-5 space-y-6">
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`treasury-group-${group.id}`}>
            <div className="mb-2 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
              <h3 id={`treasury-group-${group.id}`} className="text-sm font-semibold text-navy">{group.label}</h3>
              <p className="text-xs text-muted-foreground">{group.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tiles.filter((tile) => group.actions.includes(tile.action)).map(({ action, label, description, icon: Icon, tone }) => (
                <button
                  key={action}
                  type="button"
                  className="group flex min-h-24 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-navy/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 active:scale-[0.99]"
                  onClick={() => onSelect(action)}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-navy">{label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
                    <span className="mt-2 block text-[11px] font-medium text-navy/65 transition-colors group-hover:text-navy">Abrir painel →</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
