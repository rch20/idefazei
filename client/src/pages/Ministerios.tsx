import { useState } from "react";
import ChurchLayout, { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Music, Users, Plus, Search, Star } from "lucide-react";

const MINISTRY_ICONS: Record<string, string> = {
  louvor: "🎵",
  jovens: "⚡",
  criancas: "🌟",
  intercessao: "🙏",
  evangelismo: "🌍",
  diaconia: "🤝",
  comunicacao: "📡",
  default: "✨",
};

export default function Ministerios() {
  const { churchId } = useChurch();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data: ministries, isLoading, refetch } = trpc.ministries.list.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );

  const createMutation = trpc.ministries.create.useMutation({
    onSuccess: () => {
      toast.success("Ministério criado com sucesso!");
      setOpen(false);
      setForm({ name: "", description: "" });
      refetch();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Nome do ministério é obrigatório");
    createMutation.mutate({ churchId: churchId!, name: form.name, description: form.description });
  };

  const filtered = ministries?.filter((m: { name: string }) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <ChurchLayout>
      <div className="p-6 max-w-5xl mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-navy">Ministérios</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie os ministérios e equipes da sua igreja</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-navy text-white hover:bg-navy-light gap-2">
                <Plus className="w-4 h-4" />
                Novo Ministério
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display text-navy">Criar Ministério</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="name">Nome do Ministério *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Ministério de Louvor"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Breve descrição do ministério..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-navy text-white" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Ministérios Ativos", value: ministries?.length ?? 0, icon: Music, color: "text-purple-600" },
            { label: "Total de Membros", value: ministries?.reduce((a: number, m: { memberCount?: number }) => a + (m.memberCount ?? 0), 0) ?? 0, icon: Users, color: "text-blue-600" },
            { label: "Com Líder Definido", value: ministries?.filter((m: { leaderId?: number | null }) => m.leaderId).length ?? 0, icon: Star, color: "text-gold" },
          ].map((stat) => (
            <div key={stat.label} className="card-sacred p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-navy">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ministério..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card-sacred p-5 h-32 animate-pulse bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
            <Music className="w-12 h-12 text-muted-foreground/40" />
            <p className="font-medium text-navy">Nenhum ministério cadastrado</p>
            <p className="text-sm text-muted-foreground">Crie o primeiro ministério da sua igreja</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((ministry: { id: number; name: string; description?: string | null; memberCount?: number; leaderId?: number | null; leaderName?: string | null }) => {
              const key = ministry.name.toLowerCase().replace(/\s+/g, "");
              const icon = Object.keys(MINISTRY_ICONS).find((k) => key.includes(k)) ?? "default";
              return (
                <div key={ministry.id} className="card-sacred p-5 hover:border-gold/30 transition-all cursor-pointer group">
                  <div className="text-3xl mb-3">{MINISTRY_ICONS[icon]}</div>
                  <h3 className="font-semibold text-navy text-sm mb-1">{ministry.name}</h3>
                  {ministry.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ministry.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-auto">
                    <Badge variant="outline" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {ministry.memberCount ?? 0} membros
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ChurchLayout>
  );
}
