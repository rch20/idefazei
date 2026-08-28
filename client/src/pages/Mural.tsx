import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { uploadChurchMedia } from "@/lib/mediaUpload";
import { trpc } from "@/lib/trpc";
import { Archive, BookOpen, FileText, Globe2, ImagePlus, Megaphone, Pin, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type AnnouncementType = "aviso" | "evento" | "comunicado" | "devocional";
type AnnouncementForm = {
  title: string;
  content: string;
  type: AnnouncementType;
  pinned: boolean;
  publicVisible: boolean;
  publicStartsAt: string;
  expiresAt: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string | null;
  mediaAssetId: number | null;
};

type Announcement = {
  id: number;
  title: string;
  content: string;
  type: AnnouncementType | null;
  imageUrl: string | null;
  pinned: boolean | null;
  publicVisible: boolean;
  publicStatus: string;
  publicStartsAt: Date | null;
  expiresAt: Date | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  mediaAssetId: number | null;
  publishedAt: Date;
  createdAt: Date;
};

const TYPE_CONFIG: Record<AnnouncementType, { label: string; color: string; icon: typeof Megaphone }> = {
  aviso: { label: "Aviso", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Megaphone },
  evento: { label: "Evento", color: "bg-amber-50 text-amber-700 border-amber-200", icon: BookOpen },
  comunicado: { label: "Comunicado", color: "bg-purple-50 text-purple-700 border-purple-200", icon: Megaphone },
  devocional: { label: "Devocional", color: "bg-green-50 text-green-700 border-green-200", icon: BookOpen },
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Interno / rascunho",
  publicado: "Público agora",
  agendado: "Agendado",
  arquivado: "Arquivado",
};
const ANNOUNCEMENT_ADMIN_SUMMARY_CHAR_LIMIT = 220;

function shouldShowAnnouncementPreview(content: string) {
  const normalized = content.trim();
  return normalized.length > ANNOUNCEMENT_ADMIN_SUMMARY_CHAR_LIMIT || normalized.split(/\r?\n/).length > 3;
}

const EMPTY_FORM: AnnouncementForm = {
  title: "",
  content: "",
  type: "aviso",
  pinned: false,
  publicVisible: false,
  publicStartsAt: "",
  expiresAt: "",
  ctaLabel: "",
  ctaHref: "",
  imageUrl: null,
  mediaAssetId: null,
};

function dateInputValue(value: Date | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(" de ", " ");
}

export default function Mural() {
  const { churchId } = useChurch();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const { data: announcements, isLoading, refetch } = trpc.announcements.list.useQuery({ churchId });
  const create = trpc.announcements.create.useMutation({
    onSuccess: () => {
      toast.success(form.publicVisible ? "Aviso salvo e enviado para a fila pública." : "Aviso salvo no mural interno.");
      closeForm();
      refetch();
    },
    onError: (error) => toast.error(error.message || "Erro ao salvar aviso"),
  });
  const update = trpc.announcements.update.useMutation({
    onSuccess: () => {
      toast.success("Aviso atualizado.");
      closeForm();
      refetch();
    },
    onError: (error) => toast.error(error.message || "Erro ao atualizar aviso"),
  });
  const archive = trpc.announcements.archivePublic.useMutation({
    onSuccess: () => { toast.success("Aviso retirado da página pública."); refetch(); },
    onError: (error) => toast.error(error.message || "Não foi possível arquivar o aviso"),
  });

  const pinned = ((announcements ?? []) as Announcement[]).filter((announcement) => announcement.pinned);
  const regular = ((announcements ?? []) as Announcement[]).filter((announcement) => !announcement.pinned);
  const totalCount = ((announcements ?? []) as Announcement[]).length;
  const publicCount = ((announcements ?? []) as Announcement[]).filter((announcement) => announcement.publicVisible && ["publicado", "agendado"].includes(announcement.publicStatus)).length;
  const notPublicCount = Math.max(totalCount - publicCount, 0);

  function closeForm() {
    setOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(announcement: Announcement) {
    setEditing(announcement);
    setForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type ?? "aviso",
      pinned: Boolean(announcement.pinned),
      publicVisible: Boolean(announcement.publicVisible),
      publicStartsAt: dateInputValue(announcement.publicStartsAt),
      expiresAt: dateInputValue(announcement.expiresAt),
      ctaLabel: announcement.ctaLabel ?? "",
      ctaHref: announcement.ctaHref ?? "",
      imageUrl: announcement.imageUrl,
      mediaAssetId: announcement.mediaAssetId,
    });
    setOpen(true);
  }

  async function handleImageChange(file: File | undefined) {
    if (!file) return;
    setUploadingImage(true);
    try {
      const uploaded = await uploadChurchMedia(file, { purpose: "announcement_image", resourceType: "image" });
      setForm((current) => ({ ...current, imageUrl: uploaded.url, mediaAssetId: uploaded.mediaAssetId }));
      toast.success("Imagem enviada com segurança.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploadingImage(false);
    }
  }

  function saveAnnouncement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      churchId,
      ...form,
      publicStartsAt: form.publicStartsAt || null,
      expiresAt: form.expiresAt || null,
      ctaLabel: form.ctaLabel || null,
      ctaHref: form.ctaHref || null,
      imageUrl: form.imageUrl || null,
      mediaAssetId: form.mediaAssetId || null,
    };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  }

  const saving = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold"><Megaphone className="h-4 w-4" /> Comunicação</div>
          <h1 className="mt-2 text-2xl font-bold font-display text-navy">Mural de Avisos</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Organize os comunicados internos e escolha quais avisos merecem aparecer na página pública da igreja.</p>
        </div>
        <Button onClick={openCreate} className="w-full bg-navy text-white hover:bg-navy-light sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Novo aviso</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card-sacred flex items-center gap-3 p-4"><Megaphone className="h-5 w-5 text-navy" /><div><p className="text-2xl font-bold text-navy">{(announcements ?? []).length}</p><p className="text-xs text-muted-foreground">Avisos no mural</p></div></div>
        <div className="card-sacred flex items-center gap-3 border-gold/30 p-4"><Globe2 className="h-5 w-5 text-gold" /><div><p className="text-2xl font-bold text-navy">{publicCount}</p><p className="text-xs text-muted-foreground">Visíveis ou agendados</p></div></div>
        <div className="card-sacred flex items-center gap-3 p-4"><Pin className="h-5 w-5 text-gold" /><div><p className="text-2xl font-bold text-navy">{pinned.length}</p><p className="text-xs text-muted-foreground">Destaques fixados</p></div></div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-950">
        <p className="font-semibold">Como funciona o Mural Público</p>
        <p className="mt-1 text-blue-900/75">O mural interno continua protegido. Um aviso só aparece no site quando um Pastor marca <strong>Exibir na página pública</strong>; datas de início e expiração controlam automaticamente sua disponibilidade.</p>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          <span className="rounded-lg border border-blue-200/80 bg-white/55 px-3 py-2"><strong>{totalCount}</strong> {totalCount === 1 ? "aviso no mural" : "avisos no mural"}</span>
          <span className="rounded-lg border border-blue-200/80 bg-white/55 px-3 py-2"><strong>{publicCount}</strong> {publicCount === 1 ? "visível ou agendado" : "visíveis ou agendados"} no site</span>
          <span className="rounded-lg border border-blue-200/80 bg-white/55 px-3 py-2"><strong>{notPublicCount}</strong> {notPublicCount === 1 ? "aviso fora da página pública" : "avisos fora da página pública"}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && <AnnouncementGroup title="Fixados" icon={<Pin className="h-3 w-3" />} announcements={pinned} onEdit={openEdit} onPreview={setSelectedAnnouncement} onArchive={(item) => archive.mutate({ churchId, id: item.id })} />}
          {regular.length > 0 && <AnnouncementGroup title={pinned.length > 0 ? "Recentes" : "Avisos"} announcements={regular} onEdit={openEdit} onPreview={setSelectedAnnouncement} onArchive={(item) => archive.mutate({ churchId, id: item.id })} />}
          {(announcements ?? []).length === 0 && <div className="card-sacred flex flex-col items-center gap-3 p-12 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50"><Megaphone className="h-7 w-7 text-blue-500" /></div><p className="font-semibold text-navy">Nenhum aviso publicado</p><p className="text-sm text-muted-foreground">Publique o primeiro comunicado da sua igreja.</p></div>}
        </div>
      )}

      <Dialog open={open} onOpenChange={(value) => value ? setOpen(true) : closeForm()}>
        <DialogContent className="max-h-[92dvh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-5"><DialogTitle className="font-display text-navy">{editing ? "Editar aviso" : "Novo aviso"}</DialogTitle></DialogHeader>
          <form onSubmit={saveAnnouncement} className="max-h-[calc(92dvh-5rem)] space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
              <div><Label htmlFor="announcement-title">Título *</Label><Input id="announcement-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={255} /></div>
              <div><Label>Categoria</Label><Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as AnnouncementType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TYPE_CONFIG).map(([value, config]) => <SelectItem key={value} value={value}>{config.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label htmlFor="announcement-content">Conteúdo *</Label><Textarea id="announcement-content" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} rows={5} maxLength={4000} required /><p className="mt-1 text-right text-xs text-muted-foreground">{form.content.length}/4000</p></div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-start gap-3"><Globe2 className="mt-0.5 h-5 w-5 text-gold" /><div><p className="font-semibold text-navy">Visibilidade</p><p className="text-xs text-muted-foreground">A publicação pública exige autorização pastoral e nunca inclui o mural interno inteiro.</p></div></div>
              <label className="mt-4 flex cursor-pointer items-start gap-3"><input type="checkbox" checked={form.publicVisible} onChange={(event) => setForm({ ...form, publicVisible: event.target.checked })} className="mt-1 h-4 w-4 accent-navy" /><span><span className="block text-sm font-semibold text-navy">Exibir na página pública</span><span className="block text-xs text-muted-foreground">O aviso será publicado agora ou agendado conforme as datas abaixo.</span></span></label>
              <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="announcement-start">Começar em</Label><Input id="announcement-start" type="date" value={form.publicStartsAt} onChange={(event) => setForm({ ...form, publicStartsAt: event.target.value })} /></div><div><Label htmlFor="announcement-expiry">Expirar em</Label><Input id="announcement-expiry" type="date" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></div></div>
              <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={form.pinned} onChange={(event) => setForm({ ...form, pinned: event.target.checked })} className="h-4 w-4 accent-navy" /> Fixar como destaque no mural</label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="announcement-cta-label">Texto do botão (opcional)</Label><Input id="announcement-cta-label" placeholder="Saiba mais" value={form.ctaLabel} onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })} /></div>
              <div><Label htmlFor="announcement-cta-href">Destino do botão (opcional)</Label><Input id="announcement-cta-href" placeholder="/visite-nos ou https://..." value={form.ctaHref} onChange={(event) => setForm({ ...form, ctaHref: event.target.value })} /></div>
            </div>

            <div className="rounded-xl border border-dashed border-border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><Label>Imagem opcional</Label><p className="text-xs text-muted-foreground">Padrão do card público: <strong>1200 × 600 px (proporção 2:1)</strong>. O card se adapta à tela; imagens em outra proporção serão recortadas para manter o layout uniforme.</p><p className="mt-1 text-xs text-muted-foreground">PNG, JPEG ou WebP até 4 MB. O upload é registrado no Cloudinary por tenant.</p></div><label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-navy hover:bg-muted"><ImagePlus className="mr-2 h-4 w-4" />{uploadingImage ? "Enviando..." : form.imageUrl ? "Trocar imagem" : "Adicionar imagem"}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { void handleImageChange(event.target.files?.[0]); event.currentTarget.value = ""; }} disabled={uploadingImage} /></label></div>
              {form.imageUrl && <div className="mt-3 flex items-center gap-3"><img src={form.imageUrl} alt="Prévia do aviso" className="h-12 w-24 rounded-lg object-cover" /><span className="min-w-0 truncate text-xs text-muted-foreground">Imagem vinculada ao aviso</span></div>}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={closeForm} className="sm:min-w-28">Cancelar</Button><Button type="submit" className="bg-navy text-white hover:bg-navy-light sm:min-w-40" disabled={saving || uploadingImage}>{saving ? "Salvando..." : editing ? "Salvar alterações" : form.publicVisible ? "Salvar e publicar" : "Salvar aviso"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedAnnouncement)} onOpenChange={(value) => { if (!value) setSelectedAnnouncement(null); }}>
        <DialogContent className="mural-announcement-preview-dialog max-h-[88dvh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold"><FileText className="h-4 w-4" /> Conteúdo do aviso</div>
            <DialogTitle className="mt-2 font-display text-navy">{selectedAnnouncement?.title ?? "Aviso"}</DialogTitle>
            {selectedAnnouncement && <p className="text-xs text-muted-foreground">{TYPE_CONFIG[selectedAnnouncement.type ?? "aviso"]?.label ?? "Aviso"} · Criado em {formatDate(selectedAnnouncement.createdAt)}</p>}
          </DialogHeader>
          <div className="mural-announcement-preview-body">
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground">{selectedAnnouncement?.content}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnnouncementGroup({ title, icon, announcements, onEdit, onPreview, onArchive }: { title: string; icon?: React.ReactNode; announcements: Announcement[]; onEdit: (announcement: Announcement) => void; onPreview: (announcement: Announcement) => void; onArchive: (announcement: Announcement) => void }) {
  return <div><h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{icon}{title}</h2><div className="space-y-3">{announcements.map((announcement) => <AnnouncementCard key={announcement.id} announcement={announcement} onEdit={onEdit} onPreview={onPreview} onArchive={onArchive} />)}</div></div>;
}

function AnnouncementCard({ announcement, onEdit, onPreview, onArchive }: { announcement: Announcement; onEdit: (announcement: Announcement) => void; onPreview: (announcement: Announcement) => void; onArchive: (announcement: Announcement) => void }) {
  const cfg = TYPE_CONFIG[announcement.type ?? "aviso"] ?? TYPE_CONFIG.aviso;
  const Icon = cfg.icon;
  const isPublic = Boolean(announcement.publicVisible);
  const showPreview = shouldShowAnnouncementPreview(announcement.content);
  return <article className={`card-sacred p-4 ${announcement.pinned ? "border-gold/30 bg-amber-50/20" : ""}`}>
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${cfg.color.split(" ")[0]}`}><Icon className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-navy">{announcement.title}</p>{announcement.pinned && <Pin className="h-3 w-3 text-gold" />}<span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span></div><p className={`mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground${showPreview ? " mural-announcement-summary" : ""}`}>{announcement.content}</p>{showPreview && <button type="button" className="mural-announcement-preview-trigger" aria-haspopup="dialog" onClick={() => onPreview(announcement)}>Ver conteúdo completo</button>}<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>Criado em {formatDate(announcement.createdAt)}</span>{isPublic && <span className="inline-flex items-center gap-1 text-green-700"><Globe2 className="h-3 w-3" />{STATUS_LABELS[announcement.publicStatus] ?? "Público"}</span>}{announcement.expiresAt && <span>Expira em {formatDate(announcement.expiresAt)}</span>}</div></div>
      <div className="flex flex-wrap gap-2 sm:justify-end"><Button type="button" size="sm" variant="outline" onClick={() => onEdit(announcement)}>Editar</Button>{isPublic && announcement.publicStatus !== "arquivado" && <Button type="button" size="sm" variant="outline" className="text-amber-700" onClick={() => onArchive(announcement)}><Archive className="mr-1.5 h-3.5 w-3.5" />Retirar</Button>}</div>
    </div>
  </article>;
}
