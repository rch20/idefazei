import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { AlertCircle, ArrowLeft, CheckCircle2, FileUp, HeartHandshake, Loader2, LockKeyhole, QrCode } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TenantPublicShell } from "@/components/TenantPublicShell";
import { TenantPublicFooter } from "@/components/TenantPublicFooter";
import { useTenantPwaMeta } from "@/hooks/useTenantPwaMeta";
import { currentCivilDateKey } from "@/lib/civilDate";
import { formatBrl, parseBrlToCents } from "@/lib/treasury";
import { uploadPublicDonationProof, validatePublicDonationProof } from "@/lib/publicDonationUpload";

const TYPE_LABELS = {
  doacao: "Doação",
  dizimo: "Dízimo",
  oferta: "Oferta",
  primicias: "Primícias",
} as const;

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export default function DoacaoPublica() {
  const settingsQuery = trpc.treasury.publicDonationSettings.useQuery();
  const submitDonation = trpc.treasury.submitPublicDonation.useMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [type, setType] = useState<keyof typeof TYPE_LABELS>("doacao");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(currentCivilDateKey());
  const [prayerRequest, setPrayerRequest] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [website, setWebsite] = useState("");
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const settings = settingsQuery.data;
  useTenantPwaMeta({
    tenantSlug: undefined,
    tenantName: settings?.churchName,
    primaryColor: "#1e3a5f",
    pwaIconAssetId: undefined,
    pwaIconVersion: settings?.version,
  });

  const amountPreview = useMemo(() => {
    const cents = parseBrlToCents(amount);
    return cents && cents > 0 ? formatBrl(cents) : "—";
  }, [amount]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSentMessage(null);
    const informedAmountCents = parseBrlToCents(amount);
    if (!donorName.trim() || donorName.trim().length < 2) return setFormError("Informe seu nome.");
    if (!informedAmountCents || informedAmountCents <= 0) return setFormError("Informe um valor válido.");
    if (!proof) return setFormError("Anexe o comprovante do PIX.");
    if (!consentAccepted) return setFormError("Aceite o uso dos dados para concluir o envio.");
    try {
      validatePublicDonationProof(proof);
      const uploaded = await uploadPublicDonationProof(proof);
      const result = await submitDonation.mutateAsync({
        donorName: donorName.trim(),
        donorPhone: donorPhone.trim(),
        donorEmail: donorEmail.trim(),
        type,
        informedAmountCents,
        paymentDate,
        prayerRequest: prayerRequest.trim(),
        proofFileKey: uploaded.key,
        proofFileName: uploaded.fileName,
        proofMimeType: uploaded.mimeType,
        proofSizeBytes: uploaded.sizeBytes,
        proofSha256: uploaded.sha256,
        idempotencyKey: newIdempotencyKey(),
        consentAccepted: true,
        website,
      });
      setSentMessage(result.thankYouMessage || "Obrigado pela sua contribuição. A equipe da igreja fará a conferência do comprovante.");
      setProof(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível enviar sua contribuição.");
    }
  }

  const brand = { primaryColor: "#1e3a5f", secondaryColor: "#c9a84c", accentColor: "#c9a84c" };

  if (settingsQuery.isLoading) {
    return <main className="tenant-public-root tenant-public-loading"><Loader2 className="animate-spin text-gold" aria-label="Carregando doação" /></main>;
  }
  if (settingsQuery.error || !settings) {
    return <TenantPublicShell brand={brand}><main className="tenant-public-section"><div className="tenant-public-container mx-auto max-w-xl py-16 text-center"><AlertCircle className="mx-auto mb-4 text-gold" size={42} /><h1 className="font-display text-3xl text-navy">Doação pública indisponível</h1><p className="mt-3 text-muted-foreground">Acesse novamente pelo site oficial da sua igreja.</p><Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-navy"><ArrowLeft size={16} />Voltar para a página inicial</Link></div></main></TenantPublicShell>;
  }
  if (!settings.enabled) {
    return <TenantPublicShell brand={brand}><main className="tenant-public-section"><div className="tenant-public-container mx-auto max-w-xl py-16 text-center"><HeartHandshake className="mx-auto mb-4 text-gold" size={42} /><h1 className="font-display text-3xl text-navy">Doações temporariamente fechadas</h1><p className="mt-3 text-muted-foreground">A {settings.churchName} não está recebendo doações por este canal no momento.</p><Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-navy"><ArrowLeft size={16} />Voltar para a página inicial</Link></div></main></TenantPublicShell>;
  }
  if (sentMessage) {
    return <TenantPublicShell brand={brand}><main className="tenant-public-section"><div className="tenant-public-container mx-auto max-w-2xl py-16"><div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm"><CheckCircle2 className="mx-auto mb-4 text-emerald-700" size={48} /><h1 className="font-display text-3xl text-navy">Contribuição recebida</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-emerald-950">{sentMessage}</p><Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white"><ArrowLeft size={16} />Voltar para a igreja</Link></div></div></main></TenantPublicShell>;
  }

  return (
    <TenantPublicShell brand={brand}>
      <header className="tenant-public-header"><div className="tenant-public-container tenant-public-header-inner"><Link href="/" className="tenant-public-brand">{settings.logoUrl ? <img className="tenant-public-logo" src={settings.logoUrl} alt={`Logo ${settings.churchName}`} /> : <span className="tenant-public-mark" aria-hidden="true">✦</span>}<span>{settings.churchName}</span></Link><Link className="tenant-public-login" href="/">Página inicial</Link></div></header>
      <main className="tenant-public-section">
        <div className="tenant-public-container mx-auto max-w-5xl py-8 sm:py-14">
          <div className="mx-auto max-w-2xl text-center"><span className="tenant-public-eyebrow">Um gesto de fé e cuidado</span><h1 className="mt-3 font-display text-4xl leading-tight text-navy sm:text-5xl">Faça sua contribuição</h1><p className="mt-4 text-base leading-7 text-muted-foreground">Envie seu PIX e o comprovante com segurança. A equipe da {settings.churchName} conferirá o envio antes de registrar a entrada.</p></div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
            <section className="rounded-3xl border border-gold/30 bg-gold/5 p-5 shadow-sm sm:p-7"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold"><QrCode size={22} aria-hidden="true" /></span><div><h2 className="font-display text-2xl text-navy">PIX da igreja</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Confira os dados antes de concluir o pagamento.</p></div></div><dl className="mt-6 space-y-4 text-sm"><div><dt className="text-xs text-muted-foreground">Chave PIX</dt><dd className="mt-1 break-all rounded-xl bg-white px-3 py-3 font-semibold text-navy">{settings.pixKey}</dd></div><div><dt className="text-xs text-muted-foreground">Recebedor</dt><dd className="mt-1 font-semibold text-navy">{settings.recipientName}{settings.institutionName ? ` · ${settings.institutionName}` : ""}</dd></div></dl><p className="mt-6 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><LockKeyhole size={15} className="mt-0.5 shrink-0 text-gold" />Seu comprovante será armazenado de forma privada e usado somente para conferência da igreja.</p></section>
            <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-start justify-between gap-4"><div><h2 className="font-display text-2xl text-navy">Dados do envio</h2><p className="mt-1 text-sm text-muted-foreground">Os campos com * são obrigatórios.</p></div><div className="hidden rounded-full bg-navy/5 px-3 py-1 text-xs font-semibold text-navy sm:block">{amountPreview}</div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="public-donation-name">Nome *</Label><Input id="public-donation-name" value={donorName} onChange={event => setDonorName(event.target.value)} placeholder="Como podemos identificar você?" autoComplete="name" required /></div><div className="space-y-2"><Label htmlFor="public-donation-phone">WhatsApp</Label><Input id="public-donation-phone" value={donorPhone} onChange={event => setDonorPhone(event.target.value)} placeholder="(00) 00000-0000" autoComplete="tel" /></div><div className="space-y-2"><Label htmlFor="public-donation-email">E-mail</Label><Input id="public-donation-email" type="email" value={donorEmail} onChange={event => setDonorEmail(event.target.value)} placeholder="voce@email.com" autoComplete="email" /></div><div className="space-y-2"><Label htmlFor="public-donation-type">Tipo *</Label><select id="public-donation-type" value={type} onChange={event => setType(event.target.value as keyof typeof TYPE_LABELS)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required>{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="space-y-2"><Label htmlFor="public-donation-amount">Valor pago (R$) *</Label><Input id="public-donation-amount" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0,00" required /></div><div className="space-y-2"><Label htmlFor="public-donation-date">Data do PIX *</Label><Input id="public-donation-date" type="date" value={paymentDate} onChange={event => setPaymentDate(event.target.value)} required /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="public-donation-proof">Comprovante *</Label><Input ref={fileInputRef} id="public-donation-proof" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={event => setProof(event.target.files?.[0] ?? null)} required /><p className="text-xs text-muted-foreground">PDF, PNG, JPEG ou WebP · até 8 MB{proof ? ` · ${proof.name}` : ""}</p></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="public-donation-prayer">Pedido de oração <span className="font-normal text-muted-foreground">(opcional)</span></Label><Textarea id="public-donation-prayer" value={prayerRequest} onChange={event => setPrayerRequest(event.target.value)} rows={4} maxLength={2000} placeholder="Se desejar, deixe um pedido para a equipe pastoral." /><p className="text-xs text-muted-foreground">O pedido será tratado com cuidado pela equipe da igreja.</p></div></div><input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" value={website} onChange={event => setWebsite(event.target.value)} /><label className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><input type="checkbox" checked={consentAccepted} onChange={event => setConsentAccepted(event.target.checked)} className="mt-1 h-4 w-4 rounded border-input text-navy focus:ring-gold" />Autorizo o uso destes dados para identificar a contribuição e tratar o pedido de oração enviado à igreja.</label>{formError && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-800"><AlertCircle size={17} className="mt-0.5 shrink-0" />{formError}</div>}<Button type="submit" disabled={submitDonation.isPending} className="mt-6 w-full gap-2 bg-navy py-6 text-white hover:bg-navy/90">{submitDonation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}{submitDonation.isPending ? "Enviando..." : "Enviar contribuição"}</Button><p className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">A entrada só será registrada no relatório financeiro depois da conferência da Tesouraria.</p></form>
          </div>
        </div>
      </main>
      <TenantPublicFooter church={{ name: settings.churchName }} />
    </TenantPublicShell>
  );
}
