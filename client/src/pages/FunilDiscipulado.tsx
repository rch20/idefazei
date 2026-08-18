import { useChurch } from "@/components/ChurchLayout";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { useState } from "react";

const STAGES = [
  { key: "nova_alma", label: "Nova Alma", color: "#3b82f6", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  { key: "consolidacao", label: "Consolidação", color: "#f59e0b", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  { key: "fundamentos", label: "Fundamentos", color: "#8b5cf6", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  { key: "celula", label: "Célula", color: "#22c55e", bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  { key: "batismo", label: "Batismo", color: "#06b6d4", bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700" },
  { key: "encontro_com_deus", label: "Encontro com Deus", color: "#f43f5e", bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
  { key: "escola_de_lideres", label: "Escola de Líderes", color: "#f97316", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  { key: "lideranca", label: "Liderança", color: "#6366f1", bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
  { key: "multiplicador", label: "Multiplicador", color: "#10b981", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

export default function FunilDiscipulado() {
  const { churchId } = useChurch();
  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
  const [activeDesktopStage, setActiveDesktopStage] = useState<StageKey>("nova_alma");

  const { data: people, isLoading, refetch } = trpc.people.list.useQuery({ churchId });
  const updatePerson = trpc.people.update.useMutation({
    onSuccess: () => refetch(),
  });

  const grouped = STAGES.map((stage) => ({
    ...stage,
    people: (people ?? []).filter((p) => p.discipleshipStage === stage.key),
  }));
  const selectedStage = grouped.find((stage) => stage.key === activeDesktopStage) ?? grouped[0];

  function handleMoveForward(personId: number, currentStage: StageKey) {
    const idx = STAGES.findIndex((s) => s.key === currentStage);
    if (idx < STAGES.length - 1) {
      const nextStage = STAGES[idx + 1].key;
      updatePerson.mutate({ id: personId, churchId, discipleshipStage: nextStage });
    }
  }

  function handleMoveBackward(personId: number, currentStage: StageKey) {
    const idx = STAGES.findIndex((s) => s.key === currentStage);
    if (idx > 0) {
      const previousStage = STAGES[idx - 1].key;
      updatePerson.mutate({ id: personId, churchId, discipleshipStage: previousStage });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-navy">Funil de Discipulado</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe a jornada espiritual de cada pessoa
        </p>
      </div>

      {/* Pipeline arrow */}
      <div className="hidden rounded-2xl border border-border bg-card p-2 md:grid md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        {grouped.map((stage, index) => {
          const isActive = stage.key === activeDesktopStage;
          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => setActiveDesktopStage(stage.key)}
              aria-pressed={isActive}
              className={`relative flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 ${isActive ? `${stage.bg} ${stage.border} border shadow-sm` : "hover:bg-cream-dark"}`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: stage.color }}>{index + 1}</span>
              <span className={`min-w-0 flex-1 truncate text-xs font-semibold ${isActive ? stage.text : "text-navy"}`}>{stage.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${stage.bg} ${stage.text}`}>{stage.people.length}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground md:hidden">Acompanhe cada etapa em sequência. Toque em uma Pessoa para visualizar seus dados e avance somente quando o próximo passo estiver concluído.</p>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {STAGES.map((s) => (
            <div key={s.key} className="kanban-column min-h-0 border-l-2 border-muted pl-3">
              <div className="h-6 w-24 bg-muted rounded animate-pulse mb-3" />
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {grouped.map((stage) => (
            <section
              key={stage.key}
              className="kanban-column min-h-0 w-full border-l-2 pl-3"
              style={{ borderColor: stage.color }}
              aria-labelledby={`stage-${stage.key}`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: stage.color }}
                  />
                  <span id={`stage-${stage.key}`} className="text-xs font-semibold text-navy">{stage.label}</span>
                </div>
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${stage.bg} ${stage.text}`}
                >
                  {stage.people.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2 min-h-[80px]">
                {stage.people.length === 0 ? (
                  <div className="h-16 border-2 border-dashed border-muted rounded-lg flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Vazio</span>
                  </div>
                ) : (
                  stage.people.map((person) => (
                    <div key={person.id} className="kanban-card group">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-cream-dark flex items-center justify-center text-xs font-bold text-navy flex-shrink-0">
                          {person.photoUrl ? (
                            <img
                              src={person.photoUrl}
                              alt={person.fullName}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            person.fullName.charAt(0)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-navy truncate">
                            {person.fullName}
                          </p>
                          {person.phone && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {person.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Advance button */}
                      <div className="mt-2 flex gap-2">
                        {stage.key !== "nova_alma" && (
                          <button onClick={() => handleMoveBackward(person.id, stage.key)} className="flex flex-1 items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-navy" aria-label={`Retornar ${person.fullName} para a etapa anterior`}>
                            <ChevronLeft className="h-3 w-3" /> Retornar
                          </button>
                        )}
                        {stage.key !== "multiplicador" && (
                          <button onClick={() => handleMoveForward(person.id, stage.key)} className="flex flex-1 items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-navy" aria-label={`Avançar ${person.fullName} para a próxima etapa`}>
                            Avançar <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {!isLoading && selectedStage && (
        <section className="hidden rounded-2xl border border-border bg-card p-5 md:block" aria-labelledby={`desktop-stage-${selectedStage.key}`}>
          <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedStage.color }} />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Etapa selecionada</p>
                <h2 id={`desktop-stage-${selectedStage.key}`} className="font-display text-xl font-bold text-navy">{selectedStage.label}</h2>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${selectedStage.bg} ${selectedStage.text}`}>{selectedStage.people.length} {selectedStage.people.length === 1 ? "pessoa" : "pessoas"}</span>
          </div>

          {selectedStage.people.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center rounded-xl border-2 border-dashed border-muted text-sm text-muted-foreground">Nenhuma pessoa nesta etapa.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {selectedStage.people.map((person) => (
                <div key={person.id} className="kanban-card group">
                  <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-dark text-xs font-bold text-navy">
                      {person.photoUrl ? <img src={person.photoUrl} alt={person.fullName} className="h-8 w-8 rounded-full object-cover" /> : person.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-navy">{person.fullName}</p>{person.phone && <p className="truncate text-[10px] text-muted-foreground">{person.phone}</p>}</div>
                  </div>
                  <div className="mt-2 flex gap-2 border-t border-border pt-2">
                    {selectedStage.key !== "nova_alma" && (
                      <button onClick={() => handleMoveBackward(person.id, selectedStage.key)} className="flex flex-1 items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-navy" aria-label={`Retornar ${person.fullName} para a etapa anterior`}>
                        <ChevronLeft className="h-3 w-3" /> Retornar
                      </button>
                    )}
                    {selectedStage.key !== "multiplicador" && (
                      <button onClick={() => handleMoveForward(person.id, selectedStage.key)} className="flex flex-1 items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-navy" aria-label={`Avançar ${person.fullName} para a próxima etapa`}>
                        Avançar <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
