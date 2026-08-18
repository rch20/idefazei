import { useChurch } from "@/components/ChurchLayout";
import { trpc } from "@/lib/trpc";
import { ChevronRight, User } from "lucide-react";
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

  const { data: people, isLoading, refetch } = trpc.people.list.useQuery({ churchId });
  const updatePerson = trpc.people.update.useMutation({
    onSuccess: () => refetch(),
  });

  const grouped = STAGES.map((stage) => ({
    ...stage,
    people: (people ?? []).filter((p) => p.discipleshipStage === stage.key),
  }));

  function handleMoveForward(personId: number, currentStage: StageKey) {
    const idx = STAGES.findIndex((s) => s.key === currentStage);
    if (idx < STAGES.length - 1) {
      const nextStage = STAGES[idx + 1].key;
      updatePerson.mutate({ id: personId, churchId, discipleshipStage: nextStage });
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
      <div className="hidden items-center gap-1 overflow-x-auto pb-2 text-xs md:flex">
        {STAGES.map((stage, i) => (
          <div key={stage.key} className="flex items-center gap-1 flex-shrink-0">
            <span className={`px-2 py-1 rounded-full border font-medium ${stage.bg} ${stage.border} ${stage.text}`}>
              {stage.label}
            </span>
            {i < STAGES.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground md:hidden">Acompanhe cada etapa em sequência. Toque em uma Pessoa para visualizar seus dados e avance somente quando o próximo passo estiver concluído.</p>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:flex md:gap-4 md:overflow-x-auto md:pb-4">
          {STAGES.map((s) => (
            <div key={s.key} className="kanban-column min-h-0 border-l-2 border-muted pl-3 md:flex-shrink-0 md:border-l-0 md:pl-0">
              <div className="h-6 w-24 bg-muted rounded animate-pulse mb-3" />
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:flex md:gap-4 md:overflow-x-auto md:pb-4">
          {grouped.map((stage) => (
            <section
              key={stage.key}
              className="kanban-column min-h-0 w-full border-l-2 pl-3 md:w-52 md:flex-shrink-0 md:border-l-0 md:pl-0"
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
                      {stage.key !== "multiplicador" && (
                        <button
                          onClick={() => handleMoveForward(person.id, stage.key)}
                          className="mt-2 flex w-full items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground transition-opacity hover:text-navy md:opacity-0 md:group-hover:opacity-100"
                        >
                          Avançar etapa <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
