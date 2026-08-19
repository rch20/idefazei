import { useChurch } from "@/components/ChurchLayout";
import { useChurchAuth } from "@/hooks/useChurchAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CalendarClock, CheckCircle2, Circle, ClipboardCheck, Heart, MapPinned, Phone, MessageCircle, MessageSquare, Home, BookOpen, Users, HandHeart, Church, Send, UserCheck } from "lucide-react";
import { ReportButton } from "@/components/ReportButton";
import { toast } from "sonner";

const CHECKLIST_ITEMS = [
  { key: "callMade", label: "Ligação realizada", icon: Phone },
  { key: "messageSent", label: "Mensagem enviada", icon: MessageSquare },
  { key: "visitMade", label: "Visita realizada", icon: Home },
  { key: "bibleDelivered", label: "Bíblia entregue", icon: BookOpen },
  { key: "whatsappGroupAdded", label: "Incluído no grupo WhatsApp", icon: Users },
  { key: "prayerMade", label: "Oração realizada", icon: HandHeart },
  { key: "addedToCell", label: "Inserido em célula", icon: Church },
] as const;

type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]["key"];

function getWhatsAppLink(contact: string, personName: string) {
  const number = contact.replace(/\D/g, "");
  const internationalNumber = number.length >= 10 && !number.startsWith("55") ? `55${number}` : number;
  const message = encodeURIComponent(`Olá, ${personName}. Tudo bem? Sou da equipe de cuidado da igreja e gostaria de conversar com você.`);
  return `https://wa.me/${internationalNumber}?text=${message}`;
}

const initialFollowUpForm = {
  contactChannel: "whatsapp" as const,
  outcome: "conversou" as const,
  notes: "",
  nextAction: "",
  nextActionAt: "",
  visitStatus: "nao_necessaria" as const,
};

export default function Consolidacao() {
  const { churchId } = useChurch();
  const { user } = useChurchAuth();
  const utils = trpc.useUtils();
  const { data: consolidations, isLoading, refetch } = trpc.consolidation.list.useQuery({ churchId });
  const { data: souls } = trpc.consolidation.souls.useQuery({ churchId });
  const referralsQuery = trpc.consolidation.referrals.useQuery({ churchId });
  const { data: cells = [] } = trpc.cells.list.useQuery({ churchId });
  const { data: effectiveRoles = [] } = trpc.churchAuth.effectiveRoles.useQuery(
    { churchId },
    { enabled: Boolean(churchId && user) }
  );
  const [selectedCellByConsolidation, setSelectedCellByConsolidation] = useState<Record<number, string>>({});
  const [closingReferralId, setClosingReferralId] = useState<number | null>(null);
  const [closeReferralNotes, setCloseReferralNotes] = useState("");
  const [trackingReferralId, setTrackingReferralId] = useState<number | null>(null);
  const [followUpForm, setFollowUpForm] = useState(initialFollowUpForm);
  const followUpsQuery = trpc.consolidation.followUps.useQuery(
    { churchId, referralId: trackingReferralId ?? 0 },
    { enabled: Boolean(trackingReferralId) }
  );
  const hasFullOverview = effectiveRoles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));

  const updateChecklist = trpc.consolidation.updateChecklist.useMutation({
    onSuccess: () => refetch(),
    onError: () => toast.error("Erro ao atualizar checklist"),
  });
  const integrateIntoCell = trpc.consolidation.integrateIntoCell.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Pessoa integrada à Célula e cuidado transferido ao líder.");
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const acceptReferral = trpc.consolidation.acceptReferral.useMutation({
    onSuccess: () => {
      toast.success("Encaminhamento assumido. A Pessoa agora está em sua carteira de cuidado.");
      referralsQuery.refetch();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const recordFollowUp = trpc.consolidation.recordFollowUp.useMutation({
    onSuccess: async () => {
      toast.success("Acompanhamento registrado no histórico do caso.");
      setFollowUpForm(initialFollowUpForm);
      await Promise.all([followUpsQuery.refetch(), referralsQuery.refetch()]);
    },
    onError: (error: { message: string }) => toast.error(error.message || "Não foi possível registrar o acompanhamento."),
  });
  const closeReferral = trpc.consolidation.closeReferral.useMutation({
    onSuccess: () => {
      toast.success("Encaminhamento encerrado com histórico preservado.");
      setClosingReferralId(null);
      setCloseReferralNotes("");
      referralsQuery.refetch();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const soulsMap = new Map((souls ?? []).map((s) => [s.id, s]));

  function toggleItem(consolidationId: number, key: ChecklistKey, current: boolean) {
    updateChecklist.mutate({
      id: consolidationId,
      churchId,
      [key]: !current,
    });
  }

  function getProgress(c: NonNullable<typeof consolidations>[0]) {
    const items = CHECKLIST_ITEMS.map((i) => (c as any)[i.key] as boolean);
    const done = items.filter(Boolean).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  }

  function openTracking(referralId: number) {
    setTrackingReferralId((current) => current === referralId ? null : referralId);
    setFollowUpForm(initialFollowUpForm);
  }

  function submitFollowUp(referralId: number) {
    if (followUpForm.notes.trim().length < 3) {
      toast.error("Descreva como foi o contato antes de salvar.");
      return;
    }
    recordFollowUp.mutate({
      churchId,
      referralId,
      contactChannel: followUpForm.contactChannel,
      outcome: followUpForm.outcome,
      notes: followUpForm.notes.trim(),
      nextAction: followUpForm.nextAction.trim() || undefined,
      nextActionAt: followUpForm.nextActionAt ? new Date(followUpForm.nextActionAt).toISOString() : undefined,
      visitStatus: followUpForm.visitStatus,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Consolidação</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasFullOverview ? "Acompanhe a consolidação das Novas Almas da igreja" : "Sua fila de Novas Almas sob responsabilidade de cuidado"}
          </p>
        </div>
        <ReportButton
          label="Exportar Relatório"
          onFetch={() => utils.reports.consolidation.fetch({ churchId })}
        />
      </div>

      <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100">
            <Send className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-navy">Encaminhamentos para Consolidação</h2>
            <p className="mt-1 text-xs text-muted-foreground">Pessoas enviadas pela liderança porque precisam de resgate e acompanhamento. Aceite um encaminhamento para iniciar o cuidado.</p>
          </div>
        </div>
        {(referralsQuery.data ?? []).length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-rose-200 bg-background/70 p-3 text-sm text-muted-foreground">Não há encaminhamentos de resgate na sua fila neste momento.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {(referralsQuery.data ?? []).map((referral) => {
              const isPending = referral.status === "pendente";
              const isAccepted = referral.status === "aceito";
              const isInFollowUp = referral.status === "em_acompanhamento";
              return (
                <article key={referral.id} className="rounded-xl border border-rose-100 bg-background p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-navy">{referral.personName}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${referral.status === "encerrado" ? "border-green-200 bg-green-50 text-green-700" : referral.status === "em_acompanhamento" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{referral.status === "pendente" ? "Aguardando aceite" : referral.status === "aceito" ? "Aceito" : referral.status === "em_acompanhamento" ? "Em acompanhamento" : "Encerrado"}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Encaminhado por {referral.referredByName} em {new Date(referral.referredAt).toLocaleDateString("pt-BR")}{referral.preferredConsolidatorName ? ` · Indicado para ${referral.preferredConsolidatorName}` : ""}</p>
                      <p className="mt-3 text-sm font-medium text-navy">Motivo: <span className="font-normal text-foreground">{referral.reason}</span></p>
                      {referral.notes && <p className="mt-1 text-sm text-muted-foreground">{referral.notes}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                      {isPending && <Button size="sm" className="bg-navy text-white hover:bg-navy-light" disabled={acceptReferral.isPending} onClick={() => acceptReferral.mutate({ churchId, id: referral.id })}><UserCheck className="mr-2 h-4 w-4" />Assumir cuidado</Button>}
                      {!isPending && referral.status !== "encerrado" && <Button size="sm" variant="outline" onClick={() => openTracking(referral.id)}><ClipboardCheck className="mr-2 h-4 w-4" />{trackingReferralId === referral.id ? "Fechar painel" : "Acompanhar caso"}</Button>}
                      {isInFollowUp && <Button size="sm" variant="outline" onClick={() => setClosingReferralId(referral.id)}>Encerrar cuidado</Button>}
                      {referral.acceptedByName && <p className="text-center text-[11px] text-muted-foreground">Responsável: {referral.acceptedByName}</p>}
                    </div>
                  </div>
                  {referral.contactNumber && (
                    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="flex items-center gap-2 text-sm text-green-800"><Phone className="h-4 w-4" />{referral.contactNumber}</p>
                      <a href={getWhatsAppLink(referral.contactNumber, referral.personName)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center rounded-md bg-[#25D366] px-3 text-sm font-medium text-white transition-colors hover:bg-[#1fb65a]">
                        <MessageCircle className="mr-2 h-4 w-4" />Conversar no WhatsApp
                      </a>
                    </div>
                  )}
                  {trackingReferralId === referral.id && (
                    <div className="mt-4 rounded-xl border border-navy/15 bg-navy/[0.025] p-4">
                      <div className="flex items-start gap-3">
                        <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-navy" />
                        <div>
                          <h3 className="font-semibold text-navy">Acompanhamento do caso</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">Registre como foi o contato, programe a próxima ação e sinalize se há necessidade de visita.</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label>Canal do contato</Label>
                          <Select value={followUpForm.contactChannel} onValueChange={(value) => setFollowUpForm((current) => ({ ...current, contactChannel: value as typeof current.contactChannel }))}>
                            <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="ligacao">Ligação</SelectItem><SelectItem value="mensagem">Mensagem</SelectItem><SelectItem value="visita">Visita</SelectItem><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Resultado</Label>
                          <Select value={followUpForm.outcome} onValueChange={(value) => setFollowUpForm((current) => ({ ...current, outcome: value as typeof current.outcome }))}>
                            <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="conversou">Conversou</SelectItem><SelectItem value="sem_resposta">Sem resposta</SelectItem><SelectItem value="retornar">Precisa retornar</SelectItem><SelectItem value="agendou_visita">Visita agendada</SelectItem><SelectItem value="visitou">Visita realizada</SelectItem><SelectItem value="recusou_contato">Recusou contato</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Label htmlFor={`followup-notes-${referral.id}`}>Como foi o contato? *</Label>
                        <Textarea id={`followup-notes-${referral.id}`} rows={3} className="mt-1 bg-background" value={followUpForm.notes} onChange={(event) => setFollowUpForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Ex.: conversou, relatou dificuldade e aceitou receber uma visita esta semana." />
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor={`next-action-${referral.id}`}>Próxima ação</Label>
                          <Input id={`next-action-${referral.id}`} className="mt-1 bg-background" value={followUpForm.nextAction} onChange={(event) => setFollowUpForm((current) => ({ ...current, nextAction: event.target.value }))} placeholder="Ex.: ligar novamente" />
                        </div>
                        <div>
                          <Label htmlFor={`next-action-at-${referral.id}`}>Data de retorno</Label>
                          <Input id={`next-action-at-${referral.id}`} className="mt-1 bg-background" type="datetime-local" value={followUpForm.nextActionAt} onChange={(event) => setFollowUpForm((current) => ({ ...current, nextActionAt: event.target.value }))} />
                        </div>
                      </div>
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                        <Label className="flex items-center gap-2 text-amber-900"><MapPinned className="h-4 w-4" />Necessidade de visita</Label>
                        <Select value={followUpForm.visitStatus} onValueChange={(value) => setFollowUpForm((current) => ({ ...current, visitStatus: value as typeof current.visitStatus }))}>
                          <SelectTrigger className="mt-2 bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="nao_necessaria">Não é necessária</SelectItem><SelectItem value="solicitada">Solicitar visita</SelectItem><SelectItem value="agendada">Visita agendada</SelectItem><SelectItem value="realizada">Visita realizada</SelectItem><SelectItem value="cancelada">Visita cancelada</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="mt-3 flex justify-end"><Button type="button" className="bg-navy text-white hover:bg-navy-light" disabled={recordFollowUp.isPending || followUpForm.notes.trim().length < 3} onClick={() => submitFollowUp(referral.id)}>{recordFollowUp.isPending ? "Salvando…" : "Salvar acompanhamento"}</Button></div>

                      <div className="mt-5 border-t border-navy/10 pt-4">
                        <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-gold" /><h4 className="text-sm font-semibold text-navy">Linha do tempo do caso</h4></div>
                        {followUpsQuery.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Carregando histórico…</p> : (followUpsQuery.data ?? []).length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-border bg-background/60 p-3 text-sm text-muted-foreground">Ainda não há contatos registrados neste caso.</p> : <div className="mt-3 space-y-3">{(followUpsQuery.data ?? []).map((followUp) => (
                          <div key={followUp.id} className="rounded-lg border border-border bg-background p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-navy">{followUp.outcome.replace(/_/g, " ")} · {followUp.contactChannel}</p><span className="text-[11px] text-muted-foreground">{new Date(followUp.createdAt).toLocaleString("pt-BR")}</span></div>
                            <p className="mt-2 text-sm text-foreground">{followUp.notes}</p>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>Por {followUp.recordedByName}</span>{followUp.nextAction && <span>Próxima ação: {followUp.nextAction}{followUp.nextActionAt ? ` · ${new Date(followUp.nextActionAt).toLocaleString("pt-BR")}` : ""}</span>}{followUp.visitStatus !== "nao_necessaria" && <span className="font-medium text-amber-800">Visita: {followUp.visitStatus.replace(/_/g, " ")}</span>}</div>
                          </div>
                        ))}</div>}
                      </div>
                    </div>
                  )}
                  {closingReferralId === referral.id && (
                    <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                      <label htmlFor={`close-referral-${referral.id}`} className="text-xs font-medium text-navy">Resultado do acompanhamento *</label>
                      <Textarea id={`close-referral-${referral.id}`} className="mt-2 bg-background" rows={2} value={closeReferralNotes} onChange={(event) => setCloseReferralNotes(event.target.value)} placeholder="Ex.: contato retomado e Pessoa voltará à próxima Célula." />
                      <div className="mt-2 flex justify-end gap-2">
                        <Button size="sm" type="button" variant="ghost" onClick={() => { setClosingReferralId(null); setCloseReferralNotes(""); }}>Cancelar</Button>
                        <Button size="sm" type="button" className="bg-green-600 text-white hover:bg-green-700" disabled={closeReferral.isPending || closeReferralNotes.trim().length < 3} onClick={() => closeReferral.mutate({ churchId, id: referral.id, closeNotes: closeReferralNotes.trim() })}>Confirmar encerramento</Button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (consolidations ?? []).length === 0 ? (
        <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center">
            <Heart className="w-7 h-7 text-rose-500" />
          </div>
          <p className="font-semibold text-navy">Nenhuma consolidação em andamento</p>
          <p className="text-sm text-muted-foreground">
            {hasFullOverview ? "Atribua consolidadores às Novas Almas para começar" : "Quando uma Nova Alma for atribuída a você, ela aparecerá nesta fila."}
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-stagger">
          {(consolidations ?? []).map((c) => {
            const soul = soulsMap.get(c.soulId);
            const { done, total, pct } = getProgress(c);
            const isComplete = c.status === "consolidado";

            return (
              <div key={c.id} className={`card-sacred p-5 ${isComplete ? "opacity-75" : ""}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy">{soul?.name ?? "Alma"}</p>
                      <p className="text-xs text-muted-foreground">
                        {soul?.phone ?? "Sem telefone"} · {soul?.origin}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasFullOverview && (
                      <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-navy/5 text-navy border-navy/15">
                        Sua responsabilidade
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        isComplete
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {isComplete ? "Consolidado" : "Em Consolidação"}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-semibold text-navy">
                      {done}/{total} etapas
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: pct === 100 ? "#22c55e" : "#c9a84c",
                      }}
                    />
                  </div>
                </div>

                {/* Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CHECKLIST_ITEMS.map((item) => {
                    const checked = (c as any)[item.key] as boolean;
                    if (item.key === "addedToCell" && !checked && !isComplete) {
                      const selectedCellId = selectedCellByConsolidation[c.id] ?? "";
                      return (
                        <div key={item.key} className="rounded-lg border border-gold/40 bg-gold/5 p-2.5 sm:col-span-2">
                          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-navy">
                            <Church className="h-4 w-4 text-gold" />
                            Integrar em Célula
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <label className="sr-only" htmlFor={`cell-${c.id}`}>Selecione a Célula para {soul?.name ?? "esta pessoa"}</label>
                            <select
                              id={`cell-${c.id}`}
                              value={selectedCellId}
                              onChange={(event) => setSelectedCellByConsolidation((current) => ({ ...current, [c.id]: event.target.value }))}
                              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                            >
                              <option value="">Selecione uma Célula ativa</option>
                              {cells.map((cell) => <option key={cell.id} value={cell.id}>{cell.name}</option>)}
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-navy text-white hover:bg-navy-light"
                              disabled={!selectedCellId || integrateIntoCell.isPending}
                              onClick={() => integrateIntoCell.mutate({ churchId, consolidationId: c.id, cellId: Number(selectedCellId) })}
                            >
                              {integrateIntoCell.isPending ? "Integrando…" : "Integrar"}
                            </Button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={item.key}
                        onClick={() => !isComplete && toggleItem(c.id, item.key, checked)}
                        disabled={isComplete}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                          checked
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-cream-dark border-border text-muted-foreground hover:border-gold/40"
                        } ${isComplete ? "cursor-default" : "cursor-pointer"}`}
                      >
                        {checked ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 flex-shrink-0" />
                        )}
                        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Mark complete */}
                {!isComplete && done === total && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button
                      onClick={() =>
                        updateChecklist.mutate({
                          id: c.id,
                          churchId,
                          status: "consolidado",
                        })
                      }
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      Marcar como Consolidado ✓
                    </Button>
                  </div>
                )}

                {/* Notes */}
                {c.notes && (
                  <p className="mt-3 text-xs text-muted-foreground bg-muted rounded-lg p-2">
                    {c.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
