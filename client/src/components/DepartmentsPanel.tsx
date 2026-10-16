import { useMemo, useState } from "react";
import { ArrowLeft, Building2, Plus, ShieldCheck, Trash2, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { ConsolidationReferralBox } from "@/components/ConsolidationReferralBox";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PersonOption = { id: number; fullName: string };
type MinistryOption = { id: number; name: string };

type Props = {
  churchId: number;
  ministry: MinistryOption;
  canCreateDepartment: boolean;
  canAssignLeader: boolean;
  people: PersonOption[];
};

const emptyForm = { name: "", description: "", leaderId: "" };
const roleLabel = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const roleKeyFromName = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export function DepartmentsPanel({ churchId, ministry, canCreateDepartment, canAssignLeader, people }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [selectedRolePersonId, setSelectedRolePersonId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const departments = trpc.departments.list.useQuery({ churchId, ministryId: ministry.id });
  const selectedDepartment = useMemo(
    () => (departments.data ?? []).find((department) => department.id === selectedDepartmentId) ?? null,
    [departments.data, selectedDepartmentId]
  );
  const members = trpc.departments.members.useQuery(
    { churchId, departmentId: selectedDepartmentId ?? 0 },
    { enabled: Boolean(selectedDepartmentId) }
  );
  const candidates = trpc.departments.candidates.useQuery(
    { churchId, departmentId: selectedDepartmentId ?? 0 },
    { enabled: Boolean(selectedDepartmentId && selectedDepartment?.canManage) }
  );
  const roles = trpc.departments.roles.useQuery(
    { churchId, departmentId: selectedDepartmentId ?? 0 },
    { enabled: Boolean(selectedDepartmentId) }
  );

  const refreshDepartment = async (departmentId?: number) => {
    const refreshed = await departments.refetch();
    if (departmentId && !refreshed.data?.some((department) => department.id === departmentId)) setSelectedDepartmentId(null);
  };

  const createDepartment = trpc.departments.create.useMutation({
    onSuccess: async (created) => {
      toast.success("Departamento criado com sucesso.");
      setForm(emptyForm);
      setShowCreate(false);
      await refreshDepartment();
      if (created?.id) setSelectedDepartmentId(created.id);
    },
    onError: (error) => toast.error(error.message),
  });
  const updateDepartment = trpc.departments.update.useMutation({
    onSuccess: async () => { toast.success("Departamento atualizado."); await refreshDepartment(selectedDepartmentId ?? undefined); },
    onError: (error) => toast.error(error.message),
  });
  const updateLeader = trpc.departments.updateLeader.useMutation({
    onSuccess: async () => { toast.success("Liderança departamental atualizada."); await Promise.all([refreshDepartment(), members.refetch()]); },
    onError: (error) => toast.error(error.message),
  });
  const addMember = trpc.departments.addMember.useMutation({
    onSuccess: async () => { toast.success("Participante adicionado ao Departamento."); setSelectedCandidateId(""); await Promise.all([members.refetch(), candidates.refetch(), refreshDepartment()]); },
    onError: (error) => toast.error(error.message),
  });
  const removeMember = trpc.departments.removeMember.useMutation({
    onSuccess: async () => { toast.success("Participante removido do Departamento."); await Promise.all([members.refetch(), candidates.refetch(), roles.refetch(), refreshDepartment()]); },
    onError: (error) => toast.error(error.message),
  });
  const assignRole = trpc.departments.assignRole.useMutation({
    onSuccess: async () => { toast.success("Função departamental atribuída."); setRoleName(""); setSelectedRolePersonId(""); await roles.refetch(); },
    onError: (error) => toast.error(error.message),
  });
  const endRole = trpc.departments.endRole.useMutation({
    onSuccess: async () => { toast.success("Função departamental encerrada."); await roles.refetch(); },
    onError: (error) => toast.error(error.message),
  });
  const deactivate = trpc.departments.deactivate.useMutation({
    onSuccess: async () => { toast.success("Departamento desativado. O histórico foi preservado."); setSelectedDepartmentId(null); await refreshDepartment(); },
    onError: (error) => toast.error(error.message),
  });

  const submitCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error("Informe o nome do Departamento.");
    createDepartment.mutate({ churchId, ministryId: ministry.id, name: form.name.trim(), description: form.description.trim() || undefined, leaderId: form.leaderId ? Number(form.leaderId) : null });
  };

  const assignNewRole = () => {
    if (!selectedDepartment || !selectedRolePersonId || !roleName.trim()) return toast.error("Selecione a Pessoa e informe a função.");
    const roleKey = roleKeyFromName(roleName);
    if (roleKey.length < 2) return toast.error("Informe uma função válida.");
    assignRole.mutate({ churchId, departmentId: selectedDepartment.id, personId: Number(selectedRolePersonId), roleKey });
  };

  if (selectedDepartment) {
    const memberNameById = new Map((members.data ?? []).map((item) => [item.person.id, item.person.fullName]));
    return (
      <section className="space-y-4 rounded-xl border border-border bg-background p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedDepartmentId(null); setConfirmDeactivate(false); }} className="w-fit gap-2"><ArrowLeft className="h-4 w-4" />Departamentos</Button>
          <Badge variant="outline">ID {selectedDepartment.id}</Badge>
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-navy">{selectedDepartment.name}</h3>
          <p className="text-xs text-muted-foreground">Departamento de {ministry.name}</p>
        </div>

        {selectedDepartment.canManage && <div className="grid gap-3 rounded-xl border border-gold/20 bg-gold/5 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input defaultValue={selectedDepartment.name} aria-label="Nome do Departamento" id={`department-name-${selectedDepartment.id}`} />
            <Input defaultValue={selectedDepartment.description ?? ""} aria-label="Descrição do Departamento" id={`department-description-${selectedDepartment.id}`} />
            <Button type="button" variant="outline" disabled={updateDepartment.isPending} onClick={() => {
              const name = (document.getElementById(`department-name-${selectedDepartment.id}`) as HTMLInputElement | null)?.value.trim() ?? "";
              const description = (document.getElementById(`department-description-${selectedDepartment.id}`) as HTMLInputElement | null)?.value.trim() ?? "";
              if (!name) return toast.error("Informe o nome do Departamento.");
              updateDepartment.mutate({ churchId, departmentId: selectedDepartment.id, name, description: description || undefined });
            }}>{updateDepartment.isPending ? "Salvando…" : "Salvar"}</Button>
          </div>
        </div>}

        {selectedDepartment.canAssignLeader && <div className="rounded-xl border border-border p-3">
          <Label>Líder do Departamento</Label>
          <Select value={selectedDepartment.leaderId ? String(selectedDepartment.leaderId) : "none"} onValueChange={(leaderId) => updateLeader.mutate({ churchId, departmentId: selectedDepartment.id, leaderId: leaderId === "none" ? null : Number(leaderId) })}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">Sem líder definido</SelectItem>{people.map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
          </Select>
        </div>}

        {selectedDepartment.canManage && <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
            <SelectTrigger><SelectValue placeholder="Participante do Ministério" /></SelectTrigger>
            <SelectContent>{(candidates.data ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="button" disabled={!selectedCandidateId || addMember.isPending} onClick={() => addMember.mutate({ churchId, departmentId: selectedDepartment.id, personId: Number(selectedCandidateId) })}>{addMember.isPending ? "Adicionando…" : "Adicionar"}</Button>
        </div>}

        <div className="rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3"><span className="text-sm font-semibold text-navy">Participantes ({members.data?.length ?? 0})</span><Users className="h-4 w-4 text-muted-foreground" /></div>
          {members.isLoading ? <p className="p-4 text-sm text-muted-foreground">Carregando…</p> : (members.data ?? []).length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nenhum participante ativo.</p> : <div className="divide-y divide-border">{(members.data ?? []).map((item) => <div key={item.membership.id} className="flex items-center justify-between gap-3 px-4 py-3"><div><p className="text-sm font-medium text-navy">{item.person.fullName}</p>{selectedDepartment.leaderId === item.person.id && <Badge className="mt-1" variant="secondary">Líder</Badge>}</div>{selectedDepartment.canManage && selectedDepartment.leaderId !== item.person.id && <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${item.person.fullName}`} onClick={() => removeMember.mutate({ churchId, departmentId: selectedDepartment.id, personId: item.person.id })}><UserMinus className="h-4 w-4 text-rose-600" /></Button>}</div>)}</div>}
        </div>

        {selectedDepartment.canManage && <ConsolidationReferralBox churchId={churchId} candidates={(members.data ?? []).map((item) => ({ id: item.person.id, fullName: item.person.fullName }))} sourceLabel={`Departamento ${selectedDepartment.name}`} />}

        {selectedDepartment.canManage && <div className="space-y-3 rounded-xl border border-border p-3">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold-dark" /><p className="text-sm font-semibold text-navy">Funções no Departamento</p></div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Select value={selectedRolePersonId} onValueChange={setSelectedRolePersonId}><SelectTrigger><SelectValue placeholder="Pessoa" /></SelectTrigger><SelectContent>{(members.data ?? []).map((item) => <SelectItem key={item.person.id} value={String(item.person.id)}>{item.person.fullName}</SelectItem>)}</SelectContent></Select>
            <Input value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="Ex.: Coordenador de vocal" />
            <Button type="button" onClick={assignNewRole} disabled={assignRole.isPending}>{assignRole.isPending ? "Atribuindo…" : "Atribuir"}</Button>
          </div>
          <div className="space-y-2">{(roles.data ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma função atribuída.</p> : (roles.data ?? []).map((assignment) => <div key={assignment.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"><span className="text-xs text-navy">{memberNameById.get(assignment.personId) ?? `Pessoa ${assignment.personId}`} · {roleLabel(assignment.roleKey)}</span><Button type="button" size="sm" variant="ghost" onClick={() => endRole.mutate({ churchId, departmentId: selectedDepartment.id, assignmentId: assignment.id })}>Encerrar</Button></div>)}</div>
        </div>}

        {selectedDepartment.canManage && (confirmDeactivate ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3"><p className="text-sm font-semibold text-rose-900">Desativar este Departamento?</p><p className="mt-1 text-xs text-rose-800">Ele deixará as listas ativas, mas participantes, funções e histórico serão preservados.</p><div className="mt-3 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setConfirmDeactivate(false)} disabled={deactivate.isPending}>Voltar</Button><Button type="button" className="bg-rose-700 text-white hover:bg-rose-800" disabled={deactivate.isPending} onClick={() => deactivate.mutate({ churchId, departmentId: selectedDepartment.id })}>{deactivate.isPending ? "Desativando…" : "Confirmar desativação"}</Button></div></div> : <Button type="button" variant="outline" className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => setConfirmDeactivate(true)}><Trash2 className="h-4 w-4" />Desativar Departamento</Button>)}
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-navy">Departamentos</p><p className="text-xs text-muted-foreground">Equipes subordinadas a {ministry.name}</p></div>{canCreateDepartment && <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => setShowCreate((value) => !value)}><Plus className="h-4 w-4" />Novo</Button>}</div>
      {showCreate && <form onSubmit={submitCreate} className="space-y-3 rounded-xl border border-gold/20 bg-background p-3">
        <div className="grid gap-3 sm:grid-cols-2"><div><Label>Nome *</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Vocal" className="mt-1" /></div><div><Label>Descrição</Label><Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Responsabilidade da equipe" className="mt-1" /></div></div>
        {canAssignLeader && <div><Label>Líder</Label><Select value={form.leaderId || "none"} onValueChange={(leaderId) => setForm({ ...form, leaderId: leaderId === "none" ? "" : leaderId })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Definir depois</SelectItem>{people.map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent></Select></div>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => { setShowCreate(false); setForm(emptyForm); }}>Cancelar</Button><Button type="submit" disabled={createDepartment.isPending}>{createDepartment.isPending ? "Criando…" : "Criar Departamento"}</Button></div>
      </form>}
      {departments.isLoading ? <p className="text-sm text-muted-foreground">Carregando Departamentos…</p> : (departments.data ?? []).length === 0 ? <div className="rounded-xl border border-dashed border-border p-5 text-center"><Building2 className="mx-auto h-8 w-8 text-muted-foreground/50" /><p className="mt-2 text-sm font-medium text-navy">Nenhum Departamento cadastrado</p><p className="text-xs text-muted-foreground">Crie equipes como Vocal, Instrumental, Berçário ou Recepção.</p></div> : <div className="grid gap-2 sm:grid-cols-2">{(departments.data ?? []).map((department) => <button key={department.id} type="button" onClick={() => setSelectedDepartmentId(department.id)} className="rounded-xl border border-border bg-background p-3 text-left transition hover:border-gold/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-navy">{department.name}</p><p className="text-xs text-muted-foreground">Líder: {department.leaderName ?? "Não definido"}</p></div><Badge variant="outline">{department.memberCount} pessoas</Badge></div></button>)}</div>}
    </section>
  );
}
