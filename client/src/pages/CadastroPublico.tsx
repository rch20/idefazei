import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, Church, LockKeyhole, MapPin, Search, UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useChurchSlug } from "@/hooks/useTenant";
import { TenantPublicFooter } from "@/components/TenantPublicFooter";
import { TenantPublicShell } from "@/components/TenantPublicShell";

type PublicRegistrationForm = {
  name: string;
  whatsapp: string;
  email: string;
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  consentAccepted: boolean;
  website: string;
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

const INITIAL_FORM: PublicRegistrationForm = {
  name: "",
  whatsapp: "",
  email: "",
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  consentAccepted: false,
  website: "",
};

const SOURCE_LABELS = {
  qrcode: "QR Code da igreja",
  convite: "Convite da igreja",
  evento: "Evento da igreja",
  link: "Link compartilhado",
} as const;

type PublicRegistrationSource = keyof typeof SOURCE_LABELS;

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function readContext() {
  if (typeof window === "undefined") return { source: "qrcode" as PublicRegistrationSource, campaign: "" };
  const params = new URLSearchParams(window.location.search);
  const rawSource = params.get("origem") as PublicRegistrationSource | null;
  const source = rawSource && rawSource in SOURCE_LABELS ? rawSource : "qrcode";
  return { source, campaign: params.get("campanha")?.trim().slice(0, 120) ?? "" };
}

export default function CadastroPublico() {
  const slug = useChurchSlug();
  const context = readContext();
  const { data: tenant, isLoading } = trpc.tenantPublic.current.useQuery(undefined, { enabled: Boolean(slug) });
  const submit = trpc.publicRegistration.submit.useMutation({ onSuccess: () => setSent(true) });
  const [form, setForm] = useState<PublicRegistrationForm>(INITIAL_FORM);
  const [sent, setSent] = useState(false);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "found" | "not-found">("idle");
  const [cepError, setCepError] = useState("");
  const church = tenant?.church;
  const registration = church?.publicRegistration;
  const brand = {
    primaryColor: tenant?.theme?.primaryColor ?? church?.primaryColor,
    secondaryColor: tenant?.theme?.secondaryColor ?? church?.secondaryColor,
    accentColor: tenant?.theme?.accentColor ?? church?.secondaryColor,
  };

  const updateField = (key: keyof PublicRegistrationForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const lookupCep = async () => {
    const cep = form.zipCode.replace(/\D/g, "");
    setCepError("");
    if (!cep) {
      setCepStatus("idle");
      return;
    }
    if (cep.length !== 8) {
      setCepStatus("idle");
      setCepError("Digite um CEP válido com 8 números.");
      return;
    }
    setCepStatus("loading");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("CEP lookup failed");
      const data = await response.json() as ViaCepResponse;
      if (data.erro) {
        setCepStatus("not-found");
        setCepError("CEP não encontrado. Confira os números ou preencha o endereço manualmente.");
        return;
      }
      setForm((current) => ({
        ...current,
        zipCode: formatCep(data.cep ?? cep),
        street: data.logradouro ?? "",
        neighborhood: data.bairro ?? "",
        city: data.localidade ?? "",
        state: data.uf ?? "",
      }));
      setCepStatus("found");
    } catch {
      setCepStatus("idle");
      setCepError("Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente.");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!slug || !form.consentAccepted) return;
    submit.mutate({
      churchSlug: slug,
      name: form.name.trim(),
      whatsapp: form.whatsapp.trim(),
      email: form.email.trim(),
      zipCode: form.zipCode.trim(),
      street: form.street.trim(),
      number: form.number.trim(),
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      source: context.source,
      campaign: context.campaign,
      consentAccepted: true,
      website: form.website,
    });
  };

  if (!slug) return <main className="tenant-registration-page"><div className="tenant-registration-state"><Church aria-hidden="true" className="mx-auto mb-4 text-gold" size={42} /><h1>Cadastro disponível no link da sua igreja</h1><p>Aponte a câmera para o QR Code exibido pela sua igreja ou acesse o subdomínio informado pela liderança.</p></div></main>;
  if (isLoading) return <main className="tenant-registration-page"><div className="tenant-registration-state"><div className="tenant-registration-spinner" aria-label="Carregando cadastro" /><p>Carregando o cadastro da igreja...</p></div></main>;
  if (!church || !registration) return <main className="tenant-registration-page"><div className="tenant-registration-state"><Church aria-hidden="true" className="mx-auto mb-4 text-gold" size={42} /><h1>Igreja não encontrada</h1><p>Confira o link recebido e tente novamente.</p><Link href="/" className="tenant-registration-back-link">Voltar para a página inicial</Link></div></main>;
  if (!registration.enabled) return <TenantPublicShell brand={brand}><main className="tenant-registration-page"><div className="tenant-registration-state"><Church aria-hidden="true" className="mx-auto mb-4 text-gold" size={42} /><p className="tenant-registration-kicker">{church.name}</p><h1>Cadastro temporariamente fechado</h1><p>A igreja pausou novos cadastros públicos neste momento. Converse com a liderança para receber orientação.</p><Link href="/" className="tenant-registration-back-link"><ArrowLeft aria-hidden="true" />Voltar para a página inicial</Link></div></main></TenantPublicShell>;

  return <TenantPublicShell brand={brand}>
    <div className="tenant-registration-page">
      <header className="tenant-registration-header">
        <Link href="/" className="tenant-registration-brand" aria-label={`Voltar para a página inicial de ${church.name}`}>
          {church.logoUrl ? <img src={church.logoUrl} alt={`Logo da ${church.name}`} /> : <span aria-hidden="true">{church.name.slice(0, 1)}</span>}
          <strong>{church.name}</strong>
        </Link>
        <Link href="/" className="tenant-registration-home-link"><ArrowLeft aria-hidden="true" />Início</Link>
      </header>

      <main className="tenant-registration-main">
        {sent ? <section className="tenant-registration-card tenant-registration-success" aria-live="polite">
          <div className="tenant-registration-icon"><CheckCircle2 aria-hidden="true" /></div>
          <p className="tenant-registration-kicker">Cadastro recebido</p>
          <h1>Que bom ter você por perto</h1>
          <p>Recebemos seus dados para a equipe da {church.name}. Em breve alguém entrará em contato pelo WhatsApp informado.</p>
          <p className="mt-3 text-sm text-muted-foreground">Este envio não cria uma conta de acesso automaticamente. A liderança fará o próximo contato com segurança.</p>
          <div className="tenant-registration-actions"><Link href="/" className="tenant-registration-primary-link">Voltar para a página inicial</Link></div>
        </section> : <section className="tenant-registration-card">
          <div className="tenant-registration-card-heading"><div className="tenant-registration-icon"><UserPlus aria-hidden="true" /></div><div><p className="tenant-registration-kicker">Cadastro público · {SOURCE_LABELS[context.source]}</p><h1>{registration.title}</h1></div></div>
          <p className="tenant-registration-message">{registration.message}</p>
          {context.campaign && <p className="mt-3 rounded-xl border border-gold/20 bg-gold/5 px-3 py-2 text-xs text-navy">Você chegou por: <strong>{context.campaign}</strong></p>}
          <div className="tenant-registration-trust"><LockKeyhole aria-hidden="true" /><span>Seus dados serão enviados somente para a equipe desta igreja e não liberam acesso ao sistema automaticamente.</span></div>
          <form onSubmit={handleSubmit} className="tenant-registration-form">
            <label><span>Nome completo *</span><input required minLength={2} maxLength={255} type="text" autoComplete="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} /></label>
            <div className="tenant-registration-form-grid"><label><span>WhatsApp *</span><input required type="tel" inputMode="tel" autoComplete="tel" minLength={10} maxLength={20} value={form.whatsapp} onChange={(event) => updateField("whatsapp", event.target.value)} placeholder="(00) 00000-0000" /><small>Usaremos este número somente para contato da igreja.</small></label><label><span>E-mail</span><input type="email" autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="voce@email.com" /></label></div>

            <div className="tenant-registration-section-heading"><div><p><MapPin aria-hidden="true" />Onde você mora?</p><small>O CEP ajuda a equipe a conhecer melhor a região e indicar uma Célula quando apropriado.</small></div></div>
            <div className="tenant-registration-form-grid tenant-registration-address-first"><label><span>CEP</span><span className="tenant-registration-input-with-action"><input type="text" inputMode="numeric" autoComplete="postal-code" maxLength={9} placeholder="00000-000" value={form.zipCode} onChange={(event) => updateField("zipCode", formatCep(event.target.value))} onBlur={() => void lookupCep()} />{cepStatus === "loading" ? <span className="tenant-registration-input-status" aria-label="Consultando CEP"><span className="tenant-registration-spinner tenant-registration-spinner-small" /></span> : <Search aria-hidden="true" className="tenant-registration-input-status" />}</span>{cepError && <small className="tenant-registration-field-error" role="alert">{cepError}</small>}{cepStatus === "found" && <small className="tenant-registration-field-success">Endereço preenchido. Confira os dados.</small>}</label><label><span>Número</span><input type="text" inputMode="numeric" autoComplete="address-line2" maxLength={10} value={form.number} onChange={(event) => updateField("number", event.target.value)} /></label></div>
            <label><span>Rua / logradouro</span><input type="text" autoComplete="address-line1" maxLength={255} value={form.street} onChange={(event) => updateField("street", event.target.value)} /></label>
            <div className="tenant-registration-form-grid"><label><span>Bairro</span><input type="text" autoComplete="address-level3" maxLength={100} value={form.neighborhood} onChange={(event) => updateField("neighborhood", event.target.value)} /></label><label><span>Cidade</span><input type="text" autoComplete="address-level2" maxLength={100} value={form.city} onChange={(event) => updateField("city", event.target.value)} /></label></div>
            <label><span>Estado</span><input type="text" autoComplete="address-level1" maxLength={2} placeholder="UF" value={form.state} onChange={(event) => updateField("state", event.target.value.toUpperCase().slice(0, 2))} /></label>

            <label className="flex flex-row items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm leading-relaxed text-slate-700"><input required type="checkbox" checked={form.consentAccepted} onChange={(event) => updateField("consentAccepted", event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--tenant-primary)]" /><span>Autorizo a {church.name} a usar estes dados para entrar em contato comigo sobre a vida da igreja. *</span></label>
            <label className="sr-only" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => updateField("website", event.target.value)} /></label>
            {submit.error && <p className="tenant-registration-error" role="alert">{submit.error.message}</p>}
            <button type="submit" disabled={submit.isPending || !form.consentAccepted}>{submit.isPending ? "Enviando cadastro..." : "Enviar cadastro"}</button>
          </form>
          <p className="tenant-registration-login">Já possui acesso à plataforma? <Link href="/login">Entrar</Link></p>
        </section>}
      </main>
      <TenantPublicFooter church={church} />
    </div>
  </TenantPublicShell>;
}
