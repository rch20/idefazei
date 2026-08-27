import { type ReactNode, useEffect, useMemo, useState } from "react";
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
import { buildTreasuryReceiptHtml, formatBrl, formatDatePtBr, openTreasuryPrintDocument, parseBrlToCents } from "@/lib/treasury";
import { TreasuryPdfPreview } from "@/components/TreasuryPdfPreview";
import { toast } from "sonner";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpenCheck,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FileDown,
  FileText,
  Landmark,
  Loader2,
  Pencil,
  Power,
  Paperclip,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  WalletCards,
  XCircle,
} from "lucide-react";

type TransactionType = "entrada" | "saida";
type TransactionStatus = "rascunho" | "confirmado";
type PaymentMethod = "dinheiro" | "pix" | "transferencia" | "cartao" | "cheque" | "outro";
type PeriodAction = "close" | "reopen" | null;
type ReportMode = "summary" | "detailed";

const MAX_FINANCIAL_CENTS = 2_147_483_647;
const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "transferencia", label: "Transferência" },
  { value: "cartao", label: "Cartão" },
  { value: "cheque", label: "Cheque" },
  { value: "outro", label: "Outro" },
];

const today = () => new Date().toISOString().slice(0, 10);

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const last = new Date(year, monthNumber, 0).getDate();
  return { startDate: `${month}-01`, endDate: `${month}-${String(last).padStart(2, "0")}` };
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const TREASURY_DIALOG_CLASS = "!flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 flex-col overflow-hidden p-4 sm:max-h-[calc(100dvh-2rem)] sm:p-6";

function TreasuryDialogBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pr-1 ${className}`} style={{ scrollbarGutter: "stable" }}>{children}</div>;
}

export default function Tesouraria() {
  const { churchId, churchName } = useChurch();
  const { user } = useChurchAuth();
  const utils = trpc.useUtils();
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [accountFilter, setAccountFilter] = useState("todas");
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string; type: TransactionType } | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState<number | null>(null);
  const [receiptOpen, setReceiptOpen] = useState<number | null>(null);
  const [reconciliationOpen, setReconciliationOpen] = useState(false);
  const [reconciliationHydratedKey, setReconciliationHydratedKey] = useState("");
  const [reconciliationForm, setReconciliationForm] = useState({ accountId: "", bankClosingBalance: "", notes: "" });
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<TransactionType>("entrada");
  const [newAccount, setNewAccount] = useState({ name: "", type: "caixa" as "caixa" | "banco" | "outro", openingBalance: "0,00" });
  const [reverseReason, setReverseReason] = useState("");
  const [periodAction, setPeriodAction] = useState<PeriodAction>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [reportBlob, setReportBlob] = useState<Blob | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportChoiceOpen, setReportChoiceOpen] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportMode, setReportMode] = useState<ReportMode>("summary");
  const [reportFileName, setReportFileName] = useState("");
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
  const effectiveRolesQuery = trpc.churchAuth.effectiveRoles.useQuery({ churchId }, { enabled: Boolean(churchId) });
  const receiptQuery = trpc.treasury.receipt.useQuery({ churchId, id: receiptOpen ?? 0 }, { enabled: Boolean(churchId && receiptOpen) });
  const bankAccounts = (accountsQuery.data ?? []).filter((account) => account.type === "banco");
  const reconciliationAccountId = Number(reconciliationForm.accountId || 0);
  const reconciliationQuery = trpc.treasury.reconciliation.useQuery(
    { churchId, accountId: reconciliationAccountId, periodStart: startDate, periodEnd: endDate },
    { enabled: Boolean(churchId && reconciliationOpen && reconciliationAccountId) },
  );
  const reconciliationId = reconciliationQuery.data?.reconciliation?.id ?? 0;
  const attachmentsQuery = trpc.treasury.reconciliationAttachments.useQuery(
    { churchId, reconciliationId },
    { enabled: Boolean(churchId && reconciliationId) },
  );

  const effectiveRoles = useMemo(() => Array.from(new Set([user?.role, ...(effectiveRolesQuery.data ?? [])].filter(Boolean))), [user?.role, effectiveRolesQuery.data]);
  const periodClosed = closureQuery.data?.status === "fechado";
  const canManageStructure = effectiveRoles.some((role) => ["pastor_presidente", "pastor_local"].includes(String(role)));
  const categoryManagementQuery = trpc.treasury.categoriesManagement.useQuery({ churchId }, { enabled: Boolean(churchId && canManageStructure) });
  const canClosePeriod = effectiveRoles.includes("pastor_presidente");
  const selectedCategories = (categoriesQuery.data ?? []).filter((category) => category.type === form.type);
  const selectedAccount = selectedAccountId
    ? (accountsQuery.data ?? []).find((account) => account.id === selectedAccountId)
    : (accountsQuery.data ?? [])[0];
  const periodLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const accountLabel = selectedAccountId ? selectedAccount?.name ?? "Conta selecionada" : "Todas as contas";
  const reportTitle = reportMode === "summary" ? "Resumo de Tesouraria" : "Relatório detalhado de Tesouraria";
  const overview = overviewQuery.data;
  const bankBalanceInput = parseBrlToCents(reconciliationForm.bankClosingBalance);
  const reconciliationDifference = bankBalanceInput === null ? null : bankBalanceInput - (reconciliationQuery.data?.bookBalanceCents ?? 0);

  useEffect(() => {
    if (!reconciliationOpen || !reconciliationAccountId || !reconciliationQuery.isFetched) return;
    const key = `${reconciliationAccountId}:${startDate}`;
    if (reconciliationHydratedKey === key) return;
    const saved = reconciliationQuery.data?.reconciliation;
    setReconciliationForm((current) => ({
      ...current,
      bankClosingBalance: saved ? centsToInput(saved.bankClosingBalanceCents) : "",
      notes: saved?.notes ?? "",
    }));
    setReconciliationHydratedKey(key);
  }, [reconciliationOpen, reconciliationAccountId, startDate, reconciliationQuery.isFetched, reconciliationQuery.data, reconciliationHydratedKey]);

  const invalidateTreasury = async () => {
    await Promise.all([
      utils.treasury.overview.invalidate(),
      utils.treasury.accounts.invalidate(),
      utils.treasury.categories.invalidate(),
      utils.treasury.categoriesManagement.invalidate(),
      utils.treasury.periodClosure.invalidate(),
      utils.treasury.reconciliation.invalidate(),
    ]);
  };

  const createTransaction = trpc.treasury.createTransaction.useMutation({
    onSuccess: async () => {
      await invalidateTreasury();
      setTransactionOpen(false);
      setFormError(null);
      toast.success("Lançamento registrado com sucesso.");
    },
  });
  const createCategory = trpc.treasury.createCategory.useMutation({
    onSuccess: async () => {
      await invalidateTreasury();
      setCategoryName("");
      setEditingCategory(null);
      setCategoryOpen(false);
      setStructureError(null);
      toast.success("Categoria criada.");
    },
    onError: (error) => toast.error(error.message),
  });
  const updateCategory = trpc.treasury.updateCategory.useMutation({
    onSuccess: async () => {
      await invalidateTreasury();
      setCategoryName("");
      setEditingCategory(null);
      setCategoryOpen(false);
      setStructureError(null);
      toast.success("Categoria atualizada.");
    },
    onError: (error) => toast.error(error.message),
  });
  const setCategoryActive = trpc.treasury.setCategoryActive.useMutation({
    onSuccess: async (_category, variables) => {
      await invalidateTreasury();
      toast.success(variables.active ? "Categoria reativada." : "Categoria inativada.");
    },
    onError: (error) => toast.error(error.message),
  });
  const createAccount = trpc.treasury.createAccount.useMutation({
    onSuccess: async () => {
      await invalidateTreasury();
      setNewAccount({ name: "", type: "caixa", openingBalance: "0,00" });
      setAccountOpen(false);
      setStructureError(null);
      toast.success("Conta financeira criada.");
    },
  });
  const confirmTransaction = trpc.treasury.confirmTransaction.useMutation({
    onSuccess: async () => { await invalidateTreasury(); toast.success("Rascunho confirmado."); },
    onError: (error) => toast.error(error.message),
  });
  const reverseTransaction = trpc.treasury.reverseTransaction.useMutation({
    onSuccess: async () => {
      await invalidateTreasury();
      setReverseOpen(null);
      setReverseReason("");
      toast.success("Lançamento estornado com trilha de auditoria.");
    },
  });
  const closePeriod = trpc.treasury.closePeriod.useMutation({
    onSuccess: async () => { await invalidateTreasury(); setPeriodAction(null); toast.success("Período fechado."); },
  });
  const reopenPeriod = trpc.treasury.reopenPeriod.useMutation({
    onSuccess: async () => { await invalidateTreasury(); setPeriodAction(null); setReopenReason(""); toast.success("Período reaberto."); },
  });
  const saveReconciliation = trpc.treasury.saveReconciliation.useMutation({
    onSuccess: async (saved) => {
      setAttachmentError(null);
      await invalidateTreasury();
      await reconciliationQuery.refetch();
      toast.success(saved?.status === "conciliada" ? "Conciliação salva sem divergência." : "Conciliação salva com divergência registrada.");
    },
  });
  const removeReconciliationAttachment = trpc.treasury.removeReconciliationAttachment.useMutation({
    onSuccess: async () => { await attachmentsQuery.refetch(); toast.success("Comprovante removido."); },
  });

  const openTransaction = (type: TransactionType) => {
    const firstCategory = (categoriesQuery.data ?? []).find((category) => category.type === type);
    createTransaction.reset();
    setFormError(null);
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
    setFormError(null);
    const amountCents = parseBrlToCents(form.amount);
    if (amountCents === null || amountCents <= 0) return setFormError("Informe um valor monetário válido e maior que zero.");
    if (amountCents > MAX_FINANCIAL_CENTS) return setFormError("O valor excede o limite permitido por lançamento.");
    if (!Number(form.accountId) || !Number(form.categoryId)) return setFormError("Selecione uma conta e uma categoria válidas.");
    if (form.contributorName.trim() && form.contributorName.trim().length < 2) return setFormError("O nome para recibo deve ter pelo menos 2 caracteres.");
    createTransaction.mutate({
      churchId,
      accountId: Number(form.accountId),
      categoryId: Number(form.categoryId),
      type: form.type,
      amountCents,
      transactionDate: form.transactionDate,
      paymentMethod: form.paymentMethod,
      contributorPersonId: form.contributorPersonId ? Number(form.contributorPersonId) : undefined,
      contributorName: form.contributorPersonId ? undefined : form.contributorName.trim() || undefined,
      description: form.description.trim() || undefined,
      reference: form.reference.trim() || undefined,
      status: form.status,
    });
  };

  const submitCategory = (event: React.FormEvent) => {
    event.preventDefault();
    setStructureError(null);
    if (categoryName.trim().length < 2) return setStructureError("Informe um nome com pelo menos 2 caracteres.");
    if (editingCategory) {
      updateCategory.mutate({ churchId, id: editingCategory.id, type: categoryType, name: categoryName.trim() });
      return;
    }
    createCategory.mutate({ churchId, type: categoryType, name: categoryName.trim() });
  };

  const submitAccount = (event: React.FormEvent) => {
    event.preventDefault();
    setStructureError(null);
    const openingBalanceCents = parseBrlToCents(newAccount.openingBalance);
    if (openingBalanceCents === null || openingBalanceCents < 0) return setStructureError("Informe um saldo inicial válido e não negativo.");
    if (openingBalanceCents > MAX_FINANCIAL_CENTS) return setStructureError("O saldo inicial excede o limite permitido.");
    createAccount.mutate({ churchId, name: newAccount.name.trim(), type: newAccount.type, openingBalanceCents });
  };

  const generateReport = async (mode: ReportMode) => {
    if (!overview) return toast.error("Aguarde o carregamento do relatório.");
    setReportGenerating(true);
    try {
      const { createTreasuryReportPdf, createTreasurySummaryPdf, treasuryPdfFileName } = await import("@/lib/treasuryPdf");
      const input = { churchName, periodLabel, startDate, endDate, accountLabel, data: overview };
      const blob = mode === "summary" ? await createTreasurySummaryPdf(input) : await createTreasuryReportPdf(input);
      setReportMode(mode);
      setReportFileName(treasuryPdfFileName(month, mode));
      setReportBlob(blob);
      setReportChoiceOpen(false);
      setReportOpen(true);
    } catch (error) {
      toast.error(errorMessage(error, "Não foi possível gerar o PDF. Tente novamente."));
    } finally {
      setReportGenerating(false);
    }
  };

  const printReceipt = () => {
    const data = receiptQuery.data;
    if (!data) return;
    const contributorName = data.contributor?.fullName || data.transaction.contributorName || "Contribuinte não identificado";
    const opened = openTreasuryPrintDocument(buildTreasuryReceiptHtml({
      churchName,
      receiptNumber: data.transaction.id,
      contributorName,
      date: data.transaction.transactionDate,
      categoryName: data.category.name,
      paymentMethod: data.transaction.paymentMethod,
      amountCents: data.transaction.amountCents,
      description: data.transaction.description || "Contribuição registrada na Tesouraria da igreja.",
    }));
    if (!opened) toast.error("O navegador bloqueou a janela do recibo. Libere pop-ups e tente novamente.");
  };

  const openReconciliation = () => {
    const firstBank = bankAccounts[0];
    if (!firstBank) return;
    setReconciliationForm({ accountId: String(firstBank.id), bankClosingBalance: "", notes: "" });
    setReconciliationHydratedKey("");
    setAttachmentError(null);
    saveReconciliation.reset();
    setReconciliationOpen(true);
  };

  const uploadAttachment = async (file: File, replaceAttachmentId?: number) => {
    if (!reconciliationId) return setAttachmentError("Salve a conciliação antes de anexar um comprovante.");
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) return setAttachmentError("Envie um arquivo PDF, PNG, JPEG ou WebP.");
    if (file.size > 8 * 1024 * 1024) return setAttachmentError("O comprovante deve ter no máximo 8 MB.");
    const token = getChurchToken();
    if (!token) return setAttachmentError("Sua sessão expirou. Entre novamente para enviar o comprovante.");
    setUploadingAttachment(true);
    setAttachmentError(null);
    try {
      const formData = new FormData();
      formData.append("reconciliationId", String(reconciliationId));
      formData.append("file", file);
      const response = await fetch("/api/treasury/reconciliation-attachments", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível enviar o comprovante.");
      if (replaceAttachmentId) await removeReconciliationAttachment.mutateAsync({ churchId, reconciliationId, attachmentId: replaceAttachmentId });
      else await attachmentsQuery.refetch();
      toast.success(replaceAttachmentId ? "Comprovante substituído." : "Comprovante anexado.");
    } catch (error) {
      setAttachmentError(errorMessage(error, "Não foi possível enviar o comprovante."));
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removeAttachment = async (attachmentId: number) => {
    if (!reconciliationId || !window.confirm("Remover este comprovante? A conciliação e os lançamentos financeiros não serão alterados.")) return;
    setAttachmentError(null);
    try {
      await removeReconciliationAttachment.mutateAsync({ churchId, reconciliationId, attachmentId });
    } catch (error) {
      setAttachmentError(errorMessage(error, "Não foi possível remover o comprovante."));
    }
  };

  if (overviewQuery.error?.data?.code === "FORBIDDEN") return <AccessDenied />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-gold text-xs font-semibold uppercase tracking-[0.16em]">Administração financeira</p>
          <h1 className="mt-1 font-display text-3xl text-navy">Tesouraria</h1>
          <p className="mt-1 text-muted-foreground">Entradas, saídas, conciliação e prestação de contas da igreja.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setReportChoiceOpen(true)} disabled={!overview || overviewQuery.isFetching || reportGenerating} className="gap-2">{reportGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} {reportGenerating ? "Preparando PDF…" : "Gerar PDF"}</Button>
          {bankAccounts.length > 0 && <Button variant="outline" onClick={openReconciliation} className="gap-2"><BookOpenCheck className="h-4 w-4" /> Conciliar banco</Button>}
          <Button variant="outline" onClick={() => openTransaction("saida")} disabled={periodClosed || accountsQuery.isLoading || categoriesQuery.isLoading} title={periodClosed ? "Reabra o período para registrar uma saída." : undefined} className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50"><ArrowUpCircle className="h-4 w-4" /> Registrar saída</Button>
          <Button onClick={() => openTransaction("entrada")} disabled={periodClosed || accountsQuery.isLoading || categoriesQuery.isLoading} title={periodClosed ? "Reabra o período para registrar uma entrada." : undefined} className="gap-2 bg-navy hover:bg-navy/90"><ArrowDownCircle className="h-4 w-4" /> Registrar entrada</Button>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <label className="grid gap-1.5 text-sm font-medium text-navy">Período<Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-full sm:w-48" /></label>
        <label className="grid gap-1.5 text-sm font-medium text-navy">Conta<select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-52"><option value="todas">Todas as contas</option>{(accountsQuery.data ?? []).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          {canManageStructure && <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => { createCategory.reset(); updateCategory.reset(); setEditingCategory(null); setCategoryName(""); setCategoryType("entrada"); setStructureError(null); setCategoryOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Categoria</Button><Button variant="outline" size="sm" onClick={() => { setCategoryManagerOpen(true); categoryManagementQuery.refetch(); }}><Pencil className="mr-1 h-4 w-4" /> Gerenciar categorias</Button><Button variant="outline" size="sm" onClick={() => { createAccount.reset(); setStructureError(null); setAccountOpen(true); }}><Landmark className="mr-1 h-4 w-4" /> Conta</Button></div>}
        <div className="sm:ml-auto">{periodClosed ? <Badge className="bg-slate-800 text-white">Período fechado · lançamentos bloqueados</Badge> : <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">Período em aberto</Badge>}</div>
      </section>

      {overviewQuery.error && <InlineError message={overviewQuery.error.message} />}
      {overviewQuery.isLoading ? <TreasurySkeleton /> : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={WalletCards} label={`Saldo até ${formatDatePtBr(endDate)}`} value={formatBrl(overview?.balanceCents ?? 0)} tone="navy" helper={accountLabel} />
            <MetricCard icon={ArrowDownCircle} label="Entradas no período" value={formatBrl(overview?.entriesCents ?? 0)} tone="green" helper={periodLabel} />
            <MetricCard icon={ArrowUpCircle} label="Saídas no período" value={formatBrl(overview?.expensesCents ?? 0)} tone="rose" helper={periodLabel} />
            <MetricCard icon={CircleDollarSign} label="Resultado do período" value={formatBrl(overview?.resultCents ?? 0)} tone={(overview?.resultCents ?? 0) >= 0 ? "gold" : "rose"} helper="Entradas menos saídas" />
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <Card className="border-slate-200 shadow-sm lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3"><CardTitle className="font-display text-xl text-navy">Livro-caixa · <span className="capitalize">{periodLabel}</span></CardTitle><Badge variant="outline">{overview?.transactions.length ?? 0} lançamentos</Badge></CardHeader>
              <CardContent className="p-0">
                {(overview?.transactions.length ?? 0) === 0 ? <EmptyTransactions /> : <div className="divide-y divide-border">
                  {overview?.transactions.map(({ transaction, account, category }) => (
                    <div key={transaction.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/70">
                      <div className={`shrink-0 rounded-full p-2 ${transaction.type === "entrada" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{transaction.type === "entrada" ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}</div>
                      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-navy">{category.name}</p>{transaction.status === "rascunho" && <Badge variant="outline" className="text-[10px]">Rascunho</Badge>}{transaction.status === "estornado" && <Badge className="bg-slate-200 text-[10px] text-slate-700">Estornado</Badge>}</div><p className="truncate text-xs text-muted-foreground">{account.name} · {formatDatePtBr(transaction.transactionDate)}{transaction.description ? ` · ${transaction.description}` : ""}</p></div>
                      <div className="shrink-0 text-right"><p className={`text-sm font-semibold ${transaction.type === "entrada" ? "text-emerald-700" : "text-rose-700"}`}>{transaction.type === "entrada" ? "+" : "−"}{formatBrl(transaction.amountCents)}</p><p className="text-[10px] uppercase text-muted-foreground">{transaction.paymentMethod}</p></div>
                      <div className="flex gap-1">
                        {transaction.status === "rascunho" && <Button variant="ghost" size="icon" aria-label="Confirmar rascunho" title="Confirmar rascunho" disabled={confirmTransaction.isPending} onClick={() => confirmTransaction.mutate({ churchId, id: transaction.id })}>{confirmTransaction.isPending && confirmTransaction.variables?.id === transaction.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}</Button>}
                        {transaction.status === "confirmado" && transaction.type === "entrada" && <Button variant="ghost" size="icon" aria-label="Emitir recibo" title="Emitir recibo" onClick={() => setReceiptOpen(transaction.id)}><ReceiptText className="h-4 w-4 text-navy" /></Button>}
                        {transaction.status === "confirmado" && canManageStructure && <Button variant="ghost" size="icon" aria-label="Estornar lançamento" title="Estornar lançamento" disabled={reverseTransaction.isPending} onClick={() => { reverseTransaction.reset(); setReverseReason(""); setReverseOpen(transaction.id); }}><RotateCcw className="h-4 w-4 text-slate-600" /></Button>}
                      </div>
                    </div>
                  ))}
                </div>}
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="border-slate-200 shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-navy"><Landmark className="h-4 w-4 text-gold" /> Saldos por conta</CardTitle></CardHeader><CardContent className="space-y-3">{(overview?.accountBalances ?? []).map(({ account, balanceCents }) => <div key={account.id} className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{account.name}</span><strong className="text-navy">{formatBrl(balanceCents)}</strong></div>)}{(overview?.accountBalances.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Nenhuma conta disponível.</p>}</CardContent></Card>
              <Card className="border-slate-200 shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-navy"><ReceiptText className="h-4 w-4 text-gold" /> Categorias do período</CardTitle></CardHeader><CardContent className="space-y-3">{(overview?.categories ?? []).slice(0, 8).map((category) => <div key={`${category.type}-${category.categoryId}`} className="flex justify-between gap-3 text-sm"><span className="truncate text-muted-foreground">{category.categoryName}</span><strong className={category.type === "entrada" ? "text-emerald-700" : "text-rose-700"}>{formatBrl(category.amountCents)}</strong></div>)}{(overview?.categories.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Sem movimentos confirmados neste período.</p>}</CardContent></Card>
              <Card className="border-dashed border-gold/40 bg-gold/5"><CardContent className="pt-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-gold" /><div><p className="text-sm font-semibold text-navy">Fechamento mensal</p><p className="mt-1 text-xs text-muted-foreground">Bloqueia novos lançamentos e preserva a trilha de auditoria do período.</p>{canClosePeriod && (periodClosed ? <Button size="sm" variant="outline" className="mt-3" onClick={() => { reopenPeriod.reset(); setReopenReason(""); setPeriodAction("reopen"); }}>Reabrir período</Button> : <Button size="sm" className="mt-3 bg-navy hover:bg-navy/90" onClick={() => { closePeriod.reset(); setPeriodAction("close"); }}>Fechar {periodLabel}</Button>)}</div></div></CardContent></Card>
            </div>
          </section>
        </>
      )}

      <Dialog open={reportChoiceOpen} onOpenChange={(open) => { if (!reportGenerating) setReportChoiceOpen(open); }}>
        <DialogContent className={`${TREASURY_DIALOG_CLASS} sm:max-w-xl`}><DialogHeader className="shrink-0 pr-8"><DialogTitle className="font-display text-2xl text-navy">Escolha o formato do PDF</DialogTitle><DialogDescription>O resumo cabe em uma página; o detalhado inclui todo o livro-caixa do período.</DialogDescription></DialogHeader>
          <TreasuryDialogBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="outline" disabled={reportGenerating} onClick={() => void generateReport("summary")} className="h-auto items-start justify-start gap-3 whitespace-normal p-4 text-left"><FileText className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><span><strong className="block text-navy">Resumo · 1 página</strong><span className="mt-1 block text-xs font-normal text-muted-foreground">Indicadores, contas, categorias, movimentação consolidada e assinaturas.</span></span></Button>
              <Button type="button" variant="outline" disabled={reportGenerating} onClick={() => void generateReport("detailed")} className="h-auto items-start justify-start gap-3 whitespace-normal p-4 text-left"><BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><span><strong className="block text-navy">Relatório detalhado</strong><span className="mt-1 block text-xs font-normal text-muted-foreground">Resumo completo mais todas as linhas do livro-caixa, com paginação.</span></span></Button>
            </div>
            {reportGenerating && <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Preparando o arquivo selecionado…</p>}
          </TreasuryDialogBody>
        </DialogContent>
      </Dialog>

      <TreasuryPdfPreview open={reportOpen} blob={reportBlob} fileName={reportFileName} title={reportTitle} onClose={() => setReportOpen(false)} />

      <Dialog open={transactionOpen} onOpenChange={(open) => { if (!createTransaction.isPending) { setTransactionOpen(open); if (!open) { setFormError(null); createTransaction.reset(); } } }}>
        <DialogContent className={`${TREASURY_DIALOG_CLASS} sm:max-w-lg`}><DialogHeader className="shrink-0 pr-8"><DialogTitle className="font-display text-2xl text-navy">{form.type === "entrada" ? "Registrar entrada" : "Registrar saída"}</DialogTitle><DialogDescription>O lançamento será vinculado à conta e à categoria selecionadas.</DialogDescription></DialogHeader>
          <TreasuryDialogBody>
            <form onSubmit={submitTransaction} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5"><Label>Conta</Label><select required value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="" disabled>Selecione</option>{(accountsQuery.data ?? []).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="grid gap-1.5"><Label>Categoria</Label><select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="" disabled>Selecione</option>{selectedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div>
            <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5"><Label>Valor (R$)</Label><Input required inputMode="decimal" placeholder="0,00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label className="grid gap-1.5"><Label>Data</Label><Input required type="date" value={form.transactionDate} onChange={(event) => setForm({ ...form, transactionDate: event.target.value })} /></label></div>
            <label className="grid gap-1.5"><Label>Forma de {form.type === "entrada" ? "recebimento" : "pagamento"}</Label><select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value as PaymentMethod })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>
            {form.type === "entrada" && <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5"><Label>Contribuinte cadastrado</Label><select value={form.contributorPersonId} onChange={(event) => setForm({ ...form, contributorPersonId: event.target.value, contributorName: event.target.value ? "" : form.contributorName })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Não vincular a uma Pessoa</option>{(peopleQuery.data ?? []).map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label><label className="grid gap-1.5"><Label>Nome para recibo</Label><Input disabled={Boolean(form.contributorPersonId)} value={form.contributorName} onChange={(event) => setForm({ ...form, contributorName: event.target.value })} placeholder="Ex.: Visitante ou família" /></label></div>}
            <label className="grid gap-1.5"><Label>Descrição</Label><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={form.type === "entrada" ? "Ex.: Culto de domingo à noite" : "Ex.: Referência ou fornecedor"} /></label>
            <label className="grid gap-1.5"><Label>Referência opcional</Label><Input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="Comprovante, recibo ou nota" /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.status === "rascunho"} onChange={(event) => setForm({ ...form, status: event.target.checked ? "rascunho" : "confirmado" })} /> Salvar como rascunho</label>
            {(formError || createTransaction.error) && <InlineError message={formError || createTransaction.error?.message || "Não foi possível registrar o lançamento."} compact />}
            <Button type="submit" disabled={createTransaction.isPending} className="bg-navy hover:bg-navy/90">{createTransaction.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{form.status === "rascunho" ? "Salvar rascunho" : "Confirmar lançamento"}</Button>
            </form>
          </TreasuryDialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryManagerOpen} onOpenChange={(open) => { if (!setCategoryActive.isPending && !updateCategory.isPending) setCategoryManagerOpen(open); }}><DialogContent className={`${TREASURY_DIALOG_CLASS} sm:max-w-2xl`}><DialogHeader className="shrink-0 pr-8"><DialogTitle className="font-display text-2xl text-navy">Categorias financeiras</DialogTitle><DialogDescription>As categorias padrão são protegidas. Categorias personalizadas podem ser editadas e inativadas sem apagar o histórico.</DialogDescription></DialogHeader><TreasuryDialogBody><div className="space-y-2">{categoryManagementQuery.isLoading ? <div className="h-32 animate-pulse rounded-xl bg-muted" /> : (categoryManagementQuery.data ?? []).length === 0 ? <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Nenhuma categoria encontrada.</p> : (categoryManagementQuery.data ?? []).map((category) => <div key={category.id} className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 ${category.active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-75"}`}><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${category.type === "entrada" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{category.type === "entrada" ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-navy">{category.name}</p><Badge variant="outline" className="text-[10px]">{category.type === "entrada" ? "Entrada" : "Saída"}</Badge>{category.isSystem && <Badge className="bg-slate-200 text-[10px] text-slate-700">Padrão</Badge>}{!category.active && <Badge className="bg-amber-100 text-[10px] text-amber-800">Inativa</Badge>}</div><p className="mt-1 truncate text-[11px] text-muted-foreground">{category.isSystem ? "Categoria protegida do sistema" : "Categoria personalizada"}</p></div>{!category.isSystem && <div className="flex shrink-0 items-center gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Editar categoria ${category.name}`} title="Editar categoria" onClick={() => { setEditingCategory({ id: category.id, name: category.name, type: category.type }); setCategoryName(category.name); setCategoryType(category.type); setStructureError(null); updateCategory.reset(); setCategoryManagerOpen(false); setCategoryOpen(true); }}><Pencil className="h-4 w-4 text-navy" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`${category.active ? "Inativar" : "Reativar"} categoria ${category.name}`} title={category.active ? "Inativar categoria" : "Reativar categoria"} disabled={setCategoryActive.isPending} onClick={() => setCategoryActive.mutate({ churchId, id: category.id, active: !category.active })}><Power className={`h-4 w-4 ${category.active ? "text-rose-600" : "text-emerald-600"}`} /></Button></div>}</div>)}</div></TreasuryDialogBody></DialogContent></Dialog>

      <Dialog open={categoryOpen} onOpenChange={(open) => { if (!createCategory.isPending && !updateCategory.isPending) { setCategoryOpen(open); if (!open) { setStructureError(null); setEditingCategory(null); createCategory.reset(); updateCategory.reset(); } } }}><DialogContent className={TREASURY_DIALOG_CLASS}><DialogHeader className="shrink-0 pr-8"><DialogTitle className="font-display text-2xl text-navy">{editingCategory ? "Editar categoria" : "Nova categoria"}</DialogTitle><DialogDescription>{editingCategory ? "Atualize uma categoria personalizada sem apagar seus lançamentos." : "Crie uma categoria exclusiva para esta igreja."}</DialogDescription></DialogHeader><TreasuryDialogBody><form className="grid gap-4" onSubmit={submitCategory}><label className="grid gap-1.5"><Label>Tipo</Label><select value={categoryType} onChange={(event) => setCategoryType(event.target.value as TransactionType)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label><label className="grid gap-1.5"><Label>Nome</Label><Input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Ex.: Missões internacionais" /></label>{(structureError || createCategory.error || updateCategory.error) && <InlineError compact message={structureError || createCategory.error?.message || updateCategory.error?.message || "Não foi possível salvar a categoria."} />}<Button type="submit" disabled={createCategory.isPending || updateCategory.isPending} className="bg-navy hover:bg-navy/90">{createCategory.isPending || updateCategory.isPending ? "Salvando…" : editingCategory ? "Salvar categoria" : "Criar categoria"}</Button></form></TreasuryDialogBody></DialogContent></Dialog>

      <Dialog open={accountOpen} onOpenChange={(open) => { if (!createAccount.isPending) { setAccountOpen(open); if (!open) { setStructureError(null); createAccount.reset(); } } }}><DialogContent className={TREASURY_DIALOG_CLASS}><DialogHeader className="shrink-0 pr-8"><DialogTitle className="font-display text-2xl text-navy">Nova conta financeira</DialogTitle><DialogDescription>O saldo inicial só deve ser usado na implantação ou na abertura de uma nova conta.</DialogDescription></DialogHeader><TreasuryDialogBody><form className="grid gap-4" onSubmit={submitAccount}><label className="grid gap-1.5"><Label>Nome</Label><Input required value={newAccount.name} onChange={(event) => setNewAccount({ ...newAccount, name: event.target.value })} placeholder="Ex.: Banco Missões" /></label><label className="grid gap-1.5"><Label>Tipo</Label><select value={newAccount.type} onChange={(event) => setNewAccount({ ...newAccount, type: event.target.value as "caixa" | "banco" | "outro" })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="caixa">Caixa</option><option value="banco">Banco</option><option value="outro">Outro</option></select></label><label className="grid gap-1.5"><Label>Saldo inicial (R$)</Label><Input inputMode="decimal" value={newAccount.openingBalance} onChange={(event) => setNewAccount({ ...newAccount, openingBalance: event.target.value })} /></label>{(structureError || createAccount.error) && <InlineError compact message={structureError || createAccount.error?.message || "Não foi possível criar a conta."} />}<Button type="submit" disabled={createAccount.isPending} className="bg-navy hover:bg-navy/90">{createAccount.isPending ? "Criando…" : "Criar conta"}</Button></form></TreasuryDialogBody></DialogContent></Dialog>

      <Dialog open={reverseOpen !== null} onOpenChange={(open) => { if (!open && !reverseTransaction.isPending) { setReverseOpen(null); setReverseReason(""); reverseTransaction.reset(); } }}><DialogContent className={TREASURY_DIALOG_CLASS}><DialogHeader className="shrink-0 pr-8"><DialogTitle className="font-display text-2xl text-navy">Estornar lançamento</DialogTitle><DialogDescription>O lançamento será preservado no histórico, identificado como estornado e deixará de compor os saldos.</DialogDescription></DialogHeader><TreasuryDialogBody><label className="grid gap-1.5"><Label>Motivo do estorno</Label><Textarea value={reverseReason} onChange={(event) => setReverseReason(event.target.value)} placeholder="Explique o motivo da correção" /></label>{reverseTransaction.error && <InlineError compact message={reverseTransaction.error.message} />}<Button variant="destructive" disabled={reverseTransaction.isPending || reverseReason.trim().length < 5} onClick={() => reverseOpen && reverseTransaction.mutate({ churchId, id: reverseOpen, reason: reverseReason.trim() })}>{reverseTransaction.isPending ? "Estornando…" : "Estornar lançamento"}</Button></TreasuryDialogBody></DialogContent></Dialog>

      <Dialog open={receiptOpen !== null} onOpenChange={(open) => { if (!open) setReceiptOpen(null); }}><DialogContent className={`${TREASURY_DIALOG_CLASS} sm:max-w-lg`}><DialogHeader className="shrink-0 pr-8"><DialogTitle className="font-display text-2xl text-navy">Recibo de contribuição</DialogTitle><DialogDescription>Disponível apenas para entradas confirmadas da sua igreja.</DialogDescription></DialogHeader><TreasuryDialogBody>{receiptQuery.isLoading ? <div className="h-44 animate-pulse rounded-xl bg-muted" /> : receiptQuery.error ? <InlineError message={receiptQuery.error.message} compact /> : receiptQuery.data && <div className="space-y-3 rounded-xl border border-gold/30 bg-cream/30 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-gold">Recibo nº {receiptQuery.data.transaction.id}</p><p className="font-display text-2xl text-navy">{formatBrl(receiptQuery.data.transaction.amountCents)}</p><div className="grid gap-3 text-sm sm:grid-cols-2"><p><span className="block text-xs text-muted-foreground">Contribuinte</span>{receiptQuery.data.contributor?.fullName || receiptQuery.data.transaction.contributorName || "Não identificado"}</p><p><span className="block text-xs text-muted-foreground">Categoria</span>{receiptQuery.data.category.name}</p><p><span className="block text-xs text-muted-foreground">Data</span>{formatDatePtBr(receiptQuery.data.transaction.transactionDate)}</p><p><span className="block text-xs text-muted-foreground">Forma</span>{receiptQuery.data.transaction.paymentMethod}</p></div><p className="text-sm text-muted-foreground">{receiptQuery.data.transaction.description || "Contribuição registrada na Tesouraria."}</p><Button className="w-full bg-navy" onClick={printReceipt}><Printer className="mr-2 h-4 w-4" /> Imprimir ou salvar PDF</Button></div>}</TreasuryDialogBody></DialogContent></Dialog>

      <Dialog open={periodAction !== null} onOpenChange={(open) => { if (!open && !closePeriod.isPending && !reopenPeriod.isPending) { setPeriodAction(null); setReopenReason(""); closePeriod.reset(); reopenPeriod.reset(); } }}><DialogContent className={TREASURY_DIALOG_CLASS}><DialogHeader className="shrink-0 pr-8"><DialogTitle className="font-display text-2xl text-navy">{periodAction === "close" ? `Fechar ${periodLabel}` : `Reabrir ${periodLabel}`}</DialogTitle><DialogDescription>{periodAction === "close" ? "Após o fechamento, novos lançamentos, confirmações e estornos deste período serão bloqueados." : "A reabertura fica registrada na trilha de auditoria e exige uma justificativa pastoral."}</DialogDescription></DialogHeader><TreasuryDialogBody>{periodAction === "reopen" && <label className="grid gap-1.5"><Label>Motivo da reabertura</Label><Textarea value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} placeholder="Explique por que o período precisa ser reaberto" /></label>}{(closePeriod.error || reopenPeriod.error) && <InlineError compact message={closePeriod.error?.message || reopenPeriod.error?.message || "Não foi possível alterar o período."} />}<Button disabled={closePeriod.isPending || reopenPeriod.isPending || (periodAction === "reopen" && reopenReason.trim().length < 5)} className={periodAction === "close" ? "bg-navy hover:bg-navy/90" : ""} variant={periodAction === "reopen" ? "destructive" : "default"} onClick={() => periodAction === "close" ? closePeriod.mutate({ churchId, periodStart: startDate, periodEnd: endDate }) : reopenPeriod.mutate({ churchId, periodStart: startDate, reason: reopenReason.trim() })}>{closePeriod.isPending || reopenPeriod.isPending ? "Processando…" : periodAction === "close" ? "Confirmar fechamento" : "Confirmar reabertura"}</Button></TreasuryDialogBody></DialogContent></Dialog>

      <Dialog open={reconciliationOpen} onOpenChange={(open) => { if (!open && !saveReconciliation.isPending && !uploadingAttachment) { setReconciliationOpen(false); setReconciliationForm({ accountId: "", bankClosingBalance: "", notes: "" }); setReconciliationHydratedKey(""); setAttachmentError(null); saveReconciliation.reset(); } }}>
        <DialogContent className={`${TREASURY_DIALOG_CLASS} sm:max-w-lg`}><DialogHeader className="shrink-0 pr-8"><DialogTitle className="font-display text-2xl text-navy">Conciliação bancária</DialogTitle><DialogDescription>Compare o saldo do extrato com o saldo registrado até o fim do período. A conciliação não altera lançamentos nem fechamento.</DialogDescription></DialogHeader><TreasuryDialogBody><div className="grid gap-4">
          <label className="grid gap-1.5"><Label>Conta bancária</Label><select value={reconciliationForm.accountId} onChange={(event) => { setReconciliationForm({ accountId: event.target.value, bankClosingBalance: "", notes: "" }); setReconciliationHydratedKey(""); setAttachmentError(null); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Saldo do livro-caixa em {formatDatePtBr(endDate)}</p><p className="mt-1 text-xl font-semibold text-navy">{reconciliationQuery.isLoading ? "Carregando…" : formatBrl(reconciliationQuery.data?.bookBalanceCents ?? 0)}</p></div>
          <label className="grid gap-1.5"><Label>Saldo final no extrato (R$)</Label><Input inputMode="decimal" value={reconciliationForm.bankClosingBalance} onChange={(event) => setReconciliationForm({ ...reconciliationForm, bankClosingBalance: event.target.value })} placeholder="0,00" /></label>
          {reconciliationDifference !== null && <div className={`rounded-xl p-3 text-sm ${reconciliationDifference === 0 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}><strong>{reconciliationDifference === 0 ? "Conciliação sem divergência" : "Divergência identificada"}</strong><span className="ml-2">{formatBrl(reconciliationDifference)}</span></div>}
          <label className="grid gap-1.5"><Label>Observações</Label><Textarea value={reconciliationForm.notes} onChange={(event) => setReconciliationForm({ ...reconciliationForm, notes: event.target.value })} placeholder="Ex.: PIX em trânsito ou tarifa ainda não registrada." /></label>
          <div className="rounded-xl border border-dashed border-gold/50 bg-cream/20 p-4"><div className="flex items-start gap-3"><Paperclip className="mt-0.5 h-5 w-5 text-gold" /><div className="min-w-0 flex-1"><p className="font-semibold text-navy">Comprovantes bancários</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Salve a conciliação e envie PDF, PNG, JPEG ou WebP de até 8 MB. O servidor também valida a assinatura real do arquivo.</p>{reconciliationId ? <div className="mt-3 space-y-2">{attachmentsQuery.isLoading ? <p className="text-xs text-muted-foreground">Carregando comprovantes…</p> : (attachmentsQuery.data ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Nenhum comprovante anexado.</p> : (attachmentsQuery.data ?? []).map((attachment) => <div key={attachment.id} className="rounded-lg bg-white/70 px-3 py-2 text-sm text-navy"><div className="flex items-center justify-between gap-3"><a href={attachment.url} target="_blank" rel="noreferrer" className="min-w-0 truncate font-medium hover:underline">{attachment.fileName}</a><ExternalLink className="h-4 w-4 shrink-0" /></div><div className="mt-2 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-1 rounded border border-navy/20 px-2 py-1 text-xs font-medium text-navy hover:bg-navy hover:text-white"><RefreshCw className="h-3 w-3" /> Substituir<input type="file" className="sr-only" accept="application/pdf,image/png,image/jpeg,image/webp" disabled={uploadingAttachment || removeReconciliationAttachment.isPending} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAttachment(file, attachment.id); event.currentTarget.value = ""; }} /></label><Button type="button" variant="outline" size="sm" className="h-7 border-rose-200 px-2 text-xs text-rose-700 hover:bg-rose-50" disabled={uploadingAttachment || removeReconciliationAttachment.isPending} onClick={() => void removeAttachment(attachment.id)}><Trash2 className="mr-1 h-3 w-3" /> Remover</Button></div></div>)}<label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-navy/20 bg-white px-3 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy hover:text-white"><Upload className="h-4 w-4" />{uploadingAttachment ? "Enviando…" : "Anexar comprovante"}<input type="file" className="sr-only" accept="application/pdf,image/png,image/jpeg,image/webp" disabled={uploadingAttachment || removeReconciliationAttachment.isPending} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAttachment(file); event.currentTarget.value = ""; }} /></label></div> : <p className="mt-3 text-xs font-medium text-amber-800">Salve a conciliação para liberar o anexo.</p>}          </div></div></div>
          {attachmentError && <InlineError compact message={attachmentError} />}{saveReconciliation.error && <InlineError compact message={saveReconciliation.error.message} />}
          <Button disabled={saveReconciliation.isPending || bankBalanceInput === null || reconciliationQuery.isLoading} className="bg-navy" onClick={() => bankBalanceInput !== null && saveReconciliation.mutate({ churchId, accountId: reconciliationAccountId, periodStart: startDate, periodEnd: endDate, bankClosingBalanceCents: bankBalanceInput, notes: reconciliationForm.notes.trim() || undefined })}>{saveReconciliation.isPending ? "Salvando…" : reconciliationId ? "Atualizar conciliação" : "Salvar conciliação"}</Button>
        </div></TreasuryDialogBody></DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, helper, tone }: { icon: typeof WalletCards; label: string; value: string; helper: string; tone: "navy" | "green" | "rose" | "gold" }) {
  const tones = {
    navy: "border-l-navy bg-white text-navy",
    green: "border-l-emerald-500 bg-white text-emerald-800",
    rose: "border-l-rose-500 bg-white text-rose-800",
    gold: "border-l-gold bg-white text-navy",
  };
  const icons = { navy: "bg-navy/8 text-navy", green: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700", gold: "bg-gold/12 text-gold" };
  return <Card className={`border border-slate-200 border-l-4 shadow-sm ${tones[tone]}`}><CardContent className="p-4 sm:p-5"><div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${icons[tone]}`}><Icon className="h-4 w-4" /></div><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 font-display text-xl sm:text-2xl">{value}</p><p className="mt-2 truncate text-xs text-slate-500">{helper}</p></CardContent></Card>;
}

function InlineError({ message, compact = false }: { message: string; compact?: boolean }) {
  return <div role="alert" className={`rounded-lg border border-rose-200 bg-rose-50 text-rose-800 ${compact ? "px-3 py-2 text-sm" : "p-4"}`}>{message}</div>;
}

function TreasurySkeleton() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Card key={index}><CardContent className="p-5"><div className="h-4 w-20 animate-pulse rounded bg-muted" /><div className="mt-5 h-8 w-28 animate-pulse rounded bg-muted" /></CardContent></Card>)}</div>;
}

function EmptyTransactions() {
  return <div className="px-6 py-12 text-center"><FileText className="mx-auto mb-3 h-8 w-8 text-gold" /><p className="font-semibold text-navy">Nenhum lançamento neste período</p><p className="mt-1 text-sm text-muted-foreground">Registre uma entrada ou saída para começar o livro-caixa.</p></div>;
}

function AccessDenied() {
  return <div className="mx-auto max-w-xl p-6"><Card className="border-amber-200 bg-amber-50"><CardContent className="p-7 text-center"><XCircle className="mx-auto mb-3 h-10 w-10 text-amber-600" /><h1 className="font-display text-2xl text-navy">Acesso restrito</h1><p className="mt-2 text-sm text-muted-foreground">A Tesouraria é acessível apenas a Pastores e Tesoureiros autorizados. Solicite ao Pastor Presidente a atribuição da função, se necessário.</p></CardContent></Card></div>;
}
