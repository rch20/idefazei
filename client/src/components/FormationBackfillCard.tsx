import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

type BackfillResult = { batismo: number; encontro: number; fundamentos: number; jaRegistradas: number };

function summarize(result: BackfillResult) {
  return `${result.batismo} de Batismo, ${result.encontro} de Encontro com Deus e ${result.fundamentos} de Fundamentos`;
}

/** Preenche o prontuário de quem já concluiu antes da automação: primeiro mostra a prévia, depois grava. */
export default function FormationBackfillCard({ churchId }: { churchId: number }) {
  const [preview, setPreview] = useState<BackfillResult | null>(null);
  const [applied, setApplied] = useState<BackfillResult | null>(null);
  const run = trpc.people.backfillFormation.useMutation({
    onError: (error) => toast.error(error.message || "Não foi possível atualizar os prontuários."),
  });
  const total = preview ? preview.batismo + preview.encontro + preview.fundamentos : 0;

  return (
    <Card className="mb-5 border-border">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-navy">Prontuários dos discípulos</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Preenche as etapas de Batismo, Encontro com Deus e Fundamentos de quem já concluiu antes do preenchimento automático existir. Primeiro você vê a prévia; nada é gravado até confirmar. Cada registro pode ser desfeito individualmente na ficha da pessoa. Etapas já registradas nunca são alteradas.
          </p>
          {preview && !applied && (
            <p role="status" className="mt-2 text-xs font-medium text-navy">
              {total === 0 ? "Nada a preencher: todos os prontuários já estão em dia." : `Prévia: serão preenchidas ${summarize(preview)}. Já estavam registradas: ${preview.jaRegistradas}.`}
            </p>
          )}
          {applied && (
            <p role="status" className="mt-2 text-xs font-medium text-emerald-700">
              Preenchidas agora: {summarize(applied)}. Já estavam registradas: {applied.jaRegistradas}.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {preview && total > 0 && !applied && (
            <Button
              type="button"
              disabled={run.isPending}
              onClick={() => run.mutate({ churchId }, { onSuccess: (data) => { setApplied(data); toast.success("Prontuários atualizados."); } })}
            >
              {run.isPending ? "Gravando…" : "Confirmar preenchimento"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={run.isPending}
            onClick={() => { setApplied(null); run.mutate({ churchId, dryRun: true }, { onSuccess: (data) => setPreview(data) }); }}
          >
            {run.isPending && !preview ? "Calculando…" : preview ? "Ver prévia de novo" : "Ver prévia"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
