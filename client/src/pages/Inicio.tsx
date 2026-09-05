import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { useChurchAuth } from "@/hooks/useChurchAuth";
import { formatDatePtBr, formatEventTimeRange, getCivilDateParts, getTodayCivilDateInput } from "@/lib/treasury";
import { ArrowRight, Bell, BookOpen, CalendarDays, CheckCircle2, ChevronRight, Clock3, Heart, MapPin, UsersRound } from "lucide-react";
import { Link } from "wouter";

type NextStep = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  icon: typeof UsersRound;
};

type HomeAccess = {
  actorRole?: string | null;
  roles?: readonly string[] | null;
  isExecutive?: boolean;
  isPastoralWorker?: boolean;
  isConsolidator?: boolean;
  isVisitador?: boolean;
  canManageCells?: boolean;
  canManageMinistry?: boolean;
  canAccessTreasury?: boolean;
};

function getNextStep(accessSummary: HomeAccess | null): NextStep {
  const roles = new Set(accessSummary?.roles ?? []);
  const actorRole = accessSummary?.actorRole;
  const isExecutive = Boolean(accessSummary?.isExecutive || roles.has("pastor_presidente") || roles.has("pastor_local") || roles.has("secretario"));
  const canManageCells = Boolean(accessSummary?.canManageCells || roles.has("lider") || roles.has("supervisor"));

  if (roles.has("consolidador") || roles.has("visitador") || accessSummary?.isConsolidator || accessSummary?.isVisitador) {
    return {
      eyebrow: "Cuidado em andamento",
      title: "Continuar consolidação",
      description: "Veja as pessoas e os próximos acompanhamentos sob sua responsabilidade.",
      href: "/app/consolidacao",
      icon: Heart,
    };
  }

  if ((actorRole === "lider" || actorRole === "supervisor" || roles.has("lider") || roles.has("supervisor")) && canManageCells) {
    return {
      eyebrow: "Sua responsabilidade",
      title: "Ver minhas células",
      description: "Acompanhe sua equipe, os encontros e os próximos cuidados.",
      href: "/app/celulas",
      icon: UsersRound,
    };
  }

  if (accessSummary?.canManageMinistry && !isExecutive) {
    return {
      eyebrow: "Sua responsabilidade",
      title: "Ver meu ministério",
      description: "Acesse sua equipe e acompanhe o trabalho do ministério.",
      href: "/app/ministerios",
      icon: UsersRound,
    };
  }

  if (accessSummary?.canAccessTreasury && actorRole === "tesoureiro") {
    return {
      eyebrow: "Sua responsabilidade",
      title: "Abrir tesouraria",
      description: "Continue os registros e acompanhamentos financeiros da igreja.",
      href: "/app/tesouraria",
      icon: CheckCircle2,
    };
  }

  if (accessSummary?.isPastoralWorker) {
    return {
      eyebrow: "Cuidado da igreja",
      title: "Ver pessoas que precisam de cuidado",
      description: "Acompanhe pendências e próximos passos de cuidado pastoral.",
      href: "/app/cuidado",
      icon: Heart,
    };
  }

  if (isExecutive) {
    return {
      eyebrow: "Acompanhamento da igreja",
      title: "Ver a visão geral",
      description: "Acompanhe os principais indicadores e movimentos da igreja.",
      href: "/app/dashboard",
      icon: CheckCircle2,
    };
  }

  return {
    eyebrow: "Sua caminhada",
    title: "Acessar minha área",
    description: "Acompanhe seu perfil, sua jornada, eventos, avisos e oração.",
    href: "/app/membro",
    icon: UsersRound,
  };
}

function getChurchInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "✦";
}

function getExcerpt(content: string, limit = 180) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit).trimEnd()}…` : normalized;
}

type HomeEvent = {
  name: string;
  startDate: Date | string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
};

type HomeAnnouncement = {
  title: string;
  content: string;
};

function getCivilEventTimestamp(event: HomeEvent) {
  const parts = getCivilDateParts(event.startDate);
  if (!parts) return null;
  const timeMatch = String(event.startTime ?? "").match(/^(\d{2}):(\d{2})$/);
  const hours = timeMatch ? Number(timeMatch[1]) : 23;
  const minutes = timeMatch ? Number(timeMatch[2]) : 59;
  return Date.UTC(parts.year, parts.month - 1, parts.day, hours, minutes);
}

export function getUpcomingEventsInOrder<T extends HomeEvent>(events: T[], todayInput = getTodayCivilDateInput()) {
  const todayParts = getCivilDateParts(todayInput);
  if (!todayParts) return [...events];
  const todayTimestamp = Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day);

  return events
    .map((event, index) => ({ event, index, timestamp: getCivilEventTimestamp(event) }))
    .filter((item): item is { event: T; index: number; timestamp: number } => item.timestamp !== null && item.timestamp >= todayTimestamp)
    .sort((left, right) => left.timestamp - right.timestamp || left.index - right.index)
    .map((item) => item.event);
}

function normalizeComparableText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isAnnouncementDuplicate(announcement: HomeAnnouncement, event: HomeEvent) {
  const announcementText = normalizeComparableText(announcement.title);
  const eventText = normalizeComparableText(event.name);
  if (!announcementText || !eventText) return false;
  if (announcementText.includes(eventText) || eventText.includes(announcementText)) return true;

  const eventWords = new Set(eventText.split(" ").filter((word) => word.length > 2));
  const matchingWords = announcementText.split(" ").filter((word) => eventWords.has(word));
  return matchingWords.length >= Math.max(2, Math.ceil(eventWords.size * 0.6));
}

function HomeEventCard({ event, featured }: { event: HomeEvent; featured: boolean }) {
  return (
    <article className={`card-sacred p-4 ${featured ? "border-gold/35 bg-white shadow-sm" : "bg-card/75"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${featured ? "bg-gold/10 text-gold" : "bg-navy/5 text-navy"}`}><CalendarDays className="h-5 w-5" aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gold">{featured ? "Próximo evento" : "Em seguida"}</p>
          <h3 className={`mt-1 ${featured ? "text-lg" : "text-base"} font-semibold text-navy`}>{event.name}</h3>
          <div className="mt-2 space-y-1">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{formatDatePtBr(event.startDate)}</p>
            {event.startTime && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{formatEventTimeRange(event.startTime, event.endTime)}</p>}
            {event.location && <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{event.location}</p>}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Inicio() {
  const { churchName, logoUrl, primaryColor, accessSummary } = useChurch();
  const { user } = useChurchAuth();
  const { data, isLoading, isError } = trpc.tenantPublic.current.useQuery(undefined, { staleTime: 60_000 });
  const effectiveAccess = accessSummary ?? { actorRole: user?.role, roles: user?.role ? [user.role] : [] };
  const nextStep = getNextStep(effectiveAccess);
  const NextStepIcon = nextStep.icon;
  const initials = getChurchInitials(churchName);
  const orderedEvents = getUpcomingEventsInOrder(data?.upcomingEvents ?? []);
  const nextEvent = orderedEvents[0];
  const followingEvents = orderedEvents.slice(1, 3);
  const firstAnnouncement = data?.publicAnnouncements?.[0];
  const announcement = firstAnnouncement && (!nextEvent || !isAnnouncementDuplicate(firstAnnouncement, nextEvent)) ? firstAnnouncement : null;

  if (isLoading) {
    return (
      <div className="space-y-5" aria-label="Carregando Início">
        <div className="h-44 animate-pulse rounded-3xl bg-navy/10" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-2">
      <section
        className="relative overflow-hidden rounded-3xl px-5 py-6 text-white shadow-sm sm:px-7 sm:py-8"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor} 78%, #0b1830) 100%)` }}
        aria-labelledby="inicio-welcome-title"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full border border-white/10" aria-hidden="true" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-sm font-semibold text-white">
            {logoUrl ? <img src={logoUrl} alt={`Logo ${churchName}`} className="h-full w-full object-contain p-1.5" /> : initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-[0.16em] text-white/65">{churchName}</p>
            <h1 id="inicio-welcome-title" className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Olá, {user?.name ?? "seja bem-vindo"}</h1>
            <p className="mt-2 max-w-lg text-sm text-white/75 sm:text-base">Bem-vindo à sua igreja. Que bom ter você aqui.</p>
          </div>
        </div>
      </section>

      {isError ? (
        <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          Não foi possível carregar os conteúdos da igreja agora. Sua área continua disponível pelo menu.
        </section>
      ) : (
        <>
          <section className="card-sacred p-5 sm:p-6" aria-labelledby="inicio-message-title">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold"><BookOpen className="h-5 w-5" aria-hidden="true" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Mensagem do dia</p>
                    <h2 id="inicio-message-title" className="mt-1 font-display text-xl font-semibold text-navy">{data?.publicDevotional?.title ?? "Uma palavra para o seu dia"}</h2>
                  </div>
                  {data?.publicDevotional && <Link href="/devocional" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-navy transition-colors hover:text-gold">Ler completo <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{data?.publicDevotional ? getExcerpt(data.publicDevotional.content) : "Acompanhe uma mensagem de fé e esperança publicada pela sua igreja."}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gold/20 bg-gold/5 p-5 sm:p-6" aria-labelledby="inicio-next-step-title">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 text-gold"><NextStepIcon className="h-5 w-5" aria-hidden="true" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Seu próximo passo</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold/75">{nextStep.eyebrow}</p>
                <h2 id="inicio-next-step-title" className="mt-1 font-display text-xl font-semibold text-navy">{nextStep.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{nextStep.description}</p>
              </div>
              <Link href={nextStep.href} aria-label={nextStep.title} className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-white transition-transform active:scale-[0.97]">
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section aria-labelledby="inicio-life-title">
            <div className="mb-3 flex items-end justify-between gap-3 px-1">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Vida da igreja</p>
                <h2 id="inicio-life-title" className="mt-1 font-display text-xl font-semibold text-navy">O que está acontecendo</h2>
              </div>
              <span className="text-xs text-muted-foreground">Atualizado pela igreja</span>
            </div>
            <div className="space-y-3">
              {nextEvent ? (
                <HomeEventCard event={nextEvent} featured />
              ) : (
                <article className="card-sacred p-4">
                  <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy"><CalendarDays className="h-5 w-5" aria-hidden="true" /></div><div><h3 className="font-semibold text-navy">Nenhum próximo evento</h3><p className="mt-1 text-sm text-muted-foreground">Quando houver uma programação publicada, ela aparecerá aqui.</p></div></div>
                </article>
              )}

              {followingEvents.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2" aria-label="Eventos seguintes">
                  {followingEvents.map((item) => <HomeEventCard key={`${item.name}-${String(item.startDate)}`} event={item} featured={false} />)}
                </div>
              )}

              {announcement && (
                <article className="card-sacred border-gold/15 bg-gold/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold"><Bell className="h-5 w-5" aria-hidden="true" /></div>
                    <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-gold">Aviso da igreja</p><h3 className="mt-1 truncate font-semibold text-navy">{announcement.title}</h3><p className="mt-2 text-sm leading-5 text-muted-foreground">{getExcerpt(announcement.content, 115)}</p></div>
                  </div>
                </article>
              )}

              {orderedEvents.length > 0 && <Link href="/app/eventos" className="inline-flex items-center gap-1 px-1 text-sm font-semibold text-navy transition-colors hover:text-gold">Ver todos os eventos <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
