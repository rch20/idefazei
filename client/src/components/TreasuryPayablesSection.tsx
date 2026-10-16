import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  AdaptiveFormDialogBody,
  AdaptiveFormDialogContent,
  AdaptiveFormDialogFooter,
  adaptiveFormDialogHeaderClassName,
} from "@/components/AdaptiveFormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getCivilDateParts,
  getTodayCivilDateInput,
  parseBrlToCents,
  formatBrl,
  formatDatePtBr,
} from "@/lib/treasury";
import { trpc } from "@/lib/trpc";
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  FileText,
  Loader2,
  Pencil,
  Plus,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type TreasuryPayablesStatus = "todas" | "aberta" | "paga" | "cancelada";
type TreasuryPayableDisplayStatus = "aberta" | "vencida" | "paga" | "cancelada";
type PaymentMethod =
  | "dinheiro"
  | "pix"
  | "transferencia"
  | "cartao"
  | "cheque"
  | "outro";

type PayableFormState = {
  description: string;
  supplierName: string;
  amount: string;
  dueDate: string;
  categoryId: string;
  accountId: string;
  paymentMethod: PaymentMethod | "";
  notes: string;
  reference: string;
};

const STATUS_LABELS: Record<TreasuryPayablesStatus | "vencida", string> = {
  todas: "Todas",
  aberta: "Em aberto",
  vencida: "Vencida",
  paga: "Paga",
  cancelada: "Cancelada",
};

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência" },
  { value: "cartao", label: "Cartão" },
  { value: "cheque", label: "Cheque" },
  { value: "outro", label: "Outro" },
];

const EMPTY_FORM: PayableFormState = {
  description: "",
  supplierName: "",
  amount: "",
  dueDate: getTodayCivilDateInput(),
  categoryId: "",
  accountId: "",
  paymentMethod: "",
  notes: "",
  reference: "",
};

function StatusBadge({ status }: { status: TreasuryPayableDisplayStatus }) {
  const className = {
    aberta: "border-sky-200 bg-sky-50 text-sky-800",
    vencida: "border-rose-200 bg-rose-50 text-rose-800",
    paga: "border-emerald-200 bg-emerald-50 text-emerald-800",
    cancelada: "border-slate-200 bg-slate-100 text-slate-700",
  }[status];

  return (
    <Badge variant="outline" className={className}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return getTodayCivilDateInput();
  const parts = getCivilDateParts(value);
  if (!parts) return getTodayCivilDateInput();
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function toOptionalNumber(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function TreasuryPayablesSection({
  churchId,
  onBusyChange,
}: {
  churchId: number;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [status, setStatus] = useState<TreasuryPayablesStatus>("todas");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PayableFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    accountId: "",
    categoryId: "",
    paymentMethod: "pix" as PaymentMethod,
    paymentDate: getTodayCivilDateInput(),
    reference: "",
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const query = trpc.treasury.payables.useQuery({ churchId, status });
  const accountsQuery = trpc.treasury.accounts.useQuery({ churchId });
  const categoriesQuery = trpc.treasury.categories.useQuery({
    churchId,
    type: "saida",
  });
  const createPayable = trpc.treasury.createPayable.useMutation();
  const updatePayable = trpc.treasury.updatePayable.useMutation();
  const cancelPayable = trpc.treasury.cancelPayable.useMutation();
  const payPayable = trpc.treasury.payPayable.useMutation();
  const summary = query.data?.summary;
  const items = query.data?.items ?? [];
  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const editingItem = useMemo(
    () => items.find(item => item.payable.id === editingId),
    [editingId, items]
  );
  const payingItem = useMemo(
    () => items.find(item => item.payable.id === payingId),
    [payingId, items]
  );
  const isBusy =
    createPayable.isPending ||
    updatePayable.isPending ||
    cancelPayable.isPending ||
    payPayable.isPending;

  useEffect(() => {
    onBusyChange?.(isBusy);
    return () => onBusyChange?.(false);
  }, [isBusy, onBusyChange]);

  const invalidatePayables = () => {
    void utils.treasury.payables.invalidate();
    void utils.treasury.overview.invalidate();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    createPayable.reset();
    updatePayable.reset();
    setFormOpen(true);
  };

  const openEdit = (item: (typeof items)[number]) => {
    setEditingId(item.payable.id);
    setForm({
      description: item.payable.description,
      supplierName: item.payable.supplierName ?? "",
      amount: (item.payable.amountCents / 100).toFixed(2).replace(".", ","),
      dueDate: toDateInput(item.payable.dueDate),
      categoryId: item.payable.categoryId
        ? String(item.payable.categoryId)
        : "",
      accountId: item.payable.accountId ? String(item.payable.accountId) : "",
      paymentMethod: item.payable.paymentMethod ?? "",
      notes: item.payable.notes ?? "",
      reference: item.payable.reference ?? "",
    });
    setFormError(null);
    updatePayable.reset();
    setFormOpen(true);
  };

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountCents = parseBrlToCents(form.amount);
    if (!amountCents || amountCents <= 0) {
      setFormError("Informe um valor válido maior que zero.");
      return;
    }
    setFormError(null);
    const payload = {
      churchId,
      description: form.description.trim(),
      supplierName: form.supplierName.trim() || undefined,
      amountCents,
      dueDate: form.dueDate,
      categoryId: toOptionalNumber(form.categoryId),
      accountId: toOptionalNumber(form.accountId),
      paymentMethod: form.paymentMethod || undefined,
      notes: form.notes.trim() || undefined,
      reference: form.reference.trim() || undefined,
    };
    const onSuccess = () => {
      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      invalidatePayables();
    };
    if (editingId) {
      updatePayable.mutate({ ...payload, id: editingId }, { onSuccess });
    } else {
      createPayable.mutate(payload, { onSuccess });
    }
  };

  const openPayment = (item: (typeof items)[number]) => {
    setPayingId(item.payable.id);
    setPaymentForm({
      accountId: item.payable.accountId ? String(item.payable.accountId) : "",
      categoryId: item.payable.categoryId
        ? String(item.payable.categoryId)
        : "",
      paymentMethod: item.payable.paymentMethod ?? "pix",
      paymentDate: getTodayCivilDateInput(),
      reference: item.payable.reference ?? "",
    });
    setPaymentError(null);
    payPayable.reset();
  };

  const submitPayment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!payingId) return;
    const accountId = toOptionalNumber(paymentForm.accountId);
    const categoryId = toOptionalNumber(paymentForm.categoryId);
    if (!accountId || !categoryId || !paymentForm.paymentMethod) {
      setPaymentError(
        "Selecione a conta, a categoria de saída e a forma de pagamento."
      );
      return;
    }
    setPaymentError(null);
    payPayable.mutate(
      {
        churchId,
        id: payingId,
        accountId,
        categoryId,
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        reference: paymentForm.reference.trim() || undefined,
      },
      {
        onSuccess: () => {
          setPayingId(null);
          invalidatePayables();
        },
      }
    );
  };

  const submitCancel = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cancelId) return;
    if (cancelReason.trim().length < 5) {
      setCancelError("Explique o motivo do cancelamento.");
      return;
    }
    setCancelError(null);
    cancelPayable.mutate(
      { churchId, id: cancelId, reason: cancelReason.trim() },
      {
        onSuccess: () => {
          setCancelId(null);
          setCancelReason("");
          invalidatePayables();
        },
      }
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-sky-950">
          <p className="font-semibold">Controle operacional de obrigações</p>
          <p className="mt-1 text-xs leading-relaxed text-sky-900/80">
            Contas em aberto não alteram os quatro saldos. Ao pagar, o sistema
            cria uma única saída confirmada no livro-caixa e vincula o
            lançamento à obrigação.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11 shrink-0 gap-2 bg-navy hover:bg-navy/90"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nova conta a pagar
        </Button>
      </div>

      {query.isLoading ? (
        <div
          role="status"
          className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Carregando contas a pagar…
        </div>
      ) : query.error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          Não foi possível carregar as contas a pagar: {query.error.message}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={WalletCards}
              label="Em aberto"
              value={String(summary?.openCount ?? 0)}
              helper={formatBrl(summary?.openAmountCents ?? 0)}
            />
            <SummaryCard
              icon={CircleAlert}
              label="Vencidas"
              value={String(summary?.overdueCount ?? 0)}
              helper="Exigem atenção"
              tone="rose"
            />
            <SummaryCard
              icon={CalendarClock}
              label="Próximos 7 dias"
              value={String(summary?.dueSoonCount ?? 0)}
              helper="Em aberto"
              tone="gold"
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Pagas"
              value={String(summary?.paidCount ?? 0)}
              helper="No cadastro"
              tone="green"
            />
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-navy">
                Obrigações cadastradas
              </p>
              <p className="text-xs text-muted-foreground">
                Vencimentos acompanhados até{" "}
                {query.data?.asOfDate
                  ? formatDatePtBr(query.data.asOfDate)
                  : "hoje"}
                .
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-navy">
              Status
              <select
                value={status}
                onChange={event =>
                  setStatus(event.target.value as TreasuryPayablesStatus)
                }
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {(
                  [
                    "todas",
                    "aberta",
                    "paga",
                    "cancelada",
                  ] as TreasuryPayablesStatus[]
                ).map(value => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center">
              <FileText
                className="mx-auto mb-3 h-8 w-8 text-gold"
                aria-hidden="true"
              />
              <p className="font-semibold text-navy">
                Nenhuma conta encontrada
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                As obrigações cadastradas aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => {
                const isOpen = item.payable.status === "aberta";
                return (
                  <Card
                    key={item.payable.id}
                    className="border-slate-200 shadow-sm"
                  >
                    <CardHeader className="space-y-2 pb-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base text-navy">
                          {item.payable.description}
                        </CardTitle>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {item.payable.supplierName ||
                            "Fornecedor não informado"}
                        </p>
                      </div>
                      <StatusBadge
                        status={
                          item.displayStatus as TreasuryPayableDisplayStatus
                        }
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 text-sm sm:grid-cols-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Valor</p>
                          <p className="font-semibold text-navy">
                            {formatBrl(item.payable.amountCents)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Vencimento
                          </p>
                          <p className="font-medium text-navy">
                            {formatDatePtBr(item.dueDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Categoria
                          </p>
                          <p className="truncate font-medium text-navy">
                            {item.category?.name || "Não informada"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Conta prevista
                          </p>
                          <p className="truncate font-medium text-navy">
                            {item.account?.name || "Não informada"}
                          </p>
                        </div>
                      </div>
                      {item.payable.status === "paga" &&
                        item.payable.financialTransactionId && (
                          <p className="text-xs text-emerald-800">
                            Baixa vinculada à saída #
                            {item.payable.financialTransactionId} do
                            livro-caixa.
                          </p>
                        )}
                      {item.payable.status === "cancelada" &&
                        item.payable.cancellationReason && (
                          <p className="text-xs text-slate-600">
                            Cancelada: {item.payable.cancellationReason}
                          </p>
                        )}
                      {isOpen && (
                        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-10 gap-2"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            className="min-h-10 gap-2 bg-emerald-700 hover:bg-emerald-800"
                            onClick={() => openPayment(item)}
                          >
                            <CheckCircle2
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            Dar baixa / Pagar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-10 gap-2 border-rose-200 text-rose-800 hover:bg-rose-50"
                            onClick={() => {
                              setCancelId(item.payable.id);
                              setCancelReason("");
                              setCancelError(null);
                            }}
                          >
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={open => {
          if (!isBusy) setFormOpen(open);
        }}
      >
        <AdaptiveFormDialogContent className="sm:max-w-2xl">
          <div className={adaptiveFormDialogHeaderClassName}>
            <DialogTitle className="font-display text-2xl text-navy">
              {editingItem ? "Editar conta a pagar" : "Nova conta a pagar"}
            </DialogTitle>
            <DialogDescription>
              Cadastre a obrigação sem alterar os saldos. A saída só nasce
              quando o pagamento for confirmado.
            </DialogDescription>
          </div>
          <form className="contents" onSubmit={submitForm}>
            <AdaptiveFormDialogBody className="grid gap-4">
              <label className="grid gap-1.5 sm:col-span-2">
                <Label>Descrição *</Label>
                <Input
                  required
                  value={form.description}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Ex.: Conta de energia"
                />
              </label>
              <label className="grid gap-1.5">
                <Label>Fornecedor</Label>
                <Input
                  value={form.supplierName}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      supplierName: event.target.value,
                    }))
                  }
                  placeholder="Nome do fornecedor"
                />
              </label>
              <label className="grid gap-1.5">
                <Label>Valor *</Label>
                <Input
                  required
                  inputMode="decimal"
                  value={form.amount}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="0,00"
                />
              </label>
              <label className="grid gap-1.5">
                <Label>Vencimento *</Label>
                <Input
                  required
                  type="date"
                  value={form.dueDate}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-1.5">
                <Label>Forma prevista</Label>
                <select
                  value={form.paymentMethod}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      paymentMethod: event.target.value as PaymentMethod | "",
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Não definida</option>
                  {PAYMENT_METHODS.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <Label>Categoria de saída</Label>
                <select
                  value={form.categoryId}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecionar depois</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <Label>Conta prevista</Label>
                <select
                  value={form.accountId}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      accountId: event.target.value,
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecionar depois</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 sm:col-span-2">
                <Label>Referência</Label>
                <Input
                  value={form.reference}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                  placeholder="Número do documento ou contrato"
                />
              </label>
              <label className="grid gap-1.5 sm:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={form.notes}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Informações úteis para a equipe"
                />
              </label>
              {(formError || createPayable.error || updatePayable.error) && (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                {formError ||
                  createPayable.error?.message ||
                  updatePayable.error?.message ||
                  "Não foi possível salvar a conta a pagar."}
              </p>
            )}
            </AdaptiveFormDialogBody>
            <AdaptiveFormDialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => setFormOpen(false)}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                className="min-h-11 bg-navy hover:bg-navy/90"
                disabled={isBusy}
              >
                {isBusy ? (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : null}
                {editingId ? "Salvar alterações" : "Salvar conta"}
              </Button>
            </AdaptiveFormDialogFooter>
          </form>
        </AdaptiveFormDialogContent>
      </Dialog>

      <Dialog
        open={payingId !== null}
        onOpenChange={open => {
          if (!open && !isBusy) setPayingId(null);
        }}
      >
        <AdaptiveFormDialogContent className="sm:max-w-xl">
          <div className={adaptiveFormDialogHeaderClassName}>
            <DialogTitle className="font-display text-2xl text-navy">
              Dar baixa / Pagar
            </DialogTitle>
            <DialogDescription>
              {payingItem
                ? `${payingItem.payable.description} · ${formatBrl(payingItem.payable.amountCents)}`
                : "Confirme os dados da saída."}{" "}
              Uma única saída confirmada será vinculada a esta conta.
            </DialogDescription>
          </div>
          <form className="contents" onSubmit={submitPayment}>
            <AdaptiveFormDialogBody className="grid gap-4">
              <label className="grid gap-1.5">
                <Label>Conta financeira *</Label>
                <select
                  required
                  value={paymentForm.accountId}
                  onChange={event =>
                    setPaymentForm(current => ({
                      ...current,
                      accountId: event.target.value,
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <Label>Categoria de saída *</Label>
                <select
                  required
                  value={paymentForm.categoryId}
                  onChange={event =>
                    setPaymentForm(current => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <Label>Forma de pagamento *</Label>
                <select
                  required
                  value={paymentForm.paymentMethod}
                  onChange={event =>
                    setPaymentForm(current => ({
                      ...current,
                      paymentMethod: event.target.value as PaymentMethod,
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {PAYMENT_METHODS.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <Label>Data do pagamento *</Label>
                <Input
                  required
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={event =>
                    setPaymentForm(current => ({
                      ...current,
                      paymentDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-1.5 sm:col-span-2">
                <Label>Referência</Label>
                <Input
                  value={paymentForm.reference}
                  onChange={event =>
                    setPaymentForm(current => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                  placeholder="Comprovante ou número da operação"
                />
              </label>
              {(paymentError || payPayable.error) && (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                {paymentError ||
                  payPayable.error?.message ||
                  "Não foi possível registrar o pagamento."}
              </p>
            )}
            </AdaptiveFormDialogBody>
            <AdaptiveFormDialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => setPayingId(null)}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                className="min-h-11 bg-emerald-700 hover:bg-emerald-800"
                disabled={isBusy}
              >
                {isBusy ? (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Confirmar pagamento
              </Button>
            </AdaptiveFormDialogFooter>
          </form>
        </AdaptiveFormDialogContent>
      </Dialog>

      <Dialog
        open={cancelId !== null}
        onOpenChange={open => {
          if (!open && !isBusy) setCancelId(null);
        }}
      >
        <AdaptiveFormDialogContent className="sm:max-w-lg">
          <div className={adaptiveFormDialogHeaderClassName}>
            <DialogTitle className="font-display text-2xl text-navy">
              Cancelar conta a pagar
            </DialogTitle>
            <DialogDescription>
              O cadastro será preservado no histórico, mas não poderá mais ser
              pago.
            </DialogDescription>
          </div>
          <form className="contents" onSubmit={submitCancel}>
            <AdaptiveFormDialogBody className="grid gap-4">
              <label className="grid gap-1.5">
                <Label>Motivo *</Label>
                <Textarea
                required
                value={cancelReason}
                onChange={event => setCancelReason(event.target.value)}
                placeholder="Explique o motivo do cancelamento"
              />
            </label>
              {(cancelError || cancelPayable.error) && (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                {cancelError ||
                  cancelPayable.error?.message ||
                  "Não foi possível cancelar a conta."}
              </p>
            )}
            </AdaptiveFormDialogBody>
            <AdaptiveFormDialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => setCancelId(null)}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="min-h-11"
                disabled={isBusy || cancelReason.trim().length < 5}
              >
                {isBusy ? (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Confirmar cancelamento
              </Button>
            </AdaptiveFormDialogFooter>
          </form>
        </AdaptiveFormDialogContent>
      </Dialog>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "navy",
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
  helper: string;
  tone?: "navy" | "rose" | "gold" | "green";
}) {
  const tones = {
    navy: "border-l-navy text-navy",
    rose: "border-l-rose-500 text-rose-800",
    gold: "border-l-gold text-navy",
    green: "border-l-emerald-500 text-emerald-800",
  };
  const iconTones = {
    navy: "bg-navy/8 text-navy",
    rose: "bg-rose-50 text-rose-700",
    gold: "bg-gold/12 text-gold",
    green: "bg-emerald-50 text-emerald-700",
  };
  return (
    <Card
      className={`border border-slate-200 border-l-4 shadow-sm ${tones[tone]}`}
    >
      <CardContent className="p-3 sm:p-4">
        <div
          className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${iconTones[tone]}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 font-display text-lg sm:text-xl">{value}</p>
        <p className="mt-1 truncate text-[11px] text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  );
}
