import { useChurch } from "@/components/ChurchLayout";
import { useChurchAuth } from "@/hooks/useChurchAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Circle, Heart, Phone, MessageCircle, MessageSquare, Home, BookOpen, Users, HandHeart, Church, Send, UserCheck } from "lucide-react";
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
  const registerReferralContact = trpc.consolidation.registerReferralContact.useMutation({
    onSuccess: () => {
      toast.success("Primeiro contato registrado no encaminhamento.");
      referralsQuery.refetch();
    },
    onError: (error: { message: string }) => toast.error(error.message),
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
                      {isAccepted && <Button size="sm" variant="outline" disabled={registerReferralContact.isPending} onClick={() => registerReferralContact.mutate({ churchId, id: referral.id })}><Phone className="mr-2 h-4 w-4" />Registrar contato</Button>}
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
