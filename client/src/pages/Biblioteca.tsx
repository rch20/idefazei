import { useState } from "react";
import ChurchLayout, { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  const { data: items = [], isLoading } = trpc.library.list.useQuery(
    { churchId: churchId!, search: search || undefined, type: category !== "Todos" ? category : undefined },
    { enabled: !!churchId }
  );

  return (
    <ChurchLayout>
      <div className="p-6 max-w-5xl mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-navy">Biblioteca Digital</h1>
            <p className="text-sm text-muted-foreground mt-1">Recursos, estudos e materiais da sua igreja</p>
          </div>
          <Button
            className="bg-navy text-white hover:bg-navy-light gap-2"
            onClick={() => toast.info("Upload de material em breve!")}
          >
            + Adicionar Material
          </Button>
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
    </ChurchLayout>
  );
}
