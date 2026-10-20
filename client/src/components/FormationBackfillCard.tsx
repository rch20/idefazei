import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

type BackfillResult = { batismo: number; encontro: number; fundamentos: number; jaRegistradas: number };

/** Preenche o prontuário de quem já concluiu batismo, Encontro ou Fundamentos antes da automação. */
export default function FormationBackfillCard({ churchId }: { churchId: number }) {
  const [result, setResult] = useState<BackfillResult | null>(null);
  const backfill = trpc.people.backfillFormation.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("Prontuários atualizados.");
    },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar os prontuários."),
  });

  return (
    <Card className="mb-5 border-border">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-navy">Prontuários dos discípulos</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Preenche as etapas de Batismo, Encontro com Deus e Fundamentos de quem já concluiu antes do preenchimento automático existir. Etapas já registradas nunca são alteradas, então pode repetir sem risco.
          </p>
          {result && (
            <p role="status" className="mt-2 text-xs font-medium text-emerald-700">
              Preenchidas agora: {result.batismo} de Batismo, {result.encontro} de Encontro, {result.fundamentos} de Fundamentos. Já estavam registradas: {result.jaRegistradas}.
            </p>
          )}
        </div>
        <Button type="button" variant="outline" className="shrink-0" disabled={backfill.isPending} onClick={() => backfill.mutate({ churchId })}>
          {backfill.isPending ? "Atualizando…" : "Atualizar prontuários"}
        </Button>
      </CardContent>
    </Card>
  );
}
