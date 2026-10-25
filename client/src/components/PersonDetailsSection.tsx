import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatContactPhone, getWhatsAppLink } from "@/lib/whatsapp";

type PersonRow = {
  id: number;
  fullName: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  birthDate?: Date | string | null;
  gender?: "masculino" | "feminino" | "outro" | null;
  maritalStatus?: "solteiro" | "casado" | "divorciado" | "viuvo" | "uniao_estavel" | null;
  profession?: string | null;
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  conversionDate?: Date | string | null;
  baptismDate?: Date | string | null;
  previousChurch?: string | null;
  declaredBaptized?: boolean | null;
  declaredBaptismDate?: Date | string | null;
  pastoralNotes?: string | null;
  photoUrl?: string | null;
  pendingPhotoUrl?: string | null;
};

const GENDER_LABELS = { masculino: "Masculino", feminino: "Feminino", outro: "Outro" } as const;
const MARITAL_LABELS = { solteiro: "Solteiro(a)", casado: "Casado(a)", divorciado: "Divorciado(a)", viuvo: "Viúvo(a)", uniao_estavel: "União estável" } as const;

/** Data civil sem deslocar o dia por fuso: usa só a parte AAAA-MM-DD. */
function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const iso = value instanceof Date ? value.toISOString() : String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : "";
}

function formatDate(value: Date | string | null | undefined) {
  const input = toDateInput(value);
  return input ? input.split("-").reverse().join("/") : "—";
}

type FormState = {
  fullName: string; phone: string; whatsapp: string; email: string; birthDate: string; gender: string; maritalStatus: string; profession: string;
  zipCode: string; street: string; number: string; neighborhood: string; city: string; state: string;
  conversionDate: string; baptismDate: string; previousChurch: string; pastoralNotes: string;
};

function toForm(person: PersonRow): FormState {
  return {
    fullName: person.fullName ?? "", phone: person.phone ?? "", whatsapp: person.whatsapp ?? "", email: person.email ?? "",
    birthDate: toDateInput(person.birthDate), gender: person.gender ?? "", maritalStatus: person.maritalStatus ?? "", profession: person.profession ?? "",
    zipCode: person.zipCode ?? "", street: person.street ?? "", number: person.number ?? "", neighborhood: person.neighborhood ?? "", city: person.city ?? "", state: person.state ?? "",
    conversionDate: toDateInput(person.conversionDate), baptismDate: toDateInput(person.baptismDate), previousChurch: person.previousChurch ?? "", pastoralNotes: person.pastoralNotes ?? "",
  };
}

type Props = {
  person: PersonRow;
  churchId: number;
  canEdit: boolean;
  canSeeNotes: boolean;
  onSaved: (person: PersonRow | null) => void | Promise<void>;
};

/** Dados cadastrais da pessoa: leitura para quem acessa a ficha e edição para quem administra a igreja. */
export default function PersonDetailsSection({ person, churchId, canEdit, canSeeNotes, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() => toForm(person));
  const update = trpc.people.updateDetails.useMutation({
    onSuccess: async (result) => {
      toast.success("Dados da pessoa atualizados.");
      setEditing(false);
      await onSaved((result.person as PersonRow | null) ?? null);
    },
    onError: (error) => toast.error(error.message || "Não foi possível salvar os dados."),
  });
  const approvePhoto = trpc.people.approvePhoto.useMutation({
    onSuccess: async (result) => {
      toast.success("Foto aprovada. Já aparece para a pessoa.");
      await onSaved((result as PersonRow | null) ?? null);
    },
    onError: (error) => toast.error(error.message || "Não foi possível aprovar a foto."),
  });
  const rejectPhoto = trpc.people.rejectPhoto.useMutation({
    onSuccess: async (result) => {
      toast.success("Foto recusada e descartada.");
      await onSaved((result as PersonRow | null) ?? null);
    },
    onError: (error) => toast.error(error.message || "Não foi possível recusar a foto."),
  });
  const photoBusy = approvePhoto.isPending || rejectPhoto.isPending;
  const set = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));
  const orNull = (value: string) => (value.trim() ? value.trim() : null);

  function save() {
    update.mutate({
      id: person.id,
      churchId,
      fullName: form.fullName.trim(),
      phone: orNull(form.phone),
      whatsapp: orNull(form.whatsapp),
      email: orNull(form.email),
      birthDate: orNull(form.birthDate),
      gender: (orNull(form.gender) as "masculino" | "feminino" | "outro" | null),
      maritalStatus: (orNull(form.maritalStatus) as "solteiro" | "casado" | "divorciado" | "viuvo" | "uniao_estavel" | null),
      profession: orNull(form.profession),
      zipCode: orNull(form.zipCode),
      street: orNull(form.street),
      number: orNull(form.number),
      neighborhood: orNull(form.neighborhood),
      city: orNull(form.city),
      state: orNull(form.state),
      conversionDate: orNull(form.conversionDate),
      baptismDate: orNull(form.baptismDate),
      previousChurch: orNull(form.previousChurch),
      pastoralNotes: orNull(form.pastoralNotes),
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const whatsappLink = getWhatsAppLink(person.whatsapp ?? person.phone, person.fullName);
  const address = [person.street, person.number, person.neighborhood, [person.city, person.state].filter(Boolean).join("/")].filter(Boolean).join(", ");

  if (!editing) {
    const rows: Array<[string, string]> = [
      ["Telefone", person.phone ? formatContactPhone(person.phone) ?? "—" : "—"],
      ["WhatsApp", person.whatsapp ? formatContactPhone(person.whatsapp) ?? "—" : "—"],
      ["E-mail", person.email || "—"],
      ["Nascimento", formatDate(person.birthDate)],
      ["Sexo", person.gender ? GENDER_LABELS[person.gender] : "—"],
      ["Estado civil", person.maritalStatus ? MARITAL_LABELS[person.maritalStatus] : "—"],
      ["Profissão", person.profession || "—"],
      ["Endereço", address || "—"],
      ["CEP", person.zipCode || "—"],
      ["Data de conversão", formatDate(person.conversionDate)],
      ["Data de batismo", formatDate(person.baptismDate)],
      ...(!person.baptismDate && person.declaredBaptized
        ? ([["Batismo informado pelo membro", `Sim (em outra igreja)${person.declaredBaptismDate ? ` — ${formatDate(person.declaredBaptismDate)}` : ""} · confirme para registrar oficialmente`]] as [string, string][])
        : []),
      ["Igreja anterior", person.previousChurch || "—"],
    ];
    return (
      <section aria-label="Dados da pessoa" className="rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-navy">Dados da pessoa</h3>
            <p className="mt-1 text-xs text-muted-foreground">Contato, endereço e dados espirituais. A etapa de formação e os cursos ficam na aba Prontuário.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {whatsappLink && <Button asChild type="button" size="sm" variant="outline" className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"><a href={whatsappLink} target="_blank" rel="noreferrer">Abrir WhatsApp</a></Button>}
            {canEdit && <Button type="button" size="sm" className="bg-navy text-white hover:bg-navy-light" onClick={() => { setForm(toForm(person)); setEditing(true); }}>Editar dados</Button>}
          </div>
        </div>

        {canEdit && person.pendingPhotoUrl ? (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/60 p-3">
            <p className="text-xs font-semibold text-amber-900">Foto de perfil aguardando aprovação</p>
            <p className="mt-0.5 text-[11px] text-amber-800/80">A pessoa enviou uma nova foto. Aprove para exibi-la ou recuse para descartá-la.</p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <figure className="text-center">
                <img src={person.pendingPhotoUrl} alt="Foto enviada (pendente)" className="h-20 w-20 rounded-full object-cover ring-2 ring-amber-400" />
                <figcaption className="mt-1 text-[10px] text-amber-800">Nova (pendente)</figcaption>
              </figure>
              {person.photoUrl && (
                <figure className="text-center opacity-80">
                  <img src={person.photoUrl} alt="Foto atual" className="h-16 w-16 rounded-full object-cover" />
                  <figcaption className="mt-1 text-[10px] text-muted-foreground">Atual</figcaption>
                </figure>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={photoBusy} onClick={() => approvePhoto.mutate({ churchId, personId: person.id })}>
                  {approvePhoto.isPending ? "Aprovando..." : "Aprovar foto"}
                </Button>
                <Button type="button" size="sm" variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50" disabled={photoBusy} onClick={() => rejectPhoto.mutate({ churchId, personId: person.id })}>
                  {rejectPhoto.isPending ? "Recusando..." : "Recusar"}
                </Button>
              </div>
            </div>
          </div>
        ) : person.photoUrl ? (
          <div className="mt-4 flex items-center gap-3">
            <img src={person.photoUrl} alt={`Foto de ${person.fullName}`} className="h-14 w-14 rounded-full object-cover" />
            <span className="text-xs text-muted-foreground">Foto de perfil aprovada.</span>
          </div>
        ) : null}

        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 break-words text-sm text-navy">{value}</dd>
            </div>
          ))}
        </dl>
        {canSeeNotes && (
          <div className="mt-4 rounded-lg border border-gold/25 bg-gold/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Observações pastorais</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-navy">{person.pastoralNotes || "Nenhuma observação."}</p>
          </div>
        )}
        {!canEdit && <p className="mt-3 text-xs text-muted-foreground">Os dados são atualizados pela secretaria ou pela liderança pastoral.</p>}
      </section>
    );
  }

  return (
    <section aria-label="Editar dados da pessoa" className="rounded-xl border border-gold/30 bg-gold/5 p-4">
      <h3 className="text-sm font-semibold text-navy">Editar dados da pessoa</h3>
      <p className="mt-1 text-xs text-muted-foreground">Deixe em branco o que não souber. Telefone e WhatsApp precisam ter DDD e não podem repetir os de outra pessoa.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="pd-name">Nome completo *</Label><Input id="pd-name" value={form.fullName} maxLength={255} onChange={(e) => set({ fullName: e.target.value })} className="mt-1 bg-background" /></div>
        <div><Label htmlFor="pd-phone">Telefone</Label><Input id="pd-phone" inputMode="tel" value={form.phone} maxLength={20} onChange={(e) => set({ phone: e.target.value })} className="mt-1 bg-background" placeholder="(11) 3333-4444" /></div>
        <div><Label htmlFor="pd-whatsapp">WhatsApp</Label><Input id="pd-whatsapp" inputMode="tel" value={form.whatsapp} maxLength={20} onChange={(e) => set({ whatsapp: e.target.value })} className="mt-1 bg-background" placeholder="(11) 99999-8888" /></div>
        <div className="sm:col-span-2"><Label htmlFor="pd-email">E-mail</Label><Input id="pd-email" type="email" value={form.email} maxLength={320} onChange={(e) => set({ email: e.target.value })} className="mt-1 bg-background" /></div>
        <div><Label htmlFor="pd-birth">Nascimento</Label><Input id="pd-birth" type="date" max={today} value={form.birthDate} onChange={(e) => set({ birthDate: e.target.value })} className="mt-1 bg-background" /></div>
        <div><Label htmlFor="pd-profession">Profissão</Label><Input id="pd-profession" value={form.profession} maxLength={100} onChange={(e) => set({ profession: e.target.value })} className="mt-1 bg-background" /></div>
        <div>
          <Label htmlFor="pd-gender">Sexo</Label>
          <Select value={form.gender || "none"} onValueChange={(value) => set({ gender: value === "none" ? "" : value })}>
            <SelectTrigger id="pd-gender" className="mt-1 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">Não informado</SelectItem>{Object.entries(GENDER_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="pd-marital">Estado civil</Label>
          <Select value={form.maritalStatus || "none"} onValueChange={(value) => set({ maritalStatus: value === "none" ? "" : value })}>
            <SelectTrigger id="pd-marital" className="mt-1 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">Não informado</SelectItem>{Object.entries(MARITAL_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="pd-zip">CEP</Label><Input id="pd-zip" value={form.zipCode} maxLength={9} onChange={(e) => set({ zipCode: e.target.value })} className="mt-1 bg-background" /></div>
        <div className="sm:col-span-2 grid gap-3 sm:grid-cols-[1fr_6rem]">
          <div><Label htmlFor="pd-street">Rua</Label><Input id="pd-street" value={form.street} maxLength={255} onChange={(e) => set({ street: e.target.value })} className="mt-1 bg-background" /></div>
          <div><Label htmlFor="pd-number">Número</Label><Input id="pd-number" value={form.number} maxLength={10} onChange={(e) => set({ number: e.target.value })} className="mt-1 bg-background" /></div>
        </div>
        <div><Label htmlFor="pd-neighborhood">Bairro</Label><Input id="pd-neighborhood" value={form.neighborhood} maxLength={100} onChange={(e) => set({ neighborhood: e.target.value })} className="mt-1 bg-background" /></div>
        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <div><Label htmlFor="pd-city">Cidade</Label><Input id="pd-city" value={form.city} maxLength={100} onChange={(e) => set({ city: e.target.value })} className="mt-1 bg-background" /></div>
          <div><Label htmlFor="pd-state">UF</Label><Input id="pd-state" value={form.state} maxLength={2} onChange={(e) => set({ state: e.target.value.toUpperCase() })} className="mt-1 bg-background" /></div>
        </div>
        <div><Label htmlFor="pd-conversion">Data de conversão</Label><Input id="pd-conversion" type="date" max={today} value={form.conversionDate} onChange={(e) => set({ conversionDate: e.target.value })} className="mt-1 bg-background" /></div>
        <div><Label htmlFor="pd-baptism">Data de batismo</Label><Input id="pd-baptism" type="date" max={today} value={form.baptismDate} onChange={(e) => set({ baptismDate: e.target.value })} className="mt-1 bg-background" /></div>
        <div className="sm:col-span-2"><Label htmlFor="pd-previous">Igreja anterior</Label><Input id="pd-previous" value={form.previousChurch} maxLength={255} onChange={(e) => set({ previousChurch: e.target.value })} className="mt-1 bg-background" /></div>
        {canSeeNotes && <div className="sm:col-span-2"><Label htmlFor="pd-notes">Observações pastorais</Label><Textarea id="pd-notes" rows={3} maxLength={2000} value={form.pastoralNotes} onChange={(e) => set({ pastoralNotes: e.target.value })} className="mt-1 bg-background" /></div>}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={update.isPending} onClick={() => setEditing(false)}>Cancelar</Button>
        <Button type="button" className="bg-navy text-white hover:bg-navy-light" disabled={update.isPending || form.fullName.trim().length < 2} onClick={save}>{update.isPending ? "Salvando…" : "Salvar dados"}</Button>
      </div>
    </section>
  );
}
