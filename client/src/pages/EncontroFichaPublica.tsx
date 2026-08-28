import { FormEvent, useState } from "react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { TenantPublicShell } from "@/components/TenantPublicShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CalendarDays, CheckCircle2, Heart, Loader2, LockKeyhole, MapPin, Phone, UserRound, Users } from "lucide-react";

const emptyForm = {
  fullName: "",
  age: "",
  phone: "",
  guardianName: "",
  guardianPhone: "",
  friendName: "",
  friendPhone: "",
  attendingChurch: "",
  invitedByName: "",
  consentAccepted: false,
};

function phoneMask(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function EncontroFichaPublica() {
  const { token = "" } = useParams<{ token: string }>();
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  const publicForm = trpc.encontro.publicForm.get.useQuery(
    { token },
    { enabled: token.length >= 32, retry: false }
  );
  const submit = trpc.encontro.publicForm.submit.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const resolved = publicForm.data;
  const brand = {
    primaryColor: resolved?.church.primaryColor,
    secondaryColor: resolved?.church.secondaryColor,
  };

  function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!resolved) return;
    submit.mutate({
      token,
      fullName: form.fullName.trim(),
      age: Number(form.age),
      phone: form.phone,
      guardianName: form.guardianName.trim(),
      guardianPhone: form.guardianPhone,
      friendName: form.friendName.trim(),
      friendPhone: form.friendPhone,
      attendingChurch: form.attendingChurch.trim(),
      invitedByName: form.invitedByName.trim(),
      consentAccepted: true,
    });
  }

  if (publicForm.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f4ed]"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1e3a5f]" /><p className="mt-3 text-sm text-slate-600">Preparando sua ficha...</p></div></div>;
  }

  if (publicForm.error || !resolved) {
    return <TenantPublicShell brand={brand}><main className="flex min-h-screen items-center justify-center bg-[#f7f4ed] p-5"><Card className="w-full max-w-lg border-rose-200"><CardContent className="p-8 text-center"><AlertCircle className="mx-auto h-12 w-12 text-rose-500" /><h1 className="mt-4 font-display text-2xl font-bold text-[#1e3a5f]">Ficha indisponível</h1><p className="mt-3 text-sm leading-6 text-slate-600">Este link pode ter sido pausado, renovado ou encerrado. Solicite um novo endereço à liderança da igreja.</p><Link href="/"><Button variant="outline" className="mt-6">Ir para a página da igreja</Button></Link></CardContent></Card></main></TenantPublicShell>;
  }

  if (submitted) {
    return <TenantPublicShell brand={brand}><main className="flex min-h-screen items-center justify-center bg-[#f7f4ed] p-5"><Card className="w-full max-w-xl overflow-hidden border-0 shadow-xl"><div className="h-2" style={{ backgroundColor: resolved.church.secondaryColor ?? "#c9a84c" }} /><CardContent className="p-8 text-center sm:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-9 w-9 text-emerald-600" /></div><h1 className="mt-5 font-display text-3xl font-bold" style={{ color: resolved.church.primaryColor ?? "#1e3a5f" }}>Ficha recebida</h1><p className="mt-3 leading-7 text-slate-600">Sua ficha para o <strong>{resolved.event.name}</strong> foi enviada à equipe da {resolved.church.name}. A liderança fará a conferência e entrará em contato quando necessário.</p><div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left text-sm text-slate-600"><p className="flex gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />O envio não cria acesso ao painel. Seus dados serão usados somente na organização e no acompanhamento deste encontro.</p></div><Link href="/"><Button className="mt-7" style={{ backgroundColor: resolved.church.primaryColor ?? "#1e3a5f" }}>Voltar para a igreja</Button></Link></CardContent></Card></main></TenantPublicShell>;
  }

  const primaryColor = resolved.church.primaryColor ?? "#1e3a5f";
  const secondaryColor = resolved.church.secondaryColor ?? "#c9a84c";

  return (
    <TenantPublicShell brand={brand}>
      <div className="min-h-screen bg-[#f7f4ed] text-slate-800">
        <header className="border-b border-black/5 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 sm:px-6">
            {resolved.church.logoUrl ? <img src={resolved.church.logoUrl} alt={`Logo da ${resolved.church.name}`} className="h-11 w-11 rounded-xl object-contain" /> : <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ backgroundColor: primaryColor }}><Heart className="h-5 w-5" /></div>}
            <div className="min-w-0"><p className="truncate font-display text-lg font-bold" style={{ color: primaryColor }}>{resolved.church.name}</p><p className="text-xs text-slate-500">Ficha do discípulo</p></div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
          <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="p-6 text-white sm:p-8" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}e6)` }}>
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: secondaryColor }}><Heart className="h-4 w-4" /> Encontro com Deus</div>
              <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{resolved.event.name}</h1>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDate(resolved.event.date)}{resolved.event.endDate ? ` a ${formatDate(resolved.event.endDate)}` : ""}</span>{resolved.event.location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{resolved.event.location}</span>}</div>
            </div>

            <div className="border-b bg-white p-6 sm:p-8"><h2 className="font-display text-2xl font-bold" style={{ color: primaryColor }}>Preencha sua ficha</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Estas informações ajudam a equipe a preparar seu acolhimento e acompanhar sua participação. Você não precisa criar senha nem fazer login.</p></div>

            <form onSubmit={handleSubmit} className="space-y-8 p-6 sm:p-8">
              <FormSection icon={UserRound} title="Seus dados" description="Informe seus dados de contato.">
                <Field label="Nome completo" required><Input required minLength={3} maxLength={255} autoComplete="name" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} /></Field>
                <Field label="Idade" required><Input required type="number" min={1} max={120} inputMode="numeric" value={form.age} onChange={(event) => updateField("age", event.target.value)} /></Field>
                <Field label="Telefone ou WhatsApp" required className="sm:col-span-2"><Input required inputMode="tel" autoComplete="tel" minLength={14} maxLength={15} value={form.phone} onChange={(event) => updateField("phone", phoneMask(event.target.value))} placeholder="(00) 00000-0000" /></Field>
              </FormSection>

              <FormSection icon={Users} title="Contatos de referência" description="Informe alguém da família e um amigo de confiança.">
                <Field label="Nome da mãe, pai ou responsável" required><Input required minLength={2} maxLength={255} value={form.guardianName} onChange={(event) => updateField("guardianName", event.target.value)} /></Field>
                <Field label="Telefone do responsável" required><Input required inputMode="tel" minLength={14} maxLength={15} value={form.guardianPhone} onChange={(event) => updateField("guardianPhone", phoneMask(event.target.value))} placeholder="(00) 00000-0000" /></Field>
                <Field label="Nome de um amigo" required><Input required minLength={2} maxLength={255} value={form.friendName} onChange={(event) => updateField("friendName", event.target.value)} /></Field>
                <Field label="Telefone do amigo" required><Input required inputMode="tel" minLength={14} maxLength={15} value={form.friendPhone} onChange={(event) => updateField("friendPhone", phoneMask(event.target.value))} placeholder="(00) 00000-0000" /></Field>
              </FormSection>

              <FormSection icon={Heart} title="Sua caminhada" description="Conte de onde você vem e quem fez o convite.">
                <Field label="Igreja que participa" required><Input required minLength={2} maxLength={255} value={form.attendingChurch} onChange={(event) => updateField("attendingChurch", event.target.value)} placeholder="Se não participa, informe: não participo" /></Field>
                <Field label="Quem convidou para o encontro" required><Input required minLength={2} maxLength={255} value={form.invitedByName} onChange={(event) => updateField("invitedByName", event.target.value)} /></Field>
              </FormSection>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><input required type="checkbox" checked={form.consentAccepted} onChange={(event) => updateField("consentAccepted", event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300" style={{ accentColor: primaryColor }} /><span className="text-sm leading-6 text-slate-600">Confirmo que forneci estes dados para organização, segurança e acompanhamento do Encontro com Deus.</span></label>

              {submit.error && <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p>{submit.error.message}</p></div>}

              <Button type="submit" size="lg" className="h-12 w-full text-base font-semibold text-white" style={{ backgroundColor: primaryColor }} disabled={submit.isPending || !form.consentAccepted}>{submit.isPending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Enviando ficha...</> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Enviar minha ficha</>}</Button>
              <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" /> Seus dados ficam disponíveis somente para a equipe autorizada deste encontro.</p>
            </form>
          </section>
        </main>
        <footer className="border-t border-black/5 bg-white/70 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} {resolved.church.name} · Organização do Encontro com Deus</footer>
      </div>
    </TenantPublicShell>
  );
}

function FormSection({ icon: Icon, title, description, children }: { icon: typeof Phone; title: string; description: string; children: React.ReactNode }) {
  return <fieldset><legend className="sr-only">{title}</legend><div className="mb-4 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e3a5f]/5 text-[#1e3a5f]"><Icon className="h-5 w-5" /></span><div><h3 className="font-semibold text-[#1e3a5f]">{title}</h3><p className="mt-0.5 text-xs text-slate-500">{description}</p></div></div><div className="grid gap-4 sm:grid-cols-2">{children}</div></fieldset>;
}

function Field({ label, required, className = "", children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label className="mb-1.5 block text-sm text-slate-700">{label}{required && <span className="ml-1 text-rose-600" aria-hidden="true">*</span>}</Label>{children}</div>;
}
