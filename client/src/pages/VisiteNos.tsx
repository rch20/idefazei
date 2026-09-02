import { OpenStreetMap } from "@/components/OpenStreetMap";
import { TenantPublicShell } from "@/components/TenantPublicShell";
import { Button } from "@/components/ui/button";
import { distanceInKilometers, type Coordinates } from "@/lib/geo";
import { trpc } from "@/lib/trpc";
import { getWhatsAppLinkWithMessage } from "@/lib/whatsapp";
import { ArrowLeft, CalendarDays, Clock3, LocateFixed, MapPin, MessageCircle, Navigation, ShieldCheck, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useTenantPwaMeta } from "@/hooks/useTenantPwaMeta";
import { TenantPublicFooter } from "@/components/TenantPublicFooter";
import { getPublicHeroEyebrow } from "../../../shared/publicPage";

type PublicService = { day?: string; time?: string; label?: string; location?: string };
type SectionContent = { title?: string; body?: string; services?: PublicService[] };
type PublicCell = {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  latitude: number;
  longitude: number;
  locationMode: "approximate" | "exact";
  address: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  zipCode: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  leaderName: string;
  leaderWhatsapp: string | null;
};

const DAY_LABELS: Record<string, string> = {
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
  domingo: "Domingo",
};

function findContent(sections: Array<{ sectionType: string; content: unknown }>, type: string): SectionContent | null {
  const section = sections.find((item) => item.sectionType === type);
  return section?.content && typeof section.content === "object" ? section.content as SectionContent : null;
}

function locationLabel(cell: PublicCell) {
  if (cell.address) return [cell.address, cell.city, cell.state].filter(Boolean).join(", ");
  return [cell.neighborhood, cell.city, cell.state].filter(Boolean).join(" · ") || "Região informada no mapa";
}

function cellMessageName(name: string) {
  const cleanName = name.trim().replace(/^célula\s+/i, "").trim();
  return cleanName ? `Célula ${cleanName}` : "Célula";
}

function mapsDestination(cell: PublicCell) {
  const address = cell.address?.trim() ?? "";
  const complement = cell.addressComplement?.trim() ?? "";
  const escapedComplement = complement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const addressWithoutComplement = escapedComplement
    ? address.replace(new RegExp(`(?:,\s*)?${escapedComplement}`, "ig"), "").replace(/,\s*$/, "").trim()
    : address;
  const hasNumber = /(?:^|\s|,)(?:n[ºo°.]?\s*)?\d+[a-z]?\b/i.test(addressWithoutComplement);
  const street = [addressWithoutComplement, hasNumber ? null : cell.addressNumber?.trim()].filter(Boolean).join(", ");
  const digits = cell.zipCode?.replace(/\D/g, "") ?? "";
  const postalCode = digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
  return [street, postalCode].filter(Boolean).join(", ") || `${cell.latitude},${cell.longitude}`;
}

function mapsSearchLink(cell: PublicCell) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsDestination(cell))}`;
}

function mapsDirectionsLink(cell: PublicCell) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsDestination(cell))}&travelmode=driving`;
}

function meetingLabel(cell: PublicCell) {
  const day = cell.meetingDay ? DAY_LABELS[cell.meetingDay] ?? cell.meetingDay : null;
  if (day && cell.meetingTime) return `${day}, às ${cell.meetingTime}`;
  return day || cell.meetingTime || "Horário a confirmar com o líder";
}

export default function VisiteNos() {
  const { data, isLoading } = trpc.tenantPublic.current.useQuery();
  useTenantPwaMeta({ tenantSlug: data?.church.slug, tenantName: data?.church.name, primaryColor: data?.theme?.primaryColor ?? data?.church.primaryColor, pwaIconAssetId: data?.church.pwaIconAssetId, pwaIconVersion: data?.church.pwaIconVersion });
  const [selectedCellId, setSelectedCellId] = useState<number | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [visitorLocation, setVisitorLocation] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState("");
  const [locating, setLocating] = useState(false);

  const cells = (data?.publicCells ?? []) as PublicCell[];
  const cellsWithDistance = useMemo(() => {
    return cells
      .map((cell) => ({
        ...cell,
        distanceKm: visitorLocation
          ? distanceInKilometers(visitorLocation, { latitude: cell.latitude, longitude: cell.longitude })
          : null,
      }))
      .sort((left, right) => {
        if (left.distanceKm === null || right.distanceKm === null) return left.name.localeCompare(right.name, "pt-BR");
        return left.distanceKm - right.distanceKm;
      });
  }, [cells, visitorLocation]);

  if (isLoading) return <div className="tenant-public-root tenant-public-loading" aria-live="polite">Carregando informações da igreja...</div>;
  if (!data) return <div className="tenant-public-root tenant-public-loading">Esta igreja não está disponível.</div>;

  const schedule = findContent(data.sections, "schedule");
  const services = (schedule?.services ?? []).filter((service) => service.day && service.time);
  const selectedCell = cellsWithDistance.find((cell) => cell.id === selectedCellId) ?? cellsWithDistance[0] ?? null;
  const publicHeroEyebrow = getPublicHeroEyebrow(data.sections);
  const showMapToggle = cellsWithDistance.length > 1;
  const churchDestination = [data.church.address, data.church.city, data.church.state].filter(Boolean).join(", ");
  const churchDirections = churchDestination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(churchDestination)}`
    : null;
  const markers = cellsWithDistance.map((cell) => ({ id: cell.id, title: cell.name, latitude: cell.latitude, longitude: cell.longitude }));

  function locateVisitor() {
    if (!navigator.geolocation) {
      setLocationError("Seu navegador não oferece localização. Você ainda pode escolher uma Célula na lista.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setVisitorLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError("Não foi possível acessar sua localização. Verifique a permissão do navegador ou escolha pela lista.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <TenantPublicShell brand={{
      primaryColor: data.theme?.primaryColor ?? data.church.primaryColor,
      secondaryColor: data.theme?.secondaryColor ?? data.church.secondaryColor,
      accentColor: data.theme?.accentColor,
    }}>
      <header className="tenant-public-header">
        <div className="tenant-public-container tenant-public-header-inner">
          <a href="/" className="tenant-public-brand" aria-label={`Página inicial de ${data.church.name}`}>
            {data.theme?.logoUrl ?? data.church.logoUrl ? <img className="tenant-public-logo" src={data.theme?.logoUrl ?? data.church.logoUrl ?? ""} alt={`Logo ${data.church.name}`} /> : <span className="tenant-public-mark" aria-hidden="true">✦</span>}
            <span>{data.church.name}</span>
          </a>
          <a className="tenant-public-login" href="/login">Entrar</a>
        </div>
      </header>

      <main>
        <section className="border-b border-black/5 bg-[color-mix(in_srgb,var(--tenant-primary)_96%,black)] py-16 text-white sm:py-24">
          <div className="tenant-public-container">
            <a href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/75 hover:text-white"><ArrowLeft className="h-4 w-4" />Voltar para a página inicial</a>
            <span className="tenant-public-eyebrow block">Venha nos conhecer</span>
            <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-6xl">Visite-nos e encontre uma comunidade para caminhar junto.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">Consulte nossos horários, trace uma rota até a igreja ou encontre uma Célula autorizada perto de você.</p>
          </div>
        </section>

        <section className="tenant-public-section">
          <div className="tenant-public-container grid gap-8 lg:grid-cols-[1.25fr_.75fr]">
            <div>
              <span className="tenant-public-eyebrow">Nossos encontros</span>
              <h2 className="font-display text-3xl font-bold text-[var(--tenant-primary)] sm:text-4xl">{schedule?.title ?? "Dias e horários de culto"}</h2>
              {schedule?.body && <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">{schedule.body}</p>}
              {services.length > 0 ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {services.map((service, index) => (
                    <article key={`${service.day}-${service.time}-${index}`} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                      <div className="flex gap-3"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[var(--tenant-secondary)]" /><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--tenant-secondary)]">{service.day}</p><h3 className="mt-1 text-lg font-semibold text-[var(--tenant-primary)]">{service.label || "Culto"}</h3><p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Clock3 className="h-4 w-4" />{service.time}</p>{service.location && <p className="mt-1 flex items-start gap-2 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{service.location}</p>}</div></div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-600">Os horários ainda não foram publicados pelo Pastor desta igreja.</div>
              )}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white/85 p-6 shadow-sm">
              <MapPin className="h-6 w-6 text-[var(--tenant-secondary)]" />
              <h2 className="mt-4 font-display text-2xl font-bold text-[var(--tenant-primary)]">Onde estamos</h2>
              <p className="mt-3 leading-relaxed text-slate-600">{churchDestination || "O endereço da igreja ainda será publicado."}</p>
              {churchDirections && <Button asChild className="mt-5 w-full bg-[var(--tenant-primary)] text-white hover:opacity-90"><a href={churchDirections} target="_blank" rel="noreferrer"><Navigation className="mr-2 h-4 w-4" />Como chegar</a></Button>}
            </aside>
          </div>
        </section>

        <section id="tenant-public-cells" className="tenant-public-section bg-white/45">
          <div className="tenant-public-container">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="tenant-public-eyebrow">Comunidade perto de você</span>
                <h2 className="font-display text-3xl font-bold text-[var(--tenant-primary)] sm:text-4xl">Encontre uma Célula</h2>
                <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">Somente Células autorizadas pelo Pastor aparecem aqui. Sua localização é usada apenas neste navegador para ordenar a lista.</p>
              </div>
              <Button type="button" variant="outline" onClick={locateVisitor} disabled={locating || cells.length === 0} className="shrink-0"><LocateFixed className="mr-2 h-4 w-4" />{locating ? "Localizando…" : visitorLocation ? "Ordenadas por proximidade" : "Usar minha localização"}</Button>
            </div>
            {locationError && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">{locationError}</p>}

            {cellsWithDistance.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                <UsersRound className="mx-auto h-8 w-8 text-slate-400" /><h3 className="mt-3 text-lg font-semibold text-[var(--tenant-primary)]">Nenhuma Célula pública no momento</h3><p className="mt-2 text-sm text-slate-600">O Pastor poderá publicar locais autorizados pelo painel administrativo.</p>
              </div>
            ) : (
              <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
                {showMapToggle && <div className="lg:col-span-2 lg:hidden"><Button type="button" variant="outline" className="w-full" onClick={() => setIsMapOpen((open) => !open)} aria-expanded={isMapOpen} aria-controls="tenant-public-cells-map"><MapPin className="mr-2 h-4 w-4" />{isMapOpen ? "Ocultar mapa" : "Ver mapa das Células"}</Button></div>}
                <div id="tenant-public-cells-map" className={`${showMapToggle ? (isMapOpen ? "block" : "hidden") : "hidden"} lg:block lg:col-start-1 lg:row-start-1`}>
                  <OpenStreetMap className="h-[min(60vh,480px)] min-h-[280px]" markers={markers} selectedId={selectedCell?.id ?? null} onSelect={setSelectedCellId} ariaLabel="Mapa público das células autorizadas" />
                </div>
                <div className="space-y-3 lg:col-start-2 lg:row-start-1">
                  {cellsWithDistance.map((cell) => {
                    const isSelected = selectedCell?.id === cell.id;
                    const whatsappLink = getWhatsAppLinkWithMessage(cell.leaderWhatsapp, `Olá, ${cell.leaderName}! Gostaria de saber mais sobre a ${cellMessageName(cell.name)}.`);
                    return (
                      <article key={cell.id} className={`rounded-2xl border bg-white p-4 shadow-sm transition ${isSelected ? "border-[var(--tenant-secondary)] ring-2 ring-[color-mix(in_srgb,var(--tenant-secondary)_25%,transparent)]" : "border-slate-200"}`}>
                        <button type="button" className="w-full text-left" onClick={() => setSelectedCellId(cell.id)} aria-pressed={isSelected}>
                          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[var(--tenant-primary)]">{cell.name}</h3><p className="mt-1 text-xs text-slate-500">Líder: {cell.leaderName}</p></div>{cell.distanceKm !== null && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{cell.distanceKm.toFixed(1)} km</span>}</div>
                          <p className="mt-3 flex items-start gap-2 text-sm text-slate-600"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tenant-secondary)]" />{meetingLabel(cell)}</p>
                          {cell.locationMode === "exact" ? (
                            <a className="mt-2 flex items-start gap-2 text-sm text-slate-600 underline decoration-[var(--tenant-secondary)] decoration-1 underline-offset-4 hover:text-[var(--tenant-primary)]" href={mapsSearchLink(cell)} target="_blank" rel="noreferrer" aria-label={`Abrir o endereço da Célula ${cell.name} no mapa`} onClick={(event) => event.stopPropagation()}>
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tenant-secondary)]" />
                              <span>{locationLabel(cell)}</span>
                            </a>
                          ) : (
                            <p className="mt-2 flex items-start gap-2 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tenant-secondary)]" /><span>{locationLabel(cell)}</span></p>
                          )}
                          {cell.locationMode === "approximate" && <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-800"><ShieldCheck className="h-3.5 w-3.5" />Localização aproximada para proteger o endereço.</p>}
                        </button>
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                          {whatsappLink && <Button size="sm" asChild className="bg-emerald-600 text-white hover:bg-emerald-700"><a href={whatsappLink} target="_blank" rel="noreferrer" aria-label={`Conversar no WhatsApp com o líder da Célula ${cell.name}`}><MessageCircle className="mr-1.5 h-4 w-4" />WhatsApp</a></Button>}
                          <Button size="sm" variant="outline" asChild><a href={mapsDirectionsLink(cell)} target="_blank" rel="noreferrer" aria-label={`${cell.locationMode === "exact" ? "Como chegar à" : "Ver a região da"} Célula ${cell.name}`}><Navigation className="mr-1.5 h-4 w-4" />{cell.locationMode === "exact" ? "Como chegar" : "Ver região"}</a></Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <TenantPublicFooter church={data.church} eyebrow={publicHeroEyebrow} />
    </TenantPublicShell>
  );
}
