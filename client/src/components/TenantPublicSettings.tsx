import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, ChevronUp, Eye, Globe2, GripVertical, ImagePlus, Plus, Save, Send, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { uploadChurchMedia } from "@/lib/mediaUpload";

type SectionType = "hero" | "about" | "schedule" | "events" | "ministries" | "gallery" | "contact";
type PublicService = { day: string; time: string; label?: string; location?: string };
type PublicGalleryItem = { url: string; alt: string; caption?: string; mediaAssetId?: number };
type EditorSection = { sectionType: SectionType; enabled: boolean; sortOrder: number; content: { title?: string; eyebrow?: string; subtitle?: string; body?: string; primaryCtaLabel?: string; primaryCtaHref?: string; services?: PublicService[]; items?: PublicGalleryItem[] } };

const labels: Record<SectionType, string> = { hero: "Hero", about: "Sobre a igreja", schedule: "Horários", events: "Eventos", ministries: "Ministérios", gallery: "Galeria", contact: "Contato" };
const defaultSections: EditorSection[] = [
  { sectionType: "hero", enabled: true, sortOrder: 0, content: { title: "", eyebrow: "", subtitle: "", primaryCtaLabel: "Quero conhecer a igreja", primaryCtaHref: "/visitante" } },
  { sectionType: "about", enabled: true, sortOrder: 1, content: { title: "Uma igreja para caminhar junto", body: "" } },
  { sectionType: "schedule", enabled: true, sortOrder: 2, content: { title: "Horários de culto", body: "Encontre um horário para caminhar conosco.", services: [] } },
  { sectionType: "events", enabled: true, sortOrder: 3, content: { title: "Próximos eventos", subtitle: "Participe do que Deus está fazendo em nossa comunidade." } },
  { sectionType: "ministries", enabled: true, sortOrder: 4, content: { title: "Nossos ministérios", subtitle: "Encontre um lugar para servir e caminhar em comunidade." } },
  { sectionType: "gallery", enabled: true, sortOrder: 5, content: { title: "Nossa comunidade", subtitle: "Momentos que vivemos juntos.", items: [] } },
  { sectionType: "contact", enabled: true, sortOrder: 6, content: { title: "Visite-nos", subtitle: "Estamos prontos para receber você." } },
];

function PublicMetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p><strong className="text-lg font-bold text-navy">{value}</strong></div><p className="mt-2 truncate text-xs text-muted-foreground">{detail}</p></article>;
}

export function TenantPublicSettings() {
  const utils = trpc.useUtils();
  const preview = trpc.tenantPublic.adminPreview.useQuery();
  const [theme, setTheme] = useState({ primaryColor: "#1e3a5f", secondaryColor: "#c9a84c", accentColor: "#c9a84c", fontPair: "sacred_serif" as const, logoUrl: null as string | null, faviconUrl: null as string | null });
  const [seo, setSeo] = useState({ title: "", description: "" });
  const [sections, setSections] = useState<EditorSection[]>(defaultSections);
  const [mobilePreview, setMobilePreview] = useState(true);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  useEffect(() => {
    if (!preview.data) return;
    const currentTheme = preview.data.theme;
    if (currentTheme) setTheme({ primaryColor: currentTheme.primaryColor, secondaryColor: currentTheme.secondaryColor, accentColor: currentTheme.accentColor ?? currentTheme.secondaryColor, fontPair: "sacred_serif", logoUrl: currentTheme.logoUrl, faviconUrl: currentTheme.faviconUrl });
    const saved = preview.data.sections.filter((section) => ["hero", "about", "schedule", "events", "ministries", "gallery", "contact"].includes(section.sectionType)) as unknown as EditorSection[];
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
  const galleryItems = sections.find((section) => section.sectionType === "gallery")?.content.items ?? [];
  const uploadGalleryImage = async (file: File) => {
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) return toast.error("Escolha uma imagem PNG, JPEG ou WebP.");
    if (file.size > 4 * 1024 * 1024) return toast.error("A imagem deve ter no máximo 4 MB.");
    if (galleryItems.length >= 8) return toast.error("A galeria permite no máximo oito imagens.");
    setIsUploadingGallery(true);
    try {
      const result = await uploadChurchMedia(file, { purpose: "tenant_public_gallery", resourceType: "image" });
      patchSection("gallery", { content: { items: [...galleryItems, { url: result.optimizedUrl, mediaAssetId: result.mediaAssetId ?? undefined, alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), caption: "" }] } });
      toast.success("Imagem adicionada ao rascunho. Publique a página para exibi-la.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem."); }
    finally { setIsUploadingGallery(false); }
  };
  const hero = sections.find((section) => section.sectionType === "hero")?.content;

  if (preview.isLoading) return <div className="h-48 animate-pulse rounded-2xl bg-muted" />;
  return <div className="space-y-6">
    <div className="flex items-start gap-3 rounded-2xl border border-gold/35 bg-gold/5 p-4 text-sm leading-relaxed text-navy"><Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><p><strong>Uma página, uma igreja.</strong> Edite o rascunho com segurança: esta configuração é salva e publicada somente no subdomínio da sua igreja. O editor não altera o CSS estrutural nem outras igrejas.</p></div>
    <div className="mb-1 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-relaxed text-muted-foreground">Edite à esquerda e acompanhe a prévia protegida à direita. As alterações só chegam ao visitante depois da publicação.</p><Button type="button" variant="outline" size="sm" className="w-full shrink-0 sm:w-auto xl:hidden" onClick={() => document.getElementById("tenant-public-preview")?.scrollIntoView({ behavior: "smooth", block: "start" })}><Eye className="mr-1.5 h-4 w-4" />Ver prévia</Button></div>
    <div className="grid gap-3 sm:grid-cols-3"><PublicMetricCard label="Blocos ativos" value={`${sections.filter((section) => section.enabled).length}/${sections.length}`} detail="Seções exibidas no rascunho" /><PublicMetricCard label="Imagens" value={String(galleryItems.length)} detail="Itens na galeria pública" /><PublicMetricCard label="Prévia" value={mobilePreview ? "Mobile" : "Desktop"} detail="Modo de visualização atual" /></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
      <div className="min-w-0 space-y-5">
        <section className="card-sacred p-5 sm:p-6"><div className="mb-5 flex items-start gap-3 border-b border-border pb-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold"><Globe2 className="h-5 w-5" /></span><div><h2 className="font-semibold text-navy">Tema da Página Pública</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Estas cores pertencem ao site público. A Identidade Visual geral controla a experiência interna do painel.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"><span className="text-sm font-semibold text-navy">Cor principal</span><span className="mt-1 block text-xs text-muted-foreground">Cabeçalho e áreas de destaque</span><div className="mt-3 flex items-center gap-3"><span className="h-9 w-9 shrink-0 rounded-lg border border-white shadow-sm" style={{ backgroundColor: theme.primaryColor }} /><Input aria-label="Cor principal da Página Pública" className="min-w-0 font-mono uppercase" value={theme.primaryColor} maxLength={7} onChange={(event) => setTheme({ ...theme, primaryColor: event.target.value })} /></div></label><label className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"><span className="text-sm font-semibold text-navy">Cor de destaque</span><span className="mt-1 block text-xs text-muted-foreground">Botões e chamadas para ação</span><div className="mt-3 flex items-center gap-3"><span className="h-9 w-9 shrink-0 rounded-lg border border-white shadow-sm" style={{ backgroundColor: theme.secondaryColor }} /><Input aria-label="Cor de destaque da Página Pública" className="min-w-0 font-mono uppercase" value={theme.secondaryColor} maxLength={7} onChange={(event) => setTheme({ ...theme, secondaryColor: event.target.value, accentColor: event.target.value })} /></div></label></div>
          <div className="mt-4 grid gap-4"><label><Label>Título para buscadores</Label><Input className="mt-1" value={seo.title} maxLength={255} onChange={(event) => setSeo({ ...seo, title: event.target.value })} placeholder="Ex.: Cristã Viver — Comunidade de Fé" /></label><label><Label>Descrição pública</Label><Textarea className="mt-1" value={seo.description} maxLength={320} rows={3} onChange={(event) => setSeo({ ...seo, description: event.target.value })} placeholder="Uma breve apresentação da sua igreja." /></label></div>
        </section>
        <section className="card-sacred p-5 sm:p-6"><div className="flex flex-col gap-1 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-semibold text-navy">Blocos da página</h2><p className="mt-1 text-sm text-muted-foreground">Ative, edite e reordene blocos aprovados. A mudança só fica pública ao publicar.</p></div><span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{sections.filter((section) => section.enabled).length} de {sections.length} ativos</span></div>
          <div className="mt-4 space-y-3">{sections.map((section, index) => <article key={section.sectionType} className="rounded-xl border border-border bg-muted/20 p-4"><div className="flex min-w-0 flex-wrap items-center gap-3"><GripVertical aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" /><strong className="mr-auto min-w-0 truncate text-sm text-navy">{labels[section.sectionType]}</strong><span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background p-1"><Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Mover bloco ${labels[section.sectionType]} para cima`} title="Mover para cima"><ChevronUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon-sm" disabled={index === sections.length - 1} onClick={() => move(index, 1)} aria-label={`Mover bloco ${labels[section.sectionType]} para baixo`} title="Mover para baixo"><ChevronDown className="h-4 w-4" /></Button></span><span className="inline-flex shrink-0 items-center gap-2"><Switch checked={section.enabled} onCheckedChange={(enabled) => patchSection(section.sectionType, { enabled })} aria-label={`Exibir bloco ${labels[section.sectionType]}`} /><span className="text-xs font-medium text-slate-600">Exibir</span></span></div>
            {section.enabled && <div className="mt-4 grid gap-3"><label><Label>Título</Label><Input className="mt-1" value={section.content.title ?? ""} onChange={(event) => patchSection(section.sectionType, { content: { title: event.target.value } })} /></label>{section.sectionType === "hero" && <><label><Label>Frase de identificação</Label><Input className="mt-1" value={section.content.eyebrow ?? ""} maxLength={80} placeholder="Ex.: Comunidade de fé" onChange={(event) => patchSection("hero", { content: { eyebrow: event.target.value } })} /><p className="mt-1 text-xs text-muted-foreground">Aparece acima do título no hero e no rodapé. Se ficar em branco, usaremos “Comunidade de fé”.</p></label><label><Label>Subtítulo</Label><Textarea className="mt-1" rows={3} value={section.content.subtitle ?? ""} onChange={(event) => patchSection(section.sectionType, { content: { subtitle: event.target.value } })} /></label><div className="grid gap-3 sm:grid-cols-2"><label><Label>Texto do botão</Label><Input className="mt-1" value={section.content.primaryCtaLabel ?? ""} onChange={(event) => patchSection("hero", { content: { primaryCtaLabel: event.target.value } })} /></label><label><Label>Destino do botão</Label><Input className="mt-1" value={section.content.primaryCtaHref ?? ""} onChange={(event) => patchSection("hero", { content: { primaryCtaHref: event.target.value } })} /></label></div></>}{["about", "schedule"].includes(section.sectionType) && <label><Label>{section.sectionType === "schedule" ? "Mensagem de acolhimento" : "Texto"}</Label><Textarea className="mt-1" rows={3} value={section.content.body ?? ""} onChange={(event) => patchSection(section.sectionType, { content: { body: event.target.value } })} /></label>}{section.sectionType === "schedule" && <div className="rounded-xl border border-gold/25 bg-gold/5 p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-navy">Horários de culto e encontros</strong><Button type="button" size="sm" variant="outline" onClick={addService} disabled={(section.content.services ?? []).length >= 7}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar horário</Button></div><div className="space-y-3">{(section.content.services ?? []).map((service, serviceIndex) => <div key={serviceIndex} className="grid gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-2"><label><Label>Dia</Label><Input className="mt-1" value={service.day} maxLength={32} placeholder="Ex.: Domingo" onChange={(event) => patchService(serviceIndex, { day: event.target.value })} /></label><label><Label>Horário</Label><Input className="mt-1" value={service.time} maxLength={24} placeholder="Ex.: 19h" onChange={(event) => patchService(serviceIndex, { time: event.target.value })} /></label><label><Label>Descrição</Label><Input className="mt-1" value={service.label ?? ""} maxLength={80} placeholder="Ex.: Culto da Família" onChange={(event) => patchService(serviceIndex, { label: event.target.value })} /></label><label><Label>Local</Label><div className="mt-1 flex gap-2"><Input value={service.location ?? ""} maxLength={160} placeholder="Ex.: Templo principal" onChange={(event) => patchService(serviceIndex, { location: event.target.value })} /><Button type="button" size="icon" variant="outline" aria-label={`Remover horário ${serviceIndex + 1}`} onClick={() => removeService(serviceIndex)}><Trash2 className="h-4 w-4" /></Button></div></label></div>)}{(section.content.services ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum horário será exibido até você adicionar um culto ou encontro.</p>}</div></div>}{section.sectionType === "gallery" && <div className="rounded-xl border border-gold/25 bg-gold/5 p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-navy">Imagens da galeria</strong><label><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={isUploadingGallery || galleryItems.length >= 8} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadGalleryImage(file); }} /><Button type="button" size="sm" variant="outline" disabled={isUploadingGallery || galleryItems.length >= 8} asChild><span><ImagePlus className="mr-1 h-3.5 w-3.5" />{isUploadingGallery ? "Enviando..." : "Adicionar imagem"}</span></Button></label></div><p className="mb-3 text-xs text-muted-foreground">PNG, JPEG ou WebP, até 4 MB. Inclua uma descrição para acessibilidade.</p><div className="space-y-3">{galleryItems.map((item, itemIndex) => <div key={item.url} className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-[96px_minmax(0,1fr)]"><img src={item.url} alt="Prévia da mídia" className="h-24 w-24 rounded-md object-cover" /><div className="grid gap-2"><label><Label>Texto alternativo</Label><Input value={item.alt} maxLength={180} onChange={(event) => patchSection("gallery", { content: { items: galleryItems.map((current, index) => index === itemIndex ? { ...current, alt: event.target.value } : current) } })} /></label><label><Label>Legenda opcional</Label><div className="mt-1 flex gap-2"><Input value={item.caption ?? ""} maxLength={180} onChange={(event) => patchSection("gallery", { content: { items: galleryItems.map((current, index) => index === itemIndex ? { ...current, caption: event.target.value } : current) } })} /><Button type="button" size="icon" variant="outline" aria-label={`Remover imagem ${itemIndex + 1}`} onClick={() => patchSection("gallery", { content: { items: galleryItems.filter((_, index) => index !== itemIndex) } })}><Trash2 className="h-4 w-4" /></Button></div></label></div></div>)}{galleryItems.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma imagem será exibida até você adicionar e publicar a galeria.</p>}</div></div>}{["events", "ministries", "gallery", "contact"].includes(section.sectionType) && <label><Label>Mensagem</Label><Input className="mt-1" value={section.content.subtitle ?? ""} onChange={(event) => patchSection(section.sectionType, { content: { subtitle: event.target.value } })} /></label>}</div>}</article>)}</div>
        </section>
        <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-end"><span className="text-xs leading-relaxed text-muted-foreground sm:mr-auto">Rascunho só fica público depois de publicar.</span><div className="grid grid-cols-2 gap-2 sm:flex"><Button type="button" variant="outline" className="w-full sm:w-auto" disabled={saveDraft.isPending || publish.isPending} onClick={save}><Save className="mr-2 h-4 w-4" />{saveDraft.isPending ? "Salvando..." : "Salvar rascunho"}</Button><Button type="button" className="w-full bg-navy text-white hover:bg-navy-light sm:w-auto" disabled={saveDraft.isPending || publish.isPending} onClick={publishPage}><Send className="mr-2 h-4 w-4" />{publish.isPending ? "Publicando..." : "Publicar página"}</Button></div></div>
      </div>
      <aside id="tenant-public-preview" className="min-w-0 scroll-mt-6 xl:sticky xl:top-6 xl:self-start"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold text-navy">Prévia protegida</h2><p className="text-xs text-muted-foreground">A prévia não publica alterações.</p></div><Button variant="outline" size="sm" onClick={() => setMobilePreview(!mobilePreview)}><Smartphone className="mr-1.5 h-4 w-4" />{mobilePreview ? "Mobile" : "Desktop"}</Button></div><div className={mobilePreview ? "mx-auto max-w-[375px] overflow-hidden rounded-[1.8rem] border-8 border-navy/15 bg-background shadow-lg" : "overflow-hidden rounded-2xl border border-border bg-background shadow-sm"}><div className="tenant-public-preview" style={{ "--tenant-primary": theme.primaryColor, "--tenant-secondary": theme.secondaryColor } as CSSProperties}><div className="tenant-public-preview-header">Sua igreja</div><div className="tenant-public-preview-hero"><span>{hero?.eyebrow || "Comunidade de fé"}</span><h3>{hero?.title || "Bem-vindo à sua igreja"}</h3><p>{hero?.subtitle || "Sua mensagem de acolhimento aparecerá aqui."}</p><b>{hero?.primaryCtaLabel || "Quero conhecer"}</b></div></div></div><p className="mt-3 text-xs text-muted-foreground"><Eye className="mr-1 inline h-3.5 w-3.5" />O visitante vê somente a última revisão publicada.</p></aside>
    </div>
  </div>;
}
