import { useState } from "react";
import { History, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Candidate = { personId: number; name: string };
type Referral = { id: number; assignedToPersonId?: number | null; assignedToName?: string | null };

type Props = {
  churchId: number;
  referral: Referral;
  candidates: Candidate[];
  canAssign: boolean;
  onSaved: () => Promise<unknown>;
};

export function ConsolidationAssignmentControl({ churchId, referral, candidates, canAssign, onSaved }: Props) {
  const [assignee, setAssignee] = useState(referral.assignedToPersonId ? String(referral.assignedToPersonId) : "queue");
  const [note, setNote] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const history = trpc.consolidation.assignmentHistory.useQuery({ churchId, referralId: referral.id }, { enabled: showHistory });
  const assign = trpc.consolidation.assignReferral.useMutation({
    onSuccess: async () => { toast.success(assignee === "queue" ? "Caso devolvido à fila." : "Responsável do caso atualizado."); setNote(""); await onSaved(); },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar a atribuição."),
  });

  if (!canAssign) return referral.assignedToName ? <p className="text-center text-[11px] text-muted-foreground">Atribuído a {referral.assignedToName}</p> : null;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-navy"><UserRoundCog className="h-4 w-4 text-gold-dark" />Atribuição do caso</div>
      <Select value={assignee} onValueChange={setAssignee}>
        <SelectTrigger className="mt-2 bg-background"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="queue">Fila sem responsável</SelectItem>{candidates.map((candidate) => <SelectItem key={candidate.personId} value={String(candidate.personId)}>{candidate.name}</SelectItem>)}</SelectContent>
      </Select>
      <Input className="mt-2 bg-background" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Observação da atribuição (opcional)" />
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setShowHistory((value) => !value)}><History className="mr-1 h-3.5 w-3.5" />Histórico</Button>
        <Button type="button" size="sm" disabled={assign.isPending} onClick={() => assign.mutate({ churchId, id: referral.id, consolidatorId: assignee === "queue" ? null : Number(assignee), notes: note.trim() || undefined })}>{assign.isPending ? "Salvando…" : "Atualizar"}</Button>
      </div>
      {showHistory && <div className="mt-3 border-t border-border pt-3">{history.isLoading ? <p className="text-xs text-muted-foreground">Carregando histórico…</p> : (history.data ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma reatribuição registrada.</p> : <div className="space-y-2">{(history.data ?? []).map((event) => <div key={event.id} className="rounded-md bg-background px-2.5 py-2 text-xs"><p className="font-medium text-navy">{event.toName ?? "Fila sem responsável"}</p><p className="mt-0.5 text-muted-foreground">{new Date(event.createdAt).toLocaleString("pt-BR")}{event.notes ? ` · ${event.notes}` : ""}</p></div>)}</div>}</div>}
    </div>
  );
}
