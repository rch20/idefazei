import { useState } from "react";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { BookOpen, ExternalLink, FileText, LibraryBig, Link as LinkIcon, Presentation, Search, Video } from "lucide-react";

const CATEGORIES = ["Todos", "pdf", "video", "apostila", "devocional"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  Todos: "Todos",
  pdf: "Documentos",
  video: "Vídeos",
  apostila: "Apresentações",
  devocional: "Links e devocionais",
};

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-5 w-5 text-red-600" />,
  video: <Video className="h-5 w-5 text-blue-600" />,
  apostila: <Presentation className="h-5 w-5 text-emerald-700" />,
  devocional: <LinkIcon className="h-5 w-5 text-purple-700" />,
};

export default function Biblioteca() {
  const { churchId } = useChurch();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Todos");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; type: "pdf" | "video" | "apostila" | "devocional"; fileUrl: string; description: string }>({ title: "", type: "pdf", fileUrl: "", description: "" });
  const utils = trpc.useUtils();
  const { data: access } = trpc.escolaFundamentos.access.useQuery({ churchId: churchId! }, { enabled: Boolean(churchId) });
  const canManageMaterials = Boolean(access?.canManageStudies);
  const { data: items = [], isLoading } = trpc.library.list.useQuery(
    { churchId: churchId!, search: search || undefined, type: category !== "Todos" ? category : undefined },
    { enabled: Boolean(churchId) },
  );
  const createMutation = trpc.library.create.useMutation({
    onSuccess: () => {
      toast.success("Material adicionado ao acervo da igreja.");
      setCreateOpen(false);
      setForm({ title: "", type: "pdf", fileUrl: "", description: "" });
      utils.library.list.invalidate();
    },
    onError: (error) => toast.error(error.message || "Não foi possível adicionar o material."),
  });

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!churchId || !form.title.trim()) return toast.error("Informe o título do material.");
    createMutation.mutate({ churchId, title: form.title.trim(), type: form.type, fileUrl: form.fileUrl.trim() || undefined, description: form.description.trim() || undefined });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-navy"><LibraryBig className="h-6 w-6 text-gold" />Biblioteca Digital</h1>
          <p className="mt-1 text-sm text-muted-foreground">O acervo único de documentos, apresentações, vídeos e links da sua igreja.</p>
        </div>
        {canManageMaterials ? <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="w-full bg-navy text-white hover:bg-navy-light sm:w-auto">Adicionar material</Button></DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
            <DialogHeader><DialogTitle className="font-display text-navy">Adicionar ao acervo</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <p className="rounded-lg bg-gold/10 p-3 text-sm text-navy">Este material poderá ser usado em quantos estudos e turmas forem necessários, sem criar cópias.</p>
              <div className="space-y-2"><Label htmlFor="library-title">Título</Label><Input id="library-title" required maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Apostila — Fundamentos da Fé" /></div>
              <div className="space-y-2"><Label htmlFor="library-type">Formato</Label><select id="library-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as typeof form.type })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="pdf">Documento ou PDF</option><option value="apostila">Apresentação ou apostila</option><option value="video">Vídeo por link</option><option value="devocional">Link ou devocional</option></select></div>
              <div className="space-y-2"><Label htmlFor="library-url">Link do material</Label><Input id="library-url" type="url" value={form.fileUrl} onChange={(event) => setForm({ ...form, fileUrl: event.target.value })} placeholder="https://..." /><p className="text-xs text-muted-foreground">Para PPTX ou DOCX, use o link do arquivo no armazenamento da igreja. Para vídeos, use YouTube ou Vimeo.</p></div>
              <div className="space-y-2"><Label htmlFor="library-description">Descrição</Label><Input id="library-description" maxLength={500} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Explique onde ou como este material será usado." /></div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button type="submit" className="bg-navy text-white" disabled={createMutation.isPending}>{createMutation.isPending ? "Salvando..." : "Adicionar ao acervo"}</Button></div>
            </form>
          </DialogContent>
        </Dialog> : null}
      </div>

      <div className="rounded-xl border border-gold/25 bg-gold/5 p-4"><div className="flex gap-3"><BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><div><p className="font-semibold text-navy">Biblioteca e Escola têm papéis diferentes.</p><p className="mt-1 text-sm text-muted-foreground">Aqui fica o material reutilizável. Na Escola de Fundamentos, a liderança monta a sequência de estudos, relacionando materiais deste acervo às turmas.</p></div></div></div>

      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar por título ou descrição..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div>
      <div className="flex flex-wrap gap-2">{CATEGORIES.map((item) => <button type="button" aria-pressed={category === item} key={item} onClick={() => setCategory(item)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${category === item ? "bg-navy text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{CATEGORY_LABELS[item]}</button>)}</div>

      {isLoading ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-muted/40" />)}</div> : items.length === 0 ? <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gold/30 p-12 text-center"><BookOpen className="h-12 w-12 text-muted-foreground/40" /><p className="font-medium text-navy">Nenhum material encontrado</p><p className="max-w-md text-sm text-muted-foreground">{search || category !== "Todos" ? "Tente outra busca ou filtro." : canManageMaterials ? "Adicione o primeiro material para reutilizá-lo nos estudos de Fundamentos." : "A liderança ainda não adicionou materiais ao acervo."}</p></div> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{items.map((item) => <article key={item.id} className="flex gap-4 rounded-xl border border-gold/20 bg-card p-4 transition-colors hover:border-gold/50"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">{FORMAT_ICONS[item.type] ?? <FileText className="h-5 w-5 text-muted-foreground" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h2 className="line-clamp-2 text-sm font-semibold text-navy">{item.title}</h2><Badge variant="outline" className="shrink-0 text-xs">{CATEGORY_LABELS[item.type] ?? item.type}</Badge></div>{item.description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p> : null}<div className="mt-3 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("pt-BR")}</span>{item.fileUrl ? <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:text-gold"><ExternalLink className="h-3.5 w-3.5" />Abrir</a> : <span className="text-xs text-muted-foreground">Sem link</span>}</div></div></article>)}</div>}
    </div>
  );
}
