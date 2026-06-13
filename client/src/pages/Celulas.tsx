import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { Globe, MapPin, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DAYS = [
  { value: "segunda", label: "Segunda-feira" },
  { value: "terca", label: "Terça-feira" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "quinta", label: "Quinta-feira" },
  { value: "sexta", label: "Sexta-feira" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

const defaultForm = {
  name: "",
  leaderId: 1,
  address: "",
  city: "",
  neighborhood: "",
  meetingDay: "quarta" as const,
  meetingTime: "19:30",
};

export default function Celulas() {
  const { churchId } = useChurch();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("lista");
  const [form, setForm] = useState(defaultForm);
  const [mapReady, setMapReady] = useState(false);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  const { data: cells, isLoading, refetch } = trpc.cells.list.useQuery({ churchId });
  const createCell = trpc.cells.create.useMutation({
    onSuccess: () => {
      toast.success("Célula criada com sucesso!");
      setOpen(false);
      setForm(defaultForm);
      refetch();
    },
    onError: () => toast.error("Erro ao criar célula"),
  });

  function handleMapReady(map: google.maps.Map) {
    setMapReady(true);
    // Plot existing cells on map
    (cells ?? []).forEach((cell) => {
      if (cell.latitude && cell.longitude) {
        const marker = new google.maps.Marker({
          position: {
            lat: parseFloat(String(cell.latitude)),
            lng: parseFloat(String(cell.longitude)),
          },
          map,
          title: cell.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#c9a84c",
            fillOpacity: 0.9,
            strokeColor: "#1e3a5f",
            strokeWeight: 2,
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family: Inter, sans-serif; padding: 4px;">
              <strong style="color: #1e3a5f;">${cell.name}</strong><br/>
              <span style="font-size: 12px; color: #666;">${cell.neighborhood ?? ""} · ${cell.city ?? ""}</span><br/>
              <span style="font-size: 12px; color: #c9a84c;">${DAYS.find(d => d.value === cell.meetingDay)?.label ?? ""} ${cell.meetingTime ?? ""}</span>
            </div>
          `,
        });

        marker.addListener("click", () => infoWindow.open(map, marker));
        setMarkers((prev) => [...prev, marker]);
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createCell.mutate({ churchId, ...form });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Células</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os grupos de célula da sua igreja
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-navy hover:bg-navy-light text-white gap-2">
          <Plus className="w-4 h-4" />
          Nova Célula
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="metric-card">
          <Globe className="w-5 h-5 text-indigo-600" />
          <p className="text-2xl font-bold font-display text-navy">{(cells ?? []).length}</p>
          <p className="text-sm text-muted-foreground">Células Ativas</p>
        </div>
        <div className="metric-card">
          <MapPin className="w-5 h-5 text-gold" />
          <p className="text-2xl font-bold font-display text-navy">
            {(cells ?? []).filter((c) => c.latitude).length}
          </p>
          <p className="text-sm text-muted-foreground">Com Localização</p>
        </div>
        <div className="metric-card">
          <Users className="w-5 h-5 text-green-600" />
          <p className="text-2xl font-bold font-display text-navy">—</p>
          <p className="text-sm text-muted-foreground">Membros em Células</p>
        </div>
      </div>

      {/* Tabs: Lista / Mapa */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="mapa">Mapa Geográfico</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (cells ?? []).length === 0 ? (
            <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center">
                <Globe className="w-7 h-7 text-indigo-600" />
              </div>
              <p className="font-semibold text-navy">Nenhuma célula cadastrada</p>
              <p className="text-sm text-muted-foreground">Crie a primeira célula da sua igreja</p>
            </div>
          ) : (
            <div className="space-y-3 animate-stagger">
              {(cells ?? []).map((cell) => (
                <div key={cell.id} className="card-sacred p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy">{cell.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {cell.neighborhood && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {cell.neighborhood}, {cell.city}
                        </span>
                      )}
                      {cell.meetingDay && (
                        <span className="text-xs text-gold font-medium">
                          {DAYS.find((d) => d.value === cell.meetingDay)?.label} {cell.meetingTime}
                        </span>
                      )}
                    </div>
                  </div>
                  {cell.latitude && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                      No mapa
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mapa" className="mt-4">
          <div className="card-sacred p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-gold" />
              <p className="text-sm font-semibold text-navy">Mapa de Células</p>
              <span className="text-xs text-muted-foreground ml-auto">
                {(cells ?? []).filter((c) => c.latitude).length} células mapeadas
              </span>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ height: "450px" }}>
              <MapView
                onMapReady={handleMapReady}
                initialCenter={{ lat: -15.7801, lng: -47.9292 }}
                initialZoom={5}
              />
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gold border-2 border-navy" />
                <span>Célula ativa</span>
              </div>
              <p className="ml-auto">Clique nos marcadores para ver detalhes</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-navy flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              Nova Célula
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome da Célula *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="col-span-2">
                <Label>Endereço</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número" />
              </div>
              <div>
                <Label>Bairro</Label>
                <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>Dia da Semana</Label>
                <Select value={form.meetingDay} onValueChange={(v) => setForm({ ...form, meetingDay: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" value={form.meetingTime} onChange={(e) => setForm({ ...form, meetingTime: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-navy hover:bg-navy-light text-white" disabled={createCell.isPending}>
                {createCell.isPending ? "Salvando..." : "Criar Célula"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
