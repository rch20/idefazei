import { useMemo, useState, type FormEvent } from "react";
import { useChurch } from "@/components/ChurchLayout";
import { AdaptiveFormDialogBody, AdaptiveFormDialogContent, AdaptiveFormDialogFooter, adaptiveFormDialogHeaderClassName } from "@/components/AdaptiveFormDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Baby, Heart, Home, MapPin, Phone, Plus, Search, Trash2, Users } from "lucide-react";

type Family = {
  id: number;
  name: string;
  fatherName?: string | null;
  motherName?: string | null;
  childrenCount?: number;
  memberCount?: number;
  phone?: string | null;
  address?: string | null;
};

type FamilyMember = {
  id: number;
  familyId: number;
  personId: number;
  relation: "pai" | "mae" | "filho" | "filha" | "outro";
  fullName: string;
};

const RELATIONS = [
  { value: "pai", label: "Pai" },
  { value: "mae", label: "Mãe" },
  { value: "filho", label: "Filho" },
  { value: "filha", label: "Filha" },
  { value: "outro", label: "Outro membro" },
] as const;

const relationLabel = (relation: FamilyMember["relation"]) => RELATIONS.find((option) => option.value === relation)?.label ?? "Outro membro";

export default function Familias() {
  const { churchId } = useChurch();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [relation, setRelation] = useState<FamilyMember["relation"]>("outro");
  const [membersError, setMembersError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: access } = trpc.families.canManage.useQuery(
    { churchId: churchId! },
    { enabled: Boolean(churchId) }
  );
  const canManageFamilies = Boolean(access?.canManage);
  const { data: families, isLoading, refetch } = trpc.families.list.useQuery(
    { churchId: churchId!, search },
    { enabled: Boolean(churchId) }
  );
  const { data: people = [] } = trpc.people.list.useQuery(
    { churchId: churchId! },
    { enabled: Boolean(churchId && canManageFamilies) }
  );
  const { data: members = [], isLoading: membersLoading } = trpc.families.members.useQuery(
    { churchId: churchId!, familyId: selectedFamilyId! },
    { enabled: Boolean(churchId && selectedFamilyId) }
  );
  const selectedFamily = families?.find((family) => family.id === selectedFamilyId) as Family | undefined;
  const memberIds = useMemo(() => new Set((members as FamilyMember[]).map((member) => member.personId)), [members]);
  const availablePeople = people.filter((person) => !memberIds.has(person.id));

  const createMutation = trpc.families.create.useMutation({
    onSuccess: async (created) => {
      toast.success("Família cadastrada com sucesso!");
      setOpen(false);
      setForm({ name: "" });
      setCreateError(null);
      await refetch();
      if (created.id) setSelectedFamilyId(created.id);
    },
    onError: (error) => {
      setCreateError(error.message || "Não foi possível cadastrar a família.");
      toast.error(error.message);
    },
  });

  const addMemberMutation = trpc.families.addMember.useMutation({
    onSuccess: async () => {
      toast.success("Membro adicionado ao núcleo familiar.");
      setSelectedPersonId("");
      setRelation("outro");
      setMembersError(null);
      await Promise.all([utils.families.members.invalidate(), refetch()]);
    },
    onError: (error) => {
      setMembersError(error.message || "Não foi possível adicionar este membro.");
      toast.error(error.message);
    },
  });

  const removeMemberMutation = trpc.families.removeMember.useMutation({
    onSuccess: async () => {
      toast.success("Membro removido do núcleo familiar.");
      setMembersError(null);
      await Promise.all([utils.families.members.invalidate(), refetch()]);
    },
    onError: (error) => {
      setMembersError(error.message || "Não foi possível remover este membro.");
      toast.error(error.message);
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      const message = "Nome da família é obrigatório.";
      setCreateError(message);
      toast.error(message);
      return;
    }
    setCreateError(null);
    createMutation.mutate({ churchId: churchId!, name: form.name.trim() });
  };

  const closeFamily = () => {
    setSelectedFamilyId(null);
    setSelectedPersonId("");
    setRelation("outro");
    setMembersError(null);
  };

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up p-4 pb-24 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Famílias</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestão de núcleos familiares da igreja</p>
        </div>
        {canManageFamilies ? (
          <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (nextOpen) setCreateError(null); }}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 bg-navy text-white hover:bg-navy-light sm:w-auto">
                <Plus className="h-4 w-4" />
                Nova Família
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-w-[calc(100%-1rem)] sm:max-w-md"
              onOpenAutoFocus={(event) => event.preventDefault()}
              onPointerDown={(event) => {
                const target = event.target as HTMLElement;
                if (!target.closest("input, textarea, [contenteditable='true']")) {
                  (document.activeElement as HTMLElement | null)?.blur();
                }
              }}
            >
              <DialogHeader>
                <DialogTitle className="font-display text-navy">Cadastrar Família</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                {createError ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{createError}</div> : null}
                <div>
                  <Label htmlFor="family-name">Nome da Família *</Label>
                  <Input
                    id="family-name"
                    placeholder="Ex.: Família Silva"
                    value={form.name}
                    onChange={(event) => { setCreateError(null); setForm({ name: event.target.value }); }}
                    className="mt-1 min-h-11"
                  />
                </div>
                <DialogFooter className="pb-[env(safe-area-inset-bottom)]">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-navy text-white" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Famílias Cadastradas", value: families?.length ?? 0, icon: Home, color: "text-blue-600" },
          { label: "Membros em Famílias", value: families?.reduce((total, family) => total + (family.memberCount ?? 0), 0) ?? 0, icon: Users, color: "text-green-600" },
          { label: "Famílias Completas", value: families?.filter((family) => family.fatherName && family.motherName).length ?? 0, icon: Heart, color: "text-rose-600" },
        ].map((stat) => (
          <div key={stat.label} className="card-sacred flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${stat.color}`}><stat.icon className="h-5 w-5" /></div>
            <div><div className="text-2xl font-bold text-navy">{stat.value}</div><div className="text-xs text-muted-foreground">{stat.label}</div></div>
          </div>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar família por nome..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="card-sacred h-20 animate-pulse bg-muted p-4" />)}</div>
      ) : !families || families.length === 0 ? (
        <div className="card-sacred flex flex-col items-center gap-3 p-12 text-center"><Home className="h-12 w-12 text-muted-foreground/40" /><p className="font-medium text-navy">Nenhuma família cadastrada</p><p className="text-sm text-muted-foreground">Cadastre a primeira família da sua igreja</p></div>
      ) : (
        <div className="space-y-3">
          {families.map((family) => {
            const typedFamily = family as Family;
            return (
              <button type="button" key={typedFamily.id} onClick={() => setSelectedFamilyId(typedFamily.id)} className="card-sacred flex w-full items-start gap-4 p-4 text-left transition-colors hover:border-gold/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy/10"><Home className="h-5 w-5 text-navy" /></div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2"><span className="font-semibold text-navy">{typedFamily.name}</span><Badge variant="outline" className="text-xs">{typedFamily.memberCount ?? 0} membros</Badge></div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {typedFamily.fatherName ? <span className="flex items-center gap-1"><Users className="h-3 w-3" />Pai: {typedFamily.fatherName}</span> : null}
                    {typedFamily.motherName ? <span className="flex items-center gap-1"><Heart className="h-3 w-3" />Mãe: {typedFamily.motherName}</span> : null}
                    {typedFamily.childrenCount ? <span className="flex items-center gap-1"><Baby className="h-3 w-3" />{typedFamily.childrenCount} filho(s)</span> : null}
                    {typedFamily.phone ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{typedFamily.phone}</span> : null}
                    {typedFamily.address ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{typedFamily.address}</span> : null}
                  </div>
                  <p className="mt-2 text-xs font-medium text-navy">Toque para ver e gerenciar membros</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(selectedFamily)} onOpenChange={(nextOpen) => { if (!nextOpen) closeFamily(); }}>
        <AdaptiveFormDialogContent>
          <DialogHeader className={adaptiveFormDialogHeaderClassName}>
            <DialogTitle className="font-display text-navy">{selectedFamily?.name ?? "Família"}</DialogTitle>
            <p className="text-sm text-muted-foreground">Membros vinculados ao núcleo familiar</p>
          </DialogHeader>
          <AdaptiveFormDialogBody>
            <div className="space-y-5">
              {membersError ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{membersError}</div> : null}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-navy">Membros da família</h3><Badge variant="outline">{members.length}</Badge></div>
                {membersLoading ? <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">Carregando membros...</div> : members.length === 0 ? <div className="rounded-lg border border-dashed border-navy/20 bg-muted/20 p-4 text-sm text-muted-foreground">Nenhuma Pessoa foi vinculada a este núcleo ainda.</div> : <div className="space-y-2">{(members as FamilyMember[]).map((member) => <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-navy/10 bg-white p-3"><div className="min-w-0"><p className="truncate font-medium text-navy">{member.fullName}</p><p className="text-xs text-muted-foreground">{relationLabel(member.relation)}</p></div>{canManageFamilies ? <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive" aria-label={`Remover ${member.fullName}`} disabled={removeMemberMutation.isPending} onClick={() => removeMemberMutation.mutate({ churchId: churchId!, familyId: selectedFamilyId!, memberId: member.id })}><Trash2 className="h-4 w-4" /></Button> : null}</div>)}</div>}
              </section>
              {canManageFamilies ? <section className="space-y-3 rounded-xl border border-gold/25 bg-gold/5 p-4"><div><h3 className="font-semibold text-navy">Adicionar membro</h3><p className="text-sm text-muted-foreground">Vincule uma Pessoa já cadastrada sem criar um novo cadastro.</p></div><div className="space-y-2"><Label>Pessoa</Label><Select value={selectedPersonId} onValueChange={(value) => { setMembersError(null); setSelectedPersonId(value); }}><SelectTrigger className="min-h-11"><SelectValue placeholder={availablePeople.length ? "Selecione uma Pessoa" : "Todas as Pessoas já estão vinculadas"} /></SelectTrigger><SelectContent>{availablePeople.map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Parentesco</Label><Select value={relation} onValueChange={(value) => setRelation(value as FamilyMember["relation"])}><SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{RELATIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div></section> : null}
            </div>
          </AdaptiveFormDialogBody>
          <AdaptiveFormDialogFooter>
            <Button type="button" variant="outline" onClick={closeFamily}>Fechar</Button>
            {canManageFamilies ? <Button type="button" className="bg-navy text-white" disabled={!selectedPersonId || addMemberMutation.isPending} onClick={() => addMemberMutation.mutate({ churchId: churchId!, familyId: selectedFamilyId!, personId: Number(selectedPersonId), relation })}>{addMemberMutation.isPending ? "Adicionando..." : "Adicionar membro"}</Button> : null}
          </AdaptiveFormDialogFooter>
        </AdaptiveFormDialogContent>
      </Dialog>
    </div>
  );
}
