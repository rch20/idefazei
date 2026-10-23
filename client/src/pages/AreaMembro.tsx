import { useState, type FormEvent } from "react";
import { useChurch } from "@/components/ChurchLayout";
import { trpc } from "@/lib/trpc";
import { createIdempotencyKey } from "@/lib/idempotency";
import { uploadOnlineContributionProof, validateOnlineContributionProof, type OnlineContributionProofUpload } from "@/lib/onlineContributionUpload";
import { parseBrlToCents } from "@/lib/treasury";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Heart, BookOpen, MapPin, Calendar, Bell, Star, Pencil,
  Phone, Mail, Home, Church, CheckCircle2, Clock, AlertCircle, CircleDollarSign, Copy, FileCheck2, Upload, Loader2,
  Droplets, ArrowLeft, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { DISCIPLESHIP_STAGE_LABELS } from "@/lib/discipleshipState";
import { DEFAULT_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE } from "../../../shared/onlineContribution";

const DISCIPLESHIP_STAGES = [
  "Nova Alma", "Consolidação", "Fundamentos",
  "Batismo", "Encontro com Deus", "Escola de Líderes", "Liderança", "Multiplicador"
];

const MEMBER_JOURNEY_STAGES = ["nova_alma", "consolidacao", "fundamentos", "batismo", "encontro_com_deus", "escola_de_lideres", "lideranca", "multiplicador"] as const;

const DAY_LABELS: Record<string, string> = { segunda: "segunda", terca: "terça", quarta: "quarta", quinta: "quinta", sexta: "sexta", sabado: "sábado", domingo: "domingo" };
const COURSE_STATUS_LABELS: Record<string, string> = { matriculado: "Matriculado", em_andamento: "Em andamento", concluido: "Concluído" };

export default function AreaMembro() {
  const { churchId, accessSummary } = useChurch();
  const [activeTab, setActiveTab] = useState("perfil");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ phone: "", whatsapp: "" });
  const [contributionOpen, setContributionOpen] = useState(false);
  const [contributionThankYouOpen, setContributionThankYouOpen] = useState(false);
  const [contributionThankYouMessage, setContributionThankYouMessage] = useState(DEFAULT_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE);
  const [contributionForm, setContributionForm] = useState({ type: "dizimo" as "dizimo" | "oferta" | "primicias", amount: "", paymentDate: new Date().toISOString().slice(0, 10) });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [contributionError, setContributionError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const personId = accessSummary?.actorPersonId ?? 0;
  const utils = trpc.useUtils();
  const hasLinkedPerson = Boolean(churchId && personId);
  const canSubmitOnlineContribution = hasLinkedPerson;
  const [showPreparation, setShowPreparation] = useState(false);
  const preparationQuery = trpc.batismo.myPreparation.useQuery({ churchId: churchId! }, { enabled: hasLinkedPerson });
  const preparation = preparationQuery.data;
  const completePreparation = trpc.batismo.completePreparation.useMutation({
    onSuccess: () => {
      toast.success("Preparação concluída! A liderança foi avisada.");
      utils.batismo.myPreparation.invalidate();
    },
    onError: (error) => toast.error(error.message || "Não foi possível concluir a preparação."),
  });

  const { data: member, isLoading: loadingPeople } = trpc.people.getById.useQuery(
    { churchId: churchId!, id: personId },
    { enabled: Boolean(churchId && personId) },
  );
  const { data: events, isLoading: loadingEvents } = trpc.events.list.useQuery({ churchId: churchId! }, { enabled: !!churchId });
  const { data: publicSite, isLoading: loadingAnnouncements } = trpc.tenantPublic.current.useQuery(undefined, { enabled: !!churchId, staleTime: 60_000 });
  const announcements = publicSite?.publicAnnouncements ?? [];
  const { data: prayers, isLoading: loadingPrayers } = trpc.prayer.mine.useQuery({ churchId: churchId! }, { enabled: !!churchId });
  const journeyQuery = trpc.people.myJourney.useQuery({ churchId: churchId! }, { enabled: hasLinkedPerson });
  const journey = journeyQuery.data;
  const confirmSchedule = trpc.schedules.confirmMine.useMutation({
    onSuccess: () => {
      void utils.people.myJourney.invalidate();
      void utils.schedules.list.invalidate();
      toast.success("Presença confirmada. Sua liderança já vê a confirmação.");
    },
    onError: (error) => toast.error(error.message),
  });
  const formationQuery = trpc.people.myFormation.useQuery({ churchId: churchId! }, { enabled: hasLinkedPerson });
  const pixQuery = trpc.treasury.pixForMember.useQuery({ churchId: churchId! }, { enabled: canSubmitOnlineContribution });
  const updateContact = trpc.people.updateMyContact.useMutation({
    onSuccess: () => {
      if (churchId && personId) void utils.people.getById.invalidate({ churchId, id: personId });
      setContactOpen(false);
      toast.success("Contato atualizado. O telefone já pode ser usado no login desta igreja.");
    },
    onError: (error) => toast.error(error.message),
  });

  const submitContribution = trpc.treasury.submitOnlineContribution.useMutation({
    onSuccess: async () => {
      setContributionOpen(false);
      setProofFile(null);
      setContributionError(null);
      setContributionForm({ type: "dizimo", amount: "", paymentDate: new Date().toISOString().slice(0, 10) });
      setIdempotencyKey(createIdempotencyKey());
      setContributionThankYouMessage(pixQuery.data?.thankYouMessage?.trim() || DEFAULT_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE);
      setContributionThankYouOpen(true);
    },
    onError: (error) => setContributionError(error.message),
  });

  const openContactEditor = () => {
    setContactForm({ phone: member?.phone ?? "", whatsapp: member?.whatsapp ?? "" });
    setContactOpen(true);
  };

  const openContributionForm = () => {
    setContributionError(null);
    setProofFile(null);
    setIdempotencyKey(createIdempotencyKey());
    setContributionOpen(true);
  };

  const handleProofSelection = (file: File | undefined) => {
    if (!file) return;
    try {
      validateOnlineContributionProof(file);
      setContributionError(null);
      setProofFile(file);
    } catch (error) {
      setProofFile(null);
      setContributionError(error instanceof Error ? error.message : "Não foi possível validar o comprovante.");
    }
  };

  const submitContributionForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!churchId) return;
    const amountCents = parseBrlToCents(contributionForm.amount);
    if (!amountCents || amountCents <= 0) return setContributionError("Informe um valor maior que zero.");
    if (!contributionForm.paymentDate) return setContributionError("Informe a data do pagamento.");
    if (!proofFile) return setContributionError("Anexe o comprovante do Pix antes de enviar.");

    setContributionError(null);
    setUploadingProof(true);
    try {
      const proof: OnlineContributionProofUpload = await uploadOnlineContributionProof(proofFile);
      submitContribution.mutate({
        churchId,
        type: contributionForm.type,
        informedAmountCents: amountCents,
        paymentDate: contributionForm.paymentDate,
        proofFileKey: proof.key,
        proofFileName: proof.fileName,
        proofMimeType: proof.mimeType,
        proofSizeBytes: proof.sizeBytes,
        proofSha256: proof.sha256,
        idempotencyKey,
      });
    } catch (error) {
      setContributionError(error instanceof Error ? error.message : "Não foi possível enviar o comprovante.");
    } finally {
      setUploadingProof(false);
    }
  };

  const isLegacyCellStage = member?.discipleshipStage === "celula";
  const currentStageIndex = isLegacyCellStage
    ? DISCIPLESHIP_STAGES.indexOf("Fundamentos")
    : member?.discipleshipStage
      ? DISCIPLESHIP_STAGES.indexOf(member.discipleshipStage)
      : 0;
  const currentStageLabel = isLegacyCellStage ? "Célula (registro anterior)" : member?.discipleshipStage;
  const memberNextStep = member
    ? !member.phone && !member.whatsapp
      ? {
          title: "Complete seu contato",
          description: "Telefone ou WhatsApp também podem ser usados para entrar nesta igreja.",
          actionLabel: "Editar contato",
          action: "contact" as const,
        }
      : !member.discipleshipStage
        ? {
            title: "Defina seu próximo passo",
            description: "Sua liderança poderá orientar a próxima etapa da sua jornada.",
            actionLabel: "Ver meu perfil",
            action: "profile" as const,
          }
        : {
            title: "Continue sua jornada",
            description: `Você está em ${currentStageLabel}. Acompanhe os próximos eventos e avisos da igreja.`,
            actionLabel: "Ver eventos",
            action: "events" as const,
          }
    : null;
  if (showPreparation && preparation) {
    const completed = preparation.completedAt ? new Date(preparation.completedAt) : null;
    const splitParagraphs = (text: string) => text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    return (
      <div className="space-y-5 pb-10">
        <button
          type="button"
          onClick={() => setShowPreparation(false)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e3a5f] transition-colors hover:text-[#06b6d4]"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="overflow-hidden rounded-3xl border border-[#06b6d4]/20 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] p-6 text-white shadow-sm">
          <div className="flex items-center gap-2 text-white/80">
            <Droplets className="h-5 w-5" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Preparação para o batismo</span>
          </div>
          <h1 className="mt-2 font-serif text-2xl font-bold leading-tight">{preparation.study.title}</h1>
          {preparation.study.summary && <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">{preparation.study.summary}</p>}
        </div>

        {preparation.study.content?.trim() && (
          <section className="rounded-2xl border border-[#06b6d4]/15 bg-[#06b6d4]/5 p-5">
            {splitParagraphs(preparation.study.content).map((p, i) => (
              <p key={i} className="whitespace-pre-line leading-7 text-[#1e3a5f]/85 [&:not(:first-child)]:mt-4">{p}</p>
            ))}
          </section>
        )}

        {preparation.blocks.map((block, index) => (
          <section key={block.id} className="rounded-2xl border border-[#06b6d4]/15 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#06b6d4] text-xs font-bold text-white">{index + 1}</span>
              <h2 className="font-serif text-lg font-bold text-[#1e3a5f]">{block.title}</h2>
            </div>
            {splitParagraphs(block.content).map((p, i) => (
              <p key={i} className="mt-3 whitespace-pre-line leading-7 text-[#1e3a5f]/85">{p}</p>
            ))}
            {block.reflectionPrompt?.trim() && (
              <div className="mt-4 rounded-xl bg-[#c9a84c]/10 p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c9a84c]">
                  <Sparkles className="h-3.5 w-3.5" /> Para refletir
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-[#1e3a5f]/80">{block.reflectionPrompt}</p>
              </div>
            )}
          </section>
        ))}

        <div className="rounded-2xl border border-[#06b6d4]/20 bg-white/70 p-5 text-center backdrop-blur-sm">
          {completed ? (
            <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-5 w-5" /> Preparação concluída em {completed.toLocaleDateString("pt-BR")}
            </p>
          ) : (
            <>
              <p className="text-sm text-[#1e3a5f]/70">Terminou de ler? Marque a preparação como concluída para avisar a liderança.</p>
              <Button
                type="button"
                className="mt-3 bg-[#06b6d4] text-white hover:bg-[#0891b2]"
                disabled={completePreparation.isPending}
                onClick={() => completePreparation.mutate({ churchId: churchId! })}
              >
                {completePreparation.isPending ? "Salvando..." : "Concluí a preparação"}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header do membro */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a4f7a] rounded-2xl p-6 text-white">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#c9a84c]/50 bg-[#c9a84c]/20">
            <User className="w-8 h-8 text-[#c9a84c]" />
          </div>
          <div className="min-w-0 flex-1">
            {loadingPeople ? (
              <Skeleton className="h-6 w-40 bg-white/20 mb-2" />
            ) : (
              <>
                <h1 className="break-words font-serif text-2xl font-bold">{member?.fullName ?? "Membro"}</h1>
                <p className="text-white/60 text-sm">{member?.email ?? "Sem email cadastrado"}</p>
              </>
            )}
          </div>
          {member?.discipleshipStage && (
            <Badge className="self-start border-[#c9a84c]/30 bg-[#c9a84c]/20 text-xs text-[#c9a84c] sm:self-auto">
              {currentStageLabel}
            </Badge>
          )}
        </div>

        {/* Progresso no funil */}
        {member?.discipleshipStage && (
          <div className="mt-5">
            <p className="text-white/50 text-xs mb-2 uppercase tracking-wider">Percurso de formação</p>
            <div className="flex gap-1">
              {DISCIPLESHIP_STAGES.map((stage, i) => (
                <div
                  key={stage}
                  title={stage}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    i <= currentStageIndex ? "bg-[#c9a84c]" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-white/30 text-[10px]">Nova Alma</span>
              <span className="text-[#c9a84c] text-[10px] font-medium">{member.discipleshipStage}</span>
              <span className="text-white/30 text-[10px]">Multiplicador</span>
            </div>
          </div>
        )}
      </div>

      {preparation && (
        <button
          type="button"
          onClick={() => setShowPreparation(true)}
          className="group flex w-full items-center gap-4 rounded-2xl border border-[#06b6d4]/30 bg-gradient-to-br from-[#06b6d4]/15 via-[#06b6d4]/5 to-transparent p-4 text-left shadow-sm backdrop-blur-sm transition-colors hover:border-[#06b6d4]/50 active:scale-[0.995]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#06b6d4]/20 text-[#06b6d4]">
            <Droplets className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[#1e3a5f]">Preparação para o batismo</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-[#1e3a5f]/65">
              {preparation.completedAt ? "Você concluiu a preparação. Toque para revisar o estudo." : "Faça o estudo de preparação antes do seu batismo."}
            </span>
          </span>
          {preparation.completedAt ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Concluída</span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#06b6d4]/15 px-2 py-0.5 text-[11px] font-medium text-[#06b6d4]">Pendente</span>
          )}
        </button>
      )}

      {memberNextStep && (
        <Card className="border-[#c9a84c]/25 bg-[#c9a84c]/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c9a84c]/15">
                <Star className="h-5 w-5 text-[#c9a84c]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1e3a5f]/45">Próximo passo</p>
                <p className="mt-1 font-semibold text-[#1e3a5f]">{memberNextStep.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#1e3a5f]/65">{memberNextStep.description}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full shrink-0 border-[#1e3a5f]/20 text-[#1e3a5f] sm:w-auto"
              onClick={() => {
                if (memberNextStep.action === "contact") openContactEditor();
                if (memberNextStep.action === "profile") setActiveTab("perfil");
                if (memberNextStep.action === "events") setActiveTab("eventos");
              }}
            >
              {memberNextStep.actionLabel}
            </Button>
          </CardContent>
        </Card>
      )}

      <section aria-label="Atalhos da minha caminhada" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Minhas células", hint: "Encontros e grupo", icon: MapPin, href: "/app/celulas" },
          { label: "Escola de Fundamentos", hint: "Meu curso", icon: BookOpen, href: "/app/escola-fundamentos" },
          { label: "Pedir oração", hint: "Enviar um pedido", icon: Heart, href: "/app/oracao" },
          { label: "Contribuir", hint: "Dízimo e ofertas", icon: CircleDollarSign, onClick: () => setActiveTab("contribuir") },
        ].map(({ label, hint, icon: Icon, href, onClick }) => {
          const content = (
            <>
              <Icon className="h-4 w-4 shrink-0 text-[#c9a84c]" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[#1e3a5f]">{label}</span>
                <span className="block truncate text-[11px] text-[#1e3a5f]/50">{hint}</span>
              </span>
            </>
          );
          const className = "flex items-center gap-2.5 rounded-xl border border-[#1e3a5f]/10 bg-white px-3 py-3 text-left transition-colors hover:bg-[#1e3a5f]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]/70";
          return href ? (
            <Link key={label} href={href} className={className}>{content}</Link>
          ) : (
            <button key={label} type="button" className={className} onClick={onClick}>{content}</button>
          );
        })}
      </section>

      {hasLinkedPerson && (
        <Card className="border-[#1e3a5f]/10" aria-label="Minha caminhada">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#1e3a5f] font-serif text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-[#c9a84c]" />
              Minha caminhada
            </CardTitle>
          </CardHeader>
          <CardContent>
            {journeyQuery.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : journeyQuery.isError || !journey ? (
              <p className="text-xs text-[#1e3a5f]/55">Não foi possível carregar sua célula, ministérios e cursos agora.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1e3a5f]/45">Célula</p>
                  {journey.cells.length === 0 ? (
                    <p className="mt-1 text-sm text-[#1e3a5f]/60">Você ainda não está em uma célula. Fale com sua liderança.</p>
                  ) : journey.cells.map((cell) => (
                    <div key={cell.id} className="mt-1">
                      <p className="text-sm font-semibold text-[#1e3a5f]">{cell.name}</p>
                      <p className="text-xs text-[#1e3a5f]/60">
                        {[cell.meetingDay ? DAY_LABELS[cell.meetingDay] : null, cell.meetingTime, cell.neighborhood].filter(Boolean).join(" · ") || "Horário a combinar"}
                      </p>
                      {cell.leaderName && <p className="text-xs text-[#1e3a5f]/60">Líder: {cell.leaderName}</p>}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1e3a5f]/45">Ministérios</p>
                  {journey.ministries.length === 0 ? (
                    <p className="mt-1 text-sm text-[#1e3a5f]/60">Você ainda não serve em um ministério.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {journey.ministries.map((ministry) => (
                        <li key={ministry.id} className="text-sm font-semibold text-[#1e3a5f]">{ministry.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1e3a5f]/45">Minhas escalas</p>
                  {journey.schedules.length === 0 ? (
                    <p className="mt-1 text-sm text-[#1e3a5f]/60">Nenhuma escala marcada para você.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {journey.schedules.map((item) => (
                        <li key={item.id} className="text-sm text-[#1e3a5f]">
                          <span className="font-semibold">{item.date.split("-").reverse().slice(0, 2).join("/")}{item.startTime ? ` às ${item.startTime}` : ""}</span>
                          <span className="block text-xs text-[#1e3a5f]/60">{item.ministryName}{item.role ? ` · ${item.role}` : ""}</span>
                          {item.confirmed ? (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" aria-hidden="true" />Presença confirmada</span>
                          ) : (
                            <Button type="button" size="sm" variant="outline" className="mt-1 h-7 px-2 text-xs" disabled={confirmSchedule.isPending} onClick={() => churchId && confirmSchedule.mutate({ churchId, id: item.id })}>
                              Confirmar presença
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1e3a5f]/45">Cursos</p>
                  {journey.courses.length === 0 ? (
                    <p className="mt-1 text-sm text-[#1e3a5f]/60">Nenhuma matrícula em curso.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {journey.courses.map((course) => (
                        <li key={course.id} className="text-sm text-[#1e3a5f]">
                          <span className="font-semibold">{course.name}</span>
                          <span className="text-xs text-[#1e3a5f]/60"> · {COURSE_STATUS_LABELS[course.status ?? "matriculado"]}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList aria-label="Navegação da Área do Membro" className="w-full justify-start overflow-x-auto rounded-xl border border-[#1e3a5f]/10 bg-white p-1">
          {[
            { id: "perfil", label: "Meu Perfil", icon: User },
            { id: "jornada", label: "Minha jornada", icon: Star },
            { id: "eventos", label: "Eventos", icon: Calendar },
            { id: "avisos", label: "Avisos", icon: Bell },
            { id: "oracao", label: "Oração", icon: Heart },
            { id: "contribuir", label: "Contribuir", icon: CircleDollarSign },
          ].map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="flex-none items-center gap-2 rounded-lg px-4 py-2 text-sm data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white"
            >
              <Icon className="w-4 h-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Perfil */}
        <TabsContent value="perfil" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-[#1e3a5f]/10">
            <CardHeader className="flex flex-col items-stretch justify-between gap-3 pb-3 sm:flex-row sm:items-center">
              <CardTitle className="text-[#1e3a5f] font-serif text-base flex items-center gap-2">
                <User className="w-4 h-4 text-[#c9a84c]" />
                Dados Pessoais
              </CardTitle>
              {member && personId > 0 && (
                <Button type="button" variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={openContactEditor}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Editar contato
                </Button>
              )}
            </CardHeader>
              <CardContent className="space-y-3">
                {loadingPeople ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)
                ) : member ? (
                  <>
                    {[
                      { icon: User, label: "Nome", value: member.fullName },
                      { icon: Mail, label: "E-mail", value: member.email ?? "—" },
                      { icon: Phone, label: "Telefone para login", value: member.phone ?? "—" },
                      { icon: Phone, label: "WhatsApp para login", value: member.whatsapp ?? "—" },
                      { icon: Home, label: "Bairro", value: member.neighborhood ?? "—" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/5 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-[#1e3a5f]/50" />
                        </div>
                        <div>
                          <p className="text-[10px] text-[#1e3a5f]/40 uppercase tracking-wider">{label}</p>
                          <p className="text-[#1e3a5f] text-sm font-medium">{value}</p>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-[#1e3a5f]/40 text-sm text-center py-4">Nenhum dado encontrado</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-[#1e3a5f]/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#1e3a5f] font-serif text-base flex items-center gap-2">
                  <Church className="w-4 h-4 text-[#c9a84c]" />
                  Dados Espirituais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingPeople ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)
                ) : member ? (
                  <>
                    {[
                      { icon: Star, label: "Etapa principal da Jornada", value: member.discipleshipStage ?? "Nova Alma" },
                      { icon: CheckCircle2, label: "Batizado", value: member.baptismDate ? `Sim — ${new Date(member.baptismDate).toLocaleDateString("pt-BR")}` : "Não" },
                      { icon: Heart, label: "Data de Conversão", value: member.conversionDate ? new Date(member.conversionDate).toLocaleDateString("pt-BR") : "—" },
                      { icon: MapPin, label: "Igreja Anterior", value: member.previousChurch ?? "—" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-[#c9a84c]" />
                        </div>
                        <div>
                          <p className="text-[10px] text-[#1e3a5f]/40 uppercase tracking-wider">{label}</p>
                          <p className="text-[#1e3a5f] text-sm font-medium">{value}</p>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-[#1e3a5f]/40 text-sm text-center py-4">Nenhum dado espiritual cadastrado</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Minha jornada */}
        <TabsContent value="jornada" className="mt-4">
          <Card className="border-[#1e3a5f]/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-[#1e3a5f] font-serif text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-[#c9a84c]" />
                Meu prontuário de formação
              </CardTitle>
              <p className="mt-1 text-xs text-[#1e3a5f]/55">Seu caminho na igreja: o que já foi concluído e o que vem a seguir. Os registros vêm dos cursos, do batismo e dos encontros dos quais você participou.</p>
            </CardHeader>
            <CardContent>
              {formationQuery.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : formationQuery.isError || !formationQuery.data ? (
                <p role="alert" className="text-xs text-rose-800">Não foi possível carregar sua jornada agora.</p>
              ) : (() => {
                const byStage = new Map(formationQuery.data.stages.map((item) => [item.stage, item] as const));
                const records = formationQuery.data.records;
                const rows = [
                  ...records.courses.map((item) => ({ key: `curso-${item.id}`, kind: "Curso", name: item.name, label: item.status === "concluido" ? "Concluído" : item.status === "em_andamento" ? "Em andamento" : "Matriculado", completedAt: item.completedAt })),
                  ...records.baptisms.map((item) => ({ key: `batismo-${item.id}`, kind: "Batismo", name: item.name, label: item.status === "concluiu" ? "Concluído" : item.status === "participou" ? "Participou" : item.status === "cancelado" ? "Cancelado" : "Inscrito", completedAt: item.completedAt })),
                  ...records.encounters.map((item) => ({ key: `encontro-${item.id}`, kind: "Encontro", name: item.name, label: item.status === "concluiu" ? "Concluído" : item.status === "participou" ? "Participou" : item.status === "confirmado" ? "Confirmado" : item.status === "cancelado" ? "Cancelado" : "Inscrito", completedAt: item.completedAt })),
                ];
                return (
                  <div className="space-y-5">
                    <ol className="space-y-2">
                      {MEMBER_JOURNEY_STAGES.map((stage) => {
                        const item = byStage.get(stage);
                        const done = item?.status === "concluida";
                        const next = item?.status === "pendente";
                        return (
                          <li key={stage} className="flex items-start gap-3 rounded-xl border border-[#1e3a5f]/10 p-3">
                            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-emerald-100 text-emerald-800" : next ? "bg-[#c9a84c]/20 text-[#1e3a5f]" : "bg-[#1e3a5f]/5 text-[#1e3a5f]/40"}`} aria-hidden="true">{done ? "✓" : MEMBER_JOURNEY_STAGES.indexOf(stage) + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#1e3a5f]">{DISCIPLESHIP_STAGE_LABELS[stage]}</p>
                              <p className="text-xs text-[#1e3a5f]/60">
                                {done
                                  ? `Concluída${item?.completedAt ? ` em ${new Date(item.completedAt).toLocaleDateString("pt-BR")}` : ""}${item?.origin ? ` · veio de ${item.origin}` : ""}`
                                  : next ? "Próxima etapa" : "Ainda não registrada"}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                    <div>
                      <h3 className="text-sm font-semibold text-[#1e3a5f]">Cursos e eventos</h3>
                      {rows.length === 0 ? (
                        <p className="mt-2 text-xs text-[#1e3a5f]/60">Você ainda não tem matrícula ou participação registrada.</p>
                      ) : (
                        <ul className="mt-2 divide-y divide-[#1e3a5f]/10">
                          {rows.map((row) => (
                            <li key={row.key} className="flex items-center justify-between gap-3 py-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[#1e3a5f]">{row.name}</p>
                                <p className="text-[11px] text-[#1e3a5f]/55">{row.kind}{row.completedAt ? ` · ${new Date(row.completedAt).toLocaleDateString("pt-BR")}` : ""}</p>
                              </div>
                              <Badge variant="outline" className="shrink-0 text-[10px]">{row.label}</Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contribuir */}
        <TabsContent value="contribuir" className="mt-4">
          <Card className="border-[#1e3a5f]/10">
              <CardHeader className="flex flex-col items-stretch justify-between gap-3 pb-3 sm:flex-row sm:items-start">
                <div>
                  <CardTitle className="text-[#1e3a5f] font-serif text-base flex items-center gap-2">
                    <CircleDollarSign className="w-4 h-4 text-[#c9a84c]" />
                    Contribuição on-line
                  </CardTitle>
                  <p className="mt-1 text-xs text-[#1e3a5f]/55">
                    Envie sua própria contribuição pelo Pix e acompanhe a conferência da Tesouraria.
                  </p>
                </div>
                <Button type="button" size="sm" className="w-full shrink-0 bg-[#1e3a5f] text-white hover:bg-[#162d4a] sm:w-auto" onClick={openContributionForm} disabled={!canSubmitOnlineContribution || !pixQuery.data || pixQuery.isLoading}>
                  <CircleDollarSign className="mr-1.5 h-3.5 w-3.5" />
                  Enviar contribuição
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {!personId ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Seu usuário precisa estar vinculado a uma Pessoa para enviar uma contribuição em seu próprio nome.</p>
                ) : pixQuery.isLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : pixQuery.isError ? (
                  <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">Não foi possível carregar a configuração de contribuição desta igreja.</p>
                ) : !pixQuery.data ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">A igreja ainda não configurou uma chave Pix para receber contribuições on-line.</p>
                ) : (
                  <div className="rounded-xl border border-[#c9a84c]/25 bg-[#c9a84c]/5 p-3 text-xs text-[#1e3a5f]/70">
                    <p><span className="font-semibold text-[#1e3a5f]">Pix configurado para:</span> {pixQuery.data.recipientName}{pixQuery.data.institutionName ? ` — ${pixQuery.data.institutionName}` : ""}</p>
                    <button type="button" className="mt-1 inline-flex items-center gap-1 font-medium text-[#1e3a5f] underline-offset-2 hover:underline" onClick={() => { void navigator.clipboard?.writeText(pixQuery.data?.pixKey ?? ""); toast.success("Chave Pix copiada."); }}>
                      <Copy className="h-3 w-3" /> Copiar chave Pix
                    </button>
                  </div>
                )}
              </CardContent>
          </Card>
        </TabsContent>

        {/* Eventos */}
        <TabsContent value="eventos" className="mt-4">
          <Card className="border-[#1e3a5f]/10">
            <CardHeader>
              <CardTitle className="text-[#1e3a5f] font-serif flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#c9a84c]" />
                Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEvents ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full mb-3" />)
              ) : events && events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((event: { id: number; name: string; description?: string | null; eventDate?: Date | null; location?: string | null; maxAttendees?: number | null }) => (
                    <div key={event.id} className="flex items-start gap-3 rounded-xl border border-[#1e3a5f]/10 p-3 transition-colors hover:bg-[#1e3a5f]/5 sm:items-center sm:gap-4 sm:p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e3a5f]/10 sm:h-12 sm:w-12">
                        <Calendar className="w-6 h-6 text-[#1e3a5f]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#1e3a5f] text-sm">{event.name}</h3>
                        {event.eventDate && (
                          <p className="text-[#1e3a5f]/50 text-xs mt-0.5">
                            {new Date(event.eventDate).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                          </p>
                        )}
                        {event.location && (
                          <p className="text-[#1e3a5f]/40 text-xs flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-10 h-10 text-[#1e3a5f]/20 mx-auto mb-3" />
                  <p className="text-[#1e3a5f]/40 text-sm">Nenhum evento programado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avisos */}
        <TabsContent value="avisos" className="mt-4">
          <Card className="border-[#1e3a5f]/10">
            <CardHeader>
              <CardTitle className="text-[#1e3a5f] font-serif flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#c9a84c]" />
                Mural de Avisos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAnnouncements ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full mb-3" />)
              ) : announcements && announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <div key={ann.id} className={`p-4 rounded-xl border ${ann.pinned ? "border-amber-200 bg-amber-50" : "border-[#1e3a5f]/10 bg-[#f5f0e8]/30"}`}>
                      <div className="flex items-start gap-3">
                        {ann.pinned ? (
                          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        ) : (
                          <Bell className="w-5 h-5 text-[#c9a84c] shrink-0 mt-0.5" />
                        )}
                        <div>
                          <h3 className="font-semibold text-[#1e3a5f] text-sm">{ann.title}</h3>
                          <p className="text-[#1e3a5f]/60 text-xs mt-1 leading-relaxed">{ann.content}</p>
                          <p className="text-[#1e3a5f]/30 text-[10px] mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(ann.publishedAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bell className="w-10 h-10 text-[#1e3a5f]/20 mx-auto mb-3" />
                  <p className="text-[#1e3a5f]/40 text-sm">Nenhum aviso publicado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Oração */}
        <TabsContent value="oracao" className="mt-4">
          <Card className="border-[#1e3a5f]/10">
            <CardHeader>
              <CardTitle className="text-[#1e3a5f] font-serif flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#c9a84c]" />
                Meus Pedidos de Oração
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPrayers ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full mb-3" />)
              ) : prayers && prayers.length > 0 ? (
                <div className="space-y-3">
                  {prayers.map((prayer: { id: number; content: string; type: string; answered: boolean | null; visitorName?: string | null; createdAt: Date }) => (
                    <div key={prayer.id} className="p-4 rounded-xl border border-[#1e3a5f]/10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#1e3a5f] text-sm">{prayer.type === "testemunho" ? "Testemunho" : "Pedido de Oração"}</h3>
                          <p className="text-[#1e3a5f]/50 text-xs mt-1 leading-relaxed">{prayer.content}</p>
                          <p className="text-[#1e3a5f]/30 text-[10px] mt-2">
                            {new Date(prayer.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <Badge className={`text-xs shrink-0 ${prayer.answered ? "bg-green-100 text-green-700" : "bg-[#c9a84c]/10 text-[#c9a84c]"}`}>
                          {prayer.answered ? "Respondida" : "Em oração"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="w-10 h-10 text-[#1e3a5f]/20 mx-auto mb-3" />
                  <p className="text-[#1e3a5f]/40 text-sm">Nenhum pedido de oração registrado</p>
                  <Button asChild size="sm" className="mt-4 bg-[#1e3a5f] hover:bg-[#162d4a] text-white">
                    <Link href="/app/oracao">Enviar pedido de oração</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={contributionOpen} onOpenChange={(open) => { if (!uploadingProof && !submitContribution.isPending) setContributionOpen(open); }}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1e3a5f]"><CircleDollarSign className="h-5 w-5 text-[#c9a84c]" /> Enviar contribuição</DialogTitle>
            <DialogDescription>
              Preencha os dados do Pix e anexe o comprovante. O envio ficará pendente até a conferência da Tesouraria.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitContributionForm} className="space-y-4">
            {contributionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{contributionError}</p>}
            {pixQuery.data && (
              <div className="rounded-xl border border-[#1e3a5f]/10 bg-[#f5f0e8]/40 p-3 text-sm text-[#1e3a5f]">
                <p className="font-semibold">Faça o Pix para {pixQuery.data.recipientName}</p>
                <p className="mt-1 break-all text-xs text-[#1e3a5f]/65">Chave: {pixQuery.data.pixKey}</p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="online-contribution-type">Tipo *</Label>
                <Select value={contributionForm.type} onValueChange={(value) => setContributionForm((current) => ({ ...current, type: value as "dizimo" | "oferta" | "primicias" }))}>
                  <SelectTrigger id="online-contribution-type" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dizimo">Dízimo</SelectItem>
                    <SelectItem value="oferta">Oferta</SelectItem>
                    <SelectItem value="primicias">Primícias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="online-contribution-amount">Valor *</Label>
                <Input id="online-contribution-amount" inputMode="decimal" placeholder="0,00" value={contributionForm.amount} onChange={(event) => setContributionForm((current) => ({ ...current, amount: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="online-contribution-date">Data do pagamento *</Label>
              <Input id="online-contribution-date" type="date" value={contributionForm.paymentDate} onChange={(event) => setContributionForm((current) => ({ ...current, paymentDate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="online-contribution-proof">Comprovante do Pix *</Label>
              <Input id="online-contribution-proof" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => handleProofSelection(event.target.files?.[0])} />
              <p className="text-xs text-[#1e3a5f]/50">PDF, PNG, JPEG ou WebP, até 8 MB. O arquivo ficará privado.</p>
              {proofFile && <p className="flex items-center gap-1 text-xs text-green-700"><FileCheck2 className="h-3.5 w-3.5" /> {proofFile.name}</p>}
            </div>
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              O valor informado será conferido pela Tesouraria. Ele só entrará no relatório financeiro após a aprovação.
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setContributionOpen(false)} disabled={uploadingProof || submitContribution.isPending}>Cancelar</Button>
              <Button type="submit" className="bg-[#1e3a5f] text-white hover:bg-[#162d4a]" disabled={uploadingProof || submitContribution.isPending || !pixQuery.data}>
                {uploadingProof || submitContribution.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : <><Upload className="mr-2 h-4 w-4" /> Enviar contribuição</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={contributionThankYouOpen} onOpenChange={setContributionThankYouOpen}>
        <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-md">
          <div className="bg-gradient-to-br from-[#1e3a5f] via-[#244b76] to-[#c9a84c] px-6 pb-8 pt-7 text-white">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <CheckCircle2 className="h-8 w-8 text-white" aria-hidden="true" />
            </div>
            <DialogTitle className="mt-5 text-2xl text-white">Obrigado por sua contribuição</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-white/80">Seu comprovante foi recebido com segurança e será conferido pela Tesouraria.</DialogDescription>
          </div>
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm leading-relaxed text-[#1e3a5f]">{contributionThankYouMessage}</p>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              A contribuição ficará como <strong>Recebida</strong> até a conferência. Ela só será registrada no relatório financeiro depois da aprovação.
            </div>
            <DialogFooter>
              <Button type="button" className="w-full bg-[#1e3a5f] text-white hover:bg-[#162d4a]" onClick={() => setContributionThankYouOpen(false)}>Concluir</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f]">Editar contato</DialogTitle>
            <DialogDescription>
              Cadastre ou corrija seu telefone. O número salvo em Telefone ou WhatsApp poderá ser usado para entrar nesta igreja junto com sua senha.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!churchId || !personId) return;
              updateContact.mutate({
                churchId,
                phone: contactForm.phone.trim() || null,
                whatsapp: contactForm.whatsapp.trim() || null,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="member-phone">Telefone</Label>
              <Input
                id="member-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
                placeholder="(00) 00000-0000"
                value={contactForm.phone}
                onChange={(event) => setContactForm((current) => ({ ...current, phone: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Este número será aceito como identificador de login.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-whatsapp">WhatsApp</Label>
              <Input
                id="member-whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
                placeholder="(00) 00000-0000"
                value={contactForm.whatsapp}
                onChange={(event) => setContactForm((current) => ({ ...current, whatsapp: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">O WhatsApp também pode ser usado no login. Deixe em branco se não quiser cadastrá-lo.</p>
            </div>
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              O e-mail continua sendo o mesmo. Para alterá-lo, procure a liderança da igreja.
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setContactOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={updateContact.isPending}>
                {updateContact.isPending ? "Salvando..." : "Salvar contato"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
