import { useState } from "react";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { BookOpen, FileText, Video, Music, Search, ExternalLink } from "lucide-react";

const CATEGORIES = ["Todos", "pdf", "video", "apostila", "devocional"];
const CATEGORY_LABELS: Record<string, string> = {
  Todos: "Todos",
  pdf: "PDF",
  video: "Vídeos",
  apostila: "Apostilas",
  devocional: "Devocionais",
};

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-5 h-5 text-red-500" />,
  video: <Video className="w-5 h-5 text-blue-500" />,
  apostila: <BookOpen className="w-5 h-5 text-green-600" />,
  devocional: <Music className="w-5 h-5 text-purple-500" />,
};

export default function Biblioteca() {
  const { churchId } = useChurch();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; type: "pdf" | "video" | "apostila" | "devocional"; fileUrl: string; description: string }>({ title: "", type: "pdf", fileUrl: "", description: "" });

  const { data: items = [], isLoading, refetch } = trpc.library.list.useQuery(
    { churchId: churchId!, search: search || undefined, type: category !== "Todos" ? category : undefined },
    { enabled: !!churchId }
  );
  const createMutation = trpc.library.create.useMutation({
    onSuccess: () => {
      toast.success("Material adicionado à biblioteca!");
      setCreateOpen(false);
      setForm({ title: "", type: "pdf", fileUrl: "", description: "" });
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!churchId || !form.title.trim()) {
      toast.error("Informe o título do material.");
      return;
    }
    createMutation.mutate({
      churchId,
      title: form.title.trim(),
      type: form.type,
      fileUrl: form.fileUrl.trim() || undefined,
      description: form.description.trim() || undefined,
    });
  }

  return (
      <div className="p-6 max-w-5xl mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-navy">Biblioteca Digital</h1>
            <p className="text-sm text-muted-foreground mt-1">Recursos, estudos e materiais da sua igreja</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-navy text-white hover:bg-navy-light gap-2">+ Adicionar Material</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display text-navy">Adicionar Material</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="library-title">Título *</Label>
                  <Input id="library-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Guia de Discipulado" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="library-type">Tipo *</Label>
                  <select id="library-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as typeof form.type })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="pdf">PDF</option>
                    <option value="video">Vídeo</option>
                    <option value="apostila">Apostila</option>
                    <option value="devocional">Devocional</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="library-url">Link do material</Label>
                  <Input id="library-url" type="url" value={form.fileUrl} onChange={(event) => setForm({ ...form, fileUrl: event.target.value })} placeholder="https://..." className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="library-description">Descrição</Label>
                  <Input id="library-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Resumo do conteúdo" className="mt-1" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-navy text-white" disabled={createMutation.isPending}>{createMutation.isPending ? "Salvando..." : "Adicionar"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              type="button"
              aria-pressed={category === cat}
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                category === cat
                  ? "bg-navy text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Items grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card-sacred p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/40" />
            <p className="font-medium text-navy">Nenhum material encontrado</p>
            <p className="text-sm text-muted-foreground">
              {search || category !== "Todos"
                ? "Tente outra busca ou categoria"
                : "Adicione o primeiro material à biblioteca da sua igreja"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => (
              <div key={item.id} className="card-sacred p-4 flex gap-4 hover:border-gold/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  {FORMAT_ICONS[item.type] ?? <FileText className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-navy text-sm leading-tight">{item.title}</h3>
                    <Badge variant="outline" className="text-xs flex-shrink-0">{CATEGORY_LABELS[item.type] ?? item.type}</Badge>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    {item.fileUrl && (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title="Abrir"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}
