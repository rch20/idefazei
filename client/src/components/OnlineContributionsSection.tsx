import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdaptiveFormDialogBody, AdaptiveFormDialogContent, AdaptiveFormDialogFooter, adaptiveFormDialogHeaderClassName } from "@/components/AdaptiveFormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currentCivilDateKey, formatCivilDateKeyForInput } from "@/lib/civilDate";
import { formatBrl, formatDatePtBr, parseBrlToCents } from "@/lib/treasury";
import { AlertCircle, CheckCircle2, Clock3, Eye, FileText, Loader2, Search, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

type ContributionStatus = "pendente" | "aprovada" | "recusada";
type ContributionType = "dizimo" | "oferta" | "primicias";
type ReviewMode = "approve" | "reject" | null;

type AccountOption = { id: number; name: string };
type CategoryOption = { id: number; name: string; key?: string | null };

type Props = {
  churchId: number;
  accounts: AccountOption[];
  entryCategories: CategoryOption[];
};

const STATUS_LABELS: Record<ContributionStatus, string> = {
  pendente: "Em análise",
  aprovada: "Aprovada",
  recusada: "Recusada",
};

const TYPE_LABELS: Record<ContributionType, string> = {
  dizimo: "Dízimo",
  oferta: "Oferta",
  primicias: "Primícias",
};

const STATUS_STYLES: Record<ContributionStatus, string> = {
  pendente: "border-amber-200 bg-amber-50 text-amber-800",
  aprovada: "border-emerald-200 bg-emerald-50 text-emerald-800",
  recusada: "border-rose-200 bg-rose-50 text-rose-800",
};

function dateInput(value: string | Date | null | undefined) {
  return value ? formatCivilDateKeyForInput(value) : currentCivilDateKey();
}

function readableDate(value: string | Date | null | undefined) {
  return value ? formatDatePtBr(value) : "Não informada";
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function OnlineContributionsSection({ churchId, accounts, entryCategories }: Props) {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<ContributionStatus | "todos">("pendente");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [proofPreviewOpen, setProofPreviewOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState<ReviewMode>(null);
  const [confirmedAmount, setConfirmedAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(currentCivilDateKey());
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const contributionsQuery = trpc.treasury.onlineContributions.useQuery(
    { churchId },
    { enabled: Boolean(churchId) },
  );
  const approveContribution = trpc.treasury.approveOnlineContribution.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.treasury.onlineContributions.invalidate(),
        utils.treasury.onlineContribution.invalidate(),
        utils.treasury.overview.invalidate(),
      ]);
      closeReview(true);
      setSelectedId(null);
      toast.success("Contribuição aprovada e lançada no livro-caixa.");
    },
    onError: (error) => toast.error(error.message),
  });
  const rejectContribution = trpc.treasury.rejectOnlineContribution.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.treasury.onlineContributions.invalidate(),
        utils.treasury.onlineContribution.invalidate(),
      ]);
      closeReview(true);
      setSelectedId(null);
      toast.success("Contribuição recusada com justificativa.");
    },
    onError: (error) => toast.error(error.message),
  });

  const rawContributions = contributionsQuery.data ?? [];
  const contributions = rawContributions.filter((item): item is NonNullable<typeof item> => item !== null);
  const selected = contributions.find((item) => item.contribution.id === selectedId) ?? null;
  const filteredContributions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    return contributions.filter(({ contribution, person }) => {
      const matchesStatus = statusFilter === "todos" || contribution.status === statusFilter;
      const matchesSearch = !normalizedSearch || person.fullName.toLocaleLowerCase("pt-BR").includes(normalizedSearch) || String(contribution.id).includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [contributions, search, statusFilter]);
  const counts = useMemo(() => ({
    pendente: contributions.filter(({ contribution }) => contribution.status === "pendente").length,
    aprovada: contributions.filter(({ contribution }) => contribution.status === "aprovada").length,
    recusada: contributions.filter(({ contribution }) => contribution.status === "recusada").length,
  }), [contributions]);

  function closeReview(force = false) {
    if (!force && (approveContribution.isPending || rejectContribution.isPending)) return;
    setReviewMode(null);
    setReviewNotes("");
    setRejectionReason("");
    approveContribution.reset();
    rejectContribution.reset();
  }

  function openDetails(id: number) {
    setSelectedId(id);
    setProofPreviewOpen(false);
    setReviewMode(null);
  }

  function openProofPreview() {
    if (!selected?.contribution.signedProofUrl) return;
    setProofPreviewOpen(true);
  }

  function openReview(mode: Exclude<ReviewMode, null>) {
    if (!selected) return;
    setConfirmedAmount(centsToInput(selected.contribution.informedAmountCents));
    setPaymentDate(dateInput(selected.contribution.paymentDate));
    setAccountId(String(accounts[0]?.id ?? ""));
    setCategoryId(String(entryCategories.find((category) => category.key === selected.contribution.type)?.id ?? entryCategories[0]?.id ?? ""));
    setReviewNotes("");
    setRejectionReason("");
    approveContribution.reset();
    rejectContribution.reset();
    setReviewMode(mode);
  }

  function centsToInput(cents: number) {
    return (cents / 100).toFixed(2).replace(".", ",");
  }

  function submitApproval(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const amountCents = parseBrlToCents(confirmedAmount);
    if (!amountCents || amountCents <= 0) {
      toast.error("Informe um valor confirmado válido.");
      return;
    }
    if (!accountId || !categoryId) {
      toast.error("Selecione a conta e a categoria que receberão o lançamento.");
      return;
    }
    approveContribution.mutate({
      churchId,
      id: selected.contribution.id,
      accountId: Number(accountId),
      categoryId: Number(categoryId),
      confirmedAmountCents: amountCents,
      paymentDate,
      reviewNotes: reviewNotes.trim() || undefined,
    });
  }

  function submitRejection(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const reason = rejectionReason.trim();
    if (reason.length < 5) {
      toast.error("Explique o motivo da recusa com pelo menos 5 caracteres.");
      return;
    }
    rejectContribution.mutate({
      churchId,
      id: selected.contribution.id,
      rejectionReason: reason,
      reviewNotes: reviewNotes.trim() || undefined,
    });
  }

  return (
    <>
      <Card className="border-gold/30 bg-gold/5 shadow-sm">
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl text-navy"><ShieldCheck className="h-5 w-5 text-gold" /> Contribuições on-line</CardTitle>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Confira o comprovante e o valor antes de aprovar. Somente contribuições aprovadas entram no livro-caixa e nos relatórios.</p>
          </div>
          <Badge className="w-fit border-amber-200 bg-amber-50 text-amber-800">{counts.pendente} em análise</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Buscar contribuição on-line" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou número" className="h-10 pl-9" /></label>
            <div className="flex flex-wrap gap-1 rounded-lg bg-white/70 p-1" aria-label="Filtrar contribuições">
              {(["pendente", "aprovada", "recusada", "todos"] as const).map((status) => {
                const label = status === "todos" ? "Todas" : STATUS_LABELS[status];
                const count = status === "todos" ? contributions.length : counts[status];
                return <Button key={status} type="button" variant={statusFilter === status ? "default" : "ghost"} size="sm" className={statusFilter === status ? "bg-navy hover:bg-navy/90" : "text-navy"} onClick={() => setStatusFilter(status)}>{label} <span className="ml-1 text-[10px] opacity-75">{count}</span></Button>;
              })}
            </div>
          </div>

          {contributionsQuery.error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{contributionsQuery.error.message}</div>}
          {contributionsQuery.isLoading ? <div className="h-28 animate-pulse rounded-xl bg-white/70" /> : filteredContributions.length === 0 ? <div className="rounded-xl border border-dashed border-gold/40 bg-white/60 p-6 text-center"><FileText className="mx-auto mb-2 h-8 w-8 text-gold" /><p className="font-semibold text-navy">{statusFilter === "pendente" ? "Nenhuma contribuição aguardando conferência" : "Nenhuma contribuição encontrada"}</p><p className="mt-1 text-sm text-muted-foreground">{search ? "Tente outro nome ou número." : "Os novos envios aparecerão aqui após o discípulo concluir o envio."}</p></div> : <div className="space-y-2">
            {filteredContributions.map(({ contribution, person }) => (
              <article key={contribution.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${contribution.status === "pendente" ? "bg-amber-50 text-amber-700" : contribution.status === "aprovada" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {contribution.status === "pendente" ? <Clock3 className="h-4 w-4" /> : contribution.status === "aprovada" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-navy">{person.fullName}</p><Badge variant="outline" className={STATUS_STYLES[contribution.status]}>{STATUS_LABELS[contribution.status]}</Badge></div>
                    <p className="mt-1 text-xs text-muted-foreground">{TYPE_LABELS[contribution.type]} · Enviada em {readableDate(contribution.submittedAt)} · #{contribution.id}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end"><div className="text-right"><p className="text-base font-semibold text-navy">{formatBrl(contribution.confirmedAmountCents ?? contribution.informedAmountCents)}</p><p className="text-[11px] text-muted-foreground">{contribution.confirmedAmountCents ? "Valor aprovado" : "Valor informado"}</p></div><Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => openDetails(contribution.id)}><Eye className="h-4 w-4" /> Ver detalhes</Button></div>
              </article>
            ))}
          </div>}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected && !reviewMode)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="!flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 flex-col overflow-hidden p-4 sm:max-w-2xl sm:p-6">
          <DialogHeader className="shrink-0 pr-8"><DialogTitle className="font-display text-2xl text-navy">Contribuição on-line #{selected?.contribution.id}</DialogTitle><DialogDescription>Confira os dados enviados antes de decidir. A aprovação cria uma entrada confirmada no livro-caixa.</DialogDescription></DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {selected && <>
              <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={STATUS_STYLES[selected.contribution.status]}>{STATUS_LABELS[selected.contribution.status]}</Badge><Badge variant="outline">{TYPE_LABELS[selected.contribution.type]}</Badge></div>
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm sm:grid-cols-2"><p><span className="block text-xs text-muted-foreground">Discípulo</span><strong className="text-navy">{selected.person.fullName}</strong></p><p><span className="block text-xs text-muted-foreground">Valor informado</span><strong className="text-navy">{formatBrl(selected.contribution.informedAmountCents)}</strong></p><p><span className="block text-xs text-muted-foreground">Data do pagamento</span>{readableDate(selected.contribution.paymentDate)}</p><p><span className="block text-xs text-muted-foreground">Enviado em</span>{readableDate(selected.contribution.submittedAt)}</p>{selected.contribution.confirmedAmountCents && <p><span className="block text-xs text-muted-foreground">Valor aprovado</span>{formatBrl(selected.contribution.confirmedAmountCents)}</p>}{selected.contribution.rejectionReason && <p className="sm:col-span-2"><span className="block text-xs text-muted-foreground">Motivo da recusa</span>{selected.contribution.rejectionReason}</p>}</div>
              <div className="rounded-xl border border-gold/30 bg-gold/5 p-4"><p className="text-sm font-semibold text-navy">Comprovante</p><p className="mt-1 text-xs text-muted-foreground">{selected.contribution.proofFileName} · {Math.max(1, Math.round(selected.contribution.proofSizeBytes / 1024))} KB</p>{selected.contribution.signedProofUrl ? <Button type="button" className="mt-3 gap-2 bg-navy text-white hover:bg-navy/90" onClick={openProofPreview}><Eye className="h-4 w-4" /> Ver comprovante</Button> : <p className="mt-3 flex items-center gap-2 text-sm text-amber-800"><AlertCircle className="h-4 w-4" /> O comprovante está temporariamente indisponível.</p>}</div>
              {selected.contribution.reviewNotes && <div className="rounded-xl border border-slate-200 p-4 text-sm"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observação da revisão</p><p className="mt-1 text-navy">{selected.contribution.reviewNotes}</p></div>}
              {selected.contribution.status === "pendente" && <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => openReview("reject")}><XCircle className="mr-2 h-4 w-4" /> Recusar</Button><Button type="button" className="bg-emerald-700 hover:bg-emerald-800" onClick={() => openReview("approve")}><CheckCircle2 className="mr-2 h-4 w-4" /> Conferir e aprovar</Button></div>}
            </>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={proofPreviewOpen} onOpenChange={setProofPreviewOpen}>
        <DialogContent className="!flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 flex-col overflow-hidden p-4 sm:max-w-4xl sm:p-6">
          <DialogHeader className="shrink-0 pr-8"><DialogTitle className="font-display text-2xl text-navy">Prévia do comprovante</DialogTitle><DialogDescription>Confira o documento sem sair da Tesouraria. O arquivo continua protegido por URL temporária.</DialogDescription></DialogHeader>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-2 sm:p-4">
            {selected?.contribution.signedProofUrl && selected.contribution.proofMimeType?.startsWith("image/") ? <img src={selected.contribution.signedProofUrl} alt={`Comprovante de ${selected.person.fullName}`} className="max-h-[calc(100dvh-12rem)] max-w-full rounded-lg object-contain shadow-sm" /> : selected?.contribution.signedProofUrl && selected.contribution.proofMimeType === "application/pdf" ? <iframe src={selected.contribution.signedProofUrl} title={`Comprovante de ${selected.person.fullName}`} className="h-[calc(100dvh-12rem)] min-h-[24rem] w-full rounded-lg bg-white" /> : <p className="p-6 text-center text-sm text-muted-foreground">O formato deste comprovante não permite prévia.</p>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewMode === "approve"} onOpenChange={(open) => { if (!open) closeReview(); }}>
        <AdaptiveFormDialogContent className="sm:max-w-xl"><div className={adaptiveFormDialogHeaderClassName}><DialogTitle className="font-display text-2xl text-navy">Aprovar contribuição</DialogTitle><DialogDescription>Essa ação criará uma entrada confirmada em Tesouraria e fará parte do relatório mensal.</DialogDescription></div><form className="contents" onSubmit={submitApproval}><AdaptiveFormDialogBody className="grid gap-4"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><p className="font-semibold">{selected?.person.fullName}</p><p className="mt-1">Valor informado: {selected ? formatBrl(selected.contribution.informedAmountCents) : "—"}. Confirme o valor após conferir o comprovante.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5"><Label>Valor confirmado (R$) *</Label><Input required inputMode="decimal" value={confirmedAmount} onChange={(event) => setConfirmedAmount(event.target.value)} placeholder="0,00" /></label><label className="grid gap-1.5"><Label>Data do pagamento *</Label><Input required type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></label></div><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5"><Label>Conta financeira *</Label><select required value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-sm"><option value="" disabled>Selecione</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="grid gap-1.5"><Label>Categoria de entrada *</Label><select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-sm"><option value="" disabled>Selecione</option>{entryCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><label className="grid gap-1.5"><Label>Observação da revisão</Label><Textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Ex.: Valor conferido no extrato bancário." /></label>{approveContribution.error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{approveContribution.error.message}</div>}</AdaptiveFormDialogBody><AdaptiveFormDialogFooter><Button type="button" variant="outline" onClick={() => closeReview()} disabled={approveContribution.isPending}>Cancelar</Button><Button type="submit" disabled={approveContribution.isPending || accounts.length === 0 || entryCategories.length === 0} className="bg-emerald-700 hover:bg-emerald-800">{approveContribution.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{approveContribution.isPending ? "Aprovando…" : "Aprovar e lançar"}</Button></AdaptiveFormDialogFooter></form></AdaptiveFormDialogContent>
      </Dialog>

      <Dialog open={reviewMode === "reject"} onOpenChange={(open) => { if (!open) closeReview(); }}>
        <AdaptiveFormDialogContent className="sm:max-w-xl"><div className={adaptiveFormDialogHeaderClassName}><DialogTitle className="font-display text-2xl text-navy">Recusar contribuição</DialogTitle><DialogDescription>A recusa fica registrada na auditoria. Informe ao discípulo o motivo pelo histórico do envio.</DialogDescription></div><form className="contents" onSubmit={submitRejection}><AdaptiveFormDialogBody className="grid gap-4"><div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">{selected?.person.fullName}</p><p className="mt-1">{selected ? `${TYPE_LABELS[selected.contribution.type]} · ${formatBrl(selected.contribution.informedAmountCents)}` : "—"}</p></div><label className="grid gap-1.5"><Label>Motivo da recusa *</Label><Textarea required value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Ex.: comprovante ilegível ou valor divergente" className="min-h-24" /></label><label className="grid gap-1.5"><Label>Observação adicional</Label><Textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Orientação opcional para a próxima tentativa" /></label>{rejectContribution.error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{rejectContribution.error.message}</div>}</AdaptiveFormDialogBody><AdaptiveFormDialogFooter><Button type="button" variant="outline" onClick={() => closeReview()} disabled={rejectContribution.isPending}>Cancelar</Button><Button type="submit" variant="destructive" disabled={rejectContribution.isPending || rejectionReason.trim().length < 5}>{rejectContribution.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{rejectContribution.isPending ? "Recusando…" : "Confirmar recusa"}</Button></AdaptiveFormDialogFooter></form></AdaptiveFormDialogContent>
      </Dialog>
    </>
  );
}
