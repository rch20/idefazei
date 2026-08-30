import { TenantPublicFooter } from "@/components/TenantPublicFooter";
import { TenantPublicShell } from "@/components/TenantPublicShell";
import { Button } from "@/components/ui/button";
import { useTenantPwaMeta } from "@/hooks/useTenantPwaMeta";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BookOpen, Check, Copy, ExternalLink, MessageCircle, Share2, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatPublishedDate(value: Date | string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function DevocionalDiario() {
  const { data, isLoading } = trpc.tenantPublic.current.useQuery();
  const [copied, setCopied] = useState(false);

  useTenantPwaMeta({
    tenantSlug: data?.church.slug,
    tenantName: data?.church.name,
    primaryColor: data?.theme?.primaryColor ?? data?.church.primaryColor,
    pwaIconAssetId: data?.church.pwaIconAssetId,
    pwaIconVersion: data?.church.pwaIconVersion,
  });

  if (isLoading) {
    return <div className="tenant-public-root tenant-public-loading" aria-live="polite">Carregando o devocional...</div>;
  }

  if (!data) {
    return <div className="tenant-public-root tenant-public-loading">Esta igreja não está disponível.</div>;
  }

  const devotional = data.publicDevotional;
  const church = data.church;
  const pageUrl = typeof window === "undefined" ? "" : window.location.href;
  const shareText = devotional ? `${devotional.title} — Devocional diário de ${church.name}.` : `Devocional diário de ${church.name}.`;
  const socialMedia = church.socialMedia;

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      toast.info("O compartilhamento nativo não está disponível neste navegador.");
      return;
    }
    try {
      await navigator.share({ title: devotional?.title ?? "Devocional diário", text: shareText, url: pageUrl });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Não foi possível abrir o compartilhamento do aparelho.");
    }
  };

  const handleWhatsAppShare = () => {
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${pageUrl}`)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      toast.success("Link do devocional copiado.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar o link neste navegador.");
    }
  };

  return (
    <TenantPublicShell brand={{
      primaryColor: data.theme?.primaryColor ?? church.primaryColor,
      secondaryColor: data.theme?.secondaryColor ?? church.secondaryColor,
      accentColor: data.theme?.accentColor,
    }}>
      <header className="tenant-public-header">
        <div className="tenant-public-container tenant-public-header-inner">
          <a href="/" className="tenant-public-brand" aria-label={`Página inicial de ${church.name}`}>
            {data.theme?.logoUrl ?? church.logoUrl ? (
              <img className="tenant-public-logo" src={data.theme?.logoUrl ?? church.logoUrl ?? ""} alt={`Logo ${church.name}`} />
            ) : (
              <span className="tenant-public-mark" aria-hidden="true">✦</span>
            )}
            <span>{church.name}</span>
          </a>
          <a className="tenant-public-login" href="/">Início</a>
        </div>
      </header>

      <main>
        {!devotional ? (
          <section className="tenant-public-section">
            <div className="tenant-public-container">
              <div className="tenant-public-prose">
                <span className="tenant-public-eyebrow">Devocional diário</span>
                <h1 className="font-display text-4xl text-navy sm:text-6xl">Uma palavra para o seu dia</h1>
                <p>O próximo devocional desta igreja ainda não foi publicado. Volte em breve para acompanhar uma nova mensagem.</p>
                <a className="tenant-public-announcement-action" href="/"><ArrowLeft size={16} aria-hidden="true" /> Voltar para a página inicial</a>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="tenant-public-devotional-hero">
              <div className="tenant-public-container">
                <a className="tenant-public-back-link" href="/"><ArrowLeft size={16} aria-hidden="true" /> Página inicial</a>
                <div className="tenant-public-devotional-kicker"><BookOpen size={18} aria-hidden="true" /><span>Devocional diário</span></div>
                <p className="tenant-public-devotional-date">Publicado em {formatPublishedDate(devotional.publishedAt)}</p>
                <h1>{devotional.title}</h1>
                <p className="tenant-public-devotional-intro">Uma pausa para ouvir, refletir e caminhar com fé.</p>
              </div>
            </section>

            <article className="tenant-public-section tenant-public-devotional-section">
              <div className="tenant-public-container tenant-public-devotional-layout">
                <div className="tenant-public-devotional-reading">
                  {devotional.imageUrl && <img className="tenant-public-devotional-image" src={devotional.imageUrl} alt="Imagem do Devocional diário" loading="eager" decoding="async" />}
                  <div className="tenant-public-devotional-content">
                    <p className="tenant-public-eyebrow">Reflexão de hoje</p>
                    <div className="tenant-public-devotional-text">{devotional.content}</div>
                  </div>
                </div>

                <aside className="tenant-public-devotional-aside" aria-label="Compartilhar devocional">
                  <div className="tenant-public-devotional-share-card">
                    <div className="tenant-public-devotional-share-heading"><Share2 size={18} aria-hidden="true" /><div><strong>Compartilhe esta palavra</strong><span>Leve o devocional para alguém especial.</span></div></div>
                    <div className="tenant-public-devotional-share-actions">
                      <Button type="button" className="tenant-public-devotional-share-native" onClick={() => void handleNativeShare()}><Smartphone size={17} aria-hidden="true" /><span>Compartilhar pelo celular</span></Button>
                      <Button type="button" variant="outline" onClick={handleWhatsAppShare}><MessageCircle size={17} aria-hidden="true" /><span>WhatsApp</span><ExternalLink size={14} aria-hidden="true" /></Button>
                      <Button type="button" variant="outline" onClick={() => void handleCopyLink()}><span className="flex min-w-0 items-center gap-2">{copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}<span>{copied ? "Link copiado" : "Copiar link"}</span></span></Button>
                    </div>
                  </div>
                  <p className="tenant-public-devotional-aside-note">A leitura é pública e não exige login.</p>
                </aside>
              </div>
            </article>
          </>
        )}
      </main>

      <TenantPublicFooter church={{ ...church, socialMedia }} />
    </TenantPublicShell>
  );
}
