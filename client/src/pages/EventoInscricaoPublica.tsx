import { AlertCircle, CalendarDays, CheckCircle2, Heart, Loader2, LockKeyhole, MapPin, UsersRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "wouter";
import { TenantPublicShell } from "@/components/TenantPublicShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

const EMPTY_FORM = {
  participantName: "",
  participantPhone: "",
  companionName: "",
  email: "",
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function flyerAspectClass(format: string | null | undefined) {
  if (format === "screen") return "aspect-video";
  if (format === "stories") return "aspect-[9/16]";
  return "aspect-[4/5]";
}

export default function EventoInscricaoPublica() {
  const { token = "" } = useParams<{ token: string }>();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const registration = trpc.events.publicRegistration.get.useQuery(
    { token },
    { enabled: token.length >= 32, retry: false },
  );
  const submit = trpc.events.publicRegistration.submit.useMutation({
    onSuccess: () => setSubmitted(true),
  });
  const resolved = registration.data;
  const brand = {
    primaryColor: resolved?.church.primaryColor,
    secondaryColor: resolved?.church.secondaryColor,
  };
  const primaryColor = resolved?.church.primaryColor ?? "#1e3a5f";
  const secondaryColor = resolved?.church.secondaryColor ?? "#c9a84c";
  const isCouple = resolved?.event.registrationMode === "casal";

  function updateField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resolved) return;
    submit.mutate({
      token,
      participantName: form.participantName.trim(),
      participantPhone: form.participantPhone.trim(),
      companionName: isCouple ? form.companionName.trim() : undefined,
      email: form.email.trim(),
    });
  }

  if (registration.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f4ed]"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1e3a5f]" /><p className="mt-3 text-sm text-slate-600">Preparando a inscrição...</p></div></div>;
  }

  if (registration.error || !resolved) {
    return <TenantPublicShell brand={brand}><main className="flex min-h-screen items-center justify-center bg-[#f7f4ed] p-5"><Card className="w-full max-w-lg border-rose-200"><CardContent className="p-8 text-center"><AlertCircle className="mx-auto h-12 w-12 text-rose-500" /><h1 className="mt-4 font-display text-2xl font-bold text-[#1e3a5f]">Inscrição indisponível</h1><p className="mt-3 text-sm leading-6 text-slate-600">Este link pode ter sido pausado, renovado ou o período de inscrição pode ter encerrado. Solicite um novo link à liderança da igreja.</p><Link href="/"><Button variant="outline" className="mt-6">Ir para a página da igreja</Button></Link></CardContent></Card></main></TenantPublicShell>;
  }

  if (submitted) {
    return <TenantPublicShell brand={brand}><main className="flex min-h-screen items-center justify-center bg-[#f7f4ed] p-5"><Card className="w-full max-w-xl overflow-hidden border-0 shadow-xl"><div className="h-2" style={{ backgroundColor: secondaryColor }} /><CardContent className="p-8 text-center sm:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-9 w-9 text-emerald-600" /></div><h1 className="mt-5 font-display text-3xl font-bold" style={{ color: primaryColor }}>Inscrição recebida</h1><p className="mt-3 leading-7 text-slate-600">Sua inscrição para o <strong>{resolved.event.name}</strong> foi enviada à equipe da {resolved.church.name}.</p><p className="mt-2 text-sm leading-6 text-slate-500">A inscrição corresponde a {isCouple ? "um casal" : "uma pessoa"}. Se necessário, a igreja entrará em contato pelo telefone informado.</p><div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left text-sm text-slate-600"><p className="flex gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />O envio não cria acesso ao painel. Seus dados serão usados somente para organizar este evento.</p></div><Link href="/"><Button className="mt-7 text-white" style={{ backgroundColor: primaryColor }}>Voltar para a igreja</Button></Link></CardContent></Card></main></TenantPublicShell>;
  }

  return <TenantPublicShell brand={brand}><div className="min-h-screen bg-[#f7f4ed] text-slate-800"><header className="border-b border-black/5 bg-white/90 backdrop-blur"><div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">{resolved.church.logoUrl ? <img src={resolved.church.logoUrl} alt={`Logo da ${resolved.church.name}`} className="h-11 w-11 rounded-xl object-contain" /> : <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ backgroundColor: primaryColor }}><Heart className="h-5 w-5" /></div>}<div className="min-w-0"><p className="truncate font-display text-lg font-bold" style={{ color: primaryColor }}>{resolved.church.name}</p><p className="text-xs text-slate-500">Inscrição de evento</p></div><Link href="/" className="ml-auto text-sm font-semibold text-slate-600 hover:text-slate-900">Início</Link></div></header><main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10"><section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5"><div className="p-6 text-white sm:p-8" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}e6)` }}><div className="flex items-center gap-2 text-sm font-semibold" style={{ color: secondaryColor }}><CalendarDays className="h-4 w-4" /> {isCouple ? "Inscrição de casal" : "Inscrição individual"}</div><h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{resolved.event.name}</h1><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDate(resolved.event.startDate)}{resolved.event.endDate ? ` a ${formatDate(resolved.event.endDate)}` : ""}</span>{resolved.event.location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{resolved.event.location}</span>}</div>{resolved.event.description && <p className="mt-4 max-w-2xl text-sm leading-6 text-white/80">{resolved.event.description}</p>}</div>{resolved.flyer && <div className="border-b bg-[#f5f0e8] p-4 sm:p-6"><div className={`mx-auto max-w-md overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm ${flyerAspectClass(resolved.event.flyerFormat)}`}><img src={resolved.flyer.optimizedUrl || resolved.flyer.url} alt={`Convite do evento ${resolved.event.name}`} className="h-full w-full object-contain" /></div><p className="mt-3 text-center text-xs text-slate-500">Convite do evento</p></div>}<div className="border-b bg-white p-6 sm:p-8"><h2 className="font-display text-2xl font-bold" style={{ color: primaryColor }}>Preencha sua inscrição</h2><p className="mt-2 text-sm leading-6 text-slate-600">Informe os dados abaixo. Você não precisa criar conta nem fazer login.</p></div><form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8"><div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}><UsersRound className="h-5 w-5" /></span><div><p className="font-semibold" style={{ color: primaryColor }}>{isCouple ? "Dados do casal" : "Seus dados"}</p><p className="mt-1 text-xs leading-5 text-slate-500">{isCouple ? "Uma inscrição representa duas pessoas." : "Uma inscrição representa uma pessoa."}</p></div></div><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="event-participant-name">{isCouple ? "Nome do casal" : "Nome completo"} *</Label><Input id="event-participant-name" required minLength={3} maxLength={255} autoComplete="name" value={form.participantName} onChange={(event) => updateField("participantName", event.target.value)} placeholder={isCouple ? "Ex.: João e Maria" : "Seu nome completo"} /></div>{isCouple ? <div><Label htmlFor="event-companion-name">Nome do segundo participante *</Label><Input id="event-companion-name" required minLength={2} maxLength={255} value={form.companionName} onChange={(event) => updateField("companionName", event.target.value)} placeholder="Nome completo" /></div> : <div><Label htmlFor="event-email">E-mail <span className="text-slate-400">(opcional)</span></Label><Input id="event-email" type="email" maxLength={320} autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="voce@exemplo.com" /></div>}</div>{isCouple && <div><Label htmlFor="event-couple-email">E-mail <span className="text-slate-400">(opcional)</span></Label><Input id="event-couple-email" type="email" maxLength={320} autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="voce@exemplo.com" /></div>}<div><Label htmlFor="event-phone">Telefone ou WhatsApp *</Label><Input id="event-phone" required minLength={8} maxLength={20} inputMode="tel" autoComplete="tel" value={form.participantPhone} onChange={(event) => updateField("participantPhone", formatPhone(event.target.value))} placeholder="(00) 00000-0000" /></div>{submit.error && <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p>{submit.error.message}</p></div>}<Button type="submit" size="lg" className="h-12 w-full text-base font-semibold text-white" style={{ backgroundColor: primaryColor }} disabled={submit.isPending}>{submit.isPending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Enviando inscrição...</> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Enviar inscrição</>}</Button><p className="flex items-center justify-center gap-2 text-center text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" /> Seus dados ficam disponíveis somente para a equipe autorizada deste evento.</p></form></section></main><footer className="border-t border-black/5 bg-white/70 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} {resolved.church.name} · Gestão de Eventos</footer></div></TenantPublicShell>;
}
