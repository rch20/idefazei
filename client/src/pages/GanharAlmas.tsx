import { useChurch } from "@/components/ChurchLayout";
import { ConfirmDestructiveActionDialog } from "@/components/ConfirmDestructiveActionDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { AdaptiveFormDialogBody, AdaptiveFormDialogContent, AdaptiveFormDialogFooter, adaptiveFormDialogHeaderClassName } from "@/components/AdaptiveFormDialog";
import { SoulContactActions } from "@/components/SoulContactActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Check, ChevronsUpDown, Flame, Plus, Search, Users, X, QrCode } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { currentCivilDateKey } from "@/lib/civilDate";
import { deriveDiscipleshipDisplayState, getDiscipleshipStageLabel } from "@/lib/discipleshipState";

const ORIGINS = [
  { value: "culto", label: "Culto" },
  { value: "evangelismo", label: "Evangelismo" },
  { value: "celula", label: "Célula" },
  { value: "evento", label: "Evento" },
  { value: "redes_sociais", label: "Redes sociais" },
  { value: "indicacao", label: "Indicação" },
  { value: "visita_espontanea", label: "Visita espontânea" },
] as const;

type Origin = (typeof ORIGINS)[number]["value"];

const PUBLIC_LEAD_STATUS = {
  novo: { label: "Novo", className: "border-amber-200 bg-amber-50 text-amber-800" },
  em_atendimento: { label: "Em atendimento", className: "border-blue-200 bg-blue-50 text-blue-800" },
  convertido: { label: "Convertido", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  encerrado: { label: "Encerrado", className: "border-slate-200 bg-slate-100 text-slate-700" },
} as const;

const PUBLIC_LEAD_SOURCE = {
  qrcode: "QR Code",
  convite: "Convite",
  evento: "Evento",
  link: "Link",
} as const;

type PublicLeadConversionTarget = {
  id: number;
  name: string;
  whatsapp: string;
};

type PublicLeadRow = {
  id: number;
  soulId: number | null;
  name: string;
  whatsapp: string;
  email: string | null;
  personEmail?: string | null;
  personId: number | null;
  status: keyof typeof PUBLIC_LEAD_STATUS;
  source: keyof typeof PUBLIC_LEAD_SOURCE;
  campaign: string | null;
  createdAt: string | Date;
  city: string | null;
  state: string | null;
  discipleshipStage: string | null;
};

type SoulRow = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  personId: number | null;
  origin: string;
  decisionDate: string | Date;
  createdAt: string | Date;
  acceptedJesus: boolean | null;
  discipleshipStage?: string | null;
};

type UnifiedNewSoul = {
  key: string;
  kind: "public" | "soul";
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  personId: number | null;
  statusLabel: string;
  statusClassName: string;
  originLabel: string;
  date: string | Date;
  lead?: PublicLeadRow;
  soul?: SoulRow;
};

function formatContactDate(value: string | Date | null | undefined) {
  if (!value) return "Data não informada";
  return new Date(value).toLocaleDateString("pt-BR");
}

function createInitialForm() {
  return {
    name: "",
    phone: "",
    email: "",
    birthDate: "",
    address: "",
    decisionDate: currentCivilDateKey(),
    origin: "culto" as Origin,
    acceptedJesus: true,
    reconciliation: false,
    firstVisit: false,
    wonById: "",
    existingPersonId: "new",
    notes: "",
  };
}

export default function GanharAlmas() {
  const { churchId, accessSummary } = useChurch();
  const [, navigate] = useLocation();
  const isLimitedMember = accessSummary ? !accessSummary.isPastoralWorker : true;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(createInitialForm);
  const [formError, setFormError] = useState("");
  const [winnerSearchOpen, setWinnerSearchOpen] = useState(false);
  const [pendingPublicLeadConversion, setPendingPublicLeadConversion] = useState<PublicLeadConversionTarget | null>(null);
  const [isConfirmingPublicLead, setIsConfirmingPublicLead] = useState(false);

  const soulsQuery = trpc.souls.list.useQuery(
    { churchId: churchId! },
    { enabled: Boolean(churchId) }
  );
  // A autorização real é feita pelo procedimento protegido no servidor. O resumo
  // apenas evita uma chamada online desnecessária para perfis limitados; a fila
  // manual continua disponível para esses perfis.
  const publicLeadsQuery = trpc.publicRegistration.list.useQuery(
    { churchId: churchId! },
    { enabled: Boolean(churchId && accessSummary && !isLimitedMember), retry: false }
  );
  const updatePublicLeadStatus = trpc.publicRegistration.updateStatus.useMutation({
    onSuccess: () => {
      void publicLeadsQuery.refetch();
      toast.success("Status do cadastro atualizado.");
    },
    onError: (error) => toast.error(error.message),
  });
  const convertPublicLead = trpc.publicRegistration.convertToDisciple.useMutation({
    onSuccess: async (result) => {
      setPendingPublicLeadConversion(null);
      setIsConfirmingPublicLead(false);
      let refreshFailed = false;

      try {
        const refreshResults = await Promise.allSettled([
          publicLeadsQuery.refetch(),
          soulsQuery.refetch(),
          peopleQuery.refetch(),
        ]);

        refreshFailed = refreshResults.some(
          (refreshResult) =>
            refreshResult.status === "rejected" || refreshResult.value.isError,
        );
      } catch {
        refreshFailed = true;
      }

      if (result.status === "ambiguous") {
        toast.error(`Encontramos ${result.matches.length} fichas com este WhatsApp. Revise a aba Pessoas antes de vincular.`);
      } else if (result.status === "already_converted") {
        toast.success("Este cadastro já estava vinculado a uma ficha de Discípulo.");
      } else if (result.status === "linked") {
        toast.success("Cadastro convertido e vinculado à ficha existente em Discípulos.");
      } else {
        toast.success("Discípulo convertido. A ficha foi criada em Pessoas.");
      }

      if (refreshFailed) {
        toast.warning("A operação foi concluída, mas não foi possível atualizar todas as listas. Recarregue a página para conferir o estado atualizado.");
      }
    },
    onError: (error) => {
      setIsConfirmingPublicLead(false);
      toast.error(error.message);
    },
  });

  function handleConvertPublicLead(lead: { id: number; name: string; whatsapp: string; personId: number | null; status: keyof typeof PUBLIC_LEAD_STATUS }) {
    if (lead.personId) {
      toast.info("Este cadastro já possui uma ficha vinculada em Discípulos.");
      return;
    }
    setPendingPublicLeadConversion({
      id: lead.id,
      name: lead.name,
      whatsapp: lead.whatsapp,
    });
  }

  function handleConfirmPublicLeadConversion() {
    if (!pendingPublicLeadConversion || !churchId || convertPublicLead.isPending || isConfirmingPublicLead) return;
    setIsConfirmingPublicLead(true);
    convertPublicLead.mutate({ churchId, id: pendingPublicLeadConversion.id });
  }
  const isPublicLeadConversionPending = convertPublicLead.isPending || isConfirmingPublicLead;
  const peopleQuery = trpc.people.list.useQuery(
    { churchId: churchId! },
    { enabled: Boolean(churchId && !isLimitedMember) }
  );
  const possibleMatchInput = useMemo(
    () => ({
      churchId: churchId ?? 0,
      fullName: form.name.trim(),
      phone: form.phone.trim() || undefined,
    }),
    [churchId, form.name, form.phone]
  );
  const possibleMatchesQuery = trpc.people.findPossibleMatches.useQuery(possibleMatchInput, {
    enabled: Boolean(churchId && !isLimitedMember && possibleMatchInput.fullName.length >= 2),
  });

  const souls = (soulsQuery.data ?? []) as SoulRow[];
  const people = peopleQuery.data ?? [];
  const selectedWinner = people.find((person) => String(person.id) === form.wonById);
  const unifiedNewSouls = useMemo<UnifiedNewSoul[]>(() => {
    const publicLeads = publicLeadsQuery.isSuccess ? (publicLeadsQuery.data ?? []) as PublicLeadRow[] : [];
    const publicLeadSoulIds = new Set(publicLeads.map((lead) => lead.soulId).filter((id): id is number => id !== null && id !== undefined));
    const publicRows: UnifiedNewSoul[] = publicLeads.map((lead) => {
      const status = PUBLIC_LEAD_STATUS[lead.status];
      return {
        key: `public-${lead.id}`,
        kind: "public",
        id: lead.id,
        name: lead.name,
        phone: lead.whatsapp,
        email: lead.email ?? lead.personEmail ?? null,
        personId: lead.personId,
        statusLabel: `Cadastro: ${status.label}`,
        statusClassName: status.className,
        originLabel: `${PUBLIC_LEAD_SOURCE[lead.source]}${lead.campaign ? ` · ${lead.campaign}` : ""}`,
        date: lead.createdAt,
        lead,
      };
    });
    const soulRows: UnifiedNewSoul[] = souls
      .filter((soul) => !publicLeadSoulIds.has(soul.id))
      .map((soul) => {
        const displayState = deriveDiscipleshipDisplayState({ personId: soul.personId, discipleshipStage: soul.discipleshipStage });
        const origin = ORIGINS.find((item) => item.value === soul.origin)?.label ?? soul.origin;
        return {
          key: `soul-${soul.id}`,
          kind: "soul",
          id: soul.id,
          name: soul.name,
          phone: soul.phone,
          email: soul.email,
          personId: soul.personId,
          statusLabel: soul.personId ? `Etapa: ${getDiscipleshipStageLabel(displayState.stage)}` : "Cadastro pendente",
          statusClassName: soul.personId
            ? "border-blue-200 bg-blue-50 text-blue-800"
            : "border-amber-200 bg-amber-50 text-amber-800",
          originLabel: origin,
          date: soul.decisionDate ?? soul.createdAt,
          soul,
        };
      });
    return [...publicRows, ...soulRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [publicLeadsQuery.data, publicLeadsQuery.isSuccess, souls]);

  const filteredNewSouls = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return unifiedNewSouls;
    return unifiedNewSouls.filter((record) =>
      record.name.toLocaleLowerCase("pt-BR").includes(query)
      || record.phone?.includes(search.trim())
      || record.email?.toLocaleLowerCase("pt-BR").includes(query)
      || record.originLabel.toLocaleLowerCase("pt-BR").includes(query)
    );
  }, [search, unifiedNewSouls]);

  const createSoul = trpc.souls.create.useMutation({
    onSuccess: async (result) => {
      setOpen(false);
      setForm(createInitialForm());
      setFormError("");
      await soulsQuery.refetch();
      await peopleQuery.refetch();
      toast.success(
        result.needsConsolidator
          ? "Visitante registrado. Defina um consolidador para iniciar o cuidado."
          : result.createdPerson
            ? "Nova alma registrada e ficha da Pessoa criada."
            : "Nova alma vinculada à ficha da Pessoa selecionada."
      );
    },
    onError: (error) => setFormError(error.message || "Não foi possível registrar a nova alma."),
  });

  function openNewSoulDialog() {
    setForm({ ...createInitialForm(), origin: isLimitedMember ? "indicacao" : "culto" });
    setFormError("");
    setOpen(true);
  }

  function closeDialog() {
    if (createSoul.isPending) return;
    setOpen(false);
    setFormError("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const name = form.name.trim();
    const today = currentCivilDateKey();

    if (!churchId) {
      setFormError("Não foi possível identificar a igreja ativa. Entre novamente e tente outra vez.");
      return;
    }
    if (name.length < 2) {
      setFormError("Informe o nome completo da nova alma.");
      return;
    }
    if (!isLimitedMember && !form.birthDate) {
      setFormError("Informe a data de nascimento para criar a ficha completa da Nova Alma.");
      return;
    }
    if (form.decisionDate > today) {
      setFormError("A data da decisão não pode estar no futuro.");
      return;
    }
    if (!isLimitedMember && form.origin !== "visita_espontanea" && !form.wonById) {
      setFormError("Selecione quem ganhou esta alma para Cristo.");
      return;
    }

    const soulInput = {
      churchId,
      name,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      birthDate: !isLimitedMember && form.birthDate ? form.birthDate : undefined,
      address: form.address.trim() || undefined,
      decisionDate: form.decisionDate,
      origin: isLimitedMember ? "indicacao" as const : form.origin,
      acceptedJesus: isLimitedMember ? false : form.acceptedJesus,
      reconciliation: isLimitedMember ? false : form.reconciliation,
      firstVisit: isLimitedMember ? false : form.firstVisit,
      notes: form.notes.trim() || undefined,
    };
    createSoul.mutate(isLimitedMember ? soulInput : {
      ...soulInput,
      wonById: form.wonById ? Number(form.wonById) : undefined,
      existingPersonId: form.existingPersonId === "new" ? undefined : Number(form.existingPersonId),
    });
  }


  return (
    <section className="space-y-5 md:space-y-6" aria-labelledby="ganhar-almas-title">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="ganhar-almas-title" className="text-2xl font-bold font-display text-navy">Novas Almas</h1>
          <p className="mt-1 text-sm text-muted-foreground">{isLimitedMember ? "Indique uma pessoa para que a liderança inicie o cuidado." : "Registre a entrada da pessoa sem misturar sua Jornada com a fila moderna de cuidado."}</p>
        </div>
        <Button onClick={openNewSoulDialog} className="w-full bg-navy text-white hover:bg-navy-light sm:w-auto">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {isLimitedMember ? "Indicar pessoa" : "Registrar nova alma"}
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4" aria-label="Resumo de novas almas e discípulos">
        <div className="metric-card flex min-h-12 items-center justify-between gap-2 border-amber-200 bg-amber-50/40 px-3 py-2 sm:block sm:min-h-0 sm:p-5">
          <p className="text-xl font-bold font-display text-navy sm:text-2xl">{souls.filter((soul) => !soul.personId).length}</p>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-800 sm:text-xs">Novas almas pendentes</Badge>
        </div>
        <div className="metric-card flex min-h-12 items-center justify-between gap-2 border-emerald-200 bg-emerald-50/40 px-3 py-2 sm:block sm:min-h-0 sm:p-5">
          <p className="text-xl font-bold font-display text-navy sm:text-2xl">{souls.filter((soul) => Boolean(soul.personId)).length}</p>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-800 sm:text-xs">Discípulos com ficha</Badge>
        </div>
        <div className="metric-card flex min-h-12 items-center justify-between gap-2 border-blue-200 bg-blue-50/40 px-3 py-2 sm:block sm:min-h-0 sm:p-5">
          <p className="text-xl font-bold font-display text-navy sm:text-2xl">{souls.filter((soul) => soul.discipleshipStage === "consolidacao").length}</p>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-[11px] font-medium text-blue-800 sm:text-xs">Etapa da Jornada: Consolidação</Badge>
        </div>
      </div>
      <p className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs leading-relaxed text-slate-600">
        <strong className="text-slate-800">Leitura dos estados:</strong> esta contagem mostra a etapa principal da Jornada da Pessoa. Ela não cria nem confirma um caso na fila moderna de Consolidação; casos de cuidado são acompanhados na aba Consolidação.
      </p>
      <section className="card-sacred space-y-4 border border-navy/10 p-4 sm:p-5" aria-labelledby="new-souls-list-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><Flame className="h-5 w-5 text-amber-500" aria-hidden="true" /><h2 id="new-souls-list-title" className="font-display text-xl font-bold text-navy">Fila de Novas Almas</h2></div>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Cadastros manuais e recebidos por QR Code, convite ou link aparecem aqui uma única vez. O Encontro com Deus continua em sua própria aba.</p>
          </div>
          {publicLeadsQuery.isSuccess && <Badge variant="outline" className="w-fit border-gold/30 bg-gold/5 text-gold"><QrCode className="mr-1 h-3.5 w-3.5" aria-hidden="true" />{publicLeadsQuery.data.length} online</Badge>}
        </div>
        {publicLeadsQuery.isError && !isLimitedMember && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Não foi possível carregar os cadastros online. A lista manual continua disponível; tente atualizar a página.</p>}
      </section>
      <div className="relative">
        <Label htmlFor="soul-search" className="sr-only">Buscar nova alma</Label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id="soul-search"
          placeholder="Buscar por nome, telefone ou e-mail"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9 pr-24"
          aria-describedby="soul-search-result"
        />
        {search && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setSearch("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            Limpar
          </Button>
        )}
      </div>
      <p id="soul-search-result" className="sr-only" aria-live="polite">{filteredNewSouls.length} registros encontrados.</p>

      {soulsQuery.isLoading || (!isLimitedMember && publicLeadsQuery.isLoading) ? (
        <div className="space-y-3" aria-label="Carregando novas almas">
          {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : soulsQuery.isError ? (
        <div className="card-sacred flex flex-col items-center gap-3 p-8 text-center">
          <p className="font-semibold text-navy">Não foi possível carregar as novas almas.</p>
          <Button type="button" variant="outline" onClick={() => soulsQuery.refetch()}>Tentar novamente</Button>
        </div>
      ) : filteredNewSouls.length === 0 ? (
        <div className="card-sacred flex flex-col items-center gap-3 p-8 text-center sm:p-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50"><Flame className="h-7 w-7 text-amber-500" aria-hidden="true" /></div>
          <p className="font-semibold text-navy">{search ? "Nenhuma alma encontrada" : "Nenhuma alma registrada"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{search ? "Ajuste sua busca ou limpe o filtro para ver todos os registros." : "Comece registrando a primeira pessoa da jornada."}</p>
          {search ? <Button type="button" variant="outline" onClick={() => setSearch("")}>Limpar busca</Button> : <Button type="button" onClick={openNewSoulDialog} className="bg-navy text-white">Registrar nova alma</Button>}
        </div>
      ) : (
        <div className="space-y-3 animate-stagger">
          {filteredNewSouls.map((record) => {
            return (
              <article key={record.key} className="card-sacred flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50"><Flame className="h-5 w-5 text-amber-500" aria-hidden="true" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-navy">{record.name}</p>
                    <Badge variant="outline" className={`text-[10px] ${record.statusClassName}`}>{record.statusLabel}</Badge>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                    <span className="min-w-0 truncate" title={record.email ?? undefined}><strong className="font-medium text-slate-900">E-mail:</strong> {record.email ?? "Não informado"}</span>
                    <span><strong className="font-medium text-slate-900">WhatsApp:</strong> {record.phone ?? "Não informado"}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{record.originLabel}</span>
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" aria-hidden="true" />{formatContactDate(record.date)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <SoulContactActions name={record.name} email={record.email} phone={record.phone} />
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {record.soul?.acceptedJesus && <Badge className="border border-green-200 bg-green-50 text-green-700 hover:bg-green-50">Aceitou Jesus</Badge>}
                    {record.kind === "public" ? <>
                      <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">Status<select aria-label={`Status do cadastro de ${record.name}`} value={record.lead?.status} disabled={updatePublicLeadStatus.isPending || isPublicLeadConversionPending} onChange={(event) => record.lead && updatePublicLeadStatus.mutate({ churchId: churchId!, id: record.lead.id, status: event.target.value as keyof typeof PUBLIC_LEAD_STATUS })} className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"><option value="novo">Novo</option><option value="em_atendimento">Em atendimento</option><option value="convertido">Convertido</option><option value="encerrado">Encerrado</option></select></label>
                      {record.personId ? <Button type="button" size="sm" variant="outline" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={() => navigate(`/app/pessoas?personId=${record.personId}&section=jornada`)}><Users className="mr-1.5 h-4 w-4" aria-hidden="true" />Abrir ficha em Discípulos</Button> : <Button type="button" size="sm" variant="outline" className="border-navy/20 text-navy hover:bg-navy/5" disabled={isPublicLeadConversionPending} onClick={() => record.lead && handleConvertPublicLead(record.lead)}><Users className="mr-1.5 h-4 w-4" aria-hidden="true" />{isPublicLeadConversionPending ? "Convertendo…" : "Converter em Discípulo"}</Button>}
                    </> : record.personId ? <Button type="button" size="sm" variant="outline" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={() => navigate(`/app/pessoas?personId=${record.personId}&section=jornada`)}><Users className="mr-1.5 h-4 w-4" aria-hidden="true" />Abrir ficha</Button> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeDialog())}>
        <AdaptiveFormDialogContent>
          <div className={adaptiveFormDialogHeaderClassName}>
            <DialogTitle className="flex items-center gap-2 font-display text-navy"><Flame className="h-5 w-5 text-amber-500" aria-hidden="true" />{isLimitedMember ? "Indicar nova alma" : "Registrar nova alma"}</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">{isLimitedMember ? "Informe os dados básicos; a liderança fará a revisão e definirá o próximo passo." : "Registre as informações essenciais para iniciar o cuidado e a consolidação."}</p>
          </div>

          {peopleQuery.isLoading && !isLimitedMember ? (
            <AdaptiveFormDialogBody className="py-8 text-center text-sm text-muted-foreground">Carregando pessoas da igreja…</AdaptiveFormDialogBody>
          ) : peopleQuery.isError && !isLimitedMember ? (
            <AdaptiveFormDialogBody className="rounded-lg border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Não foi possível carregar as pessoas da igreja. Feche e tente novamente.</AdaptiveFormDialogBody>
          ) : (
            <form onSubmit={handleSubmit} className="contents" noValidate>
              <AdaptiveFormDialogBody className="space-y-5">
              {formError && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{formError}</div>}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="soul-name">Nome completo *</Label>
                  <Input id="soul-name" autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nome da pessoa" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="soul-phone">Telefone</Label>
                  <Input id="soul-phone" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="(00) 00000-0000" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="soul-email">E-mail</Label>
                  <Input id="soul-email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="nome@email.com" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="soul-birth-date">Data de nascimento{!isLimitedMember ? " *" : ""}</Label>
                  <Input id="soul-birth-date" type="date" max={currentCivilDateKey()} required={!isLimitedMember} value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} className="mt-1" />
                  {!isLimitedMember && <p className="mt-1 text-xs text-muted-foreground">Usaremos esta data na lista de aniversariantes.</p>}
                </div>
                {!isLimitedMember && <div className="sm:col-span-2 rounded-lg border border-gold/25 bg-gold/5 p-3">
                  <Label htmlFor="soul-existing-person" className="text-navy">Ficha central da Pessoa</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Uma ficha será criada automaticamente. Se esta pessoa já estiver cadastrada, selecione-a para preservar o histórico em um só lugar.</p>
                  <Select value={form.existingPersonId} onValueChange={(value) => setForm({ ...form, existingPersonId: value })}>
                    <SelectTrigger id="soul-existing-person" className="mt-3 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Criar nova ficha de Pessoa</SelectItem>
                      {people.map((person) => <SelectItem key={person.id} value={String(person.id)}>Usar: {person.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {form.existingPersonId === "new" && possibleMatchesQuery.data && possibleMatchesQuery.data.length > 0 && (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950" role="status">
                      <strong>Possível ficha já cadastrada:</strong>{" "}
                      {possibleMatchesQuery.data.map((person) => person.fullName).join(", ")}. Se for a mesma pessoa, escolha-a acima para evitar duplicidade.
                    </div>
                  )}
                </div>}
                <div>
                  <Label htmlFor="soul-decision-date">Data da decisão *</Label>
                  <Input id="soul-decision-date" type="date" max={currentCivilDateKey()} value={form.decisionDate} onChange={(event) => setForm({ ...form, decisionDate: event.target.value })} className="mt-1" />
                </div>
                {!isLimitedMember && (<div>
                  <Label htmlFor="soul-origin">Origem *</Label>
                  <Select value={form.origin} onValueChange={(value) => setForm({ ...form, origin: value as Origin, wonById: value === "visita_espontanea" ? "" : form.wonById })}>
                    <SelectTrigger id="soul-origin" className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{ORIGINS.map((origin) => <SelectItem key={origin.value} value={origin.value}>{origin.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>)}
                {!isLimitedMember && (form.origin === "visita_espontanea" ? (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                    <strong>Chegou por conta própria.</strong> Registre o visitante agora; depois, um pastor ou líder poderá definir o consolidador responsável pelo primeiro contato.
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="soul-winner-search">Quem ganhou? *</Label>
                    <Popover open={winnerSearchOpen} onOpenChange={setWinnerSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="soul-winner-search"
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={winnerSearchOpen}
                          className="mt-1 w-full justify-between font-normal"
                        >
                          {selectedWinner ? selectedWinner.fullName : "Buscar por nome ou telefone"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[min(28rem,calc(100vw-3rem))] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Digite nome ou telefone…" />
                          <CommandList className="max-h-64">
                            <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
                            <CommandGroup heading="Pessoas da igreja">
                              {people.map((person) => (
                                <CommandItem
                                  key={person.id}
                                  value={`${person.fullName} ${person.phone ?? ""} ${person.whatsapp ?? ""}`}
                                  onSelect={() => {
                                    setForm({ ...form, wonById: String(person.id) });
                                    setWinnerSearchOpen(false);
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${selectedWinner?.id === person.id ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
                                  <span className="min-w-0 flex-1 truncate">{person.fullName}</span>
                                  {(person.phone ?? person.whatsapp) && <span className="ml-2 shrink-0 text-xs text-muted-foreground">{person.phone ?? person.whatsapp}</span>}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedWinner && (
                      <Button type="button" variant="ghost" size="sm" className="mt-1 h-auto px-0 text-xs text-muted-foreground hover:text-navy" onClick={() => setForm({ ...form, wonById: "" })}>
                        <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Trocar pessoa selecionada
                      </Button>
                    )}
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <Label htmlFor="soul-address">Endereço</Label>
                  <Input id="soul-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Rua, número e bairro" className="mt-1" />
                </div>
              </div>

              {!isLimitedMember && <fieldset className="space-y-3 rounded-lg border border-border p-3">
                <legend className="px-1 text-sm font-semibold text-navy">Informações da decisão</legend>
                <label className="flex min-h-7 items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.acceptedJesus} onChange={(event) => setForm({ ...form, acceptedJesus: event.target.checked })} className="h-4 w-4 accent-navy" />Aceitou Jesus</label>
                <label className="flex min-h-7 items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.reconciliation} onChange={(event) => setForm({ ...form, reconciliation: event.target.checked })} className="h-4 w-4 accent-navy" />Reconciliação</label>
                <label className="flex min-h-7 items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.firstVisit} onChange={(event) => setForm({ ...form, firstVisit: event.target.checked })} className="h-4 w-4 accent-navy" />Primeira visita</label>
              </fieldset>}

              <div>
                <Label htmlFor="soul-notes">Observações</Label>
                <Textarea id="soul-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Informações que ajudem no primeiro contato" rows={3} className="mt-1" />
              </div>

              </AdaptiveFormDialogBody>
              <AdaptiveFormDialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} disabled={createSoul.isPending}>Cancelar</Button>
                <Button type="submit" className="bg-navy text-white hover:bg-navy-light" disabled={createSoul.isPending}>{createSoul.isPending ? "Enviando…" : isLimitedMember ? "Enviar indicação" : "Registrar nova alma"}</Button>
              </AdaptiveFormDialogFooter>
            </form>
          )}
        </AdaptiveFormDialogContent>
      </Dialog>

      <ConfirmDestructiveActionDialog
        open={Boolean(pendingPublicLeadConversion)}
        title="Converter em Discípulo?"
        description={
          pendingPublicLeadConversion ? (
            <>
              O sistema verificará o WhatsApp cadastrado de{" "}
              <strong>{pendingPublicLeadConversion.name}</strong>. Se encontrar uma única ficha ativa, fará o vínculo. Se encontrar mais de uma, pedirá uma revisão. Se não encontrar nenhuma, criará uma nova ficha.
            </>
          ) : (
            ""
          )
        }
        cancelLabel="Continuar como cadastro"
        confirmLabel="Converter em Discípulo"
        pendingLabel="Convertendo…"
        pending={isPublicLeadConversionPending}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isPublicLeadConversionPending) {
            setPendingPublicLeadConversion(null);
            setIsConfirmingPublicLead(false);
          }
        }}
        onCancel={() => {
          setPendingPublicLeadConversion(null);
          setIsConfirmingPublicLead(false);
        }}
        onConfirm={handleConfirmPublicLeadConversion}
      />
    </section>
  );
}
