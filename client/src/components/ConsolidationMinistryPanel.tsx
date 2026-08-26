import { useEffect, useState } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PersonOption = { id: number; fullName: string };
type DepartmentModel = { id: number; name: string; systemKey: string | null; leaderId: number | null; leaderName: string | null; supervisorId: number | null; supervisorName: string | null; memberCount: number };

type LeadershipCardProps = {
  churchId: number;
  department: DepartmentModel;
  candidates: PersonOption[];
  canConfigure: boolean;
  onSaved: () => Promise<unknown>;
};

function LeadershipCard({ churchId, department, candidates, canConfigure, onSaved }: LeadershipCardProps) {
  const [leaderId, setLeaderId] = useState(department.leaderId ? String(department.leaderId) : "none");
  const [supervisorId, setSupervisorId] = useState(department.supervisorId ? String(department.supervisorId) : "none");
  useEffect(() => {
    setLeaderId(department.leaderId ? String(department.leaderId) : "none");
    setSupervisorId(department.supervisorId ? String(department.supervisorId) : "none");
  }, [department.id, department.leaderId, department.supervisorId]);

  const setLeadership = trpc.consolidation.setDepartmentLeadership.useMutation({
    onSuccess: async () => { toast.success(`Liderança de ${department.name} atualizada.`); await onSaved(); },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar a liderança."),
  });

  return (
    <article className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-semibold text-navy">{department.name}</p><p className="mt-1 text-xs text-muted-foreground">Equipe operacional do Ministério</p></div>
        <Badge variant="outline"><Users className="mr-1 h-3 w-3" />{department.memberCount}</Badge>
      </div>
      {canConfigure ? <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div><Label>Líder</Label><Select value={leaderId} onValueChange={setLeaderId}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem líder definido</SelectItem>{candidates.map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Supervisor</Label><Select value={supervisorId} onValueChange={setSupervisorId}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem supervisor definido</SelectItem>{candidates.map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent></Select></div>
        <Button type="button" className="sm:col-span-2" variant="outline" disabled={setLeadership.isPending} onClick={() => setLeadership.mutate({ churchId, departmentId: department.id, leaderId: leaderId === "none" ? null : Number(leaderId), supervisorId: supervisorId === "none" ? null : Number(supervisorId) })}>{setLeadership.isPending ? "Salvando…" : "Salvar liderança"}</Button>
      </div> : <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Líder:</span> <strong className="text-navy">{department.leaderName ?? "Não definido"}</strong></p><p><span className="text-muted-foreground">Supervisor:</span> <strong className="text-navy">{department.supervisorName ?? "Não definido"}</strong></p></div>}
    </article>
  );
}

export function ConsolidationMinistryPanel({ churchId }: { churchId: number }) {
  const structure = trpc.consolidation.structure.useQuery({ churchId });

  if (structure.isLoading) return <section className="h-32 animate-pulse rounded-2xl bg-muted" />;
  if (!structure.data?.ministry) return null;
  const canConfigure = structure.data.capabilities.canConfigure;
  const candidates = structure.data.people ?? [];
  const departments = structure.data.departments ?? [];

  return (
    <section className="rounded-2xl border border-gold/25 bg-gold/[0.04] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15"><ShieldCheck className="h-5 w-5 text-gold-dark" /></div><div><h2 className="font-display text-lg font-semibold text-navy">{structure.data.ministry.name}</h2><p className="mt-1 text-xs text-muted-foreground">Pastores definem Líder e Supervisor; cada responsável gerencia somente seu Departamento.</p></div></div>
        <Badge variant="outline" className="w-fit border-gold/30 bg-background text-navy">Estrutura ministerial</Badge>
      </div>
      {canConfigure && candidates.length === 0 && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Cadastre as Pessoas e vincule suas contas antes de definir a liderança.</p>}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {departments.map((department) => <LeadershipCard key={department.id} churchId={churchId} department={department} candidates={candidates} canConfigure={canConfigure} onSaved={async () => { await structure.refetch(); }} />)}
      </div>
    </section>
  );
}
