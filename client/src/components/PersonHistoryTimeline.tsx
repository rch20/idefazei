import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronDown, Clock3, HeartHandshake, History, Home } from "lucide-react";
import { useId, useState } from "react";

export type PersonHistoryCategory = "jornada" | "cuidado" | "consolidacao" | "celula";
export type PersonHistorySource = "moderno" | "anterior" | "jornada";

export type PersonHistoryEvent = {
  id: string;
  date: string | Date;
  title: string;
  detail?: string | null;
  category: PersonHistoryCategory;
  source?: PersonHistorySource;
  isLatest?: boolean;
};

type CategoryConfig = {
  label: string;
  icon: typeof BookOpen;
  marker: string;
  badge: string;
};

const CATEGORY_CONFIG: Record<PersonHistoryCategory, CategoryConfig> = {
  jornada: {
    label: "Jornada",
    icon: BookOpen,
    marker: "bg-gold",
    badge: "border-gold/40 bg-gold/10 text-navy",
  },
  cuidado: {
    label: "Cuidado",
    icon: HeartHandshake,
    marker: "bg-rose-500",
    badge: "border-rose-200 bg-rose-50 text-rose-800",
  },
  consolidacao: {
    label: "Consolidação",
    icon: History,
    marker: "bg-indigo-600",
    badge: "border-indigo-200 bg-indigo-50 text-indigo-800",
  },
  celula: {
    label: "Célula",
    icon: Home,
    marker: "bg-emerald-600",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
};

function formatHistoryDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return date.toLocaleDateString("pt-BR");
}

function sourceLabel(source?: PersonHistorySource) {
  if (source === "anterior") return "Registro anterior";
  return null;
}

export type PersonHistoryTimelineProps = {
  events: PersonHistoryEvent[];
};

export function PersonHistoryTimeline({ events }: PersonHistoryTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const initialVisibleCount = 5;
  const visibleEvents = expanded ? events : events.slice(0, initialVisibleCount);
  const hasMoreEvents = events.length > initialVisibleCount;

  return (
    <section aria-label="Linha do tempo histórica" className="rounded-xl border border-border p-4">
      <div className="flex items-start gap-3">
        <History className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-navy">Linha do tempo histórica</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Registros anteriores da Jornada, do cuidado, da Consolidação e das Células. Esta linha do tempo não substitui os estados atuais do Resumo.</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
          Ainda não há atividades históricas registradas. A situação atual da Pessoa está disponível no Resumo, na Jornada e em Participações.
        </div>
      ) : (
        <>
          <div id={listId} className="mt-4 space-y-4 border-l border-gold/30 pl-4">
            {visibleEvents.map((event) => {
              const category = CATEGORY_CONFIG[event.category];
              const CategoryIcon = category.icon;
              const historicalSource = sourceLabel(event.source);
              return (
                <article key={event.id} className="relative min-w-0" aria-label={`${category.label}: ${event.title}`}>
                  <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background ${category.marker}`} aria-hidden="true" />
                  <div className="min-w-0 rounded-lg border border-border/70 bg-background/70 p-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={`gap-1 text-[10px] ${category.badge}`}>
                        <CategoryIcon className="h-3 w-3" aria-hidden="true" />
                        {category.label}
                      </Badge>
                      {historicalSource && <Badge variant="outline" className="text-[10px] border-slate-300 bg-slate-50 text-slate-700">{historicalSource}</Badge>}
                      {event.isLatest && <Badge variant="outline" className="text-[10px] border-gold/40 bg-gold/10 text-navy">Última atividade</Badge>}
                    </div>
                    <p className="mt-2 break-words text-sm font-medium text-navy">{event.title}</p>
                    {event.detail && <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">{event.detail}</p>}
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {formatHistoryDate(event.date)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          {hasMoreEvents && (
            <button
              type="button"
              aria-controls={listId}
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-navy transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
            >
              {expanded ? "Mostrar menos histórico" : "Mostrar mais histórico"}
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </section>
  );
}
