import { useChurch } from "@/components/ChurchLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Check, ChevronsUpDown, Flame, Plus, Search, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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

const STATUS_MAP = {
  nova_alma: { label: "Nova alma", class: "badge-nova-alma" },
  em_consolidacao: { label: "Em consolidação", class: "badge-consolidacao" },
  consolidado: { label: "Consolidado", class: "badge-celula" },
} as const;

function createInitialForm() {
  return {
    name: "",
    phone: "",
    address: "",
    decisionDate: new Date().toISOString().slice(0, 10),
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
  const { churchId } = useChurch();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(createInitialForm);
  const [formError, setFormError] = useState("");
  const [winnerSearchOpen, setWinnerSearchOpen] = useState(false);

  const soulsQuery = trpc.souls.list.useQuery(
    { churchId: churchId! },
    { enabled: Boolean(churchId) }
  );
  const peopleQuery = trpc.people.list.useQuery(
    { churchId: churchId! },
    { enabled: Boolean(churchId) }
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
    enabled: Boolean(churchId && possibleMatchInput.fullName.length >= 2),
  });

  const souls = soulsQuery.data ?? [];
  const people = peopleQuery.data ?? [];
  const selectedWinner = people.find((person) => String(person.id) === form.wonById);
  const filteredSouls = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return souls;
    return souls.filter((soul) =>
      soul.name.toLocaleLowerCase("pt-BR").includes(query) || soul.phone?.includes(search.trim())
    );
  }, [search, souls]);

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
    setForm(createInitialForm());
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
    const today = new Date().toISOString().slice(0, 10);

    if (!churchId) {
      setFormError("Não foi possível identificar a igreja ativa. Entre novamente e tente outra vez.");
      return;
    }
    if (name.length < 2) {
      setFormError("Informe o nome completo da nova alma.");
      return;
    }
    if (form.decisionDate > today) {
      setFormError("A data da decisão não pode estar no futuro.");
      return;
    }
    if (form.origin !== "visita_espontanea" && !form.wonById) {
      setFormError("Selecione quem ganhou esta alma para Cristo.");
      return;
    }

    createSoul.mutate({
      churchId,
      name,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      decisionDate: form.decisionDate,
      origin: form.origin,
      acceptedJesus: form.acceptedJesus,
      reconciliation: form.reconciliation,
      firstVisit: form.firstVisit,
      wonById: form.wonById ? Number(form.wonById) : undefined,
      existingPersonId: form.existingPersonId === "new" ? undefined : Number(form.existingPersonId),
      notes: form.notes.trim() || undefined,
    });
  }

  const stats = (["nova_alma", "em_consolidacao", "consolidado"] as const).map((status) => ({
    status,
    count: souls.filter((soul) => soul.status === status).length,
    ...STATUS_MAP[status],
  }));

  return (
    <section className="space-y-5 md:space-y-6" aria-labelledby="ganhar-almas-title">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="ganhar-almas-title" className="text-2xl font-bold font-display text-navy">Ganhar Almas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registre decisões de fé e inicie o acompanhamento com clareza.</p>
        </div>
        <Button onClick={openNewSoulDialog} className="w-full bg-navy text-white hover:bg-navy-light sm:w-auto">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Nova alma
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4" aria-label="Resumo das novas almas">
        {stats.map(({ status, count, label, class: className }) => (
          <div key={status} className="metric-card flex items-center justify-between gap-3 sm:block">
            <p className="text-2xl font-bold font-display text-navy">{count}</p>
            <Badge variant="outline" className={`font-medium ${className}`}>{label}</Badge>
          </div>
        ))}
      </div>

      <div className="relative">
        <Label htmlFor="soul-search" className="sr-only">Buscar nova alma</Label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id="soul-search"
          placeholder="Buscar por nome ou telefone"
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
      <p id="soul-search-result" className="sr-only" aria-live="polite">{filteredSouls.length} registros encontrados.</p>

      {soulsQuery.isLoading ? (
        <div className="space-y-3" aria-label="Carregando novas almas">
          {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : soulsQuery.isError ? (
        <div className="card-sacred flex flex-col items-center gap-3 p-8 text-center">
          <p className="font-semibold text-navy">Não foi possível carregar as novas almas.</p>
          <Button type="button" variant="outline" onClick={() => soulsQuery.refetch()}>Tentar novamente</Button>
        </div>
      ) : filteredSouls.length === 0 ? (
        <div className="card-sacred flex flex-col items-center gap-3 p-8 text-center sm:p-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50"><Flame className="h-7 w-7 text-amber-500" aria-hidden="true" /></div>
          <p className="font-semibold text-navy">{search ? "Nenhuma alma encontrada" : "Nenhuma alma registrada"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{search ? "Ajuste sua busca ou limpe o filtro para ver todos os registros." : "Comece registrando a primeira decisão de fé."}</p>
          {search ? <Button type="button" variant="outline" onClick={() => setSearch("")}>Limpar busca</Button> : <Button type="button" onClick={openNewSoulDialog} className="bg-navy text-white">Registrar nova alma</Button>}
        </div>
      ) : (
        <div className="space-y-3 animate-stagger">
          {filteredSouls.map((soul) => {
            const status = STATUS_MAP[soul.status];
            const origin = ORIGINS.find((item) => item.value === soul.origin)?.label ?? soul.origin;
            return (
              <article key={soul.id} className="card-sacred flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50"><Flame className="h-5 w-5 text-amber-500" aria-hidden="true" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-navy">{soul.name}</p>
                    {soul.personId && <Badge variant="outline" className="border-navy/15 bg-navy/5 text-[10px] text-navy">Ficha vinculada</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {soul.phone && <span>{soul.phone}</span>}
                    <span>{origin}</span>
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" aria-hidden="true" />{new Date(soul.decisionDate).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {soul.acceptedJesus && <Badge className="border border-green-200 bg-green-50 text-green-700 hover:bg-green-50">Aceitou Jesus</Badge>}
                  <Badge variant="outline" className={status.class}>{status.label}</Badge>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto rounded-xl p-5 sm:max-w-xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-navy"><Flame className="h-5 w-5 text-amber-500" aria-hidden="true" />Registrar nova alma</DialogTitle>
            <DialogDescription>Registre as informações essenciais para iniciar o cuidado e a consolidação.</DialogDescription>
          </DialogHeader>

          {peopleQuery.isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Carregando pessoas da igreja…</div>
          ) : peopleQuery.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Não foi possível carregar as pessoas da igreja. Feche e tente novamente.</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
                <div className="sm:col-span-2 rounded-lg border border-gold/25 bg-gold/5 p-3">
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
                </div>
                <div>
                  <Label htmlFor="soul-decision-date">Data da decisão *</Label>
                  <Input id="soul-decision-date" type="date" max={new Date().toISOString().slice(0, 10)} value={form.decisionDate} onChange={(event) => setForm({ ...form, decisionDate: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="soul-origin">Origem *</Label>
                  <Select value={form.origin} onValueChange={(value) => setForm({ ...form, origin: value as Origin, wonById: value === "visita_espontanea" ? "" : form.wonById })}>
                    <SelectTrigger id="soul-origin" className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{ORIGINS.map((origin) => <SelectItem key={origin.value} value={origin.value}>{origin.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.origin === "visita_espontanea" ? (
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
                )}
                <div className="sm:col-span-2">
                  <Label htmlFor="soul-address">Endereço</Label>
                  <Input id="soul-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Rua, número e bairro" className="mt-1" />
                </div>
              </div>

              <fieldset className="space-y-3 rounded-lg border border-border p-3">
                <legend className="px-1 text-sm font-semibold text-navy">Informações da decisão</legend>
                <label className="flex min-h-7 items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.acceptedJesus} onChange={(event) => setForm({ ...form, acceptedJesus: event.target.checked })} className="h-4 w-4 accent-navy" />Aceitou Jesus</label>
                <label className="flex min-h-7 items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.reconciliation} onChange={(event) => setForm({ ...form, reconciliation: event.target.checked })} className="h-4 w-4 accent-navy" />Reconciliação</label>
                <label className="flex min-h-7 items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.firstVisit} onChange={(event) => setForm({ ...form, firstVisit: event.target.checked })} className="h-4 w-4 accent-navy" />Primeira visita</label>
              </fieldset>

              <div>
                <Label htmlFor="soul-notes">Observações</Label>
                <Textarea id="soul-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Informações que ajudem no primeiro contato" rows={3} className="mt-1" />
              </div>

              <div className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-2 border-t border-border bg-background px-5 pt-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
                <Button type="button" variant="outline" onClick={closeDialog} disabled={createSoul.isPending}>Cancelar</Button>
                <Button type="submit" className="bg-navy text-white hover:bg-navy-light" disabled={createSoul.isPending}>{createSoul.isPending ? "Registrando…" : "Registrar nova alma"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
