import { useMemo, useState } from "react";
import { useChurch } from "@/components/ChurchLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { currentCivilDateKey } from "@/lib/civilDate";
import { CalendarCheck2, ChevronLeft, Lock, LockOpen, Minus, Plus, Search, UserCheck, Users } from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  nova_alma: "Nova alma",
  consolidacao: "Consolidação",
  celula: "Célula",
  fundamentos: "Fundamentos",
  batismo: "Batismo",
  escola_de_lideres: "Escola de líderes",
  lideranca: "Liderança",
};

function stageLabel(stage: string | null): string {
  if (!stage) return "";
  return STAGE_LABELS[stage] ?? stage.replaceAll("_", " ");
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function formatServiceDate(date: string): string {
  // date = AAAA-MM-DD → DD/MM
  const [, m, d] = date.split("-");
  if (!m || !d) return date;
  return `${d}/${m}`;
}

export default function PresencaCulto() {
  const { churchId } = useChurch();
  const [serviceId, setServiceId] = useState<number | null>(null);

  if (serviceId === null) {
    return <ServicePicker churchId={churchId} onSelect={setServiceId} />;
  }
  return <MarkingScreen churchId={churchId} serviceId={serviceId} onBack={() => setServiceId(null)} />;
}

// ─── Seletor de culto ──────────────────────────────────────────────────────────
function ServicePicker({ churchId, onSelect }: { churchId: number; onSelect: (id: number) => void }) {
  const utils = trpc.useUtils();
  const services = trpc.presenca.services.useQuery({ churchId }, { enabled: churchId > 0 });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("Culto");
  const [date, setDate] = useState(() => currentCivilDateKey());
  const [time, setTime] = useState("");

  const createService = trpc.presenca.createService.useMutation({
    onSuccess: async (service) => {
      setCreating(false);
      await utils.presenca.services.invalidate({ churchId });
      onSelect(service.id);
    },
    onError: (err) => toast.error(err.message || "Não foi possível criar o culto."),
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-navy">Presença no culto</h1>
          <p className="mt-1 text-sm text-muted-foreground">Escolha o culto para marcar a presença.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="shrink-0">
          <Plus className="mr-1 h-4 w-4" /> Novo culto
        </Button>
      </div>

      <div className="mt-5 space-y-2">
        {services.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {services.data && services.data.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum culto ainda. Toque em “Novo culto” para começar.
          </div>
        )}
        {services.data?.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-muted/60"
            style={{ touchAction: "manipulation" }}
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-navy">{s.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatServiceDate(s.serviceDate)}
                {s.startTime ? ` · ${s.startTime}` : ""}
                {s.sessionStatus === "fechada" ? " · fechado" : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-navy">
              <UserCheck className="h-4 w-4 text-gold" />
              {s.presentCount}
            </div>
          </button>
        ))}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo culto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="culto-nome">Nome</Label>
              <Input id="culto-nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Culto de domingo" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="culto-data">Data</Label>
                <Input id="culto-data" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="culto-hora">Hora (opcional)</Label>
                <Input id="culto-hora" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={createService.isPending || name.trim().length < 2 || !date}
              onClick={() => createService.mutate({ churchId, name: name.trim(), serviceDate: date, startTime: time || null })}
            >
              {createService.isPending ? "Criando…" : "Criar e marcar presença"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tela de marcação ──────────────────────────────────────────────────────────
function MarkingScreen({ churchId, serviceId, onBack }: { churchId: number; serviceId: number; onBack: () => void }) {
  const utils = trpc.useUtils();
  const input = { churchId, serviceId };
  const roster = trpc.presenca.roster.useQuery(input, { enabled: churchId > 0, refetchInterval: 5000, refetchOnWindowFocus: true });
  const [search, setSearch] = useState("");
  const [cellFilter, setCellFilter] = useState("all");
  const [ministryFilter, setMinistryFilter] = useState("all");
  const [onlyAbsent, setOnlyAbsent] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const mark = trpc.presenca.mark.useMutation({
    onMutate: async (vars) => {
      await utils.presenca.roster.cancel(input);
      const prev = utils.presenca.roster.getData(input);
      utils.presenca.roster.setData(input, (old) => {
        if (!old) return old;
        const people = old.people.map((p) =>
          p.personId === vars.personId
            ? { ...p, present: vars.present, status: vars.present ? (vars.status ?? "presente") : null, source: vars.present ? ("manual" as const) : null }
            : p
        );
        const presentCount = people.filter((p) => p.present && p.status !== "justificado").length;
        const justifiedCount = people.filter((p) => p.status === "justificado").length;
        return { ...old, people, presentCount, justifiedCount };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.presenca.roster.setData(input, ctx.prev);
      toast.error("Não foi possível salvar. Tente de novo.");
    },
    onSettled: () => utils.presenca.roster.invalidate(input),
  });

  const setVisitors = trpc.presenca.setVisitors.useMutation({
    onMutate: async (vars) => {
      await utils.presenca.roster.cancel(input);
      const prev = utils.presenca.roster.getData(input);
      utils.presenca.roster.setData(input, (old) => (old ? { ...old, session: { ...old.session, visitorsCount: vars.count } } : old));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.presenca.roster.setData(input, ctx.prev);
    },
    onSettled: () => utils.presenca.roster.invalidate(input),
  });

  const setSessionStatus = trpc.presenca.setSessionStatus.useMutation({
    onSuccess: () => utils.presenca.roster.invalidate(input),
    onError: (err) => toast.error(err.message || "Não foi possível alterar o culto."),
  });

  const data = roster.data;
  const closed = data?.session.status === "fechada";

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = normalize(search.trim());
    const cellId = cellFilter === "all" ? null : Number(cellFilter);
    const ministryId = ministryFilter === "all" ? null : Number(ministryFilter);
    return data.people.filter((p) => {
      if (q && !normalize(p.fullName).includes(q)) return false;
      if (cellId !== null && !p.cellIds.includes(cellId)) return false;
      if (ministryId !== null && !p.ministryIds.includes(ministryId)) return false;
      if (onlyAbsent && p.present) return false;
      return true;
    });
  }, [data, search, cellFilter, ministryFilter, onlyAbsent]);

  if (roster.isLoading || !data) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <button onClick={onBack} className="mb-4 inline-flex items-center text-sm text-muted-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
        </button>
        <p className="text-sm text-muted-foreground">Carregando lista…</p>
      </div>
    );
  }

  if (showReport) {
    return <ReportView churchId={churchId} serviceId={serviceId} onBack={() => setShowReport(false)} serviceName={data.service.name} />;
  }

  const visitors = data.session.visitorsCount;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4" style={{ overscrollBehavior: "contain" }}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={onBack} className="inline-flex items-center text-sm text-muted-foreground" style={{ touchAction: "manipulation" }}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Cultos
        </button>
        <button onClick={() => setShowReport(true)} className="text-sm font-semibold text-navy underline" style={{ touchAction: "manipulation" }}>
          Relatório
        </button>
      </div>

      <div className="mt-2">
        <h1 className="font-display text-lg font-semibold text-navy">{data.service.name}</h1>
        <p className="text-xs text-muted-foreground">
          {formatServiceDate(data.service.serviceDate)}
          {data.service.startTime ? ` · ${data.service.startTime}` : ""}
        </p>
      </div>

      {/* Resumo + ações */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-lg bg-gold/10 px-3 py-1.5 text-sm font-semibold text-navy">
          <UserCheck className="h-4 w-4 text-gold" /> {data.presentCount} presentes
        </div>
        {data.justifiedCount > 0 && (
          <div className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground">
            {data.justifiedCount} justificados
          </div>
        )}
        <div className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-sm text-navy">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="px-1">visitantes</span>
          <button aria-label="Menos visitantes" className="flex h-7 w-7 items-center justify-center rounded-md border border-border active:bg-muted" style={{ touchAction: "manipulation" }} onClick={() => setVisitors.mutate({ churchId, serviceId, count: Math.max(0, visitors - 1) })}>
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-6 text-center font-semibold">{visitors}</span>
          <button aria-label="Mais visitantes" className="flex h-7 w-7 items-center justify-center rounded-md border border-border active:bg-muted" style={{ touchAction: "manipulation" }} onClick={() => setVisitors.mutate({ churchId, serviceId, count: visitors + 1 })}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => setSessionStatus.mutate({ churchId, serviceId, status: closed ? "aberta" : "fechada" })}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-navy active:bg-muted"
          style={{ touchAction: "manipulation" }}
        >
          {closed ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {closed ? "Reabrir" : "Fechar"}
        </button>
      </div>

      {closed && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Presença fechada. Reabra para editar.
        </div>
      )}

      {/* Busca + filtros */}
      <div className="sticky top-0 z-10 mt-3 space-y-2 bg-background py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pelo nome…" className="pl-9" inputMode="search" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={cellFilter} onValueChange={setCellFilter}>
            <SelectTrigger className="h-9 w-auto min-w-28"><SelectValue placeholder="Célula" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as células</SelectItem>
              {data.cells.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ministryFilter} onValueChange={setMinistryFilter}>
            <SelectTrigger className="h-9 w-auto min-w-28"><SelectValue placeholder="Ministério" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os ministérios</SelectItem>
              {data.ministries.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <button
            onClick={() => setOnlyAbsent((v) => !v)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${onlyAbsent ? "border-navy bg-navy text-white" : "border-border text-navy"}`}
            style={{ touchAction: "manipulation" }}
          >
            Só ausentes
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} de {data.people.length} pessoas</p>
      </div>

      {/* Lista */}
      <div className="mt-1 space-y-1 pb-24">
        {filtered.map((p) => {
          const justified = p.status === "justificado";
          return (
            <div
              key={p.personId}
              className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${p.present ? (justified ? "border-amber-300 bg-amber-50" : "border-gold/40 bg-gold/5") : "border-border bg-card"}`}
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                disabled={closed || mark.isPending}
                onClick={() => mark.mutate({ churchId, serviceId, personId: p.personId, present: !p.present })}
                style={{ touchAction: "manipulation" }}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  {p.photoUrl ? <AvatarImage src={p.photoUrl} alt={p.fullName} /> : null}
                  <AvatarFallback className="bg-navy/10 text-xs font-semibold text-navy">{initials(p.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy">{p.fullName}</p>
                  {stageLabel(p.stage) && <p className="truncate text-xs text-muted-foreground">{stageLabel(p.stage)}</p>}
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-1.5">
                {p.present && (
                  <button
                    disabled={closed}
                    onClick={() => mark.mutate({ churchId, serviceId, personId: p.personId, present: true, status: justified ? "presente" : "justificado" })}
                    className={`rounded-md px-2 py-1 text-xs font-medium ${justified ? "bg-amber-200 text-amber-900" : "border border-border text-muted-foreground"}`}
                    style={{ touchAction: "manipulation" }}
                  >
                    {justified ? "Justificado" : "Justif."}
                  </button>
                )}
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${p.present ? "bg-gold text-white" : "border border-border text-transparent"}`}
                  aria-hidden
                >
                  <UserCheck className="h-5 w-5" />
                </span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Ninguém encontrado com esses filtros.</p>}
      </div>
    </div>
  );
}

// ─── Relatório ─────────────────────────────────────────────────────────────────
function ReportView({ churchId, serviceId, onBack, serviceName }: { churchId: number; serviceId: number; onBack: () => void; serviceName: string }) {
  const report = trpc.presenca.report.useQuery({ churchId, serviceId }, { enabled: churchId > 0 });
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <button onClick={onBack} className="inline-flex items-center text-sm text-muted-foreground" style={{ touchAction: "manipulation" }}>
        <ChevronLeft className="mr-1 h-4 w-4" /> Voltar à marcação
      </button>
      <h1 className="mt-2 flex items-center gap-2 font-display text-lg font-semibold text-navy">
        <CalendarCheck2 className="h-5 w-5 text-gold" /> Relatório — {serviceName}
      </h1>
      {report.isLoading && <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>}
      {report.data && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Presentes" value={report.data.presentCount} />
            <Stat label="Justificados" value={report.data.justifiedCount} />
            <Stat label="Ausentes" value={report.data.absentCount} />
            <Stat label="Visitantes" value={report.data.visitorsCount} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {report.data.presentCount + report.data.justifiedCount} de {report.data.totalMembers} membros marcados.
          </p>
          <h2 className="mt-5 text-sm font-semibold text-navy">Ausentes ({report.data.absentCount})</h2>
          <div className="mt-2 space-y-1">
            {report.data.absent.length === 0 && <p className="text-sm text-muted-foreground">Ninguém ausente. 🎉</p>}
            {report.data.absent.map((a) => (
              <div key={a.personId} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-navy">{a.fullName}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
