import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, HeartHandshake, Loader2, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatBrl, parseBrlToCents } from "@/lib/treasury";
import { civilDateKey, currentCivilDateKey } from "@/lib/civilDate";
import { toast } from "sonner";

type Props = {
  churchId: number;
  accounts: Array<{ id: number; name: string }>;
  entryCategories: Array<{ id: number; name: string; key?: string | null }>;
  onBusyChange?: (busy: boolean) => void;
};

const TYPE_LABELS: Record<string, string> = { doacao: "Doação", dizimo: "Dízimo", oferta: "Oferta", primicias: "Primícias" };
const STATUS_LABELS: Record<string, string> = { pendente: "Pendente", aprovada: "Aprovada", recusada: "Recusada" };

type Donation = {
  id: number;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  type: "doacao" | "dizimo" | "oferta" | "primicias";
  informedAmountCents: number;
  paymentDate: Date | string | null;
  prayerRequest: string | null;
  proofFileName: string;
  signedProofUrl: string | null;
  status: "pendente" | "aprovada" | "recusada";
  submittedAt: Date | string;
  duplicateProofCount?: number;
};

function DonationReview({
  donation,
  accounts,
  entryCategories,
  busy,
  hasDuplicateProof,
  onApprove,
  onReject,
}: {
  donation: Donation;
  accounts: Props["accounts"];
  entryCategories: Props["entryCategories"];
  busy: boolean;
  hasDuplicateProof: boolean;
  onApprove: (data: { amount: string; paymentDate: string; accountId: string; categoryId: string; reviewNotes: string }) => void;
  onReject: (data: { rejectionReason: string; reviewNotes: string }) => void;
}) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(currentCivilDateKey());
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    setAmount((donation.informedAmountCents / 100).toFixed(2).replace(".", ","));
    setPaymentDate(civilDateKey(donation.paymentDate) ?? currentCivilDateKey());
    setAccountId(accounts[0] ? String(accounts[0].id) : "");
    setCategoryId(entryCategories[0] ? String(entryCategories[0].id) : "");
    setReviewNotes("");
    setRejectionReason("");
  }, [donation, accounts, entryCategories]);

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <p>
          <span className="block text-xs text-muted-foreground">Comprovante</span>
          <a className="mt-1 inline-flex items-center gap-1 font-semibold text-navy underline" href={donation.signedProofUrl ?? "#"} target="_blank" rel="noreferrer" onClick={event => { if (!donation.signedProofUrl) event.preventDefault(); }}>
            <FileText className="h-4 w-4" aria-hidden="true" />{donation.proofFileName}
          </a>
        </p>
        <p>
          <span className="block text-xs text-muted-foreground">Contato</span>
          <strong className="mt-1 block text-navy">{donation.donorPhone || donation.donorEmail || "Não informado"}</strong>
        </p>
      </div>
      {donation.prayerRequest && <div className="mt-3 rounded-xl bg-gold/8 p-3"><span className="text-xs font-semibold text-gold">Pedido de oração</span><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-navy">{donation.prayerRequest}</p></div>}
      {hasDuplicateProof && <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span><strong>Possível duplicidade.</strong> Resolva o outro envio com este comprovante antes de aprovar e lançar esta doação.</span></div>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor={`public-donation-account-${donation.id}`}>Conta de entrada</Label><select id={`public-donation-account-${donation.id}`} value={accountId} onChange={event => setAccountId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
        <div className="space-y-1"><Label htmlFor={`public-donation-category-${donation.id}`}>Categoria de entrada</Label><select id={`public-donation-category-${donation.id}`} value={categoryId} onChange={event => setCategoryId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{entryCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
        <div className="space-y-1"><Label htmlFor={`public-donation-confirmed-${donation.id}`}>Valor confirmado</Label><Input id={`public-donation-confirmed-${donation.id}`} value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" /></div>
        <div className="space-y-1"><Label htmlFor={`public-donation-date-${donation.id}`}>Data do lançamento</Label><Input id={`public-donation-date-${donation.id}`} value={paymentDate} onChange={event => setPaymentDate(event.target.value)} type="date" /></div>
      </div>
      <div className="mt-3 space-y-1"><Label htmlFor={`public-donation-review-${donation.id}`}>Observação da conferência</Label><Textarea id={`public-donation-review-${donation.id}`} value={reviewNotes} onChange={event => setReviewNotes(event.target.value)} rows={2} maxLength={2000} /></div>
      <div className="mt-3 space-y-1"><Label htmlFor={`public-donation-reason-${donation.id}`}>Motivo da recusa <span className="font-normal text-muted-foreground">(preencha somente se recusar)</span></Label><Textarea id={`public-donation-reason-${donation.id}`} value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} rows={2} maxLength={1000} /></div>
      {!donation.signedProofUrl && <p className="mt-3 flex items-center gap-2 text-xs text-amber-800"><AlertCircle className="h-4 w-4" aria-hidden="true" />O comprovante ainda não pôde ser assinado; os dados continuam disponíveis para conferência.</p>}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="gap-2 border-rose-200 text-rose-800 hover:bg-rose-50" onClick={() => onReject({ rejectionReason, reviewNotes })} disabled={busy}><XCircle className="h-4 w-4" aria-hidden="true" />Recusar</Button><Button type="button" className="gap-2 bg-navy text-white hover:bg-navy/90" onClick={() => onApprove({ amount, paymentDate, accountId, categoryId, reviewNotes })} disabled={busy || hasDuplicateProof}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{busy ? "Processando..." : hasDuplicateProof ? "Resolver duplicidade primeiro" : "Aprovar e lançar"}</Button></div>
    </div>
  );
}

export function PublicDonationsSection({ churchId, accounts, entryCategories, onBusyChange }: Props) {
  const utils = trpc.useUtils();
  const donationsQuery = trpc.treasury.publicDonations.useQuery({ churchId, status: "pendente" });
  const approveDonation = trpc.treasury.approvePublicDonation.useMutation();
  const rejectDonation = trpc.treasury.rejectPublicDonation.useMutation();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const busy = approveDonation.isPending || rejectDonation.isPending;

  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  async function approve(id: number, data: { amount: string; paymentDate: string; accountId: string; categoryId: string; reviewNotes: string }) {
    const confirmedAmountCents = parseBrlToCents(data.amount);
    if (!confirmedAmountCents || !data.accountId || !data.categoryId) return toast.error("Informe valor, conta e categoria de entrada.");
    try {
      await approveDonation.mutateAsync({ churchId, id, accountId: Number(data.accountId), categoryId: Number(data.categoryId), confirmedAmountCents, paymentDate: data.paymentDate, reviewNotes: data.reviewNotes.trim() || undefined });
      await utils.treasury.publicDonations.invalidate({ churchId, status: "pendente" });
      setSelectedId(null);
      toast.success("Doação aprovada e lançada uma única vez no livro-caixa.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível aprovar a doação.");
    }
  }

  async function reject(id: number, data: { rejectionReason: string; reviewNotes: string }) {
    if (data.rejectionReason.trim().length < 5) return toast.error("Informe o motivo da recusa.");
    try {
      await rejectDonation.mutateAsync({ churchId, id, rejectionReason: data.rejectionReason.trim(), reviewNotes: data.reviewNotes.trim() || undefined });
      await utils.treasury.publicDonations.invalidate({ churchId, status: "pendente" });
      setSelectedId(null);
      toast.success("Doação recusada e mantida fora dos totais financeiros.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível recusar a doação.");
    }
  }

  if (donationsQuery.isLoading) return <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-gold" aria-label="Carregando doações públicas" /></div>;
  if (donationsQuery.error) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Não foi possível carregar as doações públicas.</div>;
  const allDonations = donationsQuery.data ?? [];
  const duplicateCount = allDonations.filter(row => (row?.donation?.duplicateProofCount ?? 0) > 1).length;
  const donations = useMemo(
    () => showDuplicatesOnly ? allDonations.filter(row => (row?.donation?.duplicateProofCount ?? 0) > 1) : allDonations,
    [allDonations, showDuplicatesOnly],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-navy/15 bg-navy/[0.03] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" /><div><h2 className="font-semibold text-navy">Doações pela página pública</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Confira nome, pedido de oração e comprovante. Só a aprovação cria uma entrada confirmada no livro-caixa.</p></div></div>{allDonations.length > 0 && <Button type="button" variant="outline" size="sm" className="shrink-0 border-navy/20" aria-pressed={showDuplicatesOnly} onClick={() => setShowDuplicatesOnly(value => !value)}>{showDuplicatesOnly ? "Mostrar todas" : `Possíveis duplicidades${duplicateCount ? ` (${duplicateCount})` : ""}`}</Button>}</div></div>
      {donations.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">{showDuplicatesOnly ? <><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" /><p className="mt-3 font-semibold text-navy">Nenhuma possível duplicidade</p><p className="mt-1 text-sm text-muted-foreground">Todos os envios pendentes podem seguir para conferência normal.</p></> : <><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" /><p className="mt-3 font-semibold text-navy">Nenhuma doação pendente</p><p className="mt-1 text-sm text-muted-foreground">Novos envios aparecerão aqui quando a página pública estiver ativa.</p></>}</div> : <div className="grid gap-3">{donations.map(row => { const donation = row?.donation; if (!donation) return null; const active = selectedId === donation.id; const hasDuplicateProof = (donation.duplicateProofCount ?? 0) > 1; return <article key={donation.id} className={`rounded-2xl border p-4 transition-colors ${active ? "border-navy bg-navy/[0.04]" : "border-slate-200 bg-white"}`}><button type="button" className="w-full text-left" onClick={() => setSelectedId(active ? null : donation.id)} aria-expanded={active}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-navy">{donation.donorName}</p><p className="mt-1 text-xs text-muted-foreground">{TYPE_LABELS[donation.type] ?? donation.type} · enviado em {new Date(donation.submittedAt).toLocaleString("pt-BR")}</p></div><div className="shrink-0 text-right"><div className="flex flex-wrap justify-end gap-1"><Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">{STATUS_LABELS[donation.status]}</Badge>{hasDuplicateProof && <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-800">Possível duplicidade</Badge>}</div><p className="mt-2 font-semibold text-navy">{formatBrl(donation.informedAmountCents)}</p></div></div></button>{active && <DonationReview donation={donation} accounts={accounts} entryCategories={entryCategories} busy={busy} hasDuplicateProof={hasDuplicateProof} onApprove={data => approve(donation.id, data)} onReject={data => reject(donation.id, data)} />}</article>; })}</div>}
    </div>
  );
}
