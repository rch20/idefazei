import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, Church, LockKeyhole, UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useChurchSlug } from "@/hooks/useTenant";
import { TenantPublicFooter } from "@/components/TenantPublicFooter";
import { TenantPublicShell } from "@/components/TenantPublicShell";

type RegistrationForm = {
  name: string;
  email: string;
  password: string;
  phone: string;
  whatsapp: string;
};

const INITIAL_FORM: RegistrationForm = { name: "", email: "", password: "", phone: "", whatsapp: "" };

export default function CadastroDiscipulo() {
  const slug = useChurchSlug();
  const { data: tenant, isLoading } = trpc.tenantPublic.current.useQuery(undefined, { enabled: Boolean(slug) });
  const [form, setForm] = useState<RegistrationForm>(INITIAL_FORM);
  const [sent, setSent] = useState(false);
  const register = trpc.register.disciple.useMutation({ onSuccess: () => setSent(true) });
  const church = tenant?.church;
  const registration = church?.publicRegistration;
  const brand = {
    primaryColor: tenant?.theme?.primaryColor ?? church?.primaryColor,
    secondaryColor: tenant?.theme?.secondaryColor ?? church?.secondaryColor,
    accentColor: tenant?.theme?.accentColor ?? church?.secondaryColor,
  };

  if (!slug) return <main className="tenant-registration-page"><div className="tenant-registration-state"><Church aria-hidden="true" className="mx-auto mb-4 text-gold" size={42} /><h1>Cadastro disponível no link da sua igreja</h1><p>Acesse o subdomínio informado pela liderança para entrar na comunidade.</p></div></main>;
  if (isLoading) return <main className="tenant-registration-page"><div className="tenant-registration-state"><div className="tenant-registration-spinner" aria-label="Carregando cadastro" /><p>Carregando o cadastro da igreja...</p></div></main>;
  if (!church || !registration) return <main className="tenant-registration-page"><div className="tenant-registration-state"><Church aria-hidden="true" className="mx-auto mb-4 text-gold" size={42} /><h1>Igreja não encontrada</h1><p>Confira o link recebido e tente novamente.</p><Link href="/" className="tenant-registration-back-link">Voltar para a página inicial</Link></div></main>;
  if (!registration.enabled) return <TenantPublicShell brand={brand}><main className="tenant-registration-page"><div className="tenant-registration-state"><Church aria-hidden="true" className="mx-auto mb-4 text-gold" size={42} /><p className="tenant-registration-kicker">{church.name}</p><h1>Cadastro temporariamente fechado</h1><p>A igreja pausou novos cadastros públicos neste momento. Converse com a liderança para receber orientação.</p><Link href="/" className="tenant-registration-back-link"><ArrowLeft aria-hidden="true" />Voltar para a página inicial</Link></div></main></TenantPublicShell>;

  const updateField = (key: keyof RegistrationForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    register.mutate({ churchSlug: slug, ...form });
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
            <label><span>E-mail *</span><input required type="email" autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} /></label>
            <div className="tenant-registration-form-grid"><label><span>Telefone</span><input type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} /></label><label><span>WhatsApp</span><input type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={form.whatsapp} onChange={(event) => updateField("whatsapp", event.target.value)} /></label></div>
            <label><span>Crie uma senha *</span><input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(event) => updateField("password", event.target.value)} /><small>Você usará esta senha depois que o cadastro for aprovado.</small></label>
            {register.error && <p className="tenant-registration-error" role="alert">{register.error.message}</p>}
            <button type="submit" disabled={register.isPending}>{register.isPending ? "Enviando cadastro..." : "Enviar cadastro"}</button>
          </form>
          <p className="tenant-registration-login">Já possui acesso? <Link href="/login">Entrar na plataforma</Link></p>
        </section>}
      </main>
      <TenantPublicFooter church={church} />
    </div>
  </TenantPublicShell>;
}
