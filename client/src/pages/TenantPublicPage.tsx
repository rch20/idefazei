import { TenantPublicShell } from "@/components/TenantPublicShell";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CalendarDays, Clock3, MapPin, MessageCircle, UsersRound } from "lucide-react";

type PublicService = { day?: string; time?: string; label?: string; location?: string };
type SectionContent = { title?: string; subtitle?: string; body?: string; primaryCtaLabel?: string; primaryCtaHref?: string; services?: PublicService[] };

function findContent(sections: Array<{ sectionType: string; content: unknown }>, type: string): SectionContent | null {
  const section = sections.find((item) => item.sectionType === type);
  return section?.content && typeof section.content === "object" ? section.content as SectionContent : null;
}

export default function TenantPublicPage() {
  const { data, isLoading } = trpc.tenantPublic.current.useQuery();

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
  const contact = findContent(data.sections, "contact");
  const title = hero?.title ?? `Bem-vindo à ${data.church.name}`;
  const subtitle = hero?.subtitle ?? data.church.mission ?? "Uma igreja comprometida com pessoas, fé e propósito.";
  const primaryHref = hero?.primaryCtaHref ?? "/visitante";
  const primaryLabel = hero?.primaryCtaLabel ?? "Quero conhecer a igreja";
  const publicServices = (schedule?.services ?? []).filter((service) => service.day && service.time);

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
        <section className="tenant-public-hero">
          <div className="tenant-public-container tenant-public-hero-content">
            <span className="tenant-public-eyebrow">Comunidade de fé</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <Button asChild className="tenant-public-cta">
              <a href={primaryHref}>{primaryLabel}<ArrowRight size={18} aria-hidden="true" /></a>
            </Button>
          </div>
        </section>

        {(about?.body ?? data.church.vision ?? data.church.mission) && (
          <section className="tenant-public-section">
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
                  return <article key={event.id} className="tenant-public-event-card">
                    <div className="tenant-public-event-date"><strong>{startsAt.toLocaleDateString("pt-BR", { day: "2-digit" })}</strong><span>{startsAt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></div>
                    <div className="min-w-0"><span className="tenant-public-event-type">{event.type}</span><h3>{event.name}</h3>{event.description && <p>{event.description}</p>}<div className="tenant-public-event-meta"><span><Clock3 aria-hidden="true" />{startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>{event.location && <span><MapPin aria-hidden="true" />{event.location}</span>}</div></div>
                  </article>;
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

        <section className="tenant-public-section tenant-public-contact-section">
          <div className="tenant-public-container tenant-public-contact-grid">
            {data.church.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.church.address)}`} className="tenant-public-contact-card"><MapPin aria-hidden="true" /><span><strong>Onde estamos</strong>{data.church.address}</span></a>}
            {data.church.whatsapp && <a href={`https://wa.me/${data.church.whatsapp.replace(/\D/g, "")}`} className="tenant-public-contact-card"><MessageCircle aria-hidden="true" /><span><strong>Fale conosco</strong>{contact?.subtitle ?? "Envie uma mensagem"}</span></a>}
            <a href="/visitante" className="tenant-public-contact-card"><CalendarDays aria-hidden="true" /><span><strong>{contact?.title ?? "Visite-nos"}</strong>{contact?.subtitle ?? "Estamos prontos para receber você."}</span></a>
          </div>
        </section>
      </main>

      <footer className="tenant-public-footer"><div className="tenant-public-container">© {new Date().getFullYear()} {data.church.name}</div></footer>
    </TenantPublicShell>
  );
}
