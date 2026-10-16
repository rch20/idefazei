import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarDays, Layers3, Users } from "lucide-react";
import {
  createFoundationTheme,
  makeFoundationSoftColor,
  type FoundationTheme,
} from "./FoundationTheme";

export type FoundationAdminArea =
  | "estudos"
  | "alunos"
  | "aulas"
  | "organizacao";

type FoundationAdminAreaDefinition = {
  id: FoundationAdminArea;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const FOUNDATION_ADMIN_AREAS: FoundationAdminAreaDefinition[] = [
  {
    id: "estudos",
    label: "Estudos",
    description: "Prepare e publique o conteúdo",
    icon: BookOpen,
  },
  {
    id: "alunos",
    label: "Alunos",
    description: "Matrículas e progresso",
    icon: Users,
  },
  {
    id: "aulas",
    label: "Aulas",
    description: "Encontro presencial e presença",
    icon: CalendarDays,
  },
  {
    id: "organizacao",
    label: "Organização",
    description: "Turmas, módulos e permissões",
    icon: Layers3,
  },
];

export function FoundationAreaNav({
  activeArea,
  onChange,
  theme = createFoundationTheme(),
}: {
  activeArea: FoundationAdminArea;
  onChange: (area: FoundationAdminArea) => void;
  theme?: FoundationTheme;
}) {
  return (
    <nav
      aria-label="Áreas da Escola"
      className="grid grid-cols-2 gap-2 rounded-2xl border p-2 sm:grid-cols-4"
      style={{
        borderColor: makeFoundationSoftColor(theme.accent, 25),
        backgroundColor: theme.accentSoft,
      }}
    >
      {FOUNDATION_ADMIN_AREAS.map(({ id, label, description, icon: Icon }) => {
        const active = activeArea === id;
        return (
          <button
            key={id}
            type="button"
            aria-selected={active}
            aria-pressed={active}
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(id)}
            className="flex min-h-20 min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] sm:min-h-24 sm:flex-col sm:items-start sm:justify-center"
            style={
              active
                ? {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                    color: theme.primaryForeground,
                    outlineColor: theme.focusRing,
                  }
                : {
                    backgroundColor: "white",
                    borderColor: makeFoundationSoftColor(theme.accent, 65),
                    color: theme.primary,
                    outlineColor: theme.focusRing,
                  }
            }
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {label}
              </span>
              <span
                className={`mt-0.5 block truncate text-xs ${active ? "opacity-75" : "text-muted-foreground"}`}
              >
                {description}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function FoundationAreaSection({
  title,
  description,
  icon: Icon,
  children,
  theme = createFoundationTheme(),
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  theme?: FoundationTheme;
}) {
  return (
    <section
      aria-labelledby={`foundation-area-${title.toLowerCase()}`}
      className="space-y-4"
    >
      <div
        className="flex items-start gap-3 rounded-2xl border p-4 sm:p-5"
        style={{
          borderColor: makeFoundationSoftColor(theme.accent, 20),
          backgroundColor: makeFoundationSoftColor(theme.accent, 5),
        }}
      >
        <div
          className="rounded-xl p-2"
          style={{
            backgroundColor: theme.primary,
            color: theme.primaryForeground,
          }}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2
            id={`foundation-area-${title.toLowerCase()}`}
            className="font-display text-lg font-semibold"
            style={{ color: theme.primary }}
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
