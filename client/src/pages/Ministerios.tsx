import { useState } from "react";
import { useChurch } from "@/components/ChurchLayout";
import { DepartmentsPanel } from "@/components/DepartmentsPanel";
import { ConsolidationReferralBox } from "@/components/ConsolidationReferralBox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Music, Users, Plus, Search, Star } from "lucide-react";

const MINISTRY_ICONS: Record<string, string> = {
  louvor: "🎵",
  jovens: "⚡",
  criancas: "🌟",
  intercessao: "🙏",
  evangelismo: "🌍",
  diaconia: "🤝",
  comunicacao: "📡",
  consolidacao: "🤍",
  default: "✨",
};

function isConsolidationMinistry(ministry: { type?: string | null; name: string }) {
  const normalizedName = ministry.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return ministry.type === "consolidacao" || normalizedName.includes("consolidacao");
}

export default function Ministerios() {
  const { churchId } = useChurch();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", type: "outro", leaderId: "", participantIds: [] as string[] });
  const [selectedMinistry, setSelectedMinistry] = useState<any>(null);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [customRoleName, setCustomRoleName] = useState("");
  const [customRolePackage, setCustomRolePackage] = useState("member");

  const { data: ministries, isLoading, refetch } = trpc.ministries.list.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );
  const effectiveRoles = trpc.churchAuth.effectiveRoles.useQuery({ churchId: churchId! }, { enabled: !!churchId });
  const roles = effectiveRoles.data ?? [];
  const canManageRoles = roles.some((role) => role === "pastor_presidente" || role === "pastor_local");
  const canCreateMinistry = roles.some((role) => role === "pastor_presidente" || role === "pastor_local" || role === "secretario");
  const { data: people } = trpc.people.list.useQuery({ churchId: churchId! }, { enabled: Boolean(churchId && canManageRoles) });
  const ministryMembers = trpc.ministries.members.useQuery(
    { churchId: churchId!, ministryId: selectedMinistry?.id ?? 0 },
    { enabled: Boolean(churchId && selectedMinistry?.id) }
  );
  const ministryCandidates = trpc.ministries.candidates.useQuery(
    { churchId: churchId!, ministryId: selectedMinistry?.id ?? 0 },
    { enabled: Boolean(churchId && selectedMinistry?.id && selectedMinistry?.canManage) }
  );
  const customFunctions = trpc.ministries.customFunctions.useQuery({ churchId: churchId! }, { enabled: Boolean(churchId && canCreateMinistry) });

  const createMutation = trpc.ministries.create.useMutation({
    onSuccess: () => {
      toast.success("Ministério criado com sucesso!");
      setOpen(false);
      setForm({ name: "", description: "", type: "outro", leaderId: "", participantIds: [] });
      refetch();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const updateLeader = trpc.ministries.updateLeader.useMutation({
    onSuccess: async (updated) => {
      toast.success(updated?.leaderId ? "Líder do Ministério atualizado." : "Liderança do Ministério removida.");
      const refreshed = await refetch();
      setSelectedMinistry(refreshed.data?.find((ministry) => ministry.id === updated?.id) ?? null);
    },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar o líder do Ministério."),
  });
  const assignPerson = trpc.ministries.assignPerson.useMutation({
    onSuccess: async (result) => {
      toast.success(result.alreadyMember ? "Esta pessoa já participa do ministério." : "Pessoa adicionada ao ministério.");
      setSelectedPersonId("");
      await Promise.all([refetch(), ministryMembers.refetch()]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível adicionar a pessoa."),
  });
  const createCustomFunction = trpc.ministries.createCustomFunction.useMutation({
    onSuccess: () => { toast.success("Função ministerial criada."); setCustomRoleName(""); customFunctions.refetch(); },
    onError: (error) => toast.error(error.message || "Não foi possível criar a função."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Nome do ministério é obrigatório");
    createMutation.mutate({
      churchId: churchId!,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
        type: form.type as "louvor" | "infantil" | "recepcao" | "midia" | "intercessao" | "evangelismo" | "casais" | "jovens" | "consolidacao" | "outro",
        leaderId: form.leaderId ? Number(form.leaderId) : null,
        participantIds: form.type === "consolidacao" ? form.participantIds.map(Number) : [],
    });
  };

  const addSelectedPerson = () => {
    if (!selectedMinistry || !selectedPersonId) {
      toast.error("Selecione uma Pessoa para adicionar à equipe.");
      return;
    }
    assignPerson.mutate({ churchId: churchId!, ministryId: selectedMinistry.id, personId: Number(selectedPersonId) });
  };

  const addCustomFunction = () => {
    if (!selectedMinistry || !customRoleName.trim()) return toast.error("Informe o nome da função.");
    const key = customRoleName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    createCustomFunction.mutate({ churchId: churchId!, ministryId: selectedMinistry.id, name: customRoleName.trim(), key, permissionPackage: customRolePackage as "member" | "cell_leader" | "consolidator" | "visitor" | "treasurer" | "ministry_leader" | "communication_leader" });
  };

  const filtered = ministries?.filter((m: { name: string }) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
      <div className="p-6 max-w-5xl mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-navy">Ministérios</h1>
            <p className="text-sm text-muted-foreground mt-1">{canCreateMinistry ? "Gerencie os ministérios e equipes da sua igreja" : "Gerencie o Ministério atribuído a você e sua equipe"}</p>
          </div>
          {canCreateMinistry && <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-navy text-white hover:bg-navy-light gap-2">
                <Plus className="w-4 h-4" />
                Novo Ministério
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display text-navy">Criar Ministério</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="name">Nome do Ministério *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Ministério de Louvor"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Breve descrição do ministério..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ministry-type">Tipo</Label>
                  <Select value={form.type} onValueChange={(type) => setForm({ ...form, type, participantIds: type === "consolidacao" ? form.participantIds : [] })}>
                    <SelectTrigger id="ministry-type" className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="louvor">Louvor</SelectItem><SelectItem value="infantil">Infantil</SelectItem><SelectItem value="recepcao">Recepção</SelectItem><SelectItem value="midia">Mídia</SelectItem><SelectItem value="intercessao">Intercessão</SelectItem><SelectItem value="evangelismo">Evangelismo</SelectItem><SelectItem value="casais">Casais</SelectItem><SelectItem value="jovens">Jovens</SelectItem><SelectItem value="consolidacao">Consolidação e Visitas</SelectItem><SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.type === "consolidacao" && <p className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs leading-relaxed text-navy">Os participantes deste Ministério terão acesso à aba de Consolidação como equipe de cuidado. A liderança continuará responsável por aceitar as indicações; depois da aprovação, o Consolidador atribuído poderá assumir o cuidado.</p>}
                {form.type === "consolidacao" && canManageRoles && <div>
                  <Label>Envolvidos na Consolidação</Label>
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-background p-2">
                    {(people ?? []).length === 0 ? <p className="p-2 text-xs text-muted-foreground">Nenhuma Pessoa disponível para seleção.</p> : (people ?? []).map((person) => <label key={person.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-navy hover:bg-muted"><input type="checkbox" checked={form.participantIds.includes(String(person.id))} onChange={(event) => setForm((current) => ({ ...current, participantIds: event.target.checked ? Array.from(new Set([...current.participantIds, String(person.id)])) : current.participantIds.filter((id) => id !== String(person.id)) }))} />{person.fullName}</label>)}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">A seleção será gravada junto com o Ministério e poderá ser ampliada depois pelo painel da equipe.</p>
                </div>}
                {canManageRoles && <div>
                  <Label htmlFor="ministry-leader">Líder responsável</Label>
                  <Select value={form.leaderId || "none"} onValueChange={(leaderId) => setForm({ ...form, leaderId: leaderId === "none" ? "" : leaderId })}>
                    <SelectTrigger id="ministry-leader" className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Definir depois</SelectItem>{(people ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>}
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-navy text-white" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Ministérios Ativos", value: ministries?.length ?? 0, icon: Music, color: "text-purple-600" },
            { label: "Total de Membros", value: ministries?.reduce((a: number, m: { memberCount?: number }) => a + (m.memberCount ?? 0), 0) ?? 0, icon: Users, color: "text-blue-600" },
            { label: "Com Líder Definido", value: ministries?.filter((m: { leaderId?: number | null }) => m.leaderId).length ?? 0, icon: Star, color: "text-gold" },
          ].map((stat) => (
            <div key={stat.label} className="card-sacred p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-navy">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ministério..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card-sacred p-5 h-32 animate-pulse bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
            <Music className="w-12 h-12 text-muted-foreground/40" />
            <p className="font-medium text-navy">Nenhum ministério cadastrado</p>
            <p className="text-sm text-muted-foreground">Crie o primeiro ministério da sua igreja</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((ministry: { id: number; name: string; type?: string | null; description?: string | null; memberCount?: number; leaderId?: number | null; leaderName?: string | null }) => {
              const key = isConsolidationMinistry(ministry) ? "consolidacao" : ministry.name.toLowerCase().replace(/\s+/g, "");
              const icon = Object.keys(MINISTRY_ICONS).find((k) => key.includes(k)) ?? "default";
              return (
                <button
                  key={ministry.id}
                  type="button"
                  onClick={() => { setSelectedMinistry(ministry); setSelectedPersonId(""); }}
                  className="card-sacred group w-full p-5 text-left transition-all hover:border-gold/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                  aria-label={`Gerenciar participantes de ${ministry.name}`}
                >
                  <div className="text-3xl mb-3">{MINISTRY_ICONS[icon]}</div>
                  <h3 className="font-semibold text-navy text-sm mb-1">{ministry.name}</h3>
                  {isConsolidationMinistry(ministry) && <Badge variant="outline" className="mb-2 border-gold/40 bg-gold/5 text-[10px] text-navy">Acesso à Consolidação</Badge>}
                  {ministry.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ministry.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mb-2">Responsável: <span className="font-medium text-navy">{ministry.leaderName ?? "Não definido"}</span></p>
                  <div className="flex items-center gap-2 mt-auto">
                    <Badge variant="outline" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {ministry.memberCount ?? 0} membros
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <Dialog open={Boolean(selectedMinistry)} onOpenChange={(nextOpen) => !nextOpen && setSelectedMinistry(null)}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="font-display text-navy">{canCreateMinistry ? "Equipe" : "Meu Ministério"}: {selectedMinistry?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{selectedMinistry && isConsolidationMinistry(selectedMinistry) ? "Adicione os envolvidos no cuidado. Cada participante ativo recebe acesso à aba de Consolidação; a aprovação da indicação e a assunção do cuidado continuam sendo etapas diferentes." : canCreateMinistry ? "Participantes, liderança e escalas permanecem isolados neste Ministério." : "Este painel mostra somente a equipe e as responsabilidades do Ministério sob sua liderança."}</p>
              {canManageRoles && <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
                <Label htmlFor="selected-ministry-leader">Líder responsável</Label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <Select value={selectedMinistry?.leaderId ? String(selectedMinistry.leaderId) : "none"} onValueChange={(leaderId) => updateLeader.mutate({ churchId: churchId!, ministryId: selectedMinistry.id, leaderId: leaderId === "none" ? null : Number(leaderId) })}>
                    <SelectTrigger id="selected-ministry-leader" className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Sem líder definido</SelectItem>{(people ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
                  </Select>
                  {updateLeader.isPending && <span className="self-center text-xs text-muted-foreground">Atualizando…</span>}
                </div>
              </div>}
              {selectedMinistry?.canManage ? <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione uma Pessoa" /></SelectTrigger>
                  <SelectContent>{(ministryCandidates.data ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" onClick={addSelectedPerson} disabled={assignPerson.isPending || ministryCandidates.isLoading} className="bg-navy text-white hover:bg-navy-light">
                  {assignPerson.isPending ? "Adicionando…" : "Adicionar participante"}
                </Button>
              </div> : <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Somente o Pastor, Secretário ou responsável deste Ministério pode alterar a equipe.</p>}
              <div className="rounded-xl border border-border">
                <div className="border-b border-border px-4 py-3 text-sm font-semibold text-navy">Participantes ativos ({ministryMembers.data?.length ?? 0})</div>
                {ministryMembers.isLoading ? <div className="p-4 text-sm text-muted-foreground">Carregando equipe…</div> : (ministryMembers.data ?? []).length === 0 ? <div className="p-4 text-sm text-muted-foreground">Nenhuma Pessoa adicionada ainda.</div> : (
                  <div className="divide-y divide-border">{(ministryMembers.data ?? []).map((item) => <div key={item.membership.id} className="flex items-center gap-3 px-4 py-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-dark text-xs font-bold text-navy">{item.person.fullName.charAt(0)}</div><span className="text-sm font-medium text-navy">{item.person.fullName}</span></div>)}</div>
                )}
              </div>
              {selectedMinistry?.canManage && <ConsolidationReferralBox churchId={churchId!} candidates={(ministryMembers.data ?? []).map((item) => ({ id: item.person.id, fullName: item.person.fullName }))} sourceLabel={`Ministério ${selectedMinistry.name}`} />}
              {selectedMinistry && churchId && <DepartmentsPanel churchId={churchId} ministry={{ id: selectedMinistry.id, name: selectedMinistry.name }} canCreateDepartment={canCreateMinistry} canAssignLeader={canManageRoles} people={people ?? []} />}
              {canCreateMinistry && <div className="rounded-xl border border-gold/30 bg-cream/40 p-4 space-y-3">
                <p className="text-sm font-semibold text-navy">Funções personalizadas</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input value={customRoleName} onChange={(event) => setCustomRoleName(event.target.value)} placeholder="Ex.: Líder de Louvor" />
                  <Select value={customRolePackage} onValueChange={setCustomRolePackage}>
                    <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="member">Membro</SelectItem><SelectItem value="ministry_leader">Liderança de Ministério</SelectItem><SelectItem value="visitor">Visitador</SelectItem><SelectItem value="consolidator">Consolidador</SelectItem><SelectItem value="cell_leader">Líder de Célula</SelectItem><SelectItem value="treasurer">Tesouraria</SelectItem><SelectItem value="communication_leader">Comunicação</SelectItem></SelectContent>
                  </Select>
                  <Button type="button" onClick={addCustomFunction} disabled={createCustomFunction.isPending}>Criar</Button>
                </div>
                <div className="flex flex-wrap gap-2">{(customFunctions.data ?? []).filter((role) => !role.ministryId || role.ministryId === selectedMinistry?.id).map((role) => <Badge key={role.id} variant="outline">{role.name}</Badge>)}</div>
              </div>}
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
}
