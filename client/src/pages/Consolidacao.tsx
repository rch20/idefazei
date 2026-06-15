import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Circle, Heart, Phone, MessageSquare, Home, BookOpen, Users, HandHeart, Church } from "lucide-react";
import { ReportButton } from "@/components/ReportButton";
import { toast } from "sonner";

const CHECKLIST_ITEMS = [
  { key: "callMade", label: "Ligação realizada", icon: Phone },
  { key: "messageSent", label: "Mensagem enviada", icon: MessageSquare },
  { key: "visitMade", label: "Visita realizada", icon: Home },
  { key: "bibleDelivered", label: "Bíblia entregue", icon: BookOpen },
  { key: "whatsappGroupAdded", label: "Incluído no grupo WhatsApp", icon: Users },
  { key: "prayerMade", label: "Oração realizada", icon: HandHeart },
  { key: "addedToCell", label: "Inserido em célula", icon: Church },
] as const;

type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]["key"];

export default function Consolidacao() {
  const { churchId } = useChurch();
  const utils = trpc.useUtils();
  const { data: consolidations, isLoading, refetch } = trpc.consolidation.list.useQuery({ churchId });
  const { data: souls } = trpc.souls.list.useQuery({ churchId });

  const updateChecklist = trpc.consolidation.updateChecklist.useMutation({
    onSuccess: () => refetch(),
    onError: () => toast.error("Erro ao atualizar checklist"),
  });

  const soulsMap = new Map((souls ?? []).map((s) => [s.id, s]));

  function toggleItem(consolidationId: number, key: ChecklistKey, current: boolean) {
    updateChecklist.mutate({
      id: consolidationId,
      churchId,
      [key]: !current,
    });
  }

  function getProgress(c: NonNullable<typeof consolidations>[0]) {
    const items = CHECKLIST_ITEMS.map((i) => (c as any)[i.key] as boolean);
    const done = items.filter(Boolean).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Consolidação</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe o processo de consolidação das novas almas
          </p>
        </div>
        <ReportButton
          label="Exportar Relatório"
          onFetch={() => utils.reports.consolidation.fetch({ churchId })}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (consolidations ?? []).length === 0 ? (
        <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center">
            <Heart className="w-7 h-7 text-rose-500" />
          </div>
          <p className="font-semibold text-navy">Nenhuma consolidação em andamento</p>
          <p className="text-sm text-muted-foreground">
            Atribua consolidadores às novas almas para começar
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-stagger">
          {(consolidations ?? []).map((c) => {
            const soul = soulsMap.get(c.soulId);
            const { done, total, pct } = getProgress(c);
            const isComplete = c.status === "consolidado";

            return (
              <div key={c.id} className={`card-sacred p-5 ${isComplete ? "opacity-75" : ""}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy">{soul?.name ?? "Alma"}</p>
                      <p className="text-xs text-muted-foreground">
                        {soul?.phone ?? "Sem telefone"} · {soul?.origin}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        isComplete
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {isComplete ? "Consolidado" : "Em Consolidação"}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-semibold text-navy">
                      {done}/{total} etapas
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: pct === 100 ? "#22c55e" : "#c9a84c",
                      }}
                    />
                  </div>
                </div>

                {/* Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CHECKLIST_ITEMS.map((item) => {
                    const checked = (c as any)[item.key] as boolean;
                    return (
                      <button
                        key={item.key}
                        onClick={() => !isComplete && toggleItem(c.id, item.key, checked)}
                        disabled={isComplete}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                          checked
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-cream-dark border-border text-muted-foreground hover:border-gold/40"
                        } ${isComplete ? "cursor-default" : "cursor-pointer"}`}
                      >
                        {checked ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 flex-shrink-0" />
                        )}
                        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Mark complete */}
                {!isComplete && done === total && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button
                      onClick={() =>
                        updateChecklist.mutate({
                          id: c.id,
                          churchId,
                          status: "consolidado",
                        })
                      }
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      Marcar como Consolidado ✓
                    </Button>
                  </div>
                )}

                {/* Notes */}
                {c.notes && (
                  <p className="mt-3 text-xs text-muted-foreground bg-muted rounded-lg p-2">
                    {c.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
