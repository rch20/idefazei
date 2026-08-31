import { TenantPublicShell } from "@/components/TenantPublicShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, ChevronDown, Clock3, HandHeart, MapPin, Maximize2, MessageCircle, Pin, UsersRound } from "lucide-react";
import { useTenantPwaMeta } from "@/hooks/useTenantPwaMeta";
import { TenantPublicFooter } from "@/components/TenantPublicFooter";
import { getPublicHeroEyebrow } from "../../../shared/publicPage";
import { resolveHeroImage } from "../../../shared/publicHero";
import { useState } from "react";

type PublicService = { day?: string; time?: string; label?: string; location?: string };
type PublicGalleryItem = { url?: string; alt?: string; caption?: string };
type AnnouncementDetails = { title: string; content: string; type?: string | null; publishedAt: Date | string };
const ANNOUNCEMENT_TYPE_LABELS: Record<string, string> = { aviso: "Aviso", evento: "Evento", comunicado: "Comunicado", devocional: "Devocional" };
const ANNOUNCEMENT_SUMMARY_CHAR_LIMIT = 110;

function shouldShowAnnouncementDetails(content: string) {
  const normalized = content.trim();
  return normalized.length > ANNOUNCEMENT_SUMMARY_CHAR_LIMIT || normalized.split(/\r?\n/).length > 2;
}
type SectionContent = { title?: string; subtitle?: string; body?: string; primaryCtaLabel?: string; primaryCtaHref?: string; heroImageSource?: "preset" | "custom"; heroImagePresetId?: string | null; heroImageUrl?: string | null; heroImageAssetId?: number | null; services?: PublicService[]; items?: PublicGalleryItem[] };

function findContent(sections: Array<{ sectionType: string; content: unknown }>, type: string): SectionContent | null {
  const section = sections.find((item) => item.sectionType === type);
  return section?.content && typeof section.content === "object" ? section.content as SectionContent : null;
}

export default function TenantPublicPage() {
  const { data, isLoading } = trpc.tenantPublic.current.useQuery();
  useTenantPwaMeta({ tenantSlug: data?.church.slug, tenantName: data?.church.name, primaryColor: data?.theme?.primaryColor ?? data?.church.primaryColor, pwaIconAssetId: data?.church.pwaIconAssetId, pwaIconVersion: data?.church.pwaIconVersion });
  const [expandedAnnouncementImage, setExpandedAnnouncementImage] = useState<{ title: string; imageUrl: string; imageAlt: string } | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementDetails | null>(null);

  if (isLoading) {
    return <div className="tenant-public-root tenant-public-loading" aria-live="polite">Carregando a igreja...</div>;
  }
  if (!data) {
    return <div className="tenant-public-root tenant-public-loading">Esta igreja não está disponível.</div>;
  }

  const hero = findContent(data.sections, "hero");
  const about = findContent(data.sections, "about");
  const schedule = findContent(data.sections, "schedule");
  const eventsSection = findContent(data.sections, "events");
  const ministriesSection = findContent(data.sections, "ministries");
  const gallerySection = findContent(data.sections, "gallery");
  const contact = findContent(data.sections, "contact");
  const title = hero?.title ?? `Bem-vindo à ${data.church.name}`;
  const subtitle = hero?.subtitle ?? data.church.mission ?? "Uma igreja comprometida com pessoas, fé e propósito.";
  const primaryHref = hero?.primaryCtaHref ?? "/visitante";
  const primaryLabel = hero?.primaryCtaLabel ?? "Quero conhecer a igreja";
  const publicServices = (schedule?.services ?? []).filter((service) => service.day && service.time);
  const publicGalleryItems = (gallerySection?.items ?? []).filter((item) => item.url && item.alt);
  const publicHeroEyebrow = getPublicHeroEyebrow(data.sections);
  const heroImage = resolveHeroImage(hero);

  return (
    <TenantPublicShell brand={{
      primaryColor: data.theme?.primaryColor ?? data.church.primaryColor,
      secondaryColor: data.theme?.secondaryColor ?? data.church.secondaryColor,
      accentColor: data.theme?.accentColor,
    }}>
      <header className="tenant-public-header">
        <div className="tenant-public-container tenant-public-header-inner">
          <a href="/" className="tenant-public-brand" aria-label={`Página inicial de ${data.church.name}`}>
            {data.theme?.logoUrl ?? data.church.logoUrl ? (
              <img className="tenant-public-logo" src={data.theme?.logoUrl ?? data.church.logoUrl ?? ""} alt={`Logo ${data.church.name}`} />
            ) : (
              <span className="tenant-public-mark" aria-hidden="true">✦</span>
            )}
            <span>{data.church.name}</span>
          </a>
          <a className="tenant-public-login" href="/login">Entrar</a>
        </div>
      </header>

      <main>
        <section className={`tenant-public-hero${heroImage.src ? " has-image" : ""}`}>
          {heroImage.src && <picture className="tenant-public-hero-media" aria-hidden="true">
            {heroImage.mobileSrc && heroImage.mobileSrc !== heroImage.src && <source media="(max-width: 44rem)" srcSet={heroImage.mobileSrc} />}
            <img className="tenant-public-hero-image" src={heroImage.src} alt="" />
          </picture>}
          {heroImage.src && <div className="tenant-public-hero-overlay" aria-hidden="true" />}
          <div className="tenant-public-container tenant-public-hero-content">
            <span className="tenant-public-eyebrow">{publicHeroEyebrow}</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <Button asChild className="tenant-public-cta">
              <a href={primaryHref}>{primaryLabel}<ArrowRight size={18} aria-hidden="true" /></a>
            </Button>
            {data.publicDevotional && <a className="tenant-public-devotional-cta" href="/devocional"><BookOpen size={18} aria-hidden="true" /><span><strong>Devocional diário</strong><small>Uma palavra para hoje</small></span><ArrowUpRight size={16} aria-hidden="true" /></a>}
          </div>
          <a className="tenant-public-scroll-cue" href="#tenant-public-content" aria-label="Continuar para conhecer mais sobre a igreja">
            <span>Descubra mais</span><ChevronDown size={16} aria-hidden="true" />
          </a>
        </section>

        {(about?.body ?? data.church.vision ?? data.church.mission) && (
          <section id="tenant-public-content" className="tenant-public-section">
            <div className="tenant-public-container tenant-public-prose">
              <span className="tenant-public-eyebrow">Sobre nós</span>
              <h2>{about?.title ?? "Uma igreja para caminhar junto"}</h2>
              <p>{about?.body ?? data.church.vision ?? data.church.mission}</p>
            </div>
          </section>
        )}

        {schedule && (schedule.body || publicServices.length > 0) && (
          <section className="tenant-public-section tenant-public-schedule-section">
            <div className="tenant-public-container">
              <div className="tenant-public-prose tenant-public-events-heading"><span className="tenant-public-eyebrow">Encontros</span><h2>{schedule.title ?? "Horários de culto"}</h2>{schedule.body && <p>{schedule.body}</p>}</div>
              {publicServices.length > 0 && <div className="tenant-public-services-grid">{publicServices.map((service, index) => <article className="tenant-public-service-card" key={`${service.day}-${service.time}-${index}`}><CalendarDays aria-hidden="true" /><div className="min-w-0"><span>{service.day}</span><h3>{service.label || "Encontro"}</h3><p><Clock3 aria-hidden="true" />{service.time}</p>{service.location && <p><MapPin aria-hidden="true" />{service.location}</p>}</div></article>)}</div>}
            </div>
          </section>
        )}

        {eventsSection && data.upcomingEvents.length > 0 && (
          <section className="tenant-public-section tenant-public-events-section">
            <div className="tenant-public-container">
              <div className="tenant-public-prose tenant-public-events-heading">
                <span className="tenant-public-eyebrow">Agenda da igreja</span>
                <h2>{eventsSection.title ?? "Próximos eventos"}</h2>
                {eventsSection.subtitle && <p>{eventsSection.subtitle}</p>}
              </div>
              <div className="tenant-public-events-grid">
                {data.upcomingEvents.map((event) => {
                  const startsAt = new Date(event.startDate);
                  const registrationHref = event.registrationMode !== "none" && event.registrationToken ? `/evento/inscricao/${event.registrationToken}` : null;
                  return <article key={event.id} className="tenant-public-event-card">
                    <div className="tenant-public-event-date"><strong>{startsAt.toLocaleDateString("pt-BR", { day: "2-digit" })}</strong><span>{startsAt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></div>
                    <div className="min-w-0"><span className="tenant-public-event-type">{event.type}</span><h3>{event.name}</h3>{event.description && <p>{event.description}</p>}<div className="tenant-public-event-meta"><span><Clock3 aria-hidden="true" />{startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>{event.location && <span><MapPin aria-hidden="true" />{event.location}</span>}</div>{registrationHref && <a href={registrationHref} className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#1e3a5f]/20 px-3 py-1.5 text-sm font-semibold text-[#1e3a5f] transition-colors hover:bg-[#1e3a5f]/5">Inscreva-se <ArrowRight aria-hidden="true" className="h-4 w-4" /></a>}</div>
                  </article>;
                })}
              </div>
            </div>
          </section>
        )}

        {data.publicAnnouncements.length > 0 && (
          <section className="tenant-public-section tenant-public-announcements-section">
            <div className="tenant-public-container">
              <div className="tenant-public-prose tenant-public-events-heading">
                <span className="tenant-public-eyebrow">Mural público</span>
                <h2>Avisos da igreja</h2>
                <p>Informações importantes para quem já caminha conosco e para quem está chegando.</p>
              </div>
              <div className="tenant-public-announcements-grid">
                {data.publicAnnouncements.map((announcement) => {
                  const isExternal = Boolean(announcement.ctaHref?.startsWith("http"));
                  const showDetailsAction = shouldShowAnnouncementDetails(announcement.content);
                  return (
                    <article key={announcement.id} className={`tenant-public-announcement-card${announcement.pinned ? " is-pinned" : ""}`}>
                      {announcement.imageUrl && (
                        <button
                          type="button"
                          className="tenant-public-announcement-image-trigger"
                          aria-label={`Ampliar imagem do aviso ${announcement.title}`}
                          onClick={() => setExpandedAnnouncementImage({ title: announcement.title, imageUrl: announcement.imageUrl!, imageAlt: `Imagem do aviso ${announcement.title}` })}
                        >
                          <img className="tenant-public-announcement-image" src={announcement.imageUrl} alt={`Imagem do aviso ${announcement.title}`} loading="lazy" decoding="async" />
                          <span className="tenant-public-announcement-image-hint" aria-hidden="true"><Maximize2 size={15} /><span>Ampliar</span></span>
                        </button>
                      )}
                      <div className="tenant-public-announcement-body">
                        <div className="tenant-public-announcement-meta">
                          <span>{ANNOUNCEMENT_TYPE_LABELS[announcement.type ?? "aviso"] ?? "Aviso"}</span>
                          {announcement.pinned && <span className="inline-flex items-center gap-1"><Pin size={12} aria-hidden="true" /> Destaque</span>}
                        </div>
                        <h3>{announcement.title}</h3>
                        <p className={showDetailsAction ? "tenant-public-announcement-summary" : undefined}>{announcement.content}</p>
                        {showDetailsAction && <button
                          type="button"
                          className="tenant-public-announcement-details-trigger"
                          aria-haspopup="dialog"
                          onClick={() => setSelectedAnnouncement({ title: announcement.title, content: announcement.content, type: announcement.type, publishedAt: announcement.publishedAt })}
                        >
                          Ver mais <ArrowRight size={15} aria-hidden="true" />
                        </button>}
                        <p className="text-xs">Publicado em {new Date(announcement.publishedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                        {announcement.ctaHref && announcement.ctaLabel && <a className="tenant-public-announcement-action" href={announcement.ctaHref} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noreferrer" : undefined}>{announcement.ctaLabel}<ArrowUpRight size={15} aria-hidden="true" /></a>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {ministriesSection && data.publicMinistries.length > 0 && (
          <section className="tenant-public-section tenant-public-ministries-section">
            <div className="tenant-public-container">
              <div className="tenant-public-prose tenant-public-events-heading">
                <span className="tenant-public-eyebrow">Servindo em comunidade</span>
                <h2>{ministriesSection.title ?? "Nossos ministérios"}</h2>
                {ministriesSection.subtitle && <p>{ministriesSection.subtitle}</p>}
              </div>
              <div className="tenant-public-ministries-grid">
                {data.publicMinistries.map((ministry) => (
                  <article key={ministry.id} className="tenant-public-ministry-card">
                    <UsersRound aria-hidden="true" />
                    <div className="min-w-0"><span>{ministry.type}</span><h3>{ministry.name}</h3>{ministry.description && <p>{ministry.description}</p>}</div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {gallerySection && publicGalleryItems.length > 0 && (
          <section className="tenant-public-section tenant-public-gallery-section">
            <div className="tenant-public-container">
              <div className="tenant-public-prose tenant-public-events-heading"><span className="tenant-public-eyebrow">Nossa comunidade</span><h2>{gallerySection.title ?? "Nossa comunidade"}</h2>{gallerySection.subtitle && <p>{gallerySection.subtitle}</p>}</div>
              <div className="tenant-public-gallery-grid">{publicGalleryItems.map((item, index) => <figure key={`${item.url}-${index}`} className="tenant-public-gallery-item"><img src={item.url} alt={item.alt ?? "Imagem da comunidade"} loading="lazy" decoding="async" />{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}</div>
            </div>
          </section>
        )}

        <section className="tenant-public-section tenant-public-contact-section">
          <div className="tenant-public-container tenant-public-contact-grid">
            {data.church.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.church.address)}`} className="tenant-public-contact-card"><MapPin aria-hidden="true" /><span><strong>Onde estamos</strong>{data.church.address}</span></a>}
            {data.church.whatsapp && <a href={`https://wa.me/${data.church.whatsapp.replace(/\D/g, "")}`} className="tenant-public-contact-card"><MessageCircle aria-hidden="true" /><span><strong>Fale conosco</strong>{contact?.subtitle ?? "Envie uma mensagem"}</span></a>}
            <a href="/visitante?tipo=pedido_oracao" className="tenant-public-contact-card"><HandHeart aria-hidden="true" /><span><strong>Pedido de oração</strong>Compartilhe seu pedido com nossa equipe.</span></a>
            <a href="/visite-nos" className="tenant-public-contact-card"><CalendarDays aria-hidden="true" /><span><strong>{contact?.title ?? "Visite-nos"}</strong>{contact?.subtitle ?? "Estamos prontos para receber você."}</span></a>
          </div>
        </section>
      </main>

      <Dialog open={Boolean(expandedAnnouncementImage)} onOpenChange={(open) => { if (!open) setExpandedAnnouncementImage(null); }}>
        <DialogContent className="tenant-public-image-dialog">
          <DialogHeader className="tenant-public-image-dialog-header">
            <DialogTitle>{expandedAnnouncementImage?.title ?? "Imagem do aviso"}</DialogTitle>
            <DialogDescription className="tenant-public-image-dialog-description">Visualização ampliada do aviso público.</DialogDescription>
          </DialogHeader>
          <div className="tenant-public-image-dialog-viewport">
            {expandedAnnouncementImage && <img className="tenant-public-image-expanded" src={expandedAnnouncementImage.imageUrl} alt={expandedAnnouncementImage.imageAlt} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedAnnouncement)} onOpenChange={(open) => { if (!open) setSelectedAnnouncement(null); }}>
        <DialogContent className="tenant-public-announcement-dialog">
          <DialogHeader className="tenant-public-announcement-dialog-header">
            <div className="tenant-public-announcement-dialog-meta">
              <span>{ANNOUNCEMENT_TYPE_LABELS[selectedAnnouncement?.type ?? "aviso"] ?? "Aviso"}</span>
              {selectedAnnouncement && <span>Publicado em {new Date(selectedAnnouncement.publishedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span>}
            </div>
            <DialogTitle>{selectedAnnouncement?.title ?? "Aviso da igreja"}</DialogTitle>
            <DialogDescription>Leitura completa do aviso publicado.</DialogDescription>
          </DialogHeader>
          <div className="tenant-public-announcement-dialog-body">
            <p className="tenant-public-announcement-full-content">{selectedAnnouncement?.content}</p>
          </div>
        </DialogContent>
      </Dialog>

      <TenantPublicFooter church={data.church} eyebrow={publicHeroEyebrow} />
    </TenantPublicShell>
  );
}
