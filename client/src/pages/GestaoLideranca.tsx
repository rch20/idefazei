import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Crown, Plus, Calendar, History, User } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  pastor_presidente: "Pastor Presidente",
  pastor_local: "Pastor Local",
  supervisor: "Supervisor",
  lider: "Líder",
  consolidador: "Consolidador",
  diacono: "Diácono",
  secretario: "Secretário",
  tesoureiro: "Tesoureiro",
  membro: "Membro",
};

const ROLE_COLORS: Record<string, string> = {
  pastor_presidente: "bg-yellow-100 text-yellow-800",
  pastor_local: "bg-orange-100 text-orange-800",
  supervisor: "bg-purple-100 text-purple-800",
  lider: "bg-blue-100 text-blue-800",
  consolidador: "bg-green-100 text-green-800",
  diacono: "bg-indigo-100 text-indigo-800",
  secretario: "bg-gray-100 text-gray-800",
  tesoureiro: "bg-emerald-100 text-emerald-800",
  membro: "bg-slate-100 text-slate-800",
};

export default function GestaoLideranca() {
  const { churchId } = useChurch();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    personId: "",
    role: "",
    startDate: "",
    endDate: "",
    ministry: "",
    notes: "",
  });
  const utils = trpc.useUtils();

  const { data: history, isLoading } = trpc.lideranca.list.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );
  const { data: people } = trpc.people.list.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );

  const addMutation = trpc.lideranca.add.useMutation({
    onSuccess: () => {
      toast.success("Histórico registrado com sucesso!");
      setAddOpen(false);
      setForm({ personId: "", role: "", startDate: "", endDate: "", ministry: "", notes: "" });
      utils.lideranca.list.invalidate();
    },
    onError: () => toast.error("Erro ao registrar histórico"),
  });

  if (!churchId) return null;

  // Group by person
  const grouped = (history ?? []).reduce<Record<number, { personName: string; entries: typeof history }>>((acc, item) => {
    const pid = item.history.personId;
    if (!acc[pid]) acc[pid] = { personName: item.person.fullName, entries: [] };
    acc[pid].entries!.push(item);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <Crown className="h-6 w-6 text-[#c9a84c]" />
            Gestão de Liderança
          </h1>
          <p className="text-muted-foreground mt-1">Histórico ministerial completo de cada líder</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90">
              <Plus className="h-4 w-4 mr-2" /> Registrar Histórico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Histórico Ministerial</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Pessoa *</Label>
                <Select value={form.personId} onValueChange={(v) => setForm({ ...form, personId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a pessoa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(people ?? []).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cargo/Função *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Data de Início *</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <Label>Data de Término</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Ministério</Label>
                <Input value={form.ministry} onChange={(e) => setForm({ ...form, ministry: e.target.value })} placeholder="Ex: Louvor, Jovens, Crianças..." />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
              <Button
                className="w-full bg-[#1e3a5f] text-white"
                disabled={!form.personId || !form.role || !form.startDate || addMutation.isPending}
                onClick={() => addMutation.mutate({
                  churchId: churchId!,
                  personId: Number(form.personId),
                  role: form.role as "pastor_presidente" | "pastor_local" | "supervisor" | "lider" | "consolidador" | "diacono" | "secretario" | "tesoureiro" | "membro",
                  startDate: form.startDate,
                  endDate: form.endDate || undefined,
                  ministry: form.ministry || undefined,
                  notes: form.notes || undefined,
                })}
              >
                {addMutation.isPending ? "Registrando..." : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-32 bg-muted/30" />)}
        </div>
      ) : Object.keys(grouped).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([personId, { personName, entries }]) => (
            <Card key={personId} className="border border-[#c9a84c]/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#1e3a5f] flex items-center gap-2">
                  <User className="h-5 w-5 text-[#c9a84c]" />
                  {personName}
                  <Badge variant="outline" className="ml-2 text-xs">
                    {entries?.length} registro{(entries?.length ?? 0) !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(entries ?? []).map((item) => (
                    <div key={item.history.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-muted">
                      <History className="h-4 w-4 text-[#c9a84c] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[item.history.role]}`}>
                            {ROLE_LABELS[item.history.role]}
                          </span>
                          {item.history.ministry && (
                            <span className="text-xs text-muted-foreground">— {item.history.ministry}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(item.history.startDate).toLocaleDateString("pt-BR")}
                            {item.history.endDate
                              ? ` até ${new Date(item.history.endDate).toLocaleDateString("pt-BR")}`
                              : " — atual"}
                          </span>
                        </div>
                        {item.history.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{item.history.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-[#c9a84c]/30">
          <CardContent className="p-12 text-center">
            <Crown className="h-12 w-12 text-[#c9a84c]/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">Nenhum histórico registrado</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Registre o histórico ministerial dos líderes para acompanhar sua trajetória na igreja.
            </p>
            <Button onClick={() => setAddOpen(true)} className="bg-[#1e3a5f] text-white">
              <Plus className="h-4 w-4 mr-2" /> Registrar Primeiro Histórico
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
