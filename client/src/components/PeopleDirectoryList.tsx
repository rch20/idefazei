import { ArrowRight, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PeopleDirectoryEntry = {
  person: {
    id: number;
    fullName: string;
    photoUrl?: string | null;
    discipleshipStage?: string | null;
  };
  care: {
    status: string;
    priority?: string | null;
    pastoralCoverage?: {
      coveringPastorName: string;
      coveringChurchName: string;
    } | null;
    responsibleName?: string | null;
  };
  cell?: { name?: string | null } | null;
};

type PeopleDirectoryListProps = {
  isLoading: boolean;
  filteredDirectory: PeopleDirectoryEntry[];
  search: string;
  directoryFilter: string;
  stageBadge: Record<string, string>;
  careLabels: Record<string, string>;
  getFormationStageLabel: (stage: string | null | undefined) => string;
  onClearSearch: () => void;
  onClearFilter: () => void;
  onCreatePerson: () => void;
  onOpenPerson: (person: PeopleDirectoryEntry["person"]) => void;
};

export function PeopleDirectoryList({
  isLoading,
  filteredDirectory,
  search,
  directoryFilter,
  stageBadge,
  careLabels,
  getFormationStageLabel,
  onClearSearch,
  onClearFilter,
  onCreatePerson,
  onOpenPerson,
}: PeopleDirectoryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-label="Carregando lista de Pessoas">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (filteredDirectory.length === 0) {
    return (
      <div className="card-sacred flex flex-col items-center gap-3 p-10 text-center sm:p-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy/10">
          <Users className="h-7 w-7 text-navy" />
        </div>
        <p className="font-semibold text-navy">
          {search
            ? "Nenhuma Pessoa encontrada"
            : directoryFilter !== "todas"
              ? "Nenhuma Pessoa neste filtro"
              : "Nenhuma Pessoa cadastrada"}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {search || directoryFilter !== "todas"
            ? "Ajuste a busca ou limpe o filtro para consultar outras Pessoas."
            : "Comece pela recepção: cadastre a primeira Pessoa da sua igreja."}
        </p>
        {search ? (
          <Button type="button" variant="outline" onClick={onClearSearch}>
            Limpar busca
          </Button>
        ) : directoryFilter !== "todas" ? (
          <Button type="button" variant="outline" onClick={onClearFilter}>
            Limpar filtro
          </Button>
        ) : (
          <Button type="button" className="bg-navy text-white hover:bg-navy-light" onClick={onCreatePerson}>
            <Plus className="mr-2 h-4 w-4" />
            Cadastrar primeira Pessoa
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-stagger">
      {filteredDirectory.map(({ person, care, cell }) => (
        <button
          key={person.id}
          type="button"
          onClick={() => onOpenPerson(person)}
          data-person-directory-card="true"
          className="card-sacred flex min-h-[72px] w-full items-start gap-3 p-3 text-left transition-colors hover:border-gold/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 sm:items-center sm:gap-4 sm:p-4"
          aria-label={`Abrir ficha de ${person.fullName}`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-dark">
            {person.photoUrl ? (
              <img src={person.photoUrl} alt={person.fullName} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-navy">{person.fullName.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-navy">{person.fullName}</p>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${stageBadge[person.discipleshipStage ?? "nova_alma"]}`}>
                {getFormationStageLabel(person.discipleshipStage)}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <span className="min-w-0 truncate">Célula: {cell?.name ?? "Sem Célula"}</span>
              <span className={`rounded-full border px-2 py-0.5 ${care.priority === "alta" ? "border-rose-200 bg-rose-50 text-rose-700" : care.priority === "media" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {careLabels[care.status]}
              </span>
              {care.pastoralCoverage && (
                <span className="hidden truncate sm:inline" title={`${care.pastoralCoverage.coveringPastorName} · ${care.pastoralCoverage.coveringChurchName}`}>
                  Cobertura: {care.pastoralCoverage.coveringPastorName}
                </span>
              )}
              {care.responsibleName && <span className="hidden truncate sm:inline">Responsável: {care.responsibleName}</span>}
            </div>
          </div>
          <span className="hidden shrink-0 text-xs font-semibold text-navy sm:inline">Abrir ficha</span>
          <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground sm:mt-0" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
