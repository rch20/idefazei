import { useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowLeft, CalendarDays, CheckCircle2, Church, LockKeyhole, MapPin, Search, UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useChurchSlug } from "@/hooks/useTenant";
import { TenantPublicFooter } from "@/components/TenantPublicFooter";
import { TenantPublicShell } from "@/components/TenantPublicShell";

type RegistrationForm = {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  birthDate: string;
  phone: string;
  whatsapp: string;
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

const INITIAL_FORM: RegistrationForm = {
  name: "",
  email: "",
  password: "",
  passwordConfirmation: "",
  birthDate: "",
  phone: "",
  whatsapp: "",
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
};

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function optionalValue(value: string) {
  const normalized = value.trim();
  return normalized || undefined;
}

export default function CadastroDiscipulo() {
  const slug = useChurchSlug();
  const { data: tenant, isLoading } = trpc.tenantPublic.current.useQuery(undefined, { enabled: Boolean(slug) });
  const [form, setForm] = useState<RegistrationForm>(INITIAL_FORM);
  const [sent, setSent] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "found" | "not-found">("idle");
  const [cepError, setCepError] = useState("");
  const lookupSequence = useRef(0);
  const register = trpc.register.disciple.useMutation({ onSuccess: () => setSent(true) });
  const church = tenant?.church;
  const registration = church?.publicRegistration;
  const brand = {
    primaryColor: tenant?.theme?.primaryColor ?? church?.primaryColor,
    secondaryColor: tenant?.theme?.secondaryColor ?? church?.secondaryColor,
    accentColor: tenant?.theme?.accentColor ?? church?.secondaryColor,
  };
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (!slug) return <main className="tenant-registration-page"><div className="tenant-registration-state"><Church aria-hidden="true" className="mx-auto mb-4 text-gold" size={42} /><h1>Cadastro disponível no link da sua igreja</h1><p>Acesse o subdomínio informado pela liderança para entrar na comunidade.</p></div></main>;
  if (isLoading) return <main className="tenant-registration-page"><div className="tenant-registration-state"><div className="tenant-registration-spinner" aria-label="Carregando cadastro" /><p>Carregando o cadastro da igreja...</p></div></main>;
  if (!church || !registration) return <main className="tenant-registration-page"><div className="tenant-registration-state"><Church aria-hidden="true" className="mx-auto mb-4 text-gold" size={42} /><h1>Igreja não encontrada</h1><p>Confira o link recebido e tente novamente.</p><Link href="/" className="tenant-registration-back-link">Voltar para a página inicial</Link></div></main>;
  if (!registration.enabled) return <TenantPublicShell brand={brand}><main className="tenant-registration-page"><div className="tenant-registration-state"><Church aria-hidden="true" className="mx-auto mb-4 text-gold" size={42} /><p className="tenant-registration-kicker">{church.name}</p><h1>Cadastro temporariamente fechado</h1><p>A igreja pausou novos cadastros públicos neste momento. Converse com a liderança para receber orientação.</p><Link href="/" className="tenant-registration-back-link"><ArrowLeft aria-hidden="true" />Voltar para a página inicial</Link></div></main></TenantPublicShell>;

  const updateField = (key: keyof RegistrationForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const lookupCep = async (value: string) => {
    const cep = value.replace(/\D/g, "");
    const requestId = ++lookupSequence.current;
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
      if (requestId !== lookupSequence.current) return;
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
      if (requestId !== lookupSequence.current) return;
      setCepStatus("idle");
      setCepError("Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente.");
    }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.password !== form.passwordConfirmation) {
      setPasswordError("As senhas não coincidem. Confira os dois campos antes de continuar.");
      return;
    }
    setPasswordError("");
    register.mutate({
      churchSlug: slug,
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      birthDate: optionalValue(form.birthDate),
      phone: optionalValue(form.phone),
      whatsapp: optionalValue(form.whatsapp),
      zipCode: form.zipCode.trim(),
      street: optionalValue(form.street),
      number: form.number.trim(),
      neighborhood: optionalValue(form.neighborhood),
      city: optionalValue(form.city),
      state: optionalValue(form.state)?.toUpperCase(),
    });
  };

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
          <p>A liderança da {church.name} recebeu seus dados e fará a confirmação. Após a aprovação, você poderá entrar na plataforma da igreja com o e-mail e a senha cadastrados.</p>
          <div className="tenant-registration-actions"><Link href="/" className="tenant-registration-primary-link">Voltar para a página inicial</Link><Link href="/login" className="tenant-registration-secondary-link">Já tenho acesso</Link></div>
        </section> : <section className="tenant-registration-card">
          <div className="tenant-registration-card-heading"><div className="tenant-registration-icon"><UserPlus aria-hidden="true" /></div><div><p className="tenant-registration-kicker">Ambiente oficial da igreja</p><h1>{registration.title}</h1></div></div>
          <p className="tenant-registration-message">{registration.message}</p>
          <div className="tenant-registration-trust"><LockKeyhole aria-hidden="true" /><span>Seu cadastro será analisado pela liderança antes da liberação do acesso.</span></div>
          <form onSubmit={submit} className="tenant-registration-form">
            <label><span>Nome completo *</span><input required minLength={2} maxLength={255} type="text" autoComplete="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} /></label>
            <div className="tenant-registration-form-grid"><label><span>E-mail *</span><input required type="email" autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} /></label><label><span>Data de nascimento</span><span className="tenant-registration-input-icon"><CalendarDays aria-hidden="true" /><input type="date" max={today} autoComplete="bday" value={form.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} /></span></label></div>
            <div className="tenant-registration-form-grid"><label><span>Telefone</span><input type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} /></label><label><span>WhatsApp</span><input type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={form.whatsapp} onChange={(event) => updateField("whatsapp", event.target.value)} /></label></div>

            <div className="tenant-registration-section-heading"><div><p><MapPin aria-hidden="true" />Seu endereço</p><small>Informe o CEP primeiro para preencher o endereço automaticamente.</small></div></div>
            <div className="tenant-registration-form-grid tenant-registration-address-first"><label><span>CEP *</span><span className="tenant-registration-input-with-action"><input required type="text" inputMode="numeric" autoComplete="postal-code" maxLength={9} placeholder="00000-000" value={form.zipCode} onChange={(event) => updateField("zipCode", formatCep(event.target.value))} onBlur={(event) => { void lookupCep(event.target.value); }} />{cepStatus === "loading" ? <span className="tenant-registration-input-status" aria-label="Consultando CEP"><span className="tenant-registration-spinner tenant-registration-spinner-small" /></span> : <Search aria-hidden="true" className="tenant-registration-input-status" />}</span>{cepError && <small className="tenant-registration-field-error" role="alert">{cepError}</small>}{cepStatus === "found" && <small className="tenant-registration-field-success">Endereço preenchido. Confira e complete o número.</small>}</label><label><span>Número *</span><input required type="text" inputMode="numeric" autoComplete="address-line2" maxLength={10} value={form.number} onChange={(event) => updateField("number", event.target.value)} /></label></div>
            <label><span>Rua / logradouro</span><input type="text" autoComplete="address-line1" maxLength={255} value={form.street} onChange={(event) => updateField("street", event.target.value)} /></label>
            <div className="tenant-registration-form-grid"><label><span>Bairro</span><input type="text" autoComplete="address-level3" maxLength={100} value={form.neighborhood} onChange={(event) => updateField("neighborhood", event.target.value)} /></label><label><span>Cidade</span><input type="text" autoComplete="address-level2" maxLength={100} value={form.city} onChange={(event) => updateField("city", event.target.value)} /></label></div>
            <div className="tenant-registration-form-grid"><label><span>Estado</span><input type="text" autoComplete="address-level1" maxLength={2} placeholder="UF" value={form.state} onChange={(event) => updateField("state", event.target.value.toUpperCase().slice(0, 2))} /></label><div /></div>

            <div className="tenant-registration-form-grid"><label><span>Crie uma senha *</span><input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(event) => { updateField("password", event.target.value); setPasswordError(""); }} /><small>Use pelo menos 8 caracteres. Você usará esta senha depois que o cadastro for aprovado.</small></label><label><span>Confirme sua senha *</span><input required minLength={8} type="password" autoComplete="new-password" value={form.passwordConfirmation} onChange={(event) => { updateField("passwordConfirmation", event.target.value); setPasswordError(""); }} />{(passwordError || (form.passwordConfirmation && form.password !== form.passwordConfirmation)) && <small className="tenant-registration-field-error" role="alert">{passwordError || "As senhas não coincidem."}</small>}</label></div>
            {register.error && <p className="tenant-registration-error" role="alert">{register.error.message}</p>}
            <button type="submit" disabled={register.isPending || !form.passwordConfirmation || form.password !== form.passwordConfirmation}>{register.isPending ? "Enviando cadastro..." : "Enviar cadastro"}</button>
          </form>
          <p className="tenant-registration-login">Já possui acesso? <Link href="/login">Entrar na plataforma</Link></p>
        </section>}
      </main>
      <TenantPublicFooter church={church} />
    </div>
  </TenantPublicShell>;
}
