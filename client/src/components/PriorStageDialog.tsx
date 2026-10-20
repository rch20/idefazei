import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

export type PriorStageKey = "consolidacao" | "fundamentos" | "batismo" | "encontro_com_deus" | "escola_de_lideres" | "lideranca" | "multiplicador";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchId: number;
  personId: number;
  stage: PriorStageKey | null;
  stageLabel: string;
  onSaved: () => void | Promise<void>;
};

/** Lançamento manual de uma etapa concluída em outra igreja. */
export default function PriorStageDialog({ open, onOpenChange, churchId, personId, stage, stageLabel, onSaved }: Props) {
  const [originChurch, setOriginChurch] = useState("");
  const [completedOn, setCompletedOn] = useState("");
  const [notes, setNotes] = useState("");
  const record = trpc.people.recordPriorStage.useMutation({
    onSuccess: async () => {
      toast.success("Etapa registrada como vinda de outra igreja.");
      setOriginChurch("");
      setCompletedOn("");
      setNotes("");
      onOpenChange(false);
      await onSaved();
    },
    onError: (error) => toast.error(error.message || "Não foi possível registrar a etapa."),
  });
  const today = new Date().toISOString().slice(0, 10);
  const canSave = Boolean(stage && originChurch.trim().length >= 2 && !record.isPending);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Veio de outra igreja: {stageLabel}</DialogTitle>
          <DialogDescription>
            Use quando a pessoa já concluiu esta etapa antes de chegar aqui. Fica registrado como lançamento manual, com a igreja de origem.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="prior-stage-church">Igreja de origem *</Label>
            <Input id="prior-stage-church" value={originChurch} maxLength={80} onChange={(event) => setOriginChurch(event.target.value)} className="mt-1" placeholder="Nome da igreja" />
          </div>
          <div>
            <Label htmlFor="prior-stage-date">Data aproximada</Label>
            <Input id="prior-stage-date" type="date" max={today} value={completedOn} onChange={(event) => setCompletedOn(event.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="prior-stage-notes">Observação</Label>
            <Textarea id="prior-stage-notes" value={notes} maxLength={500} rows={2} onChange={(event) => setNotes(event.target.value)} className="mt-1" placeholder="Ex.: batizado por imersão, apresentou certificado." />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => stage && record.mutate({ churchId, id: personId, stage, originChurch: originChurch.trim(), completedOn: completedOn || undefined, notes: notes.trim() || undefined })}
          >
            Registrar etapa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
