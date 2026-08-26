import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ReferralCandidate = { id: number; fullName: string };

type Props = {
  churchId: number;
  candidates: ReferralCandidate[];
  sourceLabel: string;
};

export function ConsolidationReferralBox({ churchId, candidates, sourceLabel }: Props) {
  const utils = trpc.useUtils();
  const [personId, setPersonId] = useState("");
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState<"normal" | "alta" | "urgente">("normal");
  const createReferral = trpc.consolidation.createReferral.useMutation({
    onSuccess: async () => {
      toast.success("Indicação enviada para a fila de Consolidação.");
      setPersonId("");
      setReason("");
      setPriority("normal");
      await utils.consolidation.referrals.invalidate({ churchId });
    },
    onError: (error) => toast.error(error.message || "Não foi possível enviar a indicação."),
  });

  if (candidates.length === 0) return null;

  const submit = () => {
    if (!personId) return toast.error("Selecione a Pessoa que precisa de Consolidação.");
    if (reason.trim().length < 3) return toast.error("Informe o motivo da indicação.");
    createReferral.mutate({ churchId, personId: Number(personId), reason: reason.trim(), priority });
  };

  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
      <div className="flex items-start gap-2">
        <Send className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
        <div>
          <p className="text-sm font-semibold text-navy">Indicar para Consolidação</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Escolha uma Pessoa de {sourceLabel}. O motivo, a origem e quem indicou ficarão registrados no caso.</p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_10rem]">
        <div>
          <Label>Pessoa *</Label>
          <Select value={personId} onValueChange={setPersonId}>
            <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Selecione uma Pessoa" /></SelectTrigger>
            <SelectContent>{candidates.map((candidate) => <SelectItem key={candidate.id} value={String(candidate.id)}>{candidate.fullName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Prioridade</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
            <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3">
        <Label>Motivo *</Label>
        <Textarea className="mt-1 bg-background" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Descreva objetivamente por que esta Pessoa precisa de cuidado." />
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="button" className="bg-rose-700 text-white hover:bg-rose-800" disabled={createReferral.isPending || !personId || reason.trim().length < 3} onClick={submit}>
          <Send className="mr-2 h-4 w-4" />{createReferral.isPending ? "Enviando…" : "Enviar indicação"}
        </Button>
      </div>
    </section>
  );
}
