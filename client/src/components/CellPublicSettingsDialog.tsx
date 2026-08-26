import { OpenStreetMap } from "@/components/OpenStreetMap";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Eye, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const DAYS = [
  { value: "segunda", label: "Segunda-feira" },
  { value: "terca", label: "Terça-feira" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "quinta", label: "Quinta-feira" },
  { value: "sexta", label: "Sexta-feira" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
] as const;

type PublicCell = {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  meetingDay?: typeof DAYS[number]["value"] | null;
  meetingTime?: string | null;
  publicVisible?: boolean | null;
  publicLocationMode?: "approximate" | "exact" | null;
  publicLeaderContact?: boolean | null;
};

type CellPublicSettingsDialogProps = {
  churchId: number;
  cell: PublicCell | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (cell: PublicCell) => void;
};

function coordinateValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : "";
}

export function CellPublicSettingsDialog({ churchId, cell, open, onOpenChange, onSaved }: CellPublicSettingsDialogProps) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    address: "",
    city: "",
    neighborhood: "",
    latitude: "",
    longitude: "",
    meetingDay: "" as "" | typeof DAYS[number]["value"],
    meetingTime: "",
    publicVisible: false,
    publicLocationMode: "approximate" as "approximate" | "exact",
    publicLeaderContact: false,
  });

  useEffect(() => {
    if (!cell || !open) return;
    setForm({
      address: cell.address ?? "",
      city: cell.city ?? "",
      neighborhood: cell.neighborhood ?? "",
      latitude: coordinateValue(cell.latitude),
      longitude: coordinateValue(cell.longitude),
      meetingDay: cell.meetingDay ?? "",
      meetingTime: cell.meetingTime ?? "",
      publicVisible: Boolean(cell.publicVisible),
      publicLocationMode: cell.publicLocationMode ?? "approximate",
      publicLeaderContact: Boolean(cell.publicLeaderContact),
    });
  }, [cell, open]);

  const marker = useMemo(() => {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !cell) return [];
    return [{ id: cell.id, title: cell.name, latitude, longitude }];
  }, [cell, form.latitude, form.longitude]);

  const updateSettings = trpc.cells.updatePublicSettings.useMutation({
    onSuccess: async (saved) => {
      await utils.cells.list.invalidate({ churchId });
      toast.success("Configuração pública da Célula salva.");
      onSaved?.(saved as PublicCell);
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message || "Não foi possível salvar a configuração pública."),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!cell) return;
    const latitude = form.latitude.trim() === "" ? null : Number(form.latitude);
    const longitude = form.longitude.trim() === "" ? null : Number(form.longitude);
    if ((latitude !== null && !Number.isFinite(latitude)) || (longitude !== null && !Number.isFinite(longitude))) {
      toast.error("Informe coordenadas válidas ou escolha o ponto no mapa.");
      return;
    }
    if (form.publicVisible && (latitude === null || longitude === null)) {
      toast.error("Defina o ponto no mapa antes de publicar a Célula.");
      return;
    }
    updateSettings.mutate({
      churchId,
      cellId: cell.id,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      neighborhood: form.neighborhood.trim() || null,
      latitude,
      longitude,
      meetingDay: form.meetingDay || null,
      meetingTime: form.meetingTime || null,
      publicVisible: form.publicVisible,
      publicLocationMode: form.publicLocationMode,
      publicLeaderContact: form.publicLeaderContact,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-navy">
            <ShieldCheck className="h-5 w-5 text-gold" />
            Publicação da Célula {cell?.name}
          </DialogTitle>
          <DialogDescription>
            Somente Pastores podem tornar estes dados públicos. As opções começam privadas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <section className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="cell-public-visible" className="flex items-center gap-2 text-sm font-semibold text-navy"><Eye className="h-4 w-4" />Publicar esta Célula</Label>
                <p className="mt-1 text-xs text-muted-foreground">A Célula só aparecerá em “Visite-nos” quando esta opção estiver ativa e houver coordenadas.</p>
              </div>
              <Switch id="cell-public-visible" checked={form.publicVisible} onCheckedChange={(publicVisible) => setForm((current) => ({ ...current, publicVisible }))} />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border p-4">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" /><h3 className="text-sm font-semibold text-navy">Local e encontro</h3></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><Label>Endereço interno</Label><Input className="mt-1" value={form.address} maxLength={500} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Rua, número e complemento" /></label>
              <label><Label>Bairro</Label><Input className="mt-1" value={form.neighborhood} maxLength={100} onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))} /></label>
              <label><Label>Cidade</Label><Input className="mt-1" value={form.city} maxLength={100} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} /></label>
              <label><Label>Dia da semana</Label><Select value={form.meetingDay || "none"} onValueChange={(value) => setForm((current) => ({ ...current, meetingDay: value === "none" ? "" : value as typeof DAYS[number]["value"] }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Não informado</SelectItem>{DAYS.map((day) => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}</SelectContent></Select></label>
              <label><Label>Horário</Label><Input className="mt-1" type="time" value={form.meetingTime} onChange={(event) => setForm((current) => ({ ...current, meetingTime: event.target.value }))} /></label>
              <label><Label>Latitude</Label><Input className="mt-1 font-mono" inputMode="decimal" value={form.latitude} onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))} placeholder="-23.5505" /></label>
              <label><Label>Longitude</Label><Input className="mt-1 font-mono" inputMode="decimal" value={form.longitude} onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))} placeholder="-46.6333" /></label>
            </div>
            <OpenStreetMap
              className="h-[340px]"
              markers={marker}
              selectedId={cell?.id ?? null}
              initialCenter={marker[0] ?? undefined}
              initialZoom={marker.length ? 15 : 5}
              onLocationSelect={({ latitude, longitude }) => setForm((current) => ({ ...current, latitude: latitude.toFixed(7), longitude: longitude.toFixed(7) }))}
              ariaLabel="Mapa para escolher a localização pública da célula"
            />
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
              <Label>Precisão pública</Label>
              <Select value={form.publicLocationMode} onValueChange={(value: "approximate" | "exact") => setForm((current) => ({ ...current, publicLocationMode: value }))}>
                <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="approximate">Aproximada — mostra somente a região</SelectItem><SelectItem value="exact">Exata — permite endereço e rota direta</SelectItem></SelectContent>
              </Select>
              <p className="mt-2 text-xs text-amber-900">Para encontros em residências, prefira a localização aproximada. O endereço completo não será enviado ao visitante.</p>
            </div>
          </section>

          <section className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="cell-public-contact" className="flex items-center gap-2 text-sm font-semibold text-navy"><MessageCircle className="h-4 w-4" />Exibir WhatsApp do líder</Label>
                <p className="mt-1 text-xs text-muted-foreground">Ative somente com autorização do líder. O número deve estar cadastrado na ficha da Pessoa.</p>
              </div>
              <Switch id="cell-public-contact" checked={form.publicLeaderContact} onCheckedChange={(publicLeaderContact) => setForm((current) => ({ ...current, publicLeaderContact }))} />
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updateSettings.isPending}>Cancelar</Button>
            <Button type="submit" className="bg-navy text-white hover:bg-navy-light" disabled={!cell || updateSettings.isPending}>{updateSettings.isPending ? "Salvando…" : "Salvar configuração"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
