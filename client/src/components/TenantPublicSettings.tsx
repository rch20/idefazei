import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Eye, Globe2, GripVertical, Plus, Save, Send, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type SectionType = "hero" | "about" | "schedule" | "events" | "ministries" | "contact";
type PublicService = { day: string; time: string; label?: string; location?: string };
type EditorSection = { sectionType: SectionType; enabled: boolean; sortOrder: number; content: { title?: string; subtitle?: string; body?: string; primaryCtaLabel?: string; primaryCtaHref?: string; services?: PublicService[] } };

const labels: Record<SectionType, string> = { hero: "Hero", about: "Sobre a igreja", schedule: "Horários", events: "Eventos", ministries: "Ministérios", contact: "Contato" };
const defaultSections: EditorSection[] = [
  { sectionType: "hero", enabled: true, sortOrder: 0, content: { title: "", subtitle: "", primaryCtaLabel: "Quero conhecer a igreja", primaryCtaHref: "/visitante" } },
  { sectionType: "about", enabled: true, sortOrder: 1, content: { title: "Uma igreja para caminhar junto", body: "" } },
  { sectionType: "schedule", enabled: true, sortOrder: 2, content: { title: "Horários de culto", body: "Encontre um horário para caminhar conosco.", services: [] } },
  { sectionType: "events", enabled: true, sortOrder: 3, content: { title: "Próximos eventos", subtitle: "Participe do que Deus está fazendo em nossa comunidade." } },
  { sectionType: "ministries", enabled: true, sortOrder: 4, content: { title: "Nossos ministérios", subtitle: "Encontre um lugar para servir e caminhar em comunidade." } },
  { sectionType: "contact", enabled: true, sortOrder: 5, content: { title: "Visite-nos", subtitle: "Estamos prontos para receber você." } },
];

export function TenantPublicSettings() {
  const utils = trpc.useUtils();
  const preview = trpc.tenantPublic.adminPreview.useQuery();
  const [theme, setTheme] = useState({ primaryColor: "#1e3a5f", secondaryColor: "#c9a84c", accentColor: "#c9a84c", fontPair: "sacred_serif" as const, logoUrl: null as string | null, faviconUrl: null as string | null });
  const [seo, setSeo] = useState({ title: "", description: "" });
  const [sections, setSections] = useState<EditorSection[]>(defaultSections);
  const [mobilePreview, setMobilePreview] = useState(true);

  useEffect(() => {
    if (!preview.data) return;
    const currentTheme = preview.data.theme;
    if (currentTheme) setTheme({ primaryColor: currentTheme.primaryColor, secondaryColor: currentTheme.secondaryColor, accentColor: currentTheme.accentColor ?? currentTheme.secondaryColor, fontPair: "sacred_serif", logoUrl: currentTheme.logoUrl, faviconUrl: currentTheme.faviconUrl });
    const saved = preview.data.sections.filter((section) => ["hero", "about", "schedule", "events", "ministries", "contact"].includes(section.sectionType)) as unknown as EditorSection[];
    setSections(defaultSections.map((fallback) => saved.find((section) => section.sectionType === fallback.sectionType) ?? fallback).sort((a, b) => a.sortOrder - b.sortOrder));
    setSeo({ title: preview.data.site?.seoTitle ?? "", description: preview.data.site?.seoDescription ?? "" });
  }, [preview.data]);

  const saveDraft = trpc.tenantPublic.saveDraft.useMutation({
    onSuccess: async () => { await utils.tenantPublic.adminPreview.invalidate(); toast.success("Rascunho salvo. Visitantes continuam vendo a última versão publicada."); },
    onError: (error) => toast.error(error.message),
  });
  const publish = trpc.tenantPublic.publish.useMutation({
    onSuccess: async () => { await utils.tenantPublic.adminPreview.invalidate(); toast.success("Página pública publicada com sucesso."); },
    onError: (error) => toast.error(error.message),
  });

  const normalizedSections = useMemo(() => sections.map((section, index) => ({ ...section, sortOrder: index })), [sections]);
  const draftPayload = { seoTitle: seo.title || null, seoDescription: seo.description || null, theme, sections: normalizedSections };
  const save = () => saveDraft.mutate(draftPayload);
  const publishPage = async () => {
    try {
      await saveDraft.mutateAsync(draftPayload);
      await publish.mutateAsync();
    } catch {
      // As mutações já apresentam a mensagem segura ao administrador.
    }
  };
  const move = (index: number, direction: -1 | 1) => setSections((items) => {
    const next = [...items]; const target = index + direction;
    if (target < 0 || target >= next.length) return items;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const patchSection = (sectionType: SectionType, patch: Partial<EditorSection>) => setSections((items) => items.map((section) => section.sectionType === sectionType ? { ...section, ...patch, content: patch.content ? { ...section.content, ...patch.content } : section.content } : section));
  const patchService = (index: number, patch: Partial<PublicService>) => patchSection("schedule", { content: { services: (sections.find((section) => section.sectionType === "schedule")?.content.services ?? []).map((service, serviceIndex) => serviceIndex === index ? { ...service, ...patch } : service) } });
  const addService = () => {
    const current = sections.find((section) => section.sectionType === "schedule")?.content.services ?? [];
    if (current.length < 7) patchSection("schedule", { content: { services: [...current, { day: "", time: "", label: "", location: "" }] } });
  };
  const removeService = (index: number) => {
    const current = sections.find((section) => section.sectionType === "schedule")?.content.services ?? [];
    patchSection("schedule", { content: { services: current.filter((_, serviceIndex) => serviceIndex !== index) } });
  };
  const hero = sections.find((section) => section.sectionType === "hero")?.content;

  if (preview.isLoading) return <div className="h-48 animate-pulse rounded-2xl bg-muted" />;
  return <div className="space-y-6">
    <div className="rounded-2xl border border-gold/35 bg-gold/5 p-4 text-sm text-navy"><strong>Uma página, uma igreja.</strong> Esta configuração é salva e publicada somente no seu subdomínio. Cores, blocos e textos não alteram CSS estrutural nem outras igrejas.</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
      <div className="space-y-5">
        <section className="card-sacred p-5"><div className="mb-4 flex items-center gap-2"><Globe2 className="h-5 w-5 text-gold" /><div><h2 className="font-semibold text-navy">Identidade pública</h2><p className="text-sm text-muted-foreground">Somente cores e arquivos permitidos; o layout permanece protegido.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><label><Label>Cor principal</Label><Input className="mt-1 font-mono" value={theme.primaryColor} maxLength={7} onChange={(event) => setTheme({ ...theme, primaryColor: event.target.value })} /></label><label><Label>Cor de destaque</Label><Input className="mt-1 font-mono" value={theme.secondaryColor} maxLength={7} onChange={(event) => setTheme({ ...theme, secondaryColor: event.target.value, accentColor: event.target.value })} /></label></div>
          <div className="mt-4 grid gap-4"><label><Label>Título para buscadores</Label><Input className="mt-1" value={seo.title} maxLength={255} onChange={(event) => setSeo({ ...seo, title: event.target.value })} placeholder="Ex.: Cristã Viver — Comunidade de Fé" /></label><label><Label>Descrição pública</Label><Textarea className="mt-1" value={seo.description} maxLength={320} rows={3} onChange={(event) => setSeo({ ...seo, description: event.target.value })} placeholder="Uma breve apresentação da sua igreja." /></label></div>
        </section>
        <section className="card-sacred p-5"><h2 className="font-semibold text-navy">Blocos da página</h2><p className="mt-1 text-sm text-muted-foreground">Ative, edite e reordene blocos aprovados. A mudança só fica pública ao publicar.</p>
          <div className="mt-4 space-y-3">{sections.map((section, index) => <article key={section.sectionType} className="rounded-xl border border-border bg-muted/20 p-4"><div className="flex flex-wrap items-center gap-3"><GripVertical className="h-4 w-4 text-muted-foreground" /><strong className="mr-auto text-sm text-navy">{labels[section.sectionType]}</strong><Button variant="outline" size="sm" disabled={index === 0} onClick={() => move(index, -1)}>Subir</Button><Button variant="outline" size="sm" disabled={index === sections.length - 1} onClick={() => move(index, 1)}>Descer</Button><Switch checked={section.enabled} onCheckedChange={(enabled) => patchSection(section.sectionType, { enabled })} aria-label={`Ativar bloco ${labels[section.sectionType]}`} /></div>
            {section.enabled && <div className="mt-4 grid gap-3"><label><Label>Título</Label><Input className="mt-1" value={section.content.title ?? ""} onChange={(event) => patchSection(section.sectionType, { content: { title: event.target.value } })} /></label>{section.sectionType === "hero" && <><label><Label>Subtítulo</Label><Textarea className="mt-1" rows={3} value={section.content.subtitle ?? ""} onChange={(event) => patchSection(section.sectionType, { content: { subtitle: event.target.value } })} /></label><div className="grid gap-3 sm:grid-cols-2"><label><Label>Texto do botão</Label><Input className="mt-1" value={section.content.primaryCtaLabel ?? ""} onChange={(event) => patchSection("hero", { content: { primaryCtaLabel: event.target.value } })} /></label><label><Label>Destino do botão</Label><Input className="mt-1" value={section.content.primaryCtaHref ?? ""} onChange={(event) => patchSection("hero", { content: { primaryCtaHref: event.target.value } })} /></label></div></>}{["about", "schedule"].includes(section.sectionType) && <label><Label>{section.sectionType === "schedule" ? "Mensagem de acolhimento" : "Texto"}</Label><Textarea className="mt-1" rows={3} value={section.content.body ?? ""} onChange={(event) => patchSection(section.sectionType, { content: { body: event.target.value } })} /></label>}{section.sectionType === "schedule" && <div className="rounded-xl border border-gold/25 bg-gold/5 p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-navy">Horários publicados</strong><Button type="button" size="sm" variant="outline" onClick={addService} disabled={(section.content.services ?? []).length >= 7}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar horário</Button></div><div className="space-y-3">{(section.content.services ?? []).map((service, serviceIndex) => <div key={serviceIndex} className="grid gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-2"><label><Label>Dia</Label><Input className="mt-1" value={service.day} maxLength={32} placeholder="Ex.: Domingo" onChange={(event) => patchService(serviceIndex, { day: event.target.value })} /></label><label><Label>Horário</Label><Input className="mt-1" value={service.time} maxLength={24} placeholder="Ex.: 19h" onChange={(event) => patchService(serviceIndex, { time: event.target.value })} /></label><label><Label>Descrição</Label><Input className="mt-1" value={service.label ?? ""} maxLength={80} placeholder="Ex.: Culto da Família" onChange={(event) => patchService(serviceIndex, { label: event.target.value })} /></label><label><Label>Local</Label><div className="mt-1 flex gap-2"><Input value={service.location ?? ""} maxLength={160} placeholder="Ex.: Templo principal" onChange={(event) => patchService(serviceIndex, { location: event.target.value })} /><Button type="button" size="icon" variant="outline" aria-label={`Remover horário ${serviceIndex + 1}`} onClick={() => removeService(serviceIndex)}><Trash2 className="h-4 w-4" /></Button></div></label></div>)}{(section.content.services ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum horário será exibido até você adicionar um encontro.</p>}</div></div>}{["events", "ministries", "contact"].includes(section.sectionType) && <label><Label>Mensagem</Label><Input className="mt-1" value={section.content.subtitle ?? ""} onChange={(event) => patchSection(section.sectionType, { content: { subtitle: event.target.value } })} /></label>}</div>}</article>)}</div>
        </section>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end"><Button variant="outline" disabled={saveDraft.isPending || publish.isPending} onClick={save}><Save className="mr-2 h-4 w-4" />{saveDraft.isPending ? "Salvando..." : "Salvar rascunho"}</Button><Button className="bg-navy text-white hover:bg-navy-light" disabled={saveDraft.isPending || publish.isPending} onClick={publishPage}><Send className="mr-2 h-4 w-4" />{publish.isPending ? "Publicando..." : "Publicar página"}</Button></div>
      </div>
      <aside className="min-w-0"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold text-navy">Prévia protegida</h2><p className="text-xs text-muted-foreground">A prévia não publica alterações.</p></div><Button variant="outline" size="sm" onClick={() => setMobilePreview(!mobilePreview)}><Smartphone className="mr-1.5 h-4 w-4" />{mobilePreview ? "Mobile" : "Desktop"}</Button></div><div className={mobilePreview ? "mx-auto max-w-[375px] overflow-hidden rounded-[1.8rem] border-8 border-navy/15 bg-background shadow-lg" : "overflow-hidden rounded-2xl border border-border bg-background shadow-sm"}><div className="tenant-public-preview" style={{ "--tenant-primary": theme.primaryColor, "--tenant-secondary": theme.secondaryColor } as CSSProperties}><div className="tenant-public-preview-header">Sua igreja</div><div className="tenant-public-preview-hero"><span>Comunidade de fé</span><h3>{hero?.title || "Bem-vindo à sua igreja"}</h3><p>{hero?.subtitle || "Sua mensagem de acolhimento aparecerá aqui."}</p><b>{hero?.primaryCtaLabel || "Quero conhecer"}</b></div></div></div><p className="mt-3 text-xs text-muted-foreground"><Eye className="mr-1 inline h-3.5 w-3.5" />O visitante vê somente a última revisão publicada.</p></aside>
    </div>
  </div>;
}
