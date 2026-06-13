import { useChurch } from "@/components/ChurchLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Flame, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ORIGINS = [
  { value: "culto", label: "Culto" },
  { value: "evangelismo", label: "Evangelismo" },
  { value: "celula", label: "Célula" },
  { value: "evento", label: "Evento" },
  { value: "redes_sociais", label: "Redes Sociais" },
  { value: "indicacao", label: "Indicação" },
];

const STATUS_MAP = {
  nova_alma: { label: "Nova Alma", class: "badge-nova-alma" },
  em_consolidacao: { label: "Em Consolidação", class: "badge-consolidacao" },
  consolidado: { label: "Consolidado", class: "badge-celula" },
};

export default function GanharAlmas() {
  const { churchId } = useChurch();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    decisionDate: new Date().toISOString().split("T")[0],
    origin: "culto" as const,
    acceptedJesus: true,
    reconciliation: false,
    firstVisit: false,
    wonById: 1,
    notes: "",
  });

  const { data: souls, isLoading, refetch } = trpc.souls.list.useQuery({ churchId });
  const createSoul = trpc.souls.create.useMutation({
    onSuccess: () => {
      toast.success("Nova alma registrada com sucesso!");
      setOpen(false);
      setForm({ ...form, name: "", phone: "", address: "", notes: "" });
      refetch();
    },
    onError: () => toast.error("Erro ao registrar nova alma"),
  });

  const filtered = (souls ?? []).filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createSoul.mutate({ churchId, ...form });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Ganhar Almas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registre novas conversões e decisões
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-navy hover:bg-navy-light text-white gap-2">
          <Plus className="w-4 h-4" />
          Nova Alma
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(["nova_alma", "em_consolidacao", "consolidado"] as const).map((status) => {
          const count = (souls ?? []).filter((s) => s.status === status).length;
          const cfg = STATUS_MAP[status];
          return (
            <div key={status} className="metric-card">
              <p className="text-2xl font-bold font-display text-navy">{count}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.class}`}>
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
            <Flame className="w-7 h-7 text-amber-500" />
          </div>
          <p className="font-semibold text-navy">Nenhuma alma registrada</p>
          <p className="text-sm text-muted-foreground">
            Comece registrando a primeira decisão de fé
          </p>
        </div>
      ) : (
        <div className="space-y-3 animate-stagger">
          {filtered.map((soul) => {
            const cfg = STATUS_MAP[soul.status];
            return (
              <div key={soul.id} className="card-sacred p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Flame className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy">{soul.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {soul.phone && (
                      <span className="text-xs text-muted-foreground">{soul.phone}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {ORIGINS.find((o) => o.value === soul.origin)?.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(soul.decisionDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {soul.acceptedJesus && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                      Aceitou Jesus
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.class}`}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-navy flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              Registrar Nova Alma
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label>Data da Decisão *</Label>
                <Input
                  type="date"
                  value={form.decisionDate}
                  onChange={(e) => setForm({ ...form, decisionDate: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-2">
                <Label>Origem *</Label>
                <Select
                  value={form.origin}
                  onValueChange={(v) => setForm({ ...form, origin: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGINS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Endereço</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Rua, número, bairro"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Informações da Decisão</Label>
              {[
                { key: "acceptedJesus", label: "Aceitou Jesus?" },
                { key: "reconciliation", label: "Reconciliação?" },
                { key: "firstVisit", label: "Primeira visita?" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    className="w-4 h-4 accent-navy"
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observações sobre a decisão..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-navy hover:bg-navy-light text-white"
                disabled={createSoul.isPending}
              >
                {createSoul.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
