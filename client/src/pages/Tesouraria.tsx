import { useMemo, useState } from "react";
import { useChurch } from "@/components/ChurchLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getChurchToken, useChurchAuth } from "@/hooks/useChurchAuth";
import { ArrowDownCircle, ArrowUpCircle, BookOpenCheck, CheckCircle2, CircleDollarSign, ExternalLink, FileText, Landmark, Loader2, Paperclip, Plus, Printer, ReceiptText, RotateCcw, Upload, WalletCards, XCircle } from "lucide-react";

type TransactionType = "entrada" | "saida";
type TransactionStatus = "rascunho" | "confirmado";
type PaymentMethod = "dinheiro" | "pix" | "transferencia" | "cartao" | "cheque" | "outro";

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "transferencia", label: "Transferência" },
  { value: "cartao", label: "Cartão" },
  { value: "cheque", label: "Cheque" },
  { value: "outro", label: "Outro" },
];

const toCurrency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const today = () => new Date().toISOString().slice(0, 10);
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const last = new Date(year, monthNumber, 0).getDate();
  return { startDate: `${month}-01`, endDate: `${month}-${String(last).padStart(2, "0")}` };
}

function parseCents(value: string) {
  const normalized = value.replace(",", ".").trim();
  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? Math.round(numberValue * 100) : 0;
}

export default function Tesouraria() {
  const { churchId, churchName } = useChurch();
  const { user } = useChurchAuth();
  const utils = trpc.useUtils();
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [accountFilter, setAccountFilter] = useState("todas");
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState<number | null>(null);
  const [receiptOpen, setReceiptOpen] = useState<number | null>(null);
  const [reconciliationOpen, setReconciliationOpen] = useState(false);
  const [reconciliationForm, setReconciliationForm] = useState({ accountId: "", bankClosingBalance: "", notes: "" });
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<TransactionType>("entrada");
  const [newAccount, setNewAccount] = useState({ name: "", type: "caixa" as "caixa" | "banco" | "outro", openingBalance: "0" });
  const [reverseReason, setReverseReason] = useState("");
  const [form, setForm] = useState({
    type: "entrada" as TransactionType,
    accountId: "",
    categoryId: "",
    amount: "",
    transactionDate: today(),
    paymentMethod: "dinheiro" as PaymentMethod,
    contributorPersonId: "",
    contributorName: "",
    description: "",
    reference: "",
    status: "confirmado" as TransactionStatus,
  });

  const { startDate, endDate } = useMemo(() => monthBounds(month), [month]);
  const selectedAccountId = accountFilter === "todas" ? undefined : Number(accountFilter);
  const overviewQuery = trpc.treasury.overview.useQuery({ churchId, startDate, endDate, accountId: selectedAccountId }, { enabled: Boolean(churchId) });
  const accountsQuery = trpc.treasury.accounts.useQuery({ churchId }, { enabled: Boolean(churchId) });
  const categoriesQuery = trpc.treasury.categories.useQuery({ churchId }, { enabled: Boolean(churchId) });
  const closureQuery = trpc.treasury.periodClosure.useQuery({ churchId, periodStart: startDate }, { enabled: Boolean(churchId) });
  const peopleQuery = trpc.people.list.useQuery({ churchId }, { enabled: Boolean(churchId) });
  const receiptQuery = trpc.treasury.receipt.useQuery({ churchId, id: receiptOpen ?? 0 }, { enabled: Boolean(churchId && receiptOpen) });
  const bankAccounts = (accountsQuery.data ?? []).filter((account) => account.type === "banco");
  const reconciliationAccountId = Number(reconciliationForm.accountId || bankAccounts[0]?.id || 0);
  const reconciliationQuery = trpc.treasury.reconciliation.useQuery({ churchId, accountId: reconciliationAccountId, periodStart: startDate, periodEnd: endDate }, { enabled: Boolean(churchId && reconciliationOpen && reconciliationAccountId) });
  const reconciliationId = reconciliationQuery.data?.reconciliation?.id ?? 0;
  const attachmentsQuery = trpc.treasury.reconciliationAttachments.useQuery({ churchId, reconciliationId }, { enabled: Boolean(churchId && reconciliationId) });

  const periodClosed = closureQuery.data?.status === "fechado";
  const canManageStructure = ["pastor_presidente", "pastor_local"].includes(user?.role ?? "");
  const canClosePeriod = user?.role === "pastor_presidente";
  const selectedCategories = (categoriesQuery.data ?? []).filter((category) => category.type === form.type);
  const selectedAccount = (accountsQuery.data ?? [])[0];

  const invalidateTreasury = async () => {
    await Promise.all([
      utils.treasury.overview.invalidate(),
      utils.treasury.accounts.invalidate(),
      utils.treasury.categories.invalidate(),
      utils.treasury.periodClosure.invalidate(),
      utils.treasury.reconciliation.invalidate(),
    ]);
  };

  const createTransaction = trpc.treasury.createTransaction.useMutation({
    onSuccess: async () => { await invalidateTreasury(); setTransactionOpen(false); },
  });
  const createCategory = trpc.treasury.createCategory.useMutation({
    onSuccess: async () => { await invalidateTreasury(); setCategoryName(""); setCategoryOpen(false); },
  });
  const createAccount = trpc.treasury.createAccount.useMutation({
    onSuccess: async () => { await invalidateTreasury(); setNewAccount({ name: "", type: "caixa", openingBalance: "0" }); setAccountOpen(false); },
  });
  const confirmTransaction = trpc.treasury.confirmTransaction.useMutation({ onSuccess: invalidateTreasury });
  const reverseTransaction = trpc.treasury.reverseTransaction.useMutation({ onSuccess: async () => { await invalidateTreasury(); setReverseOpen(null); setReverseReason(""); } });
  const closePeriod = trpc.treasury.closePeriod.useMutation({ onSuccess: invalidateTreasury });
  const reopenPeriod = trpc.treasury.reopenPeriod.useMutation({ onSuccess: invalidateTreasury });
  const saveReconciliation = trpc.treasury.saveReconciliation.useMutation({ onSuccess: async () => { setAttachmentError(null); await invalidateTreasury(); } });

  const openTransaction = (type: TransactionType) => {
    const firstCategory = (categoriesQuery.data ?? []).find((category) => category.type === type);
    setForm({
      type,
      accountId: String(selectedAccount?.id ?? ""),
      categoryId: String(firstCategory?.id ?? ""),
      amount: "",
      transactionDate: today(),
      paymentMethod: type === "entrada" ? "dinheiro" : "pix",
      contributorPersonId: "",
      contributorName: "",
      description: "",
      reference: "",
      status: "confirmado",
    });
    setTransactionOpen(true);
  };

  const submitTransaction = (event: React.FormEvent) => {
    event.preventDefault();
    createTransaction.mutate({
      churchId,
      accountId: Number(form.accountId),
      categoryId: Number(form.categoryId),
      type: form.type,
      amountCents: parseCents(form.amount),
      transactionDate: form.transactionDate,
      paymentMethod: form.paymentMethod,
      contributorPersonId: form.contributorPersonId ? Number(form.contributorPersonId) : undefined,
      contributorName: form.contributorPersonId ? undefined : form.contributorName.trim() || undefined,
      description: form.description.trim() || undefined,
      reference: form.reference.trim() || undefined,
      status: form.status,
    });
  };

  const periodLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const overview = overviewQuery.data;
  const bankBalanceInput = parseCents(reconciliationForm.bankClosingBalance);
  const reconciliationDifference = bankBalanceInput - (reconciliationQuery.data?.bookBalanceCents ?? 0);

  const printReceipt = () => {
    const data = receiptQuery.data;
    if (!data) return;
    const contributorName = data.contributor?.fullName || data.transaction.contributorName || "Contribuinte não identificado";
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=720,height=760");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo ${data.transaction.id}</title><style>body{font-family:Arial,sans-serif;color:#1e3a5f;padding:40px;max-width:640px;margin:auto}.top{border-bottom:2px solid #c9a84c;padding-bottom:16px}.eyebrow{color:#a67c24;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.title{font-size:28px;margin:8px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:26px 0}.box{background:#f8f5ef;border-radius:10px;padding:14px}.amount{font-size:28px;font-weight:700;color:#176b42}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:80px;text-align:center}.line{border-top:1px solid #777;padding-top:8px;font-size:12px}@media print{body{padding:0}}</style></head><body><div class="top"><div class="eyebrow">Ide Fazei · Tesouraria</div><h1 class="title">Recibo de contribuição</h1><div>${escapeHtml(churchName)} · Recibo nº ${data.transaction.id}</div></div><div class="grid"><div class="box"><strong>Recebemos de</strong><br>${escapeHtml(contributorName)}</div><div class="box"><strong>Data</strong><br>${new Date(data.transaction.transactionDate).toLocaleDateString("pt-BR")}</div><div class="box"><strong>Referente a</strong><br>${escapeHtml(data.category.name)}</div><div class="box"><strong>Forma de recebimento</strong><br>${escapeHtml(data.transaction.paymentMethod)}</div></div><p>Recebemos a importância de</p><p class="amount">${toCurrency(data.transaction.amountCents)}</p><p>${escapeHtml(data.transaction.description || "Contribuição registrada na Tesouraria da igreja.")}</p><div class="signatures"><div class="line">Tesoureiro(a)</div><div class="line">Contribuinte</div></div><script>window.onload=()=>window.print()<\/script></body></html>`);
    printWindow.document.close();
  };

  const uploadAttachment = async (file: File) => {
    if (!reconciliationId) {
      setAttachmentError("Salve a conciliação antes de anexar um comprovante.");
      return;
    }
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setAttachmentError("Envie um arquivo PDF, PNG, JPEG ou WebP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAttachmentError("O comprovante deve ter no máximo 8 MB.");
      return;
    }
    const token = getChurchToken();
    if (!token) {
      setAttachmentError("Sua sessão expirou. Entre novamente para enviar o comprovante.");
      return;
    }
    setUploadingAttachment(true);
    setAttachmentError(null);
    try {
      const formData = new FormData();
      formData.append("reconciliationId", String(reconciliationId));
      formData.append("file", file);
      const response = await fetch("/api/treasury/reconciliation-attachments", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível enviar o comprovante.");
      await attachmentsQuery.refetch();
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Não foi possível enviar o comprovante.");
    } finally {
      setUploadingAttachment(false);
    }
  };

  if (overviewQuery.error?.data?.code === "FORBIDDEN") {
    return <AccessDenied />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto print:p-0 print:max-w-none">
      <style>{`@media print { .no-print { display: none !important; } .print-card { box-shadow: none !important; border-color: #d4d4d4 !important; } body { background: white !important; } }`}</style>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between no-print">
        <div>
          <p className="text-gold text-xs font-semibold uppercase tracking-[0.16em]">Administração financeira</p>
          <h1 className="font-display text-3xl text-navy mt-1">Tesouraria</h1>
          <p className="text-muted-foreground mt-1">Entradas, saídas e prestação de contas da igreja.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="w-4 h-4" /> Imprimir</Button>
          {bankAccounts.length > 0 && <Button variant="outline" onClick={() => setReconciliationOpen(true)} className="gap-2"><BookOpenCheck className="w-4 h-4" /> Conciliar banco</Button>}
          <Button variant="outline" onClick={() => openTransaction("saida")} disabled={periodClosed} title={periodClosed ? "Reabra o período para registrar uma saída." : undefined} className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50"><ArrowUpCircle className="w-4 h-4" /> Registrar saída</Button>
          <Button onClick={() => openTransaction("entrada")} disabled={periodClosed} title={periodClosed ? "Reabra o período para registrar uma entrada." : undefined} className="gap-2 bg-navy hover:bg-navy/90"><ArrowDownCircle className="w-4 h-4" /> Registrar entrada</Button>
        </div>
      </header>

      <div className="hidden print:block border-b-2 border-navy pb-4">
        <p className="text-xs uppercase tracking-widest text-gold">Relatório de Tesouraria</p>
        <h1 className="font-display text-3xl text-navy">{churchName}</h1>
        <p className="capitalize text-slate-600">Período: {periodLabel} · Emitido em {new Date().toLocaleDateString("pt-BR")}</p>
      </div>

      <section className="no-print flex flex-col sm:flex-row gap-3 sm:items-end">
        <label className="grid gap-1.5 text-sm font-medium text-navy">
          Período
          <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-full sm:w-48" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-navy">
          Conta
          <select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-52">
            <option value="todas">Todas as contas</option>
            {(accountsQuery.data ?? []).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        {canManageStructure && <div className="flex gap-2 sm:pb-0"><Button variant="outline" size="sm" onClick={() => setCategoryOpen(true)}><Plus className="w-4 h-4 mr-1" /> Categoria</Button><Button variant="outline" size="sm" onClick={() => setAccountOpen(true)}><Landmark className="w-4 h-4 mr-1" /> Conta</Button></div>}
        {periodClosed ? <Badge className="bg-slate-800 text-white w-fit sm:mb-1">Período fechado · lançamentos bloqueados</Badge> : <Badge variant="outline" className="border-gold/50 text-navy w-fit sm:mb-1">Período em aberto</Badge>}
      </section>

      {overviewQuery.isLoading ? <TreasurySkeleton /> : (
        <>
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard icon={WalletCards} label="Saldo consolidado" value={toCurrency(overview?.balanceCents ?? 0)} tone="navy" />
            <MetricCard icon={ArrowDownCircle} label="Entradas no período" value={toCurrency(overview?.entriesCents ?? 0)} tone="green" />
            <MetricCard icon={ArrowUpCircle} label="Saídas no período" value={toCurrency(overview?.expensesCents ?? 0)} tone="rose" />
            <MetricCard icon={CircleDollarSign} label="Resultado do período" value={toCurrency(overview?.resultCents ?? 0)} tone={(overview?.resultCents ?? 0) >= 0 ? "gold" : "rose"} />
          </section>

          <section className="grid lg:grid-cols-3 gap-5 print:grid-cols-3">
            <Card className="print-card lg:col-span-2 border-gold/20">
              <CardHeader className="pb-3 flex-row items-center justify-between space-y-0"><CardTitle className="font-display text-xl text-navy">Livro-caixa · <span className="capitalize">{periodLabel}</span></CardTitle><Badge variant="outline">{overview?.transactions.length ?? 0} lançamentos</Badge></CardHeader>
              <CardContent className="p-0">
                {(overview?.transactions.length ?? 0) === 0 ? <EmptyTransactions /> : <div className="divide-y divide-border">
                  {overview?.transactions.map(({ transaction, account, category }) => (
                    <div key={transaction.id} className="px-4 py-3 flex gap-3 items-center">
                      <div className={`shrink-0 rounded-full p-2 ${transaction.type === "entrada" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {transaction.type === "entrada" ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex gap-2 items-center"><p className="font-semibold text-sm text-navy truncate">{category.name}</p>{transaction.status === "rascunho" && <Badge variant="outline" className="text-[10px]">Rascunho</Badge>}{transaction.status === "estornado" && <Badge className="bg-slate-200 text-slate-700 text-[10px]">Estornado</Badge>}</div>
                        <p className="text-xs text-muted-foreground truncate">{account.name} · {new Date(transaction.transactionDate).toLocaleDateString("pt-BR")} {transaction.description ? `· ${transaction.description}` : ""}</p>
                      </div>
                      <div className="text-right shrink-0"><p className={`font-semibold text-sm ${transaction.type === "entrada" ? "text-emerald-700" : "text-rose-700"}`}>{transaction.type === "entrada" ? "+" : "−"}{toCurrency(transaction.amountCents)}</p><p className="text-[10px] uppercase text-muted-foreground">{transaction.paymentMethod}</p></div>
                      <div className="no-print flex gap-1">
                        {transaction.status === "rascunho" && <Button variant="ghost" size="icon" title="Confirmar" onClick={() => confirmTransaction.mutate({ churchId, id: transaction.id })}><CheckCircle2 className="w-4 h-4 text-emerald-600" /></Button>}
                        {transaction.status === "confirmado" && transaction.type === "entrada" && <Button variant="ghost" size="icon" title="Emitir recibo" onClick={() => setReceiptOpen(transaction.id)}><ReceiptText className="w-4 h-4 text-navy" /></Button>}
                        {transaction.status === "confirmado" && canManageStructure && <Button variant="ghost" size="icon" title="Estornar" onClick={() => setReverseOpen(transaction.id)}><RotateCcw className="w-4 h-4 text-slate-600" /></Button>}
                      </div>
                    </div>
                  ))}
                </div>}
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="print-card border-gold/20"><CardHeader className="pb-3"><CardTitle className="text-base text-navy flex gap-2 items-center"><Landmark className="w-4 h-4 text-gold" /> Saldos por conta</CardTitle></CardHeader><CardContent className="space-y-3">
                {(overview?.accountBalances ?? []).map(({ account, balanceCents }) => <div key={account.id} className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{account.name}</span><strong className="text-navy">{toCurrency(balanceCents)}</strong></div>)}
              </CardContent></Card>
              <Card className="print-card border-gold/20"><CardHeader className="pb-3"><CardTitle className="text-base text-navy flex gap-2 items-center"><ReceiptText className="w-4 h-4 text-gold" /> Categorias do período</CardTitle></CardHeader><CardContent className="space-y-3">
                {(overview?.categories ?? []).slice(0, 8).map((category) => <div key={`${category.type}-${category.categoryId}`} className="flex justify-between gap-3 text-sm"><span className="truncate text-muted-foreground">{category.categoryName}</span><strong className={category.type === "entrada" ? "text-emerald-700" : "text-rose-700"}>{toCurrency(category.amountCents)}</strong></div>)}
                {(overview?.categories.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Sem movimentos confirmados neste período.</p>}
              </CardContent></Card>
              <Card className="no-print border-dashed border-gold/40 bg-gold/5"><CardContent className="pt-5"><div className="flex gap-3"><BookOpenCheck className="w-5 h-5 text-gold shrink-0" /><div><p className="font-semibold text-sm text-navy">Fechamento mensal</p><p className="text-xs text-muted-foreground mt-1">O fechamento bloqueia alterações diretas no período e preserva a trilha de auditoria.</p>{canClosePeriod && (closureQuery.data?.status === "fechado" ? <Button size="sm" variant="outline" className="mt-3" onClick={() => { const reason = window.prompt("Motivo da reabertura do período:"); if (reason) reopenPeriod.mutate({ churchId, periodStart: startDate, reason }); }}>Reabrir período</Button> : <Button size="sm" className="mt-3 bg-navy hover:bg-navy/90" onClick={() => closePeriod.mutate({ churchId, periodStart: startDate, periodEnd: endDate })}>Fechar {periodLabel}</Button>)}</div></div></CardContent></Card>
            </div>
          </section>
          <section className="hidden print:grid grid-cols-2 gap-8 pt-8 text-sm"><div className="border-t pt-8 text-center">Tesoureiro(a)</div><div className="border-t pt-8 text-center">Pastor(a) Responsável</div></section>
        </>
      )}

      <Dialog open={transactionOpen} onOpenChange={setTransactionOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle className="font-display text-2xl text-navy">{form.type === "entrada" ? "Registrar entrada" : "Registrar saída"}</DialogTitle><DialogDescription>O lançamento será vinculado à conta e à categoria selecionadas.</DialogDescription></DialogHeader><form onSubmit={submitTransaction} className="grid gap-4">
        <div className="grid grid-cols-2 gap-3"><label className="grid gap-1.5"><Label>Conta</Label><select required value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{(accountsQuery.data ?? []).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="grid gap-1.5"><Label>Categoria</Label><select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{selectedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="grid gap-1.5"><Label>Valor (R$)</Label><Input required inputMode="decimal" placeholder="0,00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label className="grid gap-1.5"><Label>Data</Label><Input required type="date" value={form.transactionDate} onChange={(event) => setForm({ ...form, transactionDate: event.target.value })} /></label></div>
        <label className="grid gap-1.5"><Label>Forma de {form.type === "entrada" ? "recebimento" : "pagamento"}</Label><select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value as PaymentMethod })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>
        {form.type === "entrada" && <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5"><Label>Contribuinte cadastrado</Label><select value={form.contributorPersonId} onChange={(event) => setForm({ ...form, contributorPersonId: event.target.value, contributorName: event.target.value ? "" : form.contributorName })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Não vincular a uma Pessoa</option>{(peopleQuery.data ?? []).map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label><label className="grid gap-1.5"><Label>Nome para recibo</Label><Input disabled={Boolean(form.contributorPersonId)} value={form.contributorName} onChange={(event) => setForm({ ...form, contributorName: event.target.value })} placeholder="Ex.: Visitante ou família" /></label></div>}
        <label className="grid gap-1.5"><Label>Descrição</Label><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={form.type === "entrada" ? "Ex.: Culto de domingo à noite" : "Ex.: Referência ou fornecedor"} /></label>
        <label className="grid gap-1.5"><Label>Referência opcional</Label><Input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="Comprovante, recibo ou nota" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.status === "rascunho"} onChange={(event) => setForm({ ...form, status: event.target.checked ? "rascunho" : "confirmado" })} /> Salvar como rascunho</label>
        {createTransaction.error && <p className="text-sm text-rose-700">{createTransaction.error.message}</p>}<Button type="submit" disabled={createTransaction.isPending} className="bg-navy hover:bg-navy/90">{createTransaction.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{form.status === "rascunho" ? "Salvar rascunho" : "Confirmar lançamento"}</Button>
      </form></DialogContent></Dialog>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}><DialogContent><DialogHeader><DialogTitle className="font-display text-2xl text-navy">Nova categoria</DialogTitle><DialogDescription>Crie uma categoria exclusiva para esta igreja.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); createCategory.mutate({ churchId, type: categoryType, name: categoryName }); }}><label className="grid gap-1.5"><Label>Tipo</Label><select value={categoryType} onChange={(event) => setCategoryType(event.target.value as TransactionType)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label><label className="grid gap-1.5"><Label>Nome</Label><Input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Ex.: Missões internacionais" /></label>{createCategory.error && <p className="text-sm text-rose-700">{createCategory.error.message}</p>}<Button disabled={createCategory.isPending} className="bg-navy hover:bg-navy/90">Criar categoria</Button></form></DialogContent></Dialog>

      <Dialog open={accountOpen} onOpenChange={setAccountOpen}><DialogContent><DialogHeader><DialogTitle className="font-display text-2xl text-navy">Nova conta financeira</DialogTitle><DialogDescription>O saldo inicial só deve ser usado na implantação ou na abertura de uma nova conta.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); createAccount.mutate({ churchId, name: newAccount.name, type: newAccount.type, openingBalanceCents: parseCents(newAccount.openingBalance) }); }}><label className="grid gap-1.5"><Label>Nome</Label><Input required value={newAccount.name} onChange={(event) => setNewAccount({ ...newAccount, name: event.target.value })} placeholder="Ex.: Banco Missões" /></label><label className="grid gap-1.5"><Label>Tipo</Label><select value={newAccount.type} onChange={(event) => setNewAccount({ ...newAccount, type: event.target.value as "caixa" | "banco" | "outro" })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="caixa">Caixa</option><option value="banco">Banco</option><option value="outro">Outro</option></select></label><label className="grid gap-1.5"><Label>Saldo inicial (R$)</Label><Input inputMode="decimal" value={newAccount.openingBalance} onChange={(event) => setNewAccount({ ...newAccount, openingBalance: event.target.value })} /></label>{createAccount.error && <p className="text-sm text-rose-700">{createAccount.error.message}</p>}<Button disabled={createAccount.isPending} className="bg-navy hover:bg-navy/90">Criar conta</Button></form></DialogContent></Dialog>

      <Dialog open={reverseOpen !== null} onOpenChange={(open) => { if (!open) setReverseOpen(null); }}><DialogContent><DialogHeader><DialogTitle className="font-display text-2xl text-navy">Estornar lançamento</DialogTitle><DialogDescription>O lançamento será preservado no histórico, identificado como estornado e deixará de compor os saldos.</DialogDescription></DialogHeader><label className="grid gap-1.5"><Label>Motivo do estorno</Label><Textarea value={reverseReason} onChange={(event) => setReverseReason(event.target.value)} placeholder="Explique o motivo da correção" /></label>{reverseTransaction.error && <p className="text-sm text-rose-700">{reverseTransaction.error.message}</p>}<Button variant="destructive" disabled={reverseTransaction.isPending || reverseReason.trim().length < 5} onClick={() => reverseOpen && reverseTransaction.mutate({ churchId, id: reverseOpen, reason: reverseReason })}>Estornar lançamento</Button></DialogContent></Dialog>

      <Dialog open={receiptOpen !== null} onOpenChange={(open) => { if (!open) setReceiptOpen(null); }}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle className="font-display text-2xl text-navy">Recibo de contribuição</DialogTitle><DialogDescription>Disponível apenas para entradas confirmadas da sua igreja.</DialogDescription></DialogHeader>{receiptQuery.isLoading ? <div className="h-44 animate-pulse rounded-xl bg-muted" /> : receiptQuery.data && <div className="rounded-xl border border-gold/30 bg-cream/30 p-5 space-y-3"><p className="text-xs font-semibold uppercase tracking-wider text-gold">Recibo nº {receiptQuery.data.transaction.id}</p><p className="font-display text-2xl text-navy">{toCurrency(receiptQuery.data.transaction.amountCents)}</p><div className="grid grid-cols-2 gap-3 text-sm"><p><span className="block text-xs text-muted-foreground">Contribuinte</span>{receiptQuery.data.contributor?.fullName || receiptQuery.data.transaction.contributorName || "Não identificado"}</p><p><span className="block text-xs text-muted-foreground">Categoria</span>{receiptQuery.data.category.name}</p><p><span className="block text-xs text-muted-foreground">Data</span>{new Date(receiptQuery.data.transaction.transactionDate).toLocaleDateString("pt-BR")}</p><p><span className="block text-xs text-muted-foreground">Forma</span>{receiptQuery.data.transaction.paymentMethod}</p></div><p className="text-sm text-muted-foreground">{receiptQuery.data.transaction.description || "Contribuição registrada na Tesouraria."}</p><Button className="w-full bg-navy" onClick={printReceipt}><Printer className="mr-2 h-4 w-4" /> Imprimir recibo</Button></div>}</DialogContent></Dialog>

      <Dialog open={reconciliationOpen} onOpenChange={(open) => { if (!open) { setReconciliationOpen(false); setReconciliationForm({ accountId: "", bankClosingBalance: "", notes: "" }); setAttachmentError(null); } }}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle className="font-display text-2xl text-navy">Conciliação bancária</DialogTitle><DialogDescription>Compare o saldo do extrato com o saldo registrado até o fim do período. A conciliação não altera lançamentos nem fechamento.</DialogDescription></DialogHeader><div className="grid gap-4"><label className="grid gap-1.5"><Label>Conta bancária</Label><select value={reconciliationForm.accountId || String(bankAccounts[0]?.id ?? "")} onChange={(event) => { setReconciliationForm({ ...reconciliationForm, accountId: event.target.value }); setAttachmentError(null); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Saldo do livro-caixa em {new Date(`${endDate}T12:00:00`).toLocaleDateString("pt-BR")}</p><p className="mt-1 text-xl font-semibold text-navy">{toCurrency(reconciliationQuery.data?.bookBalanceCents ?? 0)}</p></div><label className="grid gap-1.5"><Label>Saldo final no extrato (R$)</Label><Input inputMode="decimal" value={reconciliationForm.bankClosingBalance} onChange={(event) => setReconciliationForm({ ...reconciliationForm, bankClosingBalance: event.target.value })} placeholder="0,00" /></label><div className={`rounded-xl p-3 text-sm ${reconciliationDifference === 0 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}><strong>{reconciliationDifference === 0 ? "Conciliação sem divergência" : "Divergência identificada"}</strong><span className="ml-2">{toCurrency(reconciliationDifference)}</span></div><label className="grid gap-1.5"><Label>Observações</Label><Textarea value={reconciliationForm.notes} onChange={(event) => setReconciliationForm({ ...reconciliationForm, notes: event.target.value })} placeholder="Ex.: PIX em trânsito ou tarifa ainda não registrada." /></label><div className="rounded-xl border border-dashed border-gold/50 bg-cream/20 p-4"><div className="flex items-start gap-3"><Paperclip className="mt-0.5 h-5 w-5 text-gold" /><div className="min-w-0 flex-1"><p className="font-semibold text-navy">Comprovantes bancários</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Salve a conciliação e envie PDF, PNG, JPEG ou WebP de até 8 MB.</p>{reconciliationId ? <div className="mt-3 space-y-2">{attachmentsQuery.isLoading ? <p className="text-xs text-muted-foreground">Carregando comprovantes…</p> : (attachmentsQuery.data ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Nenhum comprovante anexado.</p> : (attachmentsQuery.data ?? []).map((attachment) => <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-navy hover:bg-white"><span className="min-w-0 truncate">{attachment.fileName}</span><ExternalLink className="h-4 w-4 shrink-0" /></a>)}<label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-navy/20 bg-white px-3 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy hover:text-white"><Upload className="h-4 w-4" />{uploadingAttachment ? "Enviando…" : "Anexar comprovante"}<input type="file" className="sr-only" accept="application/pdf,image/png,image/jpeg,image/webp" disabled={uploadingAttachment} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAttachment(file); event.currentTarget.value = ""; }} /></label></div> : <p className="mt-3 text-xs font-medium text-amber-800">Salve a conciliação para liberar o anexo.</p>}</div></div></div>{attachmentError && <p className="text-sm text-rose-700">{attachmentError}</p>}{saveReconciliation.error && <p className="text-sm text-rose-700">{saveReconciliation.error.message}</p>}<Button disabled={saveReconciliation.isPending || !reconciliationForm.bankClosingBalance.trim()} className="bg-navy" onClick={() => saveReconciliation.mutate({ churchId, accountId: reconciliationAccountId, periodStart: startDate, periodEnd: endDate, bankClosingBalanceCents: bankBalanceInput, notes: reconciliationForm.notes.trim() || undefined })}>{saveReconciliation.isPending ? "Salvando…" : reconciliationId ? "Atualizar conciliação" : "Salvar conciliação"}</Button></div></DialogContent></Dialog>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof WalletCards; label: string; value: string; tone: "navy" | "green" | "rose" | "gold" }) {
  const tones = { navy: "bg-navy text-white", green: "bg-emerald-600 text-white", rose: "bg-rose-600 text-white", gold: "bg-gold text-navy" };
  return <Card className={`print-card border-0 shadow-sm ${tones[tone]}`}><CardContent className="p-4 sm:p-5"><Icon className="w-4 h-4 opacity-75 mb-4" /><p className="text-[11px] uppercase tracking-wider opacity-75 font-medium">{label}</p><p className="font-display text-xl sm:text-2xl mt-1">{value}</p></CardContent></Card>;
}

function TreasurySkeleton() {
  return <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">{Array.from({ length: 4 }).map((_, index) => <Card key={index}><CardContent className="p-5"><div className="h-4 w-20 rounded bg-muted animate-pulse" /><div className="h-8 w-28 rounded bg-muted animate-pulse mt-5" /></CardContent></Card>)}</div>;
}

function EmptyTransactions() {
  return <div className="py-12 px-6 text-center"><FileText className="w-8 h-8 text-gold mx-auto mb-3" /><p className="font-semibold text-navy">Nenhum lançamento neste período</p><p className="text-sm text-muted-foreground mt-1">Registre uma entrada ou saída para começar o livro-caixa.</p></div>;
}

function AccessDenied() {
  return <div className="p-6 max-w-xl mx-auto"><Card className="border-amber-200 bg-amber-50"><CardContent className="p-7 text-center"><XCircle className="w-10 h-10 mx-auto text-amber-600 mb-3" /><h1 className="font-display text-2xl text-navy">Acesso restrito</h1><p className="text-sm text-muted-foreground mt-2">A Tesouraria é acessível apenas a Pastores e Tesoureiros autorizados. Solicite ao Pastor Presidente a atribuição da função, se necessário.</p></CardContent></Card></div>;
}
