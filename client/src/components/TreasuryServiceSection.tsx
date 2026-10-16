import { useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdaptiveFormDialogBody, AdaptiveFormDialogContent, AdaptiveFormDialogFooter, adaptiveFormDialogHeaderClassName } from "@/components/AdaptiveFormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowDownCircle, ArrowUpCircle, CalendarDays, CheckCheck, CheckCircle2, Edit3, Eye, FileText, Loader2, MoreHorizontal, PauseCircle, PlayCircle, Plus, Printer, Search, Share2, ShieldCheck, SlidersHorizontal, WalletCards, X } from "lucide-react";
import { formatBrl, formatDatePtBr, openTreasuryPrintDocument, parseBrlToCents } from "@/lib/treasury";
import { toast } from "sonner";
import { currentCivilDateKey, formatCivilDateKeyForInput } from "@/lib/civilDate";
import type { TreasuryServiceContext } from "@/components/TreasuryQuickActionHost";

type PersonOption = { id: number; fullName: string };
type AccountOption = { id: number; name: string; type: "caixa" | "banco" | "outro" };
type AmountField = "cashCents" | "pixCents" | "transferCents" | "cardCents" | "checkCents" | "otherCents";
type ReportSnapshot = {
  service: { name?: string; serviceDate?: string; startTime?: string | null; location?: string | null };
  countSheet: Record<AmountField | "totalCents" | "notes", number | string | null>;
  counters: { one: string; two: string };
  deposit: { amountCents?: number; depositDate?: string; reference?: string | null } | null;
  transactions: Array<{ type?: string; amountCents?: number; description?: string | null; status?: string }>;
  issuedAt: string;
};

type TreasuryReportRecord = {
  id: number;
  serviceId: number;
  version: number;
  status: "emitido" | "assinado";
  snapshot: unknown;
  issuedAt: Date | string;
  signedByCounterOneAt: Date | string | null;
  signedByCounterTwoAt: Date | string | null;
  signedByTreasurerAt: Date | string | null;
  signedByPastorAt: Date | string | null;
};

type ReportSignatureField = keyof Pick<TreasuryReportRecord, "signedByCounterOneAt" | "signedByCounterTwoAt" | "signedByTreasurerAt" | "signedByPastorAt">;
const REPORT_SIGNATURES: Array<{ role: "contador1" | "contador2" | "tesoureiro" | "pastor"; field: ReportSignatureField; label: string }> = [
  { role: "contador1", field: "signedByCounterOneAt", label: "Contador(a) 1" },
  { role: "contador2", field: "signedByCounterTwoAt", label: "Contador(a) 2" },
  { role: "tesoureiro", field: "signedByTreasurerAt", label: "Tesoureiro(a)" },
  { role: "pastor", field: "signedByPastorAt", label: "Pastor(a) responsável" },
];

type TreasuryRouterOutputs = inferRouterOutputs<AppRouter>;
type TreasuryServiceRecord = TreasuryRouterOutputs["treasury"]["services"][number];
type TreasuryCountSheetRecord = TreasuryRouterOutputs["treasury"]["countSheets"][number];
type TreasuryDepositRecord = TreasuryRouterOutputs["treasury"]["deposits"][number];
type TreasuryServiceTransaction = TreasuryRouterOutputs["treasury"]["serviceTransactions"][number];

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const AMOUNT_FIELDS: Array<{ key: AmountField; label: string }> = [
  { key: "cashCents", label: "Dinheiro" },
  { key: "pixCents", label: "Pix" },
  { key: "transferCents", label: "Transferência" },
  { key: "cardCents", label: "Cartão" },
  { key: "checkCents", label: "Cheque" },
  { key: "otherCents", label: "Outros" },
];
const DIALOG_CLASS = "!flex z-[200] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 flex-col overflow-hidden p-4 sm:max-h-[94vh] sm:max-w-2xl sm:p-6";
const todayCivilDate = () => currentCivilDateKey();

function moneyInput(cents: number) {
  return cents ? (cents / 100).toFixed(2).replace(".", ",") : "";
}
function serviceLabel(service: { name: string; serviceDate: string | Date; startTime?: string | null }) {
  const date = formatDatePtBr(service.serviceDate);
  return `${service.name} · ${date}${service.startTime ? ` · ${service.startTime}` : ""}`;
}
function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}
export function buildReportHtml(report: TreasuryReportRecord) {
  const snapshot = report.snapshot as ReportSnapshot;
  const count = snapshot.countSheet;
  const amountRows = AMOUNT_FIELDS.map(({ key, label }) => `<tr><td>${label}</td><td>${formatBrl(Number(count[key] ?? 0))}</td></tr>`).join("");
  const transactions = snapshot.transactions?.length
    ? snapshot.transactions.map((transaction) => `<tr><td>${escapeHtml(transaction.type)}</td><td>${escapeHtml(transaction.description || "-")}</td><td>${formatBrl(Number(transaction.amountCents ?? 0))}</td></tr>`).join("")
    : `<tr><td colspan="3">Nenhum lançamento vinculado a este culto.</td></tr>`;
  const signatureRows = REPORT_SIGNATURES.map(({ field, label }) => {
    const signedAt = report[field];
    return `<div class="line">${label}${signedAt ? ` · assinado em ${escapeHtml(formatDatePtBr(signedAt))}` : ""}</div>`;
  }).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Prestação de contas — ${escapeHtml(snapshot.service.name)}</title><style>body{font-family:Arial,sans-serif;color:#102a43;margin:32px;line-height:1.45}h1{font-size:24px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px;border-bottom:1px solid #d8dee9;padding-bottom:4px}p{margin:4px 0;color:#52667a}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{text-align:left;padding:7px;border-bottom:1px solid #d8dee9;font-size:12px}th{background:#f5f7fa}.total{font-weight:bold;font-size:16px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:62px}.line{border-top:1px solid #102a43;padding-top:6px;font-size:12px}@media print{body{margin:16mm}}</style></head><body><h1>Prestação de contas do culto</h1><p><strong>${escapeHtml(snapshot.service.name)}</strong> · ${escapeHtml(formatDatePtBr(snapshot.service.serviceDate || ""))}${snapshot.service.startTime ? ` · ${escapeHtml(snapshot.service.startTime)}` : ""}</p><p>${escapeHtml(snapshot.service.location || "Local não informado")} · Relatório nº ${report.id}, versão ${report.version} · ${report.status === "assinado" ? "Documento assinado" : "Aguardando assinaturas"}</p><h2>Contagem conferida</h2><table><thead><tr><th>Meio</th><th>Valor</th></tr></thead><tbody>${amountRows}</tbody><tfoot><tr class="total"><td>Total contado</td><td>${formatBrl(Number(count.totalCents ?? 0))}</td></tr></tfoot></table><p><strong>Contadores:</strong> ${escapeHtml(snapshot.counters.one)} e ${escapeHtml(snapshot.counters.two)}</p>${snapshot.deposit ? `<p><strong>Depósito:</strong> ${formatBrl(Number(snapshot.deposit.amountCents ?? 0))} em ${escapeHtml(formatDatePtBr(snapshot.deposit.depositDate || ""))}${snapshot.deposit.reference ? ` · ${escapeHtml(snapshot.deposit.reference)}` : ""}</p>` : "<p><strong>Depósito:</strong> ainda não registrado.</p>"}<h2>Lançamentos vinculados</h2><table><thead><tr><th>Tipo</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>${transactions}</tbody></table><p><strong>Observações:</strong> ${escapeHtml(count.notes || "Nenhuma")}</p><div class="signatures">${signatureRows}</div><script>window.onload=()=>window.print()</script></body></html>`;
}

function printReport(report: TreasuryReportRecord) {
  const html = buildReportHtml(report);
  const opened = openTreasuryPrintDocument(html);
  if (!opened) toast.error("O navegador bloqueou a janela do relatório. Libere pop-ups e tente novamente.");
}

export function reportShareText(report: TreasuryReportRecord) {
  const snapshot = report.snapshot as ReportSnapshot;
  const signedCount = REPORT_SIGNATURES.filter(({ field }) => Boolean(report[field])).length;
  return `Prestação de contas — ${snapshot.service.name ?? "Culto"} · ${formatDatePtBr(snapshot.service.serviceDate || "")} · Total contado: ${formatBrl(Number(snapshot.countSheet.totalCents ?? 0))} · ${signedCount}/${REPORT_SIGNATURES.length} assinaturas auditáveis.`;
}

export async function shareReport(report: TreasuryReportRecord) {
  const snapshot = report.snapshot as ReportSnapshot;
  const fileName = `prestacao-${report.id}-v${report.version}.html`;
  const file = new File([buildReportHtml(report)], fileName, { type: "text/html", lastModified: Date.now() });
  const shareData: ShareData = { title: `Prestação de contas — ${snapshot.service.name ?? "Culto"}`, text: reportShareText(report), files: [file] };
  if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
    await navigator.share(shareData);
    return true;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(reportShareText(report));
    return false;
  }
  return false;
}

export function filterTreasuryReports(
  reports: TreasuryReportRecord[],
  filters: { search?: string; from?: string; to?: string; date?: string; serviceId?: string },
) {
  const search = (filters.search ?? "").trim().toLocaleLowerCase("pt-BR");
  const serviceId = filters.serviceId ? Number(filters.serviceId) : null;
  return reports.filter((report) => {
    const snapshot = report.snapshot as ReportSnapshot;
    const dateKey = formatCivilDateKeyForInput(snapshot.service.serviceDate || report.issuedAt);
    const serviceName = String(snapshot.service.name ?? "").toLocaleLowerCase("pt-BR");
    return (
      (!filters.from || dateKey >= filters.from) &&
      (!filters.to || dateKey <= filters.to) &&
      (!filters.date || dateKey === filters.date) &&
      (!serviceId || report.serviceId === serviceId) &&
      (!search || serviceName.includes(search) || String(report.id).includes(search))
    );
  });
}

type TreasuryServiceCenterProps = {
  service: TreasuryServiceRecord;
  sheet?: TreasuryCountSheetRecord;
  deposit?: TreasuryDepositRecord;
  report?: TreasuryReportRecord;
  transactions: TreasuryServiceTransaction[];
  transactionsLoading: boolean;
  transactionsError: boolean;
  onRequestEntry?: (context: TreasuryServiceContext) => void;
  onCount: () => void;
  onDeposit: () => void;
  onIssueReport: () => void;
  onOpenReport: () => void;
  onPrintReport: () => void;
  onShareReport: () => void;
  onEditService: () => void;
  onCancelService: () => void;
  issueReportPending: boolean;
};

function TreasuryServiceCenter({
  service,
  sheet,
  deposit,
  report,
  transactions,
  transactionsLoading,
  transactionsError,
  onRequestEntry,
  onCount,
  onDeposit,
  onIssueReport,
  onOpenReport,
  onPrintReport,
  onShareReport,
  onEditService,
  onCancelService,
  issueReportPending,
}: TreasuryServiceCenterProps) {
  const serviceContext = {
    serviceId: service.id,
    countSheetId: sheet?.id,
    serviceDate: formatCivilDateKeyForInput(service.serviceDate),
  };
  const reportStatus = report
    ? report.status === "assinado"
      ? `Assinado · versão ${report.version}`
      : `Emitido · versão ${report.version}`
    : "Ainda não emitido";

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-gold/30 bg-[#fffdf7] p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
            Visão central do culto
          </p>
          <p className="mt-1 text-sm font-semibold text-navy">
            Tudo relacionado a esta ocorrência fica reunido aqui.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-slate-200 bg-white text-slate-700">
          {service.status === "aberto" ? "Em andamento" : service.status === "fechado" ? "Encerrado" : "Cancelado"}
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Identificação</p>
          <p className="mt-1 truncate text-sm font-semibold text-navy">{service.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{serviceLabel(service)}</p>
          <p className="truncate text-xs text-muted-foreground">{service.location || "Local não informado"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Contagem</p>
          <p className="mt-1 text-lg font-semibold text-navy">{sheet ? formatBrl(sheet.totalCents) : "Ainda não iniciada"}</p>
          <p className="text-xs text-muted-foreground">{sheet ? (sheet.status === "fechada" ? "Folha fechada" : "Rascunho salvo") : "Registre a conferência do culto"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Depósito e relatório</p>
          <p className="mt-1 text-sm font-semibold text-navy">{deposit ? formatBrl(deposit.amountCents) : "Depósito pendente"}</p>
          <p className="text-xs text-muted-foreground">{reportStatus}</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.72fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-3" aria-label={`Lançamentos do culto ${service.name}`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-navy">Lançamentos vinculados</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Somente os registros financeiros ligados a este culto.</p>
            </div>
            <Badge variant="outline" className="shrink-0 text-[10px]">{transactions.length}</Badge>
          </div>
          {transactionsLoading ? (
            <div role="status" className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando lançamentos…</div>
          ) : transactionsError ? (
            <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">Não foi possível consultar os lançamentos deste culto.</p>
          ) : transactions.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2 text-xs text-muted-foreground">Nenhum lançamento vinculado até o momento.</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {transactions.map(transaction => (
                <div key={transaction.id} className="flex min-w-0 items-center gap-2 py-2 first:pt-0 last:pb-0">
                  <div className={`shrink-0 rounded-full p-1.5 ${transaction.type === "entrada" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {transaction.type === "entrada" ? <ArrowDownCircle className="h-3.5 w-3.5" /> : <ArrowUpCircle className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-navy">{transaction.description || transaction.reference || "Lançamento do culto"}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{formatDatePtBr(transaction.transactionDate)} · {transaction.paymentMethod}{transaction.status === "rascunho" ? " · rascunho" : transaction.status === "estornado" ? " · estornado" : ""}</p>
                  </div>
                  <strong className={`shrink-0 text-xs ${transaction.type === "entrada" ? "text-emerald-700" : "text-rose-700"}`}>{transaction.type === "entrada" ? "+" : "−"}{formatBrl(transaction.amountCents)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-3" aria-label={`Ações do culto ${service.name}`}>
          <p className="text-sm font-semibold text-navy">Próximo passo</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Acesse apenas a etapa necessária, sem repetir o cadastro do culto.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {service.status !== "cancelado" && onRequestEntry && <Button type="button" size="sm" className="justify-start bg-navy hover:bg-navy/90" onClick={() => onRequestEntry(serviceContext)}><FileText className="mr-2 h-4 w-4" /> Preencher ficha financeira</Button>}
            {service.status !== "cancelado" && (!sheet || sheet.status !== "fechada") && <Button type="button" size="sm" variant="outline" className="justify-start" onClick={onCount}><WalletCards className="mr-2 h-4 w-4" /> {sheet ? "Editar contagem" : "Contar oferta"}</Button>}
            {sheet?.status === "fechada" && <Button type="button" size="sm" variant="outline" className="justify-start" onClick={onDeposit}><ShieldCheck className="mr-2 h-4 w-4" /> {deposit ? "Editar depósito" : "Registrar depósito"}</Button>}
            {sheet?.status === "fechada" && !report && <Button type="button" size="sm" variant="outline" className="justify-start" disabled={issueReportPending} onClick={onIssueReport}>{issueReportPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Emitir relatório</Button>}
            {report && <><Button type="button" size="sm" variant="outline" className="justify-start" onClick={onOpenReport}><Eye className="mr-2 h-4 w-4" /> Ver relatório e assinaturas</Button><Button type="button" size="sm" variant="outline" className="justify-start" onClick={onPrintReport}><Printer className="mr-2 h-4 w-4" /> Imprimir / salvar PDF</Button><Button type="button" size="sm" variant="outline" className="justify-start" onClick={onShareReport}><Share2 className="mr-2 h-4 w-4" /> Compartilhar relatório</Button></>}
            {service.status === "aberto" && <><Button type="button" size="sm" variant="ghost" className="justify-start text-navy" onClick={onEditService}><Edit3 className="mr-2 h-4 w-4" /> Editar culto</Button><Button type="button" size="sm" variant="ghost" className="justify-start text-rose-700 hover:text-rose-700" onClick={onCancelService}><X className="mr-2 h-4 w-4" /> Cancelar culto</Button></>}
          </div>
        </section>
      </div>
    </div>
  );
}

export function TreasuryServiceSection({ churchId, canManageStructure, people, accounts, initialView = "today", onRequestEntry }: { churchId: number; canManageStructure: boolean; people: PersonOption[]; accounts: AccountOption[]; initialView?: "today" | "reports"; onRequestEntry?: (context: TreasuryServiceContext) => void }) {
  const utils = trpc.useUtils();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(initialView === "reports");
  const [reportDetailOpen, setReportDetailOpen] = useState(false);
  const [postCloseOpen, setPostCloseOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<TreasuryReportRecord | null>(null);
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [reportServiceId, setReportServiceId] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [continueWithCount, setContinueWithCount] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [countOpen, setCountOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [postCloseServiceId, setPostCloseServiceId] = useState<number | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<number | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ name: "", weekday: "0", startTime: "", location: "", notes: "" });
  const [serviceForm, setServiceForm] = useState({ name: "", serviceDate: todayCivilDate(), startTime: "", location: "", notes: "" });
  const [countForm, setCountForm] = useState<Record<AmountField | "serviceId" | "counterOnePersonId" | "counterTwoPersonId" | "notes", string>>({ serviceId: "", counterOnePersonId: "", counterTwoPersonId: "", cashCents: "", pixCents: "", transferCents: "", cardCents: "", checkCents: "", otherCents: "", notes: "" });
  const [depositForm, setDepositForm] = useState({ accountId: "", amount: "", depositDate: todayCivilDate(), reference: "", notes: "" });
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);
  const schedulesQuery = trpc.treasury.recurringSchedules.useQuery({ churchId, includeInactive: true }, { enabled: Boolean(churchId) });
  const servicesQuery = trpc.treasury.services.useQuery({ churchId }, { enabled: Boolean(churchId) });
  const sheetsQuery = trpc.treasury.countSheets.useQuery({ churchId }, { enabled: Boolean(churchId) });
  const depositsQuery = trpc.treasury.deposits.useQuery({ churchId }, { enabled: Boolean(churchId) });
  const reportsQuery = trpc.treasury.reports.useQuery({ churchId }, { enabled: Boolean(churchId) });
  const expandedServiceTransactionsQuery = trpc.treasury.serviceTransactions.useQuery(
    { churchId, serviceId: expandedServiceId ?? 0 },
    { enabled: Boolean(churchId && expandedServiceId) }
  );
  const materializeOccurrences = trpc.treasury.materializeOccurrences.useMutation({
    onSuccess: async (result) => {
      await servicesQuery.refetch();
      toast.success(result.created > 0 ? `${result.created} ocorrência(s) recorrente(s) atualizada(s).` : "Nenhuma nova ocorrência recorrente foi necessária.");
    },
    onError: (error) => toast.error(error.message),
  });
  const createRecurringSchedule = trpc.treasury.createRecurringSchedule.useMutation({ onSuccess: async () => { await Promise.all([schedulesQuery.refetch(), servicesQuery.refetch()]); setScheduleOpen(false); setScheduleForm({ name: "", weekday: "0", startTime: "", location: "", notes: "" }); setScheduleError(null); toast.success("Programação fixa salva. As ocorrências previstas foram atualizadas."); }, onError: (error) => { setScheduleError(error.message); toast.error(error.message); } });
  const setRecurringScheduleActive = trpc.treasury.setRecurringScheduleActive.useMutation({ onSuccess: async () => { await Promise.all([schedulesQuery.refetch(), servicesQuery.refetch()]); toast.success("Programação fixa atualizada."); }, onError: (error) => toast.error(error.message) });
  const updateRecurringSchedule = trpc.treasury.updateRecurringSchedule.useMutation({ onSuccess: async () => { await Promise.all([schedulesQuery.refetch(), servicesQuery.refetch()]); setScheduleOpen(false); setEditingScheduleId(null); setScheduleError(null); toast.success("Programação fixa atualizada. As novas ocorrências seguirão esta configuração; as já criadas permanecem iguais."); }, onError: (error) => { setScheduleError(error.message); toast.error(error.message); } });
  const createService = trpc.treasury.createService.useMutation({ onSuccess: async (service) => { const shouldContinueWithCount = continueWithCount; setContinueWithCount(false); await servicesQuery.refetch(); setServiceOpen(false); setEditingServiceId(null); setServiceForm({ name: "", serviceDate: todayCivilDate(), startTime: "", location: "", notes: "" }); setServiceError(null); toast.success("Culto ou evento cadastrado."); if (shouldContinueWithCount && service) openCount(service.id); }, onError: (error) => { setServiceError(error.message); toast.error(error.message); } });
  const updateService = trpc.treasury.updateService.useMutation({ onSuccess: async () => { await servicesQuery.refetch(); setServiceOpen(false); setEditingServiceId(null); setServiceError(null); toast.success("Ocorrência atualizada. A programação fixa não foi alterada."); }, onError: (error) => { setServiceError(error.message); toast.error(error.message); } });
  const cancelService = trpc.treasury.cancelService.useMutation({ onSuccess: async () => { await servicesQuery.refetch(); toast.success("Culto cancelado."); }, onError: (error) => toast.error(error.message) });
  const saveCountSheet = trpc.treasury.saveCountSheet.useMutation({ onSuccess: async (sheet) => { await Promise.all([sheetsQuery.refetch(), servicesQuery.refetch()]); setCountOpen(false); setCountError(null); toast.success(sheet?.status === "fechada" ? "Contagem fechada." : "Folha salva como rascunho."); }, onError: (error) => { setCountError(error.message); toast.error(error.message); } });
  const closeCountSheet = trpc.treasury.closeCountSheet.useMutation({ onSuccess: async () => { const closedServiceId = selectedServiceId; await Promise.all([sheetsQuery.refetch(), servicesQuery.refetch()]); setCountOpen(false); setCountError(null); if (closedServiceId) { setPostCloseServiceId(closedServiceId); setPostCloseOpen(true); } toast.success("Contagem fechada e pronta para emissão."); }, onError: (error) => { setCountError(error.message); toast.error(error.message); } });
  const saveDeposit = trpc.treasury.saveDeposit.useMutation({ onSuccess: async () => { await depositsQuery.refetch(); setDepositOpen(false); setDepositError(null); toast.success("Depósito vinculado à folha."); }, onError: (error) => { setDepositError(error.message); toast.error(error.message); } });
  const issueReport = trpc.treasury.issueReport.useMutation({ onSuccess: async (report) => { await reportsQuery.refetch(); if (report) { setSelectedReport(report as TreasuryReportRecord); setReportDetailOpen(true); setPostCloseOpen(false); } toast.success("Relatório de culto emitido e guardado no histórico."); }, onError: (error) => toast.error(error.message) });
  const signReport = trpc.treasury.signReport.useMutation({ onSuccess: async (report) => { await reportsQuery.refetch(); if (report) { const updated = report as TreasuryReportRecord; setSelectedReport(current => current?.id === updated.id ? updated : current); } toast.success("Assinatura registrada com trilha de auditoria."); }, onError: (error) => toast.error(error.message) });
  const recurringSchedules = schedulesQuery.data ?? [];
  const services = servicesQuery.data ?? [];
  const sheets = sheetsQuery.data ?? [];
  const deposits = depositsQuery.data ?? [];
  const reports = reportsQuery.data as TreasuryReportRecord[] ?? [];
  const serviceById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);
  const sheetByServiceId = useMemo(() => new Map(sheets.map((sheet) => [sheet.serviceId, sheet])), [sheets]);
  const depositBySheetId = useMemo(() => new Map(deposits.map((deposit) => [deposit.countSheetId, deposit])), [deposits]);
  const servicesToRender = services.slice(0, 12);
  const filteredReports = useMemo(() => filterTreasuryReports(reports, { search: reportSearch, from: reportFrom, to: reportTo, date: reportDate, serviceId: reportServiceId }), [reports, reportDate, reportFrom, reportSearch, reportServiceId, reportTo]);
  const reportServiceOptions = useMemo(() => services.filter((service) => reports.some((report) => report.serviceId === service.id)), [reports, services]);
  const postCloseService = postCloseServiceId ? serviceById.get(postCloseServiceId) : null;
  const postCloseSheet = postCloseService ? sheetByServiceId.get(postCloseService.id) : null;
  const openReportDetail = (report: TreasuryReportRecord) => { setSelectedReport(report); setReportDetailOpen(true); };
  const clearReportFilters = () => { setReportFrom(""); setReportTo(""); setReportDate(""); setReportServiceId(""); setReportSearch(""); };
  const handleReportShare = async (report: TreasuryReportRecord) => {
    try {
      const shared = await shareReport(report);
      toast.success(shared ? "Relatório preparado para compartilhamento." : "Resumo copiado. O arquivo HTML também pode ser salvo ou impresso pelo navegador.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Não foi possível compartilhar este relatório.");
    }
  };
  const countTotal = AMOUNT_FIELDS.reduce((sum, { key }) => sum + (parseBrlToCents(countForm[key]) ?? 0), 0);
  const bankAccounts = accounts.filter((account) => account.type === "banco");

  const openCount = (serviceId: number) => {
    setCountError(null);
    const existing = sheetByServiceId.get(serviceId);
    setSelectedServiceId(serviceId);
    setSelectedSheetId(existing?.id ?? null);
    setCountForm({ serviceId: String(serviceId), counterOnePersonId: existing ? String(existing.counterOnePersonId) : "", counterTwoPersonId: existing ? String(existing.counterTwoPersonId) : "", cashCents: existing ? moneyInput(existing.cashCents) : "", pixCents: existing ? moneyInput(existing.pixCents) : "", transferCents: existing ? moneyInput(existing.transferCents) : "", cardCents: existing ? moneyInput(existing.cardCents) : "", checkCents: existing ? moneyInput(existing.checkCents) : "", otherCents: existing ? moneyInput(existing.otherCents) : "", notes: existing?.notes ?? "" });
    setCountOpen(true);
  };
  const openDeposit = (sheetId: number) => {
    setDepositError(null);
    const existing = depositBySheetId.get(sheetId);
    setSelectedSheetId(sheetId);
    setDepositForm({ accountId: existing ? String(existing.accountId) : String(bankAccounts[0]?.id ?? ""), amount: existing ? moneyInput(existing.amountCents) : "", depositDate: existing?.depositDate ? formatCivilDateKeyForInput(existing.depositDate) : todayCivilDate(), reference: existing?.reference ?? "", notes: existing?.notes ?? "" });
    setDepositOpen(true);
  };
  const openSchedule = (schedule?: (typeof recurringSchedules)[number]) => { setEditingScheduleId(schedule?.id ?? null); setScheduleError(null); setScheduleForm({ name: schedule?.name ?? "", weekday: String(schedule?.weekday ?? 0), startTime: schedule?.startTime ?? "", location: schedule?.location ?? "", notes: schedule?.notes ?? "" }); setScheduleOpen(true); };
  const openService = (service?: (typeof services)[number], continueToCount = false) => { setContinueWithCount(continueToCount); setEditingServiceId(service?.id ?? null); setServiceError(null); setServiceForm({ name: service?.name ?? "", serviceDate: service?.serviceDate ? formatCivilDateKeyForInput(service.serviceDate) : todayCivilDate(), startTime: service?.startTime ?? "", location: service?.location ?? "", notes: service?.notes ?? "" }); setServiceOpen(true); };
  const submitSchedule = (event: React.FormEvent) => { event.preventDefault(); setScheduleError(null); const input = { churchId, name: scheduleForm.name.trim(), weekday: Number(scheduleForm.weekday), startTime: scheduleForm.startTime, location: scheduleForm.location.trim() || undefined, notes: scheduleForm.notes.trim() || undefined }; if (editingScheduleId) updateRecurringSchedule.mutate({ ...input, id: editingScheduleId }); else createRecurringSchedule.mutate(input); };
  const submitService = (event: React.FormEvent) => { event.preventDefault(); setServiceError(null); const input = { churchId, name: serviceForm.name.trim(), serviceDate: serviceForm.serviceDate, startTime: serviceForm.startTime || undefined, location: serviceForm.location.trim() || undefined, notes: serviceForm.notes.trim() || undefined }; if (editingServiceId) updateService.mutate({ ...input, id: editingServiceId }); else createService.mutate(input); };
  const submitCount = (event: React.FormEvent, closeAfterSave = false) => { event.preventDefault(); setCountError(null); const amountValues = Object.fromEntries(AMOUNT_FIELDS.map(({ key }) => [key, parseBrlToCents(countForm[key]) ?? 0])) as Record<AmountField, number>; saveCountSheet.mutate({ id: selectedSheetId ?? undefined, churchId, serviceId: Number(countForm.serviceId), counterOnePersonId: Number(countForm.counterOnePersonId), counterTwoPersonId: Number(countForm.counterTwoPersonId), ...amountValues, notes: countForm.notes.trim() || undefined }); if (closeAfterSave && selectedSheetId) closeCountSheet.mutate({ churchId, id: selectedSheetId }); };
  const submitDeposit = (event: React.FormEvent) => { event.preventDefault(); setDepositError(null); if (!selectedSheetId) return; const amountCents = parseBrlToCents(depositForm.amount);     if (!amountCents || amountCents <= 0) { const message = "Informe um valor de depósito válido."; setDepositError(message); return toast.error(message); } const existing = depositBySheetId.get(selectedSheetId); saveDeposit.mutate({ id: existing?.id, churchId, countSheetId: selectedSheetId, accountId: Number(depositForm.accountId), amountCents, depositDate: depositForm.depositDate, reference: depositForm.reference.trim() || undefined, notes: depositForm.notes.trim() || undefined }); };

  const renderServiceCard = (service: (typeof services)[number]) => {
    const sheet = sheetByServiceId.get(service.id);
    const deposit = sheet ? depositBySheetId.get(sheet.id) : undefined;
    const report = reports.find((item) => item.serviceId === service.id);
    const hasActions = service.status === "aberto" || Boolean(sheet);
    return (
      <article key={service.id} className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <p className="min-w-0 truncate text-sm font-semibold text-navy">{service.name}</p>
              <Badge variant="outline" className={`text-[10px] ${service.status === "fechado" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : service.status === "cancelado" ? "border-slate-200 bg-slate-100 text-slate-600" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{service.status === "aberto" ? "Aberto" : service.status === "fechado" ? "Fechado" : "Cancelado"}</Badge>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{service.origin === "recorrente" ? "Culto regular" : "Evento manual"} · {serviceLabel(service)}{service.location ? ` · ${service.location}` : ""}</p>
            {sheet && <p className="mt-1 truncate text-[11px] text-muted-foreground">Contagem <strong>{formatBrl(sheet.totalCents)}</strong> · {sheet.status === "fechada" ? "fechada" : "rascunho"}{deposit ? ` · Depósito ${formatBrl(deposit.amountCents)}` : ""}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 px-2.5" onClick={() => setExpandedServiceId((current) => current === service.id ? null : service.id)} aria-expanded={expandedServiceId === service.id} aria-label={`Ver detalhes da prestação de ${service.name}`}><Search className="h-4 w-4" /><span className="hidden sm:inline">Detalhes</span></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button type="button" size="icon" variant="outline" className="h-8 w-8" disabled={!hasActions} aria-label={`Abrir ações da prestação de ${service.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60"><DropdownMenuLabel>Ações do culto</DropdownMenuLabel><DropdownMenuSeparator />{service.status !== "cancelado" && onRequestEntry && <DropdownMenuItem onSelect={() => onRequestEntry({ serviceId: service.id, countSheetId: sheet?.id, serviceDate: formatCivilDateKeyForInput(service.serviceDate) })}><WalletCards className="h-4 w-4" /> Registrar entrada do culto</DropdownMenuItem>}{(!sheet || sheet.status !== "fechada") && service.status !== "cancelado" && <DropdownMenuItem onSelect={() => openCount(service.id)}><WalletCards className="h-4 w-4" /> {sheet ? "Editar contagem" : "Contar oferta"}</DropdownMenuItem>}{sheet?.status === "fechada" && <><DropdownMenuItem onSelect={() => openDeposit(sheet.id)}><WalletCards className="h-4 w-4" /> {deposit ? "Editar depósito" : "Registrar depósito"}</DropdownMenuItem><DropdownMenuItem disabled={issueReport.isPending} onSelect={() => issueReport.mutate({ churchId, serviceId: service.id, countSheetId: sheet.id })}><FileText className="h-4 w-4" /> Emitir relatório</DropdownMenuItem>{report && <><DropdownMenuItem onSelect={() => openReportDetail(report as TreasuryReportRecord)}><Eye className="h-4 w-4" /> Ver relatório e assinaturas</DropdownMenuItem><DropdownMenuItem onSelect={() => printReport(report as TreasuryReportRecord)}><Printer className="h-4 w-4" /> Imprimir / salvar PDF</DropdownMenuItem><DropdownMenuItem onSelect={() => void handleReportShare(report as TreasuryReportRecord)}><Share2 className="h-4 w-4" /> Compartilhar relatório</DropdownMenuItem></>}</>}{service.status === "aberto" && <><DropdownMenuItem onSelect={() => openService(service)}><Edit3 className="h-4 w-4" /> Editar ocorrência</DropdownMenuItem><DropdownMenuItem className="text-rose-700 focus:text-rose-700" onSelect={() => { if (window.confirm(service.origin === "recorrente" ? "Marcar esta ocorrência como não realizada? A programação fixa continuará ativa." : "Cancelar este culto/evento? O histórico de contagem não será apagado.")) cancelService.mutate({ churchId, id: service.id }); }}><X className="h-4 w-4" /> {service.origin === "recorrente" ? "Não realizado" : "Cancelar"}</DropdownMenuItem></>}</DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {expandedServiceId === service.id && <TreasuryServiceCenter
          service={service}
          sheet={sheet}
          deposit={deposit}
          report={report as TreasuryReportRecord | undefined}
          transactions={expandedServiceTransactionsQuery.data ?? []}
          transactionsLoading={expandedServiceTransactionsQuery.isLoading}
          transactionsError={Boolean(expandedServiceTransactionsQuery.error)}
          onRequestEntry={onRequestEntry}
          onCount={() => openCount(service.id)}
          onDeposit={() => sheet && openDeposit(sheet.id)}
          onIssueReport={() => sheet && issueReport.mutate({ churchId, serviceId: service.id, countSheetId: sheet.id })}
          onOpenReport={() => report && openReportDetail(report as TreasuryReportRecord)}
          onPrintReport={() => report && printReport(report as TreasuryReportRecord)}
          onShareReport={() => report && void handleReportShare(report as TreasuryReportRecord)}
          onEditService={() => openService(service)}
          onCancelService={() => {
            if (window.confirm(service.origin === "recorrente" ? "Marcar esta ocorrência como não realizada? A programação fixa continuará ativa." : "Cancelar este culto/evento? O histórico de contagem não será apagado.")) {
              cancelService.mutate({ churchId, id: service.id });
            }
          }}
          issueReportPending={issueReport.isPending}
        />}
      </article>
    );
  };

  return <>
    <Card className="border-gold/30 bg-gold/5 shadow-sm">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-xl text-navy"><CalendarDays className="h-5 w-5 text-gold" /> Programação fixa</CardTitle><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Configure uma vez os cultos semanais. A criação das ocorrências é uma ação explícita e não acontece durante a consulta.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" className="shrink-0" onClick={() => materializeOccurrences.mutate({ churchId })} disabled={!canManageStructure || materializeOccurrences.isPending}>{materializeOccurrences.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />} Atualizar ocorrências</Button><Button className="shrink-0 bg-navy hover:bg-navy/90" onClick={() => setScheduleOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova programação</Button></div></CardHeader>
      <CardContent className="space-y-3">
        {schedulesQuery.isLoading ? <div className="h-16 animate-pulse rounded-xl bg-white/70" /> : recurringSchedules.length === 0 ? <div className="rounded-xl border border-dashed border-gold/40 bg-white/50 p-4 text-sm text-muted-foreground">Nenhum culto fixo configurado. Cadastre, por exemplo, Domingo às 18h.</div> : recurringSchedules.map((schedule) => <div key={schedule.id} className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-navy">{schedule.name}</p><Badge variant="outline" className={schedule.active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-100 text-slate-600"}>{schedule.active ? "Ativa" : "Pausada"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{WEEKDAYS[schedule.weekday]} às {schedule.startTime}{schedule.location ? ` · ${schedule.location}` : ""}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => openSchedule(schedule)}><Edit3 className="mr-1 h-4 w-4" /> Editar</Button><Button size="sm" variant="outline" disabled={setRecurringScheduleActive.isPending} onClick={() => setRecurringScheduleActive.mutate({ churchId, id: schedule.id, active: !schedule.active })}>{schedule.active ? <><PauseCircle className="mr-1 h-4 w-4" /> Pausar</> : <><PlayCircle className="mr-1 h-4 w-4" /> Ativar</>}</Button></div></div>)}
      </CardContent>
    </Card>

    <Card className="border-gold/30 bg-gold/5 shadow-sm">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><CardTitle className="flex items-center gap-2 text-lg text-navy sm:text-xl"><CalendarDays className="h-5 w-5 shrink-0 text-gold" /> Ocorrências de cultos</CardTitle><p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">Consulte os cultos e eventos já cadastrados e acesse as ações de contagem, depósito e ficha financeira de cada ocorrência.</p></div><Button type="button" variant="outline" className="h-9 w-full shrink-0 sm:h-10 sm:w-auto" onClick={() => openService(undefined)}><Plus className="mr-2 h-4 w-4" /> Cadastrar culto ou evento manual</Button></CardHeader>
      <CardContent className="space-y-2.5 pt-1 sm:space-y-3">
        {servicesQuery.isLoading ? <div className="h-20 animate-pulse rounded-xl bg-white/70" /> : services.length === 0 ? <div className="rounded-xl border border-dashed border-gold/40 bg-white/50 p-4 text-sm text-muted-foreground"><p className="font-medium text-navy">Nenhuma ocorrência cadastrada.</p><p className="mt-1">Cadastre um culto ou evento manual para acessar a contagem, o depósito e a ficha financeira vinculada.</p><Button size="sm" onClick={() => openService(undefined)} className="mt-3 bg-navy hover:bg-navy/90"><Plus className="mr-2 h-4 w-4" /> Cadastrar culto ou evento manual</Button></div> : <div className="space-y-2">{servicesToRender.map(renderServiceCard)}</div>}
        {historyOpen && <div className="border-t border-gold/20 pt-3"><div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="flex items-center gap-2 text-xs font-semibold text-navy sm:text-sm"><FileText className="h-4 w-4 text-gold" /> Histórico de prestações anteriores</p><p className="mt-1 text-[11px] text-muted-foreground">Contagens, depósitos e relatórios antigos continuam disponíveis para consulta, assinatura e impressão.</p></div><Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 self-start text-xs" onClick={clearReportFilters}><SlidersHorizontal className="h-3.5 w-3.5" /> Limpar filtros</Button></div><div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.35fr_1.1fr_1fr_1fr_1fr]"><label className="grid gap-1 text-[11px] font-medium text-navy"><span>Buscar culto ou nº</span><Input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Ex.: domingo ou 42" className="h-9 text-xs" /></label><label className="grid gap-1 text-[11px] font-medium text-navy"><span>Culto</span><select aria-label="Filtrar por culto" value={reportServiceId} onChange={(event) => setReportServiceId(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs"><option value="">Todos os cultos</option>{reportServiceOptions.map((service) => <option key={service.id} value={service.id}>{service.name} · {formatDatePtBr(service.serviceDate)}</option>)}</select></label><label className="grid gap-1 text-[11px] font-medium text-navy"><span>Data exata</span><Input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} className="h-9 text-xs" /></label><label className="grid gap-1 text-[11px] font-medium text-navy"><span>De</span><Input type="date" value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} className="h-9 text-xs" /></label><label className="grid gap-1 text-[11px] font-medium text-navy"><span>Até</span><Input type="date" value={reportTo} onChange={(event) => setReportTo(event.target.value)} className="h-9 text-xs" /></label></div>{filteredReports.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 p-3 text-xs text-muted-foreground">Nenhum relatório encontrado com estes filtros.</div> : <div className="grid gap-2 sm:grid-cols-2">{filteredReports.map((report) => { const snapshot = report.snapshot as ReportSnapshot; const signedCount = REPORT_SIGNATURES.filter(({ field }) => Boolean(report[field])).length; return <article key={report.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"><button type="button" className="min-w-0 flex-1 text-left" onClick={() => openReportDetail(report)}><strong className="block truncate text-xs text-navy">{snapshot.service.name ?? serviceById.get((snapshot.service as { id?: number }).id ?? 0)?.name ?? "Culto"}</strong><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">Relatório nº {report.id} · versão {report.version} · {formatDatePtBr(report.issuedAt)}</span><span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700"><CheckCheck className="h-3 w-3" /> {signedCount}/{REPORT_SIGNATURES.length} assinaturas</span></button><div className="flex shrink-0 items-center gap-1"><Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Imprimir relatório ${report.id}`} onClick={() => printReport(report)}><Printer className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Compartilhar relatório ${report.id}`} onClick={() => void handleReportShare(report)}><Share2 className="h-4 w-4" /></Button></div></article>; })}</div>}</div>}
        {services.length > 0 && <div className="flex items-center justify-between gap-3 border-t border-gold/20 pt-2.5"><p className="text-[11px] text-muted-foreground">{services.length} ocorrência(s) cadastrada(s).</p><Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs text-navy" onClick={() => setHistoryOpen((open) => !open)}>{historyOpen ? "Ocultar históricos anteriores" : "Ver históricos anteriores"}</Button></div>}
      </CardContent>
    </Card>

    <Dialog open={postCloseOpen} onOpenChange={setPostCloseOpen}><DialogContent className={`${DIALOG_CLASS} sm:max-w-lg`}><DialogHeader className="shrink-0 pr-8"><DialogTitle className="font-display text-2xl text-navy">Contagem fechada</DialogTitle><DialogDescription>{postCloseService?.name ? `${postCloseService.name} · ${formatDatePtBr(postCloseService.serviceDate)}` : "A prestação foi encerrada."} A folha está pronta para virar um relatório de culto no histórico.</DialogDescription></DialogHeader><AdaptiveFormDialogBody className="grid gap-3"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-900">Próximo passo recomendado</p><p className="mt-1 text-xs leading-relaxed text-emerald-800">Emita o relatório para registrar o snapshot da contagem, manter a trilha de assinaturas e liberar as ações de imprimir ou compartilhar.</p></div>{postCloseSheet && <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-muted-foreground">Total contado</p><p className="mt-1 text-2xl font-semibold text-navy">{formatBrl(postCloseSheet.totalCents)}</p></div>}</AdaptiveFormDialogBody><AdaptiveFormDialogFooter><Button type="button" variant="outline" onClick={() => { setPostCloseOpen(false); setHistoryOpen(true); }}>Ver histórico</Button><Button type="button" className="bg-navy hover:bg-navy/90" disabled={!postCloseServiceId || !postCloseSheet || issueReport.isPending} onClick={() => { if (!postCloseServiceId || !postCloseSheet) return; issueReport.mutate({ churchId, serviceId: postCloseServiceId, countSheetId: postCloseSheet.id }); }}>{issueReport.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Emitir relatório do culto</Button></AdaptiveFormDialogFooter></DialogContent></Dialog>

    <Dialog open={scheduleOpen} onOpenChange={(open) => { setScheduleOpen(open); if (!open) { setEditingScheduleId(null); setScheduleError(null); } }}><AdaptiveFormDialogContent><div className={adaptiveFormDialogHeaderClassName}><DialogTitle className="font-display text-2xl text-navy">{editingScheduleId ? "Editar programação fixa" : "Nova programação fixa"}</DialogTitle><p className="mt-1 text-sm text-muted-foreground">Configure uma vez o culto semanal. A ocorrência será criada automaticamente no dia correspondente.</p></div><form className="contents" onSubmit={submitSchedule}><AdaptiveFormDialogBody className="grid gap-4"><label className="grid gap-1.5"><Label>Nome do culto *</Label><Input required value={scheduleForm.name} onChange={(event) => setScheduleForm({ ...scheduleForm, name: event.target.value })} placeholder="Ex.: Culto de domingo" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5"><Label>Dia da semana *</Label><select required value={scheduleForm.weekday} onChange={(event) => setScheduleForm({ ...scheduleForm, weekday: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{WEEKDAYS.map((weekday, index) => <option key={weekday} value={index}>{weekday}</option>)}</select></label><label className="grid gap-1.5"><Label>Horário *</Label><Input required type="time" value={scheduleForm.startTime} onChange={(event) => setScheduleForm({ ...scheduleForm, startTime: event.target.value })} /></label></div><label className="grid gap-1.5"><Label>Local</Label><Input value={scheduleForm.location} onChange={(event) => setScheduleForm({ ...scheduleForm, location: event.target.value })} placeholder="Ex.: Templo principal" /></label><label className="grid gap-1.5"><Label>Observações</Label><Textarea value={scheduleForm.notes} onChange={(event) => setScheduleForm({ ...scheduleForm, notes: event.target.value })} placeholder="Orientações para as ocorrências futuras" /></label>{scheduleError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{scheduleError}</div>}</AdaptiveFormDialogBody><AdaptiveFormDialogFooter><Button type="button" variant="outline" onClick={() => setScheduleOpen(false)} disabled={createRecurringSchedule.isPending || updateRecurringSchedule.isPending}>Cancelar</Button><Button type="submit" disabled={createRecurringSchedule.isPending || updateRecurringSchedule.isPending} className="bg-navy hover:bg-navy/90">{createRecurringSchedule.isPending || updateRecurringSchedule.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />} Salvar programação</Button></AdaptiveFormDialogFooter></form></AdaptiveFormDialogContent></Dialog>

    <Dialog open={serviceOpen} onOpenChange={(open) => { setServiceOpen(open); if (!open) { setEditingServiceId(null); setServiceError(null); } }}><AdaptiveFormDialogContent><div className={adaptiveFormDialogHeaderClassName}><DialogTitle className="font-display text-2xl text-navy">{editingServiceId ? "Editar ocorrência de culto" : "Cadastrar culto ou evento manual"}</DialogTitle><p className="mt-1 text-sm text-muted-foreground">{editingServiceId ? "Altere somente esta ocorrência. A programação fixa continuará igual." : "Use esta opção somente para uma programação extraordinária, fora dos cultos fixos."}</p></div><form className="contents" onSubmit={submitService}><AdaptiveFormDialogBody className="grid gap-4"><label className="grid gap-1.5"><Label>Nome do culto *</Label><Input required value={serviceForm.name} onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })} placeholder="Ex.: Culto de domingo à noite" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5"><Label>Data *</Label><Input required type="date" value={serviceForm.serviceDate} onChange={(event) => setServiceForm({ ...serviceForm, serviceDate: event.target.value })} /></label><label className="grid gap-1.5"><Label>Horário</Label><Input type="time" value={serviceForm.startTime} onChange={(event) => setServiceForm({ ...serviceForm, startTime: event.target.value })} /></label></div><label className="grid gap-1.5"><Label>Local</Label><Input value={serviceForm.location} onChange={(event) => setServiceForm({ ...serviceForm, location: event.target.value })} placeholder="Ex.: Templo principal" /></label><label className="grid gap-1.5"><Label>Observações</Label><Textarea value={serviceForm.notes} onChange={(event) => setServiceForm({ ...serviceForm, notes: event.target.value })} placeholder="Informações úteis para a prestação de contas" /></label>{serviceError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{serviceError}</div>}</AdaptiveFormDialogBody><AdaptiveFormDialogFooter><Button type="button" variant="outline" onClick={() => setServiceOpen(false)} disabled={createService.isPending || updateService.isPending}>Cancelar</Button><Button type="submit" disabled={createService.isPending || updateService.isPending} className="bg-navy hover:bg-navy/90">{createService.isPending || updateService.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />} {editingServiceId ? "Salvar ajuste" : "Cadastrar culto"}</Button></AdaptiveFormDialogFooter></form></AdaptiveFormDialogContent></Dialog>

    <Dialog open={countOpen} onOpenChange={(open) => { setCountOpen(open); if (!open) setCountError(null); }}><AdaptiveFormDialogContent><div className={adaptiveFormDialogHeaderClassName}><DialogTitle className="font-display text-2xl text-navy">Folha de contagem</DialogTitle><p className="mt-1 text-sm text-muted-foreground">Informe duas pessoas diferentes. Os valores são gravados por meio de pagamento e o total é calculado automaticamente.</p></div><form className="contents" onSubmit={(event) => submitCount(event)}><AdaptiveFormDialogBody className="grid gap-4"><label className="grid gap-1.5"><Label>Culto *</Label><select required value={countForm.serviceId} onChange={(event) => setCountForm({ ...countForm, serviceId: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="" disabled>Selecione o culto</option>{services.filter((service) => service.status !== "cancelado").map((service) => <option key={service.id} value={service.id}>{serviceLabel(service)}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5"><Label>Contador(a) 1 *</Label><select required value={countForm.counterOnePersonId} onChange={(event) => setCountForm({ ...countForm, counterOnePersonId: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="" disabled>Selecione</option>{people.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label><label className="grid gap-1.5"><Label>Contador(a) 2 *</Label><select required value={countForm.counterTwoPersonId} onChange={(event) => setCountForm({ ...countForm, counterTwoPersonId: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="" disabled>Selecione</option>{people.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label></div><div className="grid gap-3 sm:grid-cols-2">{AMOUNT_FIELDS.map(({ key, label }) => <label className="grid gap-1.5" key={key}><Label>{label} (R$)</Label><Input inputMode="decimal" placeholder="0,00" value={countForm[key]} onChange={(event) => setCountForm({ ...countForm, [key]: event.target.value })} /></label>)}</div><div className="rounded-xl border border-gold/30 bg-gold/5 p-4"><p className="text-xs text-muted-foreground">Total da contagem</p><p className="mt-1 text-2xl font-semibold text-navy">{formatBrl(countTotal)}</p></div><label className="grid gap-1.5"><Label>Observações</Label><Textarea value={countForm.notes} onChange={(event) => setCountForm({ ...countForm, notes: event.target.value })} placeholder="Diferenças, conferências ou observações" /></label>{countError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{countError}</div>}</AdaptiveFormDialogBody><AdaptiveFormDialogFooter><Button type="submit" variant="outline" disabled={saveCountSheet.isPending || closeCountSheet.isPending}>Salvar rascunho</Button><Button type="button" disabled={saveCountSheet.isPending || closeCountSheet.isPending || !selectedSheetId} onClick={() => { setCountError(null); closeCountSheet.mutate({ churchId, id: selectedSheetId! }); }} className="bg-navy hover:bg-navy/90"><CheckCircle2 className="mr-2 h-4 w-4" /> Fechar contagem</Button></AdaptiveFormDialogFooter></form></AdaptiveFormDialogContent></Dialog>

    <Dialog open={depositOpen} onOpenChange={(open) => { setDepositOpen(open); if (!open) setDepositError(null); }}><AdaptiveFormDialogContent><div className={adaptiveFormDialogHeaderClassName}><DialogTitle className="font-display text-2xl text-navy">Registrar depósito</DialogTitle><p className="mt-1 text-sm text-muted-foreground">Vincule o depósito bancário à folha de contagem já fechada.</p></div><form className="contents" onSubmit={submitDeposit}><AdaptiveFormDialogBody className="grid gap-4"><label className="grid gap-1.5"><Label>Conta bancária *</Label><select required value={depositForm.accountId} onChange={(event) => setDepositForm({ ...depositForm, accountId: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="" disabled>Selecione</option>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5"><Label>Valor depositado (R$) *</Label><Input required inputMode="decimal" value={depositForm.amount} onChange={(event) => setDepositForm({ ...depositForm, amount: event.target.value })} placeholder="0,00" /></label><label className="grid gap-1.5"><Label>Data *</Label><Input required type="date" value={depositForm.depositDate} onChange={(event) => setDepositForm({ ...depositForm, depositDate: event.target.value })} /></label></div><label className="grid gap-1.5"><Label>Comprovante ou referência</Label><Input value={depositForm.reference} onChange={(event) => setDepositForm({ ...depositForm, reference: event.target.value })} placeholder="Número do depósito" /></label><label className="grid gap-1.5"><Label>Observações</Label><Textarea value={depositForm.notes} onChange={(event) => setDepositForm({ ...depositForm, notes: event.target.value })} /></label>{depositError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{depositError}</div>}{bankAccounts.length === 0 && <p className="text-sm text-rose-700">Cadastre uma conta do tipo banco antes de registrar o depósito.</p>}</AdaptiveFormDialogBody><AdaptiveFormDialogFooter><Button type="button" variant="outline" onClick={() => setDepositOpen(false)} disabled={saveDeposit.isPending}>Cancelar</Button><Button type="submit" disabled={saveDeposit.isPending || bankAccounts.length === 0} className="bg-navy hover:bg-navy/90">{saveDeposit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />} Salvar depósito</Button></AdaptiveFormDialogFooter></form></AdaptiveFormDialogContent></Dialog>

    <Dialog open={reportDetailOpen} onOpenChange={(open) => { setReportDetailOpen(open); if (!open) setSelectedReport(null); }}><DialogContent className={`${DIALOG_CLASS} sm:max-w-2xl`}>
      {selectedReport && (() => { const snapshot = selectedReport.snapshot as ReportSnapshot; const signedCount = REPORT_SIGNATURES.filter(({ field }) => Boolean(selectedReport[field])).length; return <>
        <DialogHeader className="shrink-0 pr-8"><DialogTitle className="font-display text-2xl text-navy">Relatório de prestação</DialogTitle><DialogDescription>{snapshot.service.name ?? "Culto"} · relatório nº {selectedReport.id}, versão {selectedReport.version}</DialogDescription></DialogHeader>
        <AdaptiveFormDialogBody className="grid gap-4">
          <div className="grid gap-2 rounded-xl border border-gold/30 bg-gold/5 p-4 sm:grid-cols-3"><div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Data</p><p className="mt-1 text-sm font-semibold text-navy">{formatDatePtBr(snapshot.service.serviceDate || selectedReport.issuedAt)}</p></div><div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total contado</p><p className="mt-1 text-sm font-semibold text-navy">{formatBrl(Number(snapshot.countSheet.totalCents ?? 0))}</p></div><div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</p><Badge className={selectedReport.status === "assinado" ? "mt-1 bg-emerald-600" : "mt-1 bg-amber-100 text-amber-800"}>{selectedReport.status === "assinado" ? "Assinado" : "Aguardando assinaturas"}</Badge></div></div>
          <div className="grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-semibold text-navy">Conferência</p><p className="mt-1 text-xs text-muted-foreground">{snapshot.counters.one} e {snapshot.counters.two}</p><p className="mt-2 text-xs text-muted-foreground">{snapshot.deposit ? `Depósito: ${formatBrl(Number(snapshot.deposit.amountCents ?? 0))}` : "Depósito ainda não registrado."}</p></div><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-semibold text-navy">Lançamentos vinculados</p><p className="mt-1 text-xs text-muted-foreground">{snapshot.transactions?.length ?? 0} lançamento(s) preservado(s) no snapshot.</p><p className="mt-2 text-xs text-muted-foreground">Emitido em {formatDatePtBr(selectedReport.issuedAt)}.</p></div></div>
          <section className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-navy">Assinatura interna auditável</p><p className="mt-1 text-xs text-muted-foreground">Cada papel assina uma única vez, vinculado ao usuário autenticado.</p></div><Badge variant="outline">{signedCount}/{REPORT_SIGNATURES.length}</Badge></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{REPORT_SIGNATURES.map(({ role, field, label }) => { const signedAt = selectedReport[field]; return <div key={role} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"><div className="min-w-0"><p className="truncate text-xs font-medium text-navy">{label}</p><p className="text-[11px] text-muted-foreground">{signedAt ? `Assinado em ${formatDatePtBr(signedAt)}` : "Pendente"}</p></div>{signedAt ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Button type="button" size="sm" className="h-8 shrink-0 bg-navy px-2.5 text-xs hover:bg-navy/90" disabled={signReport.isPending} onClick={() => signReport.mutate({ churchId, id: selectedReport.id, role })}>Assinar</Button>}</div>; })}</div></section>
        </AdaptiveFormDialogBody>
        <AdaptiveFormDialogFooter><Button type="button" variant="outline" onClick={() => void handleReportShare(selectedReport)}><Share2 className="mr-2 h-4 w-4" /> Compartilhar</Button><Button type="button" variant="outline" onClick={() => printReport(selectedReport)}><Printer className="mr-2 h-4 w-4" /> Imprimir / salvar PDF</Button><Button type="button" className="bg-navy hover:bg-navy/90" onClick={() => setReportDetailOpen(false)}>Fechar</Button></AdaptiveFormDialogFooter>
      </>; })()}
    </DialogContent></Dialog>
  </>;
}
