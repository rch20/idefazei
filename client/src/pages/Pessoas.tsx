import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Clock3, HeartHandshake, Plus, Search, ShieldCheck, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const STAGES_LABELS: Record<string, string> = {
  nova_alma: "Nova Alma",
  consolidacao: "Consolidação",
  fundamentos: "Fundamentos",
  celula: "Célula",
  batismo: "Batismo",
  encontro_com_deus: "Encontro com Deus",
  escola_de_lideres: "Escola de Líderes",
  lideranca: "Liderança",
  multiplicador: "Multiplicador",
};

const STAGE_BADGE: Record<string, string> = {
  nova_alma: "badge-nova-alma",
  consolidacao: "badge-consolidacao",
  fundamentos: "badge-fundamentos",
  celula: "badge-celula",
  batismo: "badge-batismo",
  encontro_com_deus: "badge-encontro",
  escola_de_lideres: "badge-escola",
  lideranca: "badge-lideranca",
  multiplicador: "badge-multiplicador",
};

const CARE_ROLE_LABELS: Record<string, string> = {
  quem_ganhou: "Quem ganhou",
  consolidador: "Consolidador",
  lider_celula: "Líder de célula",
  discipulador: "Discipulador",
  pastor: "Pastor",
};

const defaultForm = {
  fullName: "",
  cpf: "",
  rg: "",
  birthDate: "",
  gender: "" as any,
  maritalStatus: "" as any,
  profession: "",
  education: "",
  phone: "",
  whatsapp: "",
  email: "",
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  conversionDate: "",
  baptismDate: "",
  previousChurch: "",
  pastoralNotes: "",
  discipleshipStage: "nova_alma" as any,
};

export default function Pessoas() {
  const { churchId } = useChurch();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [careForm, setCareForm] = useState({ responsiblePersonId: "", role: "consolidador", notes: "" });
  const [selectedCellId, setSelectedCellId] = useState("");
  const utils = trpc.useUtils();

  const { data: people, isLoading, refetch } = trpc.people.list.useQuery({ churchId, search: search || undefined });
  const careAttention = trpc.dashboard.careAttention.useQuery({ churchId });
  const currentCare = trpc.care.getCurrent.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id) }
  );
  const careHistory = trpc.care.history.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id) }
  );
  const cellsQuery = trpc.cells.list.useQuery({ churchId });
  const currentCell = trpc.cells.personMembership.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id) }
  );
  const cellHistory = trpc.cells.membershipHistory.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id) }
  );
  const createPerson = trpc.people.create.useMutation({
    onSuccess: () => {
      toast.success("Pessoa cadastrada com sucesso!");
      setOpen(false);
      setForm(defaultForm);
      refetch();
    },
    onError: () => toast.error("Erro ao cadastrar pessoa"),
  });
  const assignCare = trpc.care.assign.useMutation({
    onSuccess: async () => {
      toast.success("Responsável pelo cuidado atualizado.");
      setCareForm((current) => ({ ...current, notes: "" }));
      await Promise.all([currentCare.refetch(), careHistory.refetch(), careAttention.refetch()]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar o responsável."),
  });
  const startConsolidation = trpc.consolidation.create.useMutation({
    onSuccess: async () => {
      toast.success("Consolidação iniciada e responsável atualizado.");
      await Promise.all([
        currentCare.refetch(),
        careHistory.refetch(),
        careAttention.refetch(),
        utils.souls.list.invalidate({ churchId }),
      ]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível iniciar a consolidação."),
  });
  const assignCell = trpc.cells.assignPerson.useMutation({
    onSuccess: async (result) => {
      toast.success(result.transferred ? "Pessoa transferida de célula com histórico preservado." : "Pessoa integrada à célula.");
      setSelectedCellId("");
      await Promise.all([currentCell.refetch(), cellHistory.refetch(), currentCare.refetch(), careAttention.refetch(), refetch()]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível integrar a pessoa à célula."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: any = { churchId, ...form };
    Object.keys(data).forEach((k) => {
      if (data[k] === "") data[k] = undefined;
    });
    createPerson.mutate(data);
  }

  const selectedAttention = (careAttention.data ?? []).find((item) => item.person.id === selectedPerson?.id);
  const currentResponsible = (people ?? []).find((person) => person.id === currentCare.data?.responsiblePersonId);

  useEffect(() => {
    const personId = Number(new URLSearchParams(location.split("?")[1] ?? "").get("personId"));
    const person = (people ?? []).find((candidate) => candidate.id === personId);
    if (person && selectedPerson?.id !== person.id) openPersonJourney(person);
  }, [location, people, selectedPerson?.id]);

  const careTimeline = selectedPerson
    ? [
        ...(selectedAttention?.soul
          ? [{ date: selectedAttention.soul.decisionDate, title: "Nova Alma registrada", detail: "Decisão e origem espiritual registradas." }]
          : []),
        ...(careHistory.data ?? []).map((item) => ({
          date: item.startedAt,
          title: "Responsável pelo cuidado definido",
          detail: `${CARE_ROLE_LABELS[item.role] ?? item.role}${item.notes ? ` · ${item.notes}` : ""}`,
        })),
        ...(selectedAttention?.consolidation?.callDate
          ? [{ date: selectedAttention.consolidation.callDate, title: "Primeiro contato realizado", detail: "Contato de consolidação registrado." }]
          : []),
        ...(selectedAttention?.consolidation?.messageDate
          ? [{ date: selectedAttention.consolidation.messageDate, title: "Mensagem enviada", detail: "Ação de consolidação registrada." }]
          : []),
        ...(selectedAttention?.consolidation?.visitDate
          ? [{ date: selectedAttention.consolidation.visitDate, title: "Visita realizada", detail: "Ação de consolidação registrada." }]
          : []),
        ...(selectedAttention?.consolidation?.prayerDate
          ? [{ date: selectedAttention.consolidation.prayerDate, title: "Oração realizada", detail: "Ação de consolidação registrada." }]
          : []),
        ...(cellHistory.data ?? []).map((membership) => ({
          date: membership.joinedAt,
          title: membership.active ? "Integrada à Célula" : "Histórico de Célula",
          detail: membership.active ? `Célula atual: ${membership.cellName}` : `Participou da Célula ${membership.cellName}`,
        })),
      ]
        .filter((item) => item.date)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  function openPersonJourney(person: any) {
    setSelectedPerson(person);
    setCareForm({ responsiblePersonId: "", role: "consolidador", notes: "" });
    setSelectedCellId("");
  }

  function saveCareAssignment() {
    if (!selectedPerson || !careForm.responsiblePersonId) {
      toast.error("Selecione a pessoa responsável pelo cuidado.");
      return;
    }
    assignCare.mutate({
      churchId,
      personId: selectedPerson.id,
      responsiblePersonId: Number(careForm.responsiblePersonId),
      role: careForm.role as "quem_ganhou" | "consolidador" | "lider_celula" | "discipulador" | "pastor",
      notes: careForm.notes.trim() || undefined,
    });
  }

  function handleStartConsolidation() {
    const consolidatorId = Number(careForm.responsiblePersonId) || currentCare.data?.responsiblePersonId;
    if (!selectedAttention?.soul) {
      toast.error("Esta pessoa não possui uma Nova Alma pendente de consolidação.");
      return;
    }
    if (!consolidatorId) {
      toast.error("Defina primeiro o consolidador responsável.");
      return;
    }
    startConsolidation.mutate({ churchId, soulId: selectedAttention.soul.id, consolidatorId });
  }

  function handleCellAssignment() {
    if (!selectedPerson || !selectedCellId) {
      toast.error("Selecione uma célula ativa.");
      return;
    }
    assignCell.mutate({ churchId, personId: selectedPerson.id, cellId: Number(selectedCellId) });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Pessoas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastro completo de membros e visitantes
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-navy hover:bg-navy-light text-white gap-2">
          <Plus className="w-4 h-4" />
          Nova Pessoa
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {Object.entries(STAGES_LABELS).slice(0, 5).map(([key, label]) => {
          const count = (people ?? []).filter((p) => p.discipleshipStage === key).length;
          return (
            <div key={key} className="card-sacred p-3 text-center">
              <p className="text-xl font-bold font-display text-navy">{count}</p>
              <p className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium mt-1 ${STAGE_BADGE[key]}`}>
                {label}
              </p>
            </div>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (people ?? []).length === 0 ? (
        <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-navy/10 flex items-center justify-center">
            <Users className="w-7 h-7 text-navy" />
          </div>
          <p className="font-semibold text-navy">Nenhuma pessoa cadastrada</p>
          <p className="text-sm text-muted-foreground">Cadastre a primeira pessoa da sua igreja</p>
        </div>
      ) : (
        <div className="space-y-2 animate-stagger">
          {(people ?? []).map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => openPersonJourney(person)}
              className="card-sacred flex w-full items-center gap-4 p-4 text-left transition-colors hover:border-gold/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
              aria-label={`Abrir jornada de cuidado de ${person.fullName}`}
            >
              <div className="w-10 h-10 rounded-full bg-cream-dark flex items-center justify-center flex-shrink-0">
                {person.photoUrl ? (
                  <img src={person.photoUrl} alt={person.fullName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-navy">{person.fullName.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy">{person.fullName}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {person.phone && <span className="text-xs text-muted-foreground">{person.phone}</span>}
                  {person.email && <span className="text-xs text-muted-foreground hidden sm:block">{person.email}</span>}
                  {person.city && <span className="text-xs text-muted-foreground hidden md:block">{person.city}/{person.state}</span>}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${STAGE_BADGE[person.discipleshipStage ?? "nova_alma"]}`}>
                {STAGES_LABELS[person.discipleshipStage ?? "nova_alma"]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-navy flex items-center gap-2">
              <User className="w-5 h-5" />
              Cadastrar Pessoa
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="pessoal" className="w-full">
              <TabsList className="grid grid-cols-4 w-full mb-4">
                <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
                <TabsTrigger value="contato">Contato</TabsTrigger>
                <TabsTrigger value="endereco">Endereço</TabsTrigger>
                <TabsTrigger value="espiritual">Espiritual</TabsTrigger>
              </TabsList>

              <TabsContent value="pessoal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome Completo *</Label>
                    <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <Label>RG</Label>
                    <Input value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
                  </div>
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Sexo</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as any })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estado Civil</Label>
                    <Select value={form.maritalStatus} onValueChange={(v) => setForm({ ...form, maritalStatus: v as any })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                        <SelectItem value="casado">Casado(a)</SelectItem>
                        <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                        <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                        <SelectItem value="uniao_estavel">União Estável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Profissão</Label>
                    <Input value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} />
                  </div>
                  <div>
                    <Label>Escolaridade</Label>
                    <Input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contato" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Telefone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="col-span-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="endereco" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>CEP</Label>
                    <Input value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} placeholder="00000-000" />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Rua</Label>
                    <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                  </div>
                  <div>
                    <Label>Bairro</Label>
                    <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} placeholder="SP" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="espiritual" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Conversão</Label>
                    <Input type="date" value={form.conversionDate} onChange={(e) => setForm({ ...form, conversionDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Data do Batismo</Label>
                    <Input type="date" value={form.baptismDate} onChange={(e) => setForm({ ...form, baptismDate: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Igreja Anterior</Label>
                    <Input value={form.previousChurch} onChange={(e) => setForm({ ...form, previousChurch: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Etapa no Funil</Label>
                    <Select value={form.discipleshipStage} onValueChange={(v) => setForm({ ...form, discipleshipStage: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STAGES_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Observações Pastorais</Label>
                    <Textarea value={form.pastoralNotes} onChange={(e) => setForm({ ...form, pastoralNotes: e.target.value })} rows={3} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-navy hover:bg-navy-light text-white" disabled={createPerson.isPending}>
                {createPerson.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedPerson)} onOpenChange={(nextOpen) => !nextOpen && setSelectedPerson(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-navy"><HeartHandshake className="h-5 w-5 text-rose-600" />Jornada de cuidado</DialogTitle>
            <DialogDescription>{selectedPerson?.fullName} · {STAGES_LABELS[selectedPerson?.discipleshipStage ?? "nova_alma"]}</DialogDescription>
          </DialogHeader>

          {selectedAttention && (
            <div className={`rounded-xl border p-4 ${selectedAttention.priority === "alta" ? "border-rose-200 bg-rose-50/60" : selectedAttention.priority === "media" ? "border-amber-200 bg-amber-50/60" : "border-green-200 bg-green-50/60"}`}>
              <div className="flex items-start gap-3">
                <ShieldCheck className={`mt-0.5 h-5 w-5 shrink-0 ${selectedAttention.priority === "alta" ? "text-rose-600" : selectedAttention.priority === "media" ? "text-amber-600" : "text-green-600"}`} />
                <div>
                  <p className="text-sm font-semibold text-navy">Próximo passo: {selectedAttention.nextStep}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedAttention.reasons.length > 0 ? selectedAttention.reasons.join(" · ") : "Não há pendências críticas no momento."}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-navy">Responsável atual</h3>
              {currentCare.isLoading ? <p className="mt-2 text-sm text-muted-foreground">Carregando…</p> : currentCare.data ? (
                <div className="mt-3 space-y-1">
                  <p className="font-medium text-navy">{currentResponsible?.fullName ?? "Pessoa vinculada"}</p>
                  <Badge variant="outline" className="text-xs">{CARE_ROLE_LABELS[currentCare.data.role] ?? currentCare.data.role}</Badge>
                </div>
              ) : <p className="mt-2 text-sm text-rose-700">Nenhum responsável definido.</p>}
            </section>
            <section className="rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-navy">Histórico de cuidado</h3>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" />{careHistory.data?.length ?? 0} atribuição(ões) registrada(s)</p>
            </section>
          </div>

          <section className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-navy">Linha do tempo de acompanhamento</h3>
            {careTimeline.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Ainda não há ações de cuidado registradas.</p>
            ) : (
              <div className="mt-4 space-y-4 border-l border-gold/30 pl-4">
                {careTimeline.slice(0, 10).map((event, index) => (
                  <div key={`${event.title}-${index}`} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-gold" />
                    <p className="text-sm font-medium text-navy">{event.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{event.detail}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{new Date(event.date).toLocaleDateString("pt-BR")}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gold/25 bg-gold/5 p-4">
            <h3 className="text-sm font-semibold text-navy">Definir responsável pelo cuidado</h3>
            <p className="mt-1 text-xs text-muted-foreground">Ao atualizar, o responsável anterior é preservado no histórico e deixa de ficar ativo.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="care-responsible">Responsável *</Label>
                <Select value={careForm.responsiblePersonId} onValueChange={(value) => setCareForm((current) => ({ ...current, responsiblePersonId: value }))}>
                  <SelectTrigger id="care-responsible" className="mt-1 bg-background"><SelectValue placeholder="Selecione uma pessoa" /></SelectTrigger>
                  <SelectContent>{(people ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="care-role">Função no cuidado *</Label>
                <Select value={careForm.role} onValueChange={(value) => setCareForm((current) => ({ ...current, role: value }))}>
                  <SelectTrigger id="care-role" className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CARE_ROLE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3">
              <Label htmlFor="care-notes">Observação</Label>
              <Textarea id="care-notes" className="mt-1 bg-background" rows={2} value={careForm.notes} onChange={(event) => setCareForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Ex.: responsável definido após primeiro contato" />
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              {selectedAttention?.nextStep === "Iniciar consolidação" && <Button type="button" variant="outline" onClick={handleStartConsolidation} disabled={startConsolidation.isPending}>Iniciar consolidação</Button>}
              <Button type="button" className="bg-navy text-white hover:bg-navy-light" onClick={saveCareAssignment} disabled={assignCare.isPending}>{assignCare.isPending ? "Salvando…" : "Atualizar responsável"}</Button>
            </div>
          </section>

          <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
            <h3 className="text-sm font-semibold text-navy">Integração em Célula</h3>
            {currentCell.isLoading ? (
              <p className="mt-2 text-sm text-muted-foreground">Carregando vínculo de célula…</p>
            ) : currentCell.data ? (
              <div className="mt-2 rounded-lg border border-indigo-100 bg-background/80 p-3">
                <p className="text-sm font-medium text-navy">Célula ativa: {currentCell.data.cellName}</p>
                <p className="mt-1 text-xs text-muted-foreground">Desde {new Date(currentCell.data.joinedAt).toLocaleDateString("pt-BR")}. Escolher outra célula fará uma transferência, sem apagar o histórico.</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-amber-800">Esta pessoa ainda não possui uma célula ativa.</p>
            )}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="journey-cell">Célula de destino</Label>
                <Select value={selectedCellId} onValueChange={setSelectedCellId}>
                  <SelectTrigger id="journey-cell" className="mt-1 bg-background"><SelectValue placeholder="Selecione uma célula ativa" /></SelectTrigger>
                  <SelectContent>{(cellsQuery.data ?? []).map((cell) => <SelectItem key={cell.id} value={String(cell.id)}>{cell.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={handleCellAssignment} disabled={assignCell.isPending || (cellsQuery.data ?? []).length === 0}>
                {assignCell.isPending ? "Atualizando…" : currentCell.data ? "Transferir" : "Integrar à célula"}
              </Button>
            </div>
            {cellHistory.data && cellHistory.data.length > 1 && <p className="mt-3 text-xs text-muted-foreground">{cellHistory.data.length - 1} vínculo(s) anterior(es) preservado(s) no histórico.</p>}
          </section>
        </DialogContent>
      </Dialog>
    </div>
  );
}
