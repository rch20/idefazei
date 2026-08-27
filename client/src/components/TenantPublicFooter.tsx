import { Facebook, Instagram, Mail, MapPin, Music2, Phone, Globe2, Youtube, type LucideIcon } from "lucide-react";
import { normalizeSocialMediaLinks, SOCIAL_PLATFORM_KEYS, SOCIAL_PLATFORM_META, type SocialPlatform } from "../../../shared/socialMedia";

type TenantPublicFooterProps = {
  church: {
    name: string;
    address?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    website?: string | null;
    socialMedia?: unknown;
  };
};

const SOCIAL_ICONS: Record<SocialPlatform, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: Music2,
};

function safeWebsiteUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizePhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 8 ? digits : null;
}

export function TenantPublicFooter({ church }: TenantPublicFooterProps) {
  const socialMedia = normalizeSocialMediaLinks(church.socialMedia);
  const socialLinks = SOCIAL_PLATFORM_KEYS.filter((platform) => socialMedia[platform]).map((platform) => ({
    platform,
    href: socialMedia[platform]!,
    label: SOCIAL_PLATFORM_META[platform].label,
    Icon: SOCIAL_ICONS[platform],
  }));
  const websiteUrl = safeWebsiteUrl(church.website);
  const phoneDigits = normalizePhone(church.phone);
  const whatsappDigits = normalizePhone(church.whatsapp);

  return (
    <footer className="tenant-public-footer">
      <div className="tenant-public-container">
        <div className="tenant-public-footer-grid">
          <div className="tenant-public-footer-brand">
            <p className="tenant-public-footer-kicker">Comunidade de fé</p>
            <h2>{church.name}</h2>
            <p>Um lugar para caminhar junto, servir e crescer.</p>
          </div>

          <div className="tenant-public-footer-contact">
            <h2>Contato</h2>
            {church.address && <p><MapPin aria-hidden="true" /><span>{church.address}</span></p>}
            {phoneDigits && <a href={`tel:${phoneDigits}`}><Phone aria-hidden="true" /><span>{church.phone}</span></a>}
            {church.email && <a href={`mailto:${church.email}`}><Mail aria-hidden="true" /><span>{church.email}</span></a>}
            {websiteUrl && <a href={websiteUrl} target="_blank" rel="noreferrer"><Globe2 aria-hidden="true" /><span>Site oficial</span></a>}
            {whatsappDigits && <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noreferrer"><Phone aria-hidden="true" /><span>WhatsApp</span></a>}
          </div>

          {socialLinks.length > 0 && <div className="tenant-public-footer-social">
            <h2>Acompanhe a igreja</h2>
            <nav aria-label={`Redes sociais de ${church.name}`}>
              <div className="tenant-public-footer-social-links">
                {socialLinks.map(({ platform, href, label, Icon }) => <a key={platform} href={href} target="_blank" rel="noreferrer" aria-label={`${label} de ${church.name}`} title={label}><Icon aria-hidden="true" /><span>{label}</span></a>)}
              </div>
            </nav>
          </div>}
        </div>
        <div className="tenant-public-footer-bottom"><span>© {new Date().getFullYear()} {church.name}</span><span>Presença digital da igreja</span></div>
      </div>
    </footer>
  );
}
