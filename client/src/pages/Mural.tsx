import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BookOpen, Megaphone, Pin, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  aviso: { label: "Aviso", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Megaphone },
  evento: { label: "Evento", color: "bg-amber-50 text-amber-700 border-amber-200", icon: BookOpen },
  comunicado: { label: "Comunicado", color: "bg-purple-50 text-purple-700 border-purple-200", icon: Megaphone },
  devocional: { label: "Devocional", color: "bg-green-50 text-green-700 border-green-200", icon: BookOpen },
};

export default function Mural() {
  const { churchId } = useChurch();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", type: "aviso" as const, pinned: false });

  const { data: announcements, isLoading, refetch } = trpc.announcements.list.useQuery({ churchId });
  const create = trpc.announcements.create.useMutation({
    onSuccess: () => {
      toast.success("Aviso publicado!");
      setOpen(false);
      setForm({ title: "", content: "", type: "aviso", pinned: false });
      refetch();
    },
    onError: () => toast.error("Erro ao publicar aviso"),
  });

  const pinned = (announcements ?? []).filter((a) => a.pinned);
  const regular = (announcements ?? []).filter((a) => !a.pinned);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Mural de Avisos</h1>
          <p className="text-sm text-muted-foreground mt-1">Comunicados, devocionais e avisos da igreja</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-navy hover:bg-navy-light text-white gap-2">
          <Plus className="w-4 h-4" />
          Novo Aviso
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Pin className="w-3 h-3" /> Fixados
              </h2>
              <div className="space-y-3">
                {pinned.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
              </div>
            </div>
          )}
          {regular.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recentes</h2>
              )}
              <div className="space-y-3 animate-stagger">
                {regular.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
              </div>
            </div>
          )}
          {(announcements ?? []).length === 0 && (
            <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                <Megaphone className="w-7 h-7 text-blue-500" />
              </div>
              <p className="font-semibold text-navy">Nenhum aviso publicado</p>
              <p className="text-sm text-muted-foreground">Publique o primeiro comunicado da sua igreja</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-navy flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-500" />
              Novo Aviso
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); create.mutate({ churchId, ...form }); }} className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([v, c]) => (
                    <SelectItem key={v} value={v}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conteúdo *</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} required />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="w-4 h-4 accent-navy" />
              <span className="text-sm">Fixar no topo do mural</span>
            </label>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-navy hover:bg-navy-light text-white" disabled={create.isPending}>
                {create.isPending ? "Publicando..." : "Publicar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnnouncementCard({ announcement }: { announcement: any }) {
  const cfg = TYPE_CONFIG[announcement.type] ?? TYPE_CONFIG.aviso;
  const Icon = cfg.icon;
  return (
    <div className={`card-sacred p-4 ${announcement.pinned ? "border-gold/30 bg-amber-50/20" : ""}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color.split(" ").slice(0, 1).join(" ")}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-navy">{announcement.title}</p>
            {announcement.pinned && <Pin className="w-3 h-3 text-gold" />}
          </div>
          <p className="text-sm text-foreground leading-relaxed">{announcement.content}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(announcement.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>
    </div>
  );
}
