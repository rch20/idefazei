import { Button } from "@/components/ui/button";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";

type SoulContactActionsProps = {
  name: string;
  email?: string | null;
  phone?: string | null;
  compact?: boolean;
};

function getWhatsAppHref(phone: string | null | undefined, name: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const international = digits.startsWith("55") ? digits : `55${digits}`;
  const message = `Olá, ${name}! Entramos em contato pela igreja.`;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

export function SoulContactActions({ name, email, phone, compact = false }: SoulContactActionsProps) {
  const whatsappHref = getWhatsAppHref(phone, name);
  const labelClassName = compact ? "sr-only" : "hidden sm:inline";

  const copyEmail = async () => {
    if (!email) return;
    if (!navigator.clipboard) {
      toast.error("Copie o e-mail manualmente neste navegador.");
      return;
    }
    try {
      await navigator.clipboard.writeText(email);
      toast.success("E-mail copiado.");
    } catch {
      toast.error("Não foi possível copiar o e-mail.");
    }
  };

  if (!email && !whatsappHref) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={`Ações de contato de ${name}`}>
      {email && (
        <>
          <a
            href={`mailto:${email}`}
            aria-label={`Enviar e-mail para ${name}`}
            title="Enviar e-mail"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-sky-700 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            <span className={labelClassName}>E-mail</span>
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void copyEmail()}
            aria-label={`Copiar e-mail de ${name}`}
            title="Copiar e-mail"
            className="h-9 gap-1.5 px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            <span className={labelClassName}>Copiar</span>
          </Button>
        </>
      )}
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          aria-label={`Conversar com ${name} pelo WhatsApp`}
          title="Conversar no WhatsApp"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-emerald-700 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span className={labelClassName}>WhatsApp</span>
        </a>
      )}
    </div>
  );
}
