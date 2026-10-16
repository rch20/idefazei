import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Printer,
  Share2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  buildTreasuryEntrySheetEmailUrl,
  buildTreasuryEntrySheetHtml,
  buildTreasuryEntrySheetWhatsAppUrl,
  formatBrl,
  formatDatePtBr,
  openTreasuryPrintDocument,
  parseBrlToCents,
  shareTreasuryEntrySheet,
} from "@/lib/treasury";
import { currentCivilDateKey } from "@/lib/civilDate";
import { toast } from "sonner";

type ContributionType = "dizimo" | "oferta" | "oferta_especial" | "outra";
type PaymentMethod =
  | "dinheiro"
  | "pix"
  | "transferencia"
  | "cartao"
  | "cheque"
  | "outro";

type ServiceOption = {
  id: number;
  name: string;
  serviceDate: string | Date;
  startTime?: string | null;
  location?: string | null;
};

type EntryLineForm = {
  key: string;
  contributionType: ContributionType;
  paymentMethod: PaymentMethod;
  amount: string;
  description: string;
};

const CONTRIBUTION_TYPES: Array<{ value: ContributionType; label: string }> = [
  { value: "dizimo", label: "Dízimo" },
  { value: "oferta", label: "Oferta" },
  { value: "oferta_especial", label: "Oferta especial" },
  { value: "outra", label: "Outra contribuição" },
];

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência" },
  { value: "cartao", label: "Cartão" },
  { value: "cheque", label: "Cheque" },
  { value: "outro", label: "Outro" },
];

const emptyLine = (): EntryLineForm => ({
  key: `${Date.now()}-${Math.random()}`,
  contributionType: "dizimo",
  paymentMethod: "dinheiro",
  amount: "",
  description: "",
});

function serviceLabel(service: ServiceOption) {
  const date = formatDatePtBr(service.serviceDate);
  return `${service.name} · ${date}${service.startTime ? ` · ${service.startTime}` : ""}`;
}

function moneyInput(cents: number) {
  return cents > 0 ? (cents / 100).toFixed(2).replace(".", ",") : "";
}

export function TreasuryEntrySheetSection({
  churchId,
  open,
  onOpenChange,
  services,
  initialServiceId,
  canManageStructure,
  onServiceCreated,
}: {
  churchId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: ServiceOption[];
  initialServiceId?: number | null;
  canManageStructure: boolean;
  onServiceCreated?: () => void;
}) {
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [lines, setLines] = useState<EntryLineForm[]>([emptyLine()]);
  const [notes, setNotes] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [postSaveActionsOpen, setPostSaveActionsOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: "",
    serviceDate: currentCivilDateKey(),
    startTime: "",
    location: "",
  });
  const entrySheetQuery = trpc.treasury.entrySheetByService.useQuery(
    { churchId, serviceId: Number(selectedServiceId || 0) },
    { enabled: Boolean(open && churchId && selectedServiceId) }
  );
  const createService = trpc.treasury.createService.useMutation({
    onSuccess: service => {
      if (!service) return;
      setSelectedServiceId(String(service.id));
      setManualOpen(false);
      setManualForm({
        name: "",
        serviceDate: currentCivilDateKey(),
        startTime: "",
        location: "",
      });
      onServiceCreated?.();
      toast.success("Culto manual criado. Agora preencha a ficha financeira.");
    },
    onError: error => toast.error(error.message),
  });
  const saveEntrySheet = trpc.treasury.saveEntrySheet.useMutation({
    onSuccess: async () => {
      await entrySheetQuery.refetch();
      setPostSaveActionsOpen(true);
      toast.success(
        "Ficha financeira salva como rascunho. Nenhum valor foi lançado no livro-caixa."
      );
    },
    onError: error => toast.error(error.message),
  });
  const finalizeEntrySheet = trpc.treasury.finalizeEntrySheet.useMutation({
    onSuccess: async () => {
      await entrySheetQuery.refetch();
      toast.success(
        "Ficha finalizada. Você pode assiná-la ou apenas imprimir e compartilhar."
      );
    },
    onError: error => toast.error(error.message),
  });
  const signEntrySheet = trpc.treasury.signEntrySheet.useMutation({
    onSuccess: async () => {
      await entrySheetQuery.refetch();
      toast.success("Ficha assinada com registro auditável.");
    },
    onError: error => toast.error(error.message),
  });

  const selectedService = useMemo(
    () => services.find(service => service.id === Number(selectedServiceId)),
    [selectedServiceId, services]
  );

  useEffect(() => {
    if (!open) return;
    setSelectedServiceId(initialServiceId ? String(initialServiceId) : "");
    setManualOpen(false);
  }, [initialServiceId, open]);

  useEffect(() => {
    const sheet = entrySheetQuery.data;
    if (!sheet) {
      setLines([emptyLine()]);
      setNotes("");
      return;
    }
    setLines(
      sheet.lines.length > 0
        ? sheet.lines.map(line => ({
            key: String(line.id),
            contributionType: line.contributionType,
            paymentMethod: line.paymentMethod,
            amount: moneyInput(line.amountCents),
            description: line.description ?? "",
          }))
        : [emptyLine()]
    );
    setNotes(sheet.sheet.notes ?? "");
  }, [entrySheetQuery.data]);

  const lineTotals = useMemo(() => {
    const totals = new Map<ContributionType, number>();
    for (const line of lines) {
      const cents = parseBrlToCents(line.amount) ?? 0;
      totals.set(
        line.contributionType,
        (totals.get(line.contributionType) ?? 0) + cents
      );
    }
    return totals;
  }, [lines]);
  const totalCents = Array.from(lineTotals.values()).reduce(
    (sum, value) => sum + value,
    0
  );
  const savedSheet = entrySheetQuery.data?.sheet;
  const sheetFinalized = savedSheet?.status === "finalizada";
  const sheetPosted = savedSheet?.postingStatus === "lancada";
  const document =
    savedSheet && selectedService
      ? {
          sheet: savedSheet,
          lines: entrySheetQuery.data?.lines ?? [],
          service: selectedService,
        }
      : null;

  const updateLine = (key: string, patch: Partial<EntryLineForm>) => {
    setLines(current =>
      current.map(line => (line.key === key ? { ...line, ...patch } : line))
    );
  };

  const submitManualService = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageStructure) return;
    createService.mutate({
      churchId,
      name: manualForm.name.trim(),
      serviceDate: manualForm.serviceDate,
      startTime: manualForm.startTime || undefined,
      location: manualForm.location.trim() || undefined,
    });
  };

  const submitEntrySheet = (event: React.FormEvent) => {
    event.preventDefault();
    if (sheetFinalized || sheetPosted) return;
    if (!selectedServiceId)
      return toast.error("Selecione um culto antes de salvar a ficha.");
    saveEntrySheet.mutate({
      churchId,
      serviceId: Number(selectedServiceId),
      id: entrySheetQuery.data?.sheet.id,
      lines: lines.map(line => ({
        contributionType: line.contributionType,
        paymentMethod: line.paymentMethod,
        amountCents: parseBrlToCents(line.amount) ?? 0,
        description: line.description.trim() || undefined,
      })),
      notes: notes.trim() || undefined,
    });
  };

  const printSheet = () => {
    if (!document) return;
    if (!openTreasuryPrintDocument(buildTreasuryEntrySheetHtml(document))) {
      toast.error(
        "O navegador bloqueou a janela. Libere pop-ups e tente novamente."
      );
    }
  };

  const shareSheet = async () => {
    if (!document) return;
    try {
      await shareTreasuryEntrySheet(document);
      toast.success("Ficha compartilhada ou resumo copiado.");
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError")
        toast.error("Não foi possível compartilhar a ficha.");
    }
  };

  const emailSheet = () => {
    if (!document) return;
    window.location.href = buildTreasuryEntrySheetEmailUrl(document);
    toast.success("Rascunho de e-mail aberto. Escolha o destinatário e envie.");
  };

  const whatsappSheet = () => {
    if (!document) return;
    const url = buildTreasuryEntrySheetWhatsAppUrl(document);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = url;
    toast.success("Mensagem do WhatsApp aberta. Escolha o contato e envie.");
  };

  const signSavedSheet = async () => {
    if (!savedSheet || savedSheet.signedAt) return;
    try {
      if (savedSheet.status === "rascunho") {
        await finalizeEntrySheet.mutateAsync({
          churchId,
          id: savedSheet.id,
        });
      }
      await signEntrySheet.mutateAsync({ churchId, id: savedSheet.id });
      await entrySheetQuery.refetch();
      setPostSaveActionsOpen(false);
      toast.success("Ficha finalizada e assinada digitalmente.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível assinar a ficha."
      );
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AdaptiveFormDialogContent className="sm:max-w-4xl">
        <div className={adaptiveFormDialogHeaderClassName}>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl text-navy">
            <FileText className="h-5 w-5 text-gold" /> Ficha financeira do culto
          </DialogTitle>
          <DialogDescription>
            Preencha dízimos, ofertas e outras contribuições. Salvar esta ficha
            não altera o saldo da Tesouraria.
          </DialogDescription>
        </div>
        <form className="contents" onSubmit={submitEntrySheet}>
          <AdaptiveFormDialogBody className="space-y-4">
            <section className="rounded-xl border border-gold/30 bg-[#fffdf7] p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-medium text-navy">
                  Culto da ficha
                  <select
                    value={selectedServiceId}
                    onChange={event => setSelectedServiceId(event.target.value)}
                    className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                    required={!manualOpen}
                  >
                    <option value="">Selecione um culto já cadastrado</option>
                    {services
                      .filter(service => service.location !== "__cancelado__")
                      .map(service => (
                        <option key={service.id} value={service.id}>
                          {serviceLabel(service)}
                        </option>
                      ))}
                  </select>
                </label>
                {canManageStructure && (
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setManualOpen(current => !current)}
                  >
                    {manualOpen
                      ? "Escolher culto cadastrado"
                      : "Informar culto manualmente"}
                  </Button>
                )}
              </div>
              {selectedService && !manualOpen && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {selectedService.location || "Local não informado"}
                </p>
              )}
              {savedSheet && (
                <div
                  className={`mt-3 rounded-lg border px-3 py-2 text-xs ${sheetPosted ? "border-emerald-200 bg-emerald-50 text-emerald-900" : sheetFinalized ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                  role="status"
                >
                  {sheetPosted
                    ? "Ficha lançada no livro-caixa. Os campos estão protegidos para evitar duplicidade."
                    : sheetFinalized
                      ? `Ficha finalizada${savedSheet.signedAt ? " e assinada" : ". A assinatura é opcional"}. Os campos estão protegidos.`
                      : "Rascunho salvo. Você ainda pode editar antes de finalizar."}
                </div>
              )}
            </section>

            {manualOpen && canManageStructure && (
              <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                <p className="text-sm font-semibold text-navy">
                  Novo culto manual
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use apenas quando o culto ainda não estiver cadastrado. Ele
                  será criado uma única vez e ficará disponível para esta ficha.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium text-navy">
                    Nome do culto
                    <Input
                      required
                      value={manualForm.name}
                      onChange={event =>
                        setManualForm(current => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Ex.: Culto especial"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-navy">
                    Data
                    <Input
                      required
                      type="date"
                      value={manualForm.serviceDate}
                      onChange={event =>
                        setManualForm(current => ({
                          ...current,
                          serviceDate: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-navy">
                    Horário
                    <Input
                      type="time"
                      value={manualForm.startTime}
                      onChange={event =>
                        setManualForm(current => ({
                          ...current,
                          startTime: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-navy">
                    Local
                    <Input
                      value={manualForm.location}
                      onChange={event =>
                        setManualForm(current => ({
                          ...current,
                          location: event.target.value,
                        }))
                      }
                      placeholder="Opcional"
                    />
                  </label>
                </div>
                <Button
                  type="button"
                  className="mt-3 bg-navy hover:bg-navy/90"
                  disabled={createService.isPending}
                  onClick={submitManualService}
                >
                  {createService.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}{" "}
                  Criar culto e continuar
                </Button>
              </section>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-navy">
                    Entradas recebidas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Adicione uma linha para cada tipo de contribuição e forma de
                    pagamento.
                  </p>
                </div>
                <span className="text-lg font-semibold text-navy">
                  Total: {formatBrl(totalCents)}
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {lines.map(line => (
                  <div
                    key={line.key}
                    className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[1fr_1fr_9rem_auto] sm:items-end"
                  >
                    <label className="grid gap-1 text-xs font-medium text-navy">
                      Tipo
                      <select
                        value={line.contributionType}
                        disabled={sheetFinalized || sheetPosted}
                        onChange={event =>
                          updateLine(line.key, {
                            contributionType: event.target
                              .value as ContributionType,
                          })
                        }
                        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="dizimo">Dízimo</option>
                        <option value="oferta">Oferta</option>
                        <option value="oferta_especial">Oferta especial</option>
                        <option value="outra">Outra contribuição</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-navy">
                      Forma de pagamento
                      <select
                        value={line.paymentMethod}
                        disabled={sheetFinalized || sheetPosted}
                        onChange={event =>
                          updateLine(line.key, {
                            paymentMethod: event.target.value as PaymentMethod,
                          })
                        }
                        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {PAYMENT_METHODS.map(method => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-navy">
                      Valor
                      <Input
                        inputMode="decimal"
                        disabled={sheetFinalized || sheetPosted}
                        value={line.amount}
                        onChange={event =>
                          updateLine(line.key, { amount: event.target.value })
                        }
                        placeholder="0,00"
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-full sm:w-10"
                      aria-label="Remover linha"
                      disabled={
                        lines.length === 1 || sheetFinalized || sheetPosted
                      }
                      onClick={() =>
                        setLines(current =>
                          current.filter(item => item.key !== line.key)
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {line.contributionType === "outra" && (
                      <label className="grid gap-1 text-xs font-medium text-navy sm:col-span-4">
                        Descrição da outra contribuição
                        <Input
                          disabled={sheetFinalized || sheetPosted}
                          value={line.description}
                          onChange={event =>
                            updateLine(line.key, {
                              description: event.target.value,
                            })
                          }
                          placeholder="Ex.: Oferta missionária"
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-3 gap-2"
                disabled={sheetFinalized || sheetPosted}
                onClick={() => setLines(current => [...current, emptyLine()])}
              >
                <Plus className="h-4 w-4" /> Adicionar outra entrada
              </Button>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                {CONTRIBUTION_TYPES.map(type => (
                  <div
                    key={type.value}
                    className="rounded-lg border border-slate-200 bg-white p-2.5"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {type.label}
                    </p>
                    <p className="mt-1 font-semibold text-navy">
                      {formatBrl(lineTotals.get(type.value) ?? 0)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <label className="grid gap-1.5 text-sm font-medium text-navy">
              Observações
              <Textarea
                disabled={sheetFinalized || sheetPosted}
                value={notes}
                onChange={event => setNotes(event.target.value)}
                placeholder="Anote algo importante sobre esta ficha, se necessário."
                rows={3}
              />
            </label>
            <div
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            >
              A ficha pode ser finalizada, assinada opcionalmente, impressa ou
              compartilhada. O lançamento no livro-caixa continua sendo uma ação
              separada e protegida da Etapa 3C.
            </div>
          </AdaptiveFormDialogBody>
          <AdaptiveFormDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveEntrySheet.isPending}
            >
              Fechar
            </Button>
            {document && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={shareSheet}
                  disabled={saveEntrySheet.isPending}
                >
                  <Share2 className="mr-2 h-4 w-4" /> Compartilhar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={printSheet}
                  disabled={saveEntrySheet.isPending}
                >
                  <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
                </Button>
              </>
            )}
            {savedSheet?.status === "rascunho" && (
              <Button
                type="button"
                variant="outline"
                className="bg-white"
                disabled={
                  finalizeEntrySheet.isPending || saveEntrySheet.isPending
                }
                onClick={() =>
                  finalizeEntrySheet.mutate({ churchId, id: savedSheet.id })
                }
              >
                {finalizeEntrySheet.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Finalizar ficha
              </Button>
            )}
            {savedSheet?.status === "finalizada" && !savedSheet.signedAt && (
              <Button
                type="button"
                variant="outline"
                className="bg-white"
                disabled={signEntrySheet.isPending}
                onClick={() =>
                  signEntrySheet.mutate({ churchId, id: savedSheet.id })
                }
              >
                {signEntrySheet.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Assinar ficha
              </Button>
            )}
            <Button
              type="submit"
              className="bg-navy hover:bg-navy/90"
              disabled={
                saveEntrySheet.isPending ||
                createService.isPending ||
                !selectedServiceId ||
                manualOpen ||
                sheetFinalized ||
                sheetPosted
              }
            >
              {saveEntrySheet.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}{" "}
              Salvar ficha como rascunho
            </Button>
          </AdaptiveFormDialogFooter>
        </form>
      </AdaptiveFormDialogContent>
    </Dialog>
      <Dialog open={postSaveActionsOpen} onOpenChange={setPostSaveActionsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-navy">
              Ficha salva com sucesso
            </DialogTitle>
            <DialogDescription>
              Escolha o que deseja fazer com a última versão salva da ficha.
              Nenhum valor foi lançado no livro-caixa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-24 flex-col items-start justify-between gap-3 p-4 text-left"
              onClick={printSheet}
              disabled={!document}
            >
              <Printer className="h-5 w-5 text-navy" />
              <span>
                <span className="block font-semibold text-navy">
                  Imprimir / PDF
                </span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Abrir o documento para impressão.
                </span>
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-24 flex-col items-start justify-between gap-3 p-4 text-left"
              onClick={shareSheet}
              disabled={!document}
            >
              <Share2 className="h-5 w-5 text-navy" />
              <span>
                <span className="block font-semibold text-navy">
                  Compartilhar
                </span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Enviar ou copiar um resumo seguro.
                </span>
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-24 flex-col items-start justify-between gap-3 p-4 text-left"
              onClick={emailSheet}
              disabled={!document}
            >
              <Mail className="h-5 w-5 text-navy" />
              <span>
                <span className="block font-semibold text-navy">
                  Enviar por e-mail
                </span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Abrir rascunho com o resumo.
                </span>
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-24 flex-col items-start justify-between gap-3 p-4 text-left"
              onClick={whatsappSheet}
              disabled={!document}
            >
              <MessageCircle className="h-5 w-5 text-[#128c7e]" />
              <span>
                <span className="block font-semibold text-navy">
                  Enviar pelo WhatsApp
                </span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Abrir mensagem e escolher o contato.
                </span>
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-24 flex-col items-start justify-between gap-3 border-gold/50 bg-[#fffdf7] p-4 text-left"
              onClick={() => void signSavedSheet()}
              disabled={
                !savedSheet ||
                Boolean(savedSheet.signedAt) ||
                finalizeEntrySheet.isPending ||
                signEntrySheet.isPending
              }
            >
              <ShieldCheck className="h-5 w-5 text-gold" />
              <span>
                <span className="block font-semibold text-navy">
                  Assinar digitalmente
                </span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Opcional. A ficha será finalizada e protegida.
                </span>
              </span>
            </Button>
          </div>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
            E-mail e WhatsApp abrem um rascunho: você escolhe o destinatário e
            confirma o envio. Para anexar o PDF, use Imprimir / PDF e anexe o
            arquivo manualmente.
          </p>
          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPostSaveActionsOpen(false)}
            >
              Continuar preenchendo
            </Button>
            <Button
              type="button"
              className="bg-navy hover:bg-navy/90"
              onClick={() => {
                setPostSaveActionsOpen(false);
                onOpenChange(false);
              }}
            >
              Fechar ficha
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
