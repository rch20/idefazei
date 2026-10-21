import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, FileText, HeartHandshake, Loader2, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AdaptiveFormDialogBody, AdaptiveFormDialogContent, AdaptiveFormDialogFooter, adaptiveFormDialogHeaderClassName } from "@/components/AdaptiveFormDialog";
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
  proofMimeType?: string | null;
  proofSha256?: string | null;
  signedProofUrl: string | null;
  status: "pendente" | "aprovada" | "recusada";
  submittedAt: Date | string;
  duplicateProofCount?: number;
};

type ApproveData = { amount: string; paymentDate: string; accountId: string; categoryId: string; reviewNotes: string };
type RejectData = { rejectionReason: string; reviewNotes: string };

function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Mostra o comprovante dentro do modal; o arquivo continua privado (URL assinada e temporária). */
function ProofPreview({ donation }: { donation: Donation }) {
  const [failed, setFailed] = useState(false);
  const url = donation.signedProofUrl;
  const isPdf = donation.proofMimeType === "application/pdf" || /\.pdf$/i.test(donation.proofFileName);
  useEffect(() => setFailed(false), [donation.id]);
  if (!url) {
    return <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-center text-sm text-amber-900"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" aria-hidden="true" />O comprovante ainda não pôde ser carregado. Feche e abra de novo para tentar outra vez.</span></div>;
  }
  return (
    <div className="space-y-2">
      <div className="flex max-h-[55vh] min-h-48 items-center justify-center overflow-auto rounded-xl border border-border bg-muted/40 p-2">
        {isPdf ? (
          <iframe title={`Comprovante de ${donation.donorName}`} src={url} className="h-[55vh] w-full rounded-lg bg-white" />
        ) : failed ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Não foi possível exibir a imagem aqui. Use “Abrir em outra aba”.</p>
        ) : (
          <img src={url} alt={`Comprovante de ${donation.donorName}`} className="max-h-[52vh] w-auto max-w-full rounded-lg object-contain" onError={() => setFailed(true)} />
        )}
      </div>
      <a className="inline-flex items-center gap-1 text-xs font-medium text-navy underline" href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />Abrir em outra aba · {donation.proofFileName}</a>
    </div>
  );
}

function DonationReviewDialog({
  donation,
  siblings,
  accounts,
  entryCategories,
  busy,
  onClose,
  onApprove,
  onReject,
}: {
  donation: Donation;
  siblings: Donation[];
  accounts: Props["accounts"];
  entryCategories: Props["entryCategories"];
  busy: boolean;
  onClose: () => void;
  onApprove: (data: ApproveData) => void;
  onReject: (data: RejectData) => void;
}) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(currentCivilDateKey());
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const hasDuplicateProof = (donation.duplicateProofCount ?? 0) > 1;

  useEffect(() => {
    setAmount((donation.informedAmountCents / 100).toFixed(2).replace(".", ","));
    setPaymentDate(civilDateKey(donation.paymentDate) ?? currentCivilDateKey());
    setAccountId(accounts[0] ? String(accounts[0].id) : "");
    setCategoryId(entryCategories[0] ? String(entryCategories[0].id) : "");
    setReviewNotes("");
    setRejectionReason("");
    setRejecting(false);
  }, [donation, accounts, entryCategories]);

  const confirmedCents = parseBrlToCents(amount);
  const differsFromInformed = confirmedCents !== null && confirmedCents !== donation.informedAmountCents;

  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <AdaptiveFormDialogContent className="sm:max-w-5xl">
        <div className={adaptiveFormDialogHeaderClassName}>
          <DialogTitle className="flex items-center gap-2 font-display text-navy"><HeartHandshake className="h-5 w-5 text-gold" aria-hidden="true" />{donation.donorName}</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">{TYPE_LABELS[donation.type] ?? donation.type} informada de {formatBrl(donation.informedAmountCents)} · enviada em {formatDateTime(donation.submittedAt)}. Confira o comprovante e confirme o valor.</DialogDescription>
        </div>
        <AdaptiveFormDialogBody>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <ProofPreview donation={donation} />
            <div className="space-y-4">
              <div className="grid gap-2 rounded-xl bg-muted/50 p-3 text-sm sm:grid-cols-2">
                <p><span className="block text-xs text-muted-foreground">Contato</span><strong className="text-navy">{donation.donorPhone || donation.donorEmail || "Não informado"}</strong></p>
                <p><span className="block text-xs text-muted-foreground">Valor informado</span><strong className="text-navy">{formatBrl(donation.informedAmountCents)}</strong></p>
              </div>
              {donation.prayerRequest && <div className="rounded-xl bg-gold/8 p-3"><span className="text-xs font-semibold text-gold">Pedido de oração</span><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-navy">{donation.prayerRequest}</p></div>}
              {hasDuplicateProof && (
                <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span><strong>Possível duplicidade.</strong> O mesmo arquivo de comprovante foi enviado mais de uma vez; aprovar as duas lançaria o valor em dobro. Resolva o outro envio antes de aprovar este.</span></p>
                  {siblings.length > 0 && <ul className="mt-2 space-y-1 text-xs">{siblings.map(item => <li key={item.id}>Também enviado por <strong>{item.donorName}</strong> em {formatDateTime(item.submittedAt)} · {formatBrl(item.informedAmountCents)}</li>)}</ul>}
                  <Button type="button" size="sm" variant="outline" className="mt-3 border-amber-300 bg-white text-amber-900 hover:bg-amber-100" disabled={busy} onClick={() => onReject({ rejectionReason: "Comprovante duplicado: o mesmo arquivo já foi enviado em outra doação.", reviewNotes })}>Recusar esta como duplicada</Button>
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor={`public-donation-confirmed-${donation.id}`}>Valor confirmado (R$)</Label>
                <Input id={`public-donation-confirmed-${donation.id}`} value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" className="h-12 text-lg font-semibold" />
                {differsFromInformed && <p className="text-xs text-amber-800">Diferente do valor informado ({formatBrl(donation.informedAmountCents)}). Confira no comprovante.</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><Label htmlFor={`public-donation-account-${donation.id}`}>Conta de entrada</Label><select id={`public-donation-account-${donation.id}`} value={accountId} onChange={event => setAccountId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
                <div className="space-y-1"><Label htmlFor={`public-donation-category-${donation.id}`}>Categoria de entrada</Label><select id={`public-donation-category-${donation.id}`} value={categoryId} onChange={event => setCategoryId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{entryCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
              </div>
              <div className="space-y-1"><Label htmlFor={`public-donation-date-${donation.id}`}>Data do lançamento</Label><Input id={`public-donation-date-${donation.id}`} value={paymentDate} onChange={event => setPaymentDate(event.target.value)} type="date" max={currentCivilDateKey()} /></div>
              <div className="space-y-1"><Label htmlFor={`public-donation-review-${donation.id}`}>Observação da conferência <span className="font-normal text-muted-foreground">(opcional)</span></Label><Textarea id={`public-donation-review-${donation.id}`} value={reviewNotes} onChange={event => setReviewNotes(event.target.value)} rows={2} maxLength={2000} /></div>
              {rejecting && <div className="space-y-1"><Label htmlFor={`public-donation-reason-${donation.id}`}>Motivo da recusa</Label><Textarea id={`public-donation-reason-${donation.id}`} value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} rows={2} maxLength={500} placeholder="Ex.: comprovante ilegível ou valor não confere." autoFocus /></div>}
            </div>
          </div>
        </AdaptiveFormDialogBody>
        <AdaptiveFormDialogFooter>
          {rejecting ? (
            <>
              <Button type="button" variant="outline" onClick={() => setRejecting(false)} disabled={busy}>Voltar</Button>
              <Button type="button" className="gap-2 bg-rose-700 text-white hover:bg-rose-800" disabled={busy || rejectionReason.trim().length < 5} onClick={() => onReject({ rejectionReason, reviewNotes })}><XCircle className="h-4 w-4" aria-hidden="true" />Confirmar recusa</Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" className="gap-2 border-rose-200 text-rose-800 hover:bg-rose-50" onClick={() => setRejecting(true)} disabled={busy}><XCircle className="h-4 w-4" aria-hidden="true" />Recusar</Button>
              <Button type="button" className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800" disabled={busy || hasDuplicateProof} onClick={() => onApprove({ amount, paymentDate, accountId, categoryId, reviewNotes })}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}{hasDuplicateProof ? "Resolva a duplicidade primeiro" : "Aprovar e lançar"}</Button>
            </>
          )}
        </AdaptiveFormDialogFooter>
      </AdaptiveFormDialogContent>
    </Dialog>
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
  const allDonations = useMemo(() => (donationsQuery.data ?? []).map(row => row?.donation as Donation | undefined).filter((item): item is Donation => Boolean(item)), [donationsQuery.data]);
  const duplicateCount = allDonations.filter(item => (item.duplicateProofCount ?? 0) > 1).length;
  const donations = useMemo(() => (showDuplicatesOnly ? allDonations.filter(item => (item.duplicateProofCount ?? 0) > 1) : allDonations), [allDonations, showDuplicatesOnly]);
  const selected = allDonations.find(item => item.id === selectedId) ?? null;
  const siblings = selected?.proofSha256 ? allDonations.filter(item => item.id !== selected.id && item.proofSha256 === selected.proofSha256) : [];

  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  async function approve(id: number, data: ApproveData) {
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

  async function reject(id: number, data: RejectData) {
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-navy/15 bg-navy/[0.03] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3"><HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" /><div><h2 className="font-semibold text-navy">Doações pela página pública</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Toque em uma doação para ver o comprovante, confirmar o valor e aprovar ou recusar. Só a aprovação cria uma entrada confirmada no livro-caixa.</p></div></div>
          {allDonations.length > 0 && <Button type="button" variant="outline" size="sm" className="shrink-0 border-navy/20" aria-pressed={showDuplicatesOnly} onClick={() => setShowDuplicatesOnly(value => !value)}>{showDuplicatesOnly ? "Mostrar todas" : `Possíveis duplicidades${duplicateCount ? ` (${duplicateCount})` : ""}`}</Button>}
        </div>
      </div>
      {donations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" />
          <p className="mt-3 font-semibold text-navy">{showDuplicatesOnly ? "Nenhuma possível duplicidade" : "Nenhuma doação pendente"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{showDuplicatesOnly ? "Todos os envios pendentes podem seguir para conferência normal." : "Novos envios aparecerão aqui quando a página pública estiver ativa."}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {donations.map(donation => {
            const active = selectedId === donation.id;
            const hasDuplicateProof = (donation.duplicateProofCount ?? 0) > 1;
            return (
              <article key={donation.id} className={`rounded-2xl border p-4 transition-colors ${active ? "border-navy bg-navy/[0.04]" : "border-slate-200 bg-white hover:border-navy/30"}`}>
                <button type="button" className="w-full text-left" onClick={() => setSelectedId(donation.id)} aria-expanded={active} aria-haspopup="dialog">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="truncate font-semibold text-navy">{donation.donorName}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><FileText className="h-3.5 w-3.5" aria-hidden="true" />{TYPE_LABELS[donation.type] ?? donation.type} · enviado em {formatDateTime(donation.submittedAt)} · ver comprovante</p></div>
                    <div className="shrink-0 text-right"><div className="flex flex-wrap justify-end gap-1"><Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">{STATUS_LABELS[donation.status]}</Badge>{hasDuplicateProof && <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-800">Possível duplicidade</Badge>}</div><p className="mt-2 font-semibold text-navy">{formatBrl(donation.informedAmountCents)}</p></div>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      )}
      {selected && <DonationReviewDialog donation={selected} siblings={siblings} accounts={accounts} entryCategories={entryCategories} busy={busy} onClose={() => setSelectedId(null)} onApprove={data => approve(selected.id, data)} onReject={data => reject(selected.id, data)} />}
    </div>
  );
}
