import { useState } from "react";
import { CalendarClock, UserRoundCog, XCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Visitor = { personId: number; name: string };
type Visit = { id: number; assignedToPersonId: number | null; scheduledAt: Date | string | null; status: string };

type Props = { churchId: number; visit: Visit; visitors: Visitor[]; onSaved: () => Promise<unknown> };

function toLocal(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function VisitAssignmentControl({ churchId, visit, visitors, onSaved }: Props) {
  const [assignee, setAssignee] = useState(visit.assignedToPersonId ? String(visit.assignedToPersonId) : "queue");
  const [scheduledAt, setScheduledAt] = useState(toLocal(visit.scheduledAt));
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const assign = trpc.consolidation.assignVisit.useMutation({ onSuccess: async () => { toast.success("Visita atualizada."); await onSaved(); }, onError: (error) => toast.error(error.message || "Não foi possível atualizar a Visita.") });
  const cancel = trpc.consolidation.cancelVisit.useMutation({ onSuccess: async () => { toast.success("Visita cancelada e preservada no histórico."); setCancelling(false); setCancelReason(""); await onSaved(); }, onError: (error) => toast.error(error.message || "Não foi possível cancelar a Visita.") });

  if (["realizada", "cancelada"].includes(visit.status)) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-navy"><UserRoundCog className="h-4 w-4 text-gold-dark" />Gestão da Visita</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Select value={assignee} onValueChange={setAssignee}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="queue">Fila sem Visitador</SelectItem>{visitors.map((visitor) => <SelectItem key={visitor.personId} value={String(visitor.personId)}>{visitor.name}</SelectItem>)}</SelectContent></Select>
        <div className="relative"><CalendarClock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="bg-background pl-9" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></div>
      </div>
      {!cancelling ? <div className="mt-2 flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" className="text-rose-700" onClick={() => setCancelling(true)}><XCircle className="mr-1 h-4 w-4" />Cancelar Visita</Button><Button type="button" size="sm" disabled={assign.isPending} onClick={() => assign.mutate({ churchId, visitId: visit.id, visitorId: assignee === "queue" ? null : Number(assignee), scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined })}>{assign.isPending ? "Salvando…" : "Salvar atribuição"}</Button></div> : <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5"><Input className="bg-background" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Motivo do cancelamento" /><div className="mt-2 flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setCancelling(false)}>Voltar</Button><Button type="button" size="sm" variant="destructive" disabled={cancel.isPending || cancelReason.trim().length < 3} onClick={() => cancel.mutate({ churchId, visitId: visit.id, reason: cancelReason.trim() })}>{cancel.isPending ? "Cancelando…" : "Confirmar cancelamento"}</Button></div></div>}
    </div>
  );
}
