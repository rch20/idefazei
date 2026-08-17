import { useState } from "react";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Users, Home, Heart, Baby, Plus, Search, Phone, MapPin } from "lucide-react";

export default function Familias() {
  const { churchId } = useChurch();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "" });

  const { data: families, isLoading, refetch } = trpc.families.list.useQuery(
    { churchId: churchId!, search },
    { enabled: !!churchId }
  );

  const createMutation = trpc.families.create.useMutation({
    onSuccess: () => {
      toast.success("Família cadastrada com sucesso!");
      setOpen(false);
      setForm({ name: "" });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Nome da família é obrigatório");
    createMutation.mutate({ churchId: churchId!, name: form.name });
  };

  return (
      <div className="p-6 max-w-5xl mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-navy">Famílias</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestão de núcleos familiares da igreja</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-navy text-white hover:bg-navy-light gap-2">
                <Plus className="w-4 h-4" />
                Nova Família
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display text-navy">Cadastrar Família</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="name">Nome da Família *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Família Silva"
                    value={form.name}
                    onChange={(e) => setForm({ name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-navy text-white" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Famílias Cadastradas", value: families?.length ?? 0, icon: Home, color: "text-blue-600" },
            { label: "Membros em Famílias", value: families?.reduce((a: number, f: { memberCount?: number | null }) => a + (f.memberCount ?? 0), 0) ?? 0, icon: Users, color: "text-green-600" },
            { label: "Famílias Completas", value: families?.filter((f: { fatherName?: string | null; motherName?: string | null }) => f.fatherName && f.motherName).length ?? 0, icon: Heart, color: "text-rose-600" },
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
            placeholder="Buscar família por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-sacred p-4 h-20 animate-pulse bg-muted" />
            ))}
          </div>
        ) : !families || families.length === 0 ? (
          <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
            <Home className="w-12 h-12 text-muted-foreground/40" />
            <p className="font-medium text-navy">Nenhuma família cadastrada</p>
            <p className="text-sm text-muted-foreground">Cadastre a primeira família da sua igreja</p>
          </div>
        ) : (
          <div className="space-y-3">
            {families.map((family: { id: number; name: string; fatherName?: string | null; motherName?: string | null; childrenCount?: number; memberCount?: number; phone?: string | null; address?: string | null }) => (
              <div key={family.id} className="card-sacred p-4 flex items-start gap-4 hover:border-gold/30 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 text-navy" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-navy">{family.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {family.memberCount ?? 0} membros
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {family.fatherName && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> Pai: {family.fatherName}
                      </span>
                    )}
                    {family.motherName && (
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" /> Mãe: {family.motherName}
                      </span>
                    )}
                    {family.childrenCount && family.childrenCount > 0 ? (
                      <span className="flex items-center gap-1">
                        <Baby className="w-3 h-3" /> {family.childrenCount} filho(s)
                      </span>
                    ) : null}
                    {family.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {family.phone}
                      </span>
                    )}
                    {family.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {family.address}
                      </span>
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
