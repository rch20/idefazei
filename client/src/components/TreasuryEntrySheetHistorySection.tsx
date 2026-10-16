import { useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AdaptiveFormDialogBody,
  AdaptiveFormDialogFooter,
} from "@/components/AdaptiveFormDialog";
import { Input } from "@/components/ui/input";
import {
  formatBrl,
  getCivilDateKey,
  formatDatePtBr,
  buildTreasuryEntrySheetHtml,
  openTreasuryPrintDocument,
  shareTreasuryEntrySheet,
  type TreasuryEntrySheetDocument,
} from "@/lib/treasury";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Printer,
  Search,
  Share2,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import type {
  TreasuryServiceContext,
  TreasuryAccountOption,
} from "@/components/TreasuryQuickActionHost";

type EntrySheetHistoryRecord =
  inferRouterOutputs<AppRouter>["treasury"]["entrySheetHistory"][number];
type PaymentMethod =
  | "dinheiro"
  | "pix"
  | "transferencia"
  | "cartao"
  | "cheque"
  | "outro";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  transferencia: "Transferência",
  cartao: "Cartão",
  cheque: "Cheque",
  outro: "Outro",
};
const CONTRIBUTION_LABELS: Record<string, string> = {
  dizimo: "Dízimo",
  oferta: "Oferta",
  oferta_especial: "Oferta especial",
  outra: "Outra contribuição",
};

function documentFromRecord(
  record: EntrySheetHistoryRecord
): TreasuryEntrySheetDocument | null {
  if (!record.service) return null;
  return {
    sheet: record.sheet,
    lines: record.lines,
    service: record.service,
  };
}

function statusLabel(record: EntrySheetHistoryRecord) {
  if (record.sheet.postingStatus === "lancada") return "Lançada no livro-caixa";
  if (record.sheet.signedAt) return "Assinada · não lançada";
  if (record.sheet.status === "finalizada")
    return "Finalizada · assinatura pendente";
  return "Rascunho";
}

export function TreasuryEntrySheetHistorySection({
  churchId,
  accounts,
  onRequestClose,
  onRequestEntry,
}: {
  churchId: number;
  accounts: TreasuryAccountOption[];
  onRequestClose: () => void;
  onRequestEntry?: (context: TreasuryServiceContext) => void;
}) {
  const historyQuery = trpc.treasury.entrySheetHistory.useQuery({ churchId });
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [postingAccountByMethod, setPostingAccountByMethod] = useState<
    Record<string, string>
  >({});

  const finalize = trpc.treasury.finalizeEntrySheet.useMutation({
    onSuccess: async () => {
      toast.success("Ficha finalizada. A assinatura continua opcional.");
      await utils.treasury.entrySheetHistory.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const sign = trpc.treasury.signEntrySheet.useMutation({
    onSuccess: async () => {
      toast.success("Ficha assinada com registro auditável.");
      await utils.treasury.entrySheetHistory.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const post = trpc.treasury.postEntrySheet.useMutation({
    onSuccess: async result => {
      const postedSheet = result.sheet?.sheet;
      if (postedSheet) {
        utils.treasury.entrySheetHistory.setData(
          { churchId },
          current =>
            current?.map(record =>
              record.sheet.id === postedSheet.id
                ? { ...record, sheet: { ...record.sheet, ...postedSheet } }
                : record
            )
        );
      }
      toast.success(
        result.alreadyPosted
          ? "Esta ficha já estava lançada. Nenhum valor foi duplicado."
          : "Ficha lançada no livro-caixa uma única vez."
      );
      await utils.treasury.entrySheetHistory.invalidate();
      await utils.treasury.overview.invalidate();
      await utils.treasury.serviceTransactions.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const records = historyQuery.data ?? [];
  const filtered = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return records.filter(record => {
      if (!record.service) return false;
      const serviceDate = getCivilDateKey(record.service.serviceDate) ?? "";
      const serviceName = record.service.name.toLocaleLowerCase("pt-BR");
      return (
        (!normalized ||
          serviceName.includes(normalized) ||
          String(record.sheet.id).includes(normalized)) &&
        (!date || serviceDate === date) &&
        (!from || serviceDate >= from) &&
        (!to || serviceDate <= to)
      );
    });
  }, [date, from, records, search, to]);
  const selected =
    records.find(record => record.sheet.id === selectedId) ?? null;
  const selectedDocument = selected ? documentFromRecord(selected) : null;
  const selectedMethods = selected
    ? Array.from(
        new Set(selected.lines.map(line => line.paymentMethod as PaymentMethod))
      )
    : [];
  const postingAccounts = selectedMethods.map(paymentMethod => ({
    paymentMethod,
    accountId: Number(
      postingAccountByMethod[paymentMethod] || accounts[0]?.id || 0
    ),
  }));

  const clearFilters = () => {
    setSearch("");
    setDate("");
    setFrom("");
    setTo("");
  };
  const printSelected = () => {
    if (!selectedDocument) return;
    if (
      !openTreasuryPrintDocument(buildTreasuryEntrySheetHtml(selectedDocument))
    ) {
      toast.error(
        "O navegador bloqueou a janela. Libere pop-ups e tente novamente."
      );
    }
  };
  const shareDocument = async (document: TreasuryEntrySheetDocument) => {
    try {
      const result = await shareTreasuryEntrySheet(document);
      toast.success(
        result === "shared"
          ? "Ficha compartilhada."
          : "Resumo da ficha copiado para a área de transferência."
      );
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError")
        toast.error(
          "Não foi possível compartilhar nem copiar o resumo da ficha."
        );
    }
  };
  const shareSelected = async () => {
    if (selectedDocument) await shareDocument(selectedDocument);
  };
  const requestEdit = () => {
    if (!selected?.service || !onRequestEntry) return;
    onRequestClose();
    onRequestEntry({
      serviceId: selected.service.id,
      serviceDate: getCivilDateKey(selected.service.serviceDate) ?? "",
    });
  };
  const postSelected = () => {
    if (!selected) return;
    if (
      accounts.length === 0 ||
      postingAccounts.some(account => !account.accountId)
    ) {
      toast.error(
        "Cadastre ao menos uma conta financeira antes de lançar a ficha."
      );
      return;
    }
    if (
      !window.confirm(
        "Confirmar lançamento? Os valores desta ficha serão lançados no livro-caixa uma única vez e alterarão o saldo da Tesouraria."
      )
    )
      return;
    post.mutate({ churchId, id: selected.sheet.id, accounts: postingAccounts });
  };

  return (
    <Card className="border-gold/30 bg-gold/5 shadow-sm">
      <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg text-navy sm:text-xl">
            <FileText className="h-5 w-5 text-gold" /> Histórico das fichas de
            culto
          </CardTitle>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Abra uma ficha antiga, assine se desejar, imprima ou compartilhe
            novamente. O livro-caixa só muda após a ação protegida de
            lançamento.
          </p>
        </div>
        <Badge variant="outline" className="w-fit bg-white">
          {filtered.length} ficha(s)
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <label className="grid gap-1 text-[11px] font-medium text-navy">
            <span>Buscar culto ou ficha</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Ex.: domingo ou 42"
                className="h-9 pl-8 text-xs"
              />
            </div>
          </label>
          <label className="grid gap-1 text-[11px] font-medium text-navy">
            <span>Data exata</span>
            <Input
              type="date"
              value={date}
              onChange={event => setDate(event.target.value)}
              className="h-9 text-xs"
            />
          </label>
          <label className="grid gap-1 text-[11px] font-medium text-navy">
            <span>De</span>
            <Input
              type="date"
              value={from}
              onChange={event => setFrom(event.target.value)}
              className="h-9 text-xs"
            />
          </label>
          <label className="grid gap-1 text-[11px] font-medium text-navy">
            <span>Até</span>
            <Input
              type="date"
              value={to}
              onChange={event => setTo(event.target.value)}
              className="h-9 text-xs"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            className="h-9 self-end bg-white text-xs"
            onClick={clearFilters}
          >
            Limpar filtros
          </Button>
        </div>

        {historyQuery.isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando histórico…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-5 text-sm text-muted-foreground">
            Nenhuma ficha encontrada com esses filtros.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map(record => (
              <article
                key={record.sheet.id}
                className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => setSelectedId(record.sheet.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-navy">
                        {record.service?.name ?? "Culto"}
                      </strong>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {record.service
                          ? formatDatePtBr(record.service.serviceDate)
                          : "Data não informada"}{" "}
                        · Ficha nº {record.sheet.id}
                      </span>
                    </div>
                    <Badge
                      className={
                        record.sheet.postingStatus === "lancada"
                          ? "shrink-0 bg-emerald-600"
                          : record.sheet.status === "finalizada"
                            ? "shrink-0 bg-amber-100 text-amber-800"
                            : "shrink-0 bg-slate-100 text-slate-700"
                      }
                    >
                      {record.sheet.postingStatus === "lancada"
                        ? "Lançada"
                        : record.sheet.status === "finalizada"
                          ? "Finalizada"
                          : "Rascunho"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-navy">
                    {formatBrl(record.sheet.totalCents)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {record.lines.length} linha(s) ·{" "}
                    {record.sheet.signedAt
                      ? "assinada"
                      : "assinatura opcional pendente"}
                  </p>
                </button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 bg-white text-xs"
                    onClick={() => setSelectedId(record.sheet.id)}
                  >
                    <FileText className="h-3.5 w-3.5" /> Abrir ficha
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Imprimir ficha ${record.sheet.id}`}
                    onClick={() => {
                      const document = documentFromRecord(record);
                      if (
                        document &&
                        !openTreasuryPrintDocument(
                          buildTreasuryEntrySheetHtml(document)
                        )
                      )
                        toast.error("Libere pop-ups para imprimir a ficha.");
                    }}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Compartilhar ficha ${record.sheet.id}`}
                    onClick={() => {
                      const document = documentFromRecord(record);
                      if (document) void shareDocument(document);
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={open => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="!flex z-[210] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 flex-col overflow-hidden p-4 sm:max-h-[94vh] sm:max-w-2xl sm:p-6">
          {selected && selectedDocument && (
            <>
              <DialogHeader className="shrink-0 pr-8">
                <DialogTitle className="font-display text-2xl text-navy">
                  Ficha financeira do culto
                </DialogTitle>
                <DialogDescription>
                  {selectedDocument.service.name} ·{" "}
                  {formatDatePtBr(selectedDocument.service.serviceDate)} · ficha
                  nº {selected.sheet.id}
                </DialogDescription>
              </DialogHeader>
              <AdaptiveFormDialogBody className="grid gap-3">
                <div className="grid gap-2 rounded-xl border border-gold/30 bg-gold/5 p-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Total
                    </p>
                    <p className="mt-1 text-lg font-semibold text-navy">
                      {formatBrl(selected.sheet.totalCents)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Situação
                    </p>
                    <Badge
                      className={
                        selected.sheet.postingStatus === "lancada"
                          ? "mt-1 bg-emerald-600"
                          : "mt-1 bg-amber-100 text-amber-800"
                      }
                    >
                      {statusLabel(selected)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Assinatura
                    </p>
                    <p className="mt-1 text-sm font-semibold text-navy">
                      {selected.sheet.signedAt
                        ? `Assinada em ${formatDatePtBr(selected.sheet.signedAt)}`
                        : "Opcional · pendente"}
                    </p>
                  </div>
                </div>
                <section className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-navy">
                      Contribuições recebidas
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {selected.lines.length} linha(s)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {selected.lines.map(line => (
                      <div
                        key={line.id}
                        className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-navy">
                            {CONTRIBUTION_LABELS[line.contributionType] ??
                              line.contributionType}{" "}
                            ·{" "}
                            {PAYMENT_LABELS[
                              line.paymentMethod as PaymentMethod
                            ] ?? line.paymentMethod}
                          </p>
                          <p className="mt-0.5 truncate text-muted-foreground">
                            {line.description || "Sem descrição"}
                          </p>
                        </div>
                        <strong className="shrink-0 text-navy">
                          {formatBrl(line.amountCents)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-muted-foreground">
                  <strong className="text-navy">Observações:</strong>{" "}
                  {selected.sheet.notes || "Nenhuma"}
                </div>
                {selected.sheet.status === "finalizada" &&
                  selected.sheet.postingStatus !== "lancada" && (
                    <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                        <WalletCards className="h-4 w-4" /> Conta para cada
                        forma de pagamento
                      </p>
                      <p className="mt-1 text-xs text-amber-900">
                        O lançamento será feito uma única vez, respeitando a
                        forma escolhida em cada linha.
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {selectedMethods.map(method => (
                          <label
                            key={method}
                            className="grid gap-1 text-xs font-medium text-amber-950"
                          >
                            {PAYMENT_LABELS[method]}
                            <select
                              value={
                                postingAccountByMethod[method] ??
                                String(accounts[0]?.id ?? "")
                              }
                              onChange={event =>
                                setPostingAccountByMethod(current => ({
                                  ...current,
                                  [method]: event.target.value,
                                }))
                              }
                              className="h-9 rounded-md border border-amber-300 bg-white px-2 text-sm"
                            >
                              <option value="">Selecione uma conta</option>
                              {accounts.map(account => (
                                <option key={account.id} value={account.id}>
                                  {account.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>
                    </section>
                  )}
              </AdaptiveFormDialogBody>
              <AdaptiveFormDialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={requestEdit}
                  disabled={
                    !onRequestEntry ||
                    selected.sheet.status !== "rascunho" ||
                    selected.sheet.postingStatus === "lancada"
                  }
                >
                  Editar ficha
                </Button>
                {selected.sheet.status === "rascunho" && (
                  <Button
                    type="button"
                    className="bg-navy hover:bg-navy/90"
                    disabled={finalize.isPending}
                    onClick={() =>
                      finalize.mutate({ churchId, id: selected.sheet.id })
                    }
                  >
                    {finalize.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}{" "}
                    Finalizar ficha
                  </Button>
                )}
                {selected.sheet.status === "finalizada" &&
                  !selected.sheet.signedAt && (
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-white"
                      disabled={sign.isPending}
                      onClick={() =>
                        sign.mutate({ churchId, id: selected.sheet.id })
                      }
                    >
                      {sign.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="mr-2 h-4 w-4" />
                      )}{" "}
                      Assinar ficha
                    </Button>
                  )}
                {selected.sheet.status === "finalizada" &&
                  selected.sheet.postingStatus !== "lancada" && (
                    <Button
                      type="button"
                      className="bg-navy hover:bg-navy/90"
                      disabled={post.isPending}
                      onClick={postSelected}
                    >
                      {post.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <WalletCards className="mr-2 h-4 w-4" />
                      )}{" "}
                      Lançar no livro-caixa
                    </Button>
                  )}
                <Button type="button" variant="outline" onClick={shareSelected}>
                  <Share2 className="mr-2 h-4 w-4" /> Compartilhar
                </Button>
                <Button type="button" variant="outline" onClick={printSelected}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimir / salvar PDF
                </Button>
                <Button type="button" onClick={() => setSelectedId(null)}>
                  Fechar
                </Button>
              </AdaptiveFormDialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
