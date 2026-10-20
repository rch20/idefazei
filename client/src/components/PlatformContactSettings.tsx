import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  buildPlatformWhatsAppLink,
  DEFAULT_WHATSAPP_MESSAGE,
  formatBrazilianPhone,
  formatCnpj,
  normalizePlatformContactInput,
  type PlatformContactField,
} from "@shared/platformContact";

type FormState = {
  whatsapp: string; phone: string; email: string; address: string; businessHours: string; whatsappMessage: string;
  legalName: string; cnpj: string; instagram: string; facebook: string; youtube: string; tiktok: string;
};

const EMPTY: FormState = {
  whatsapp: "", phone: "", email: "", address: "", businessHours: "", whatsappMessage: "", legalName: "", cnpj: "",
  instagram: "", facebook: "", youtube: "", tiktok: "",
};

function toPayload(form: FormState) {
  return {
    whatsapp: form.whatsapp, phone: form.phone, email: form.email, address: form.address, businessHours: form.businessHours,
    whatsappMessage: form.whatsappMessage, legalName: form.legalName, cnpj: form.cnpj,
    social: { instagram: form.instagram, facebook: form.facebook, youtube: form.youtube, tiktok: form.tiktok },
  };
}

const inputClass = "bg-white/5 border-white/15 text-white placeholder:text-white/30";

export default function PlatformContactSettings() {
  const utils = trpc.useUtils();
  const query = trpc.superAdmin.contactSettings.useQuery(undefined, { refetchOnWindowFocus: false });
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<PlatformContactField, string>>>({});

  useEffect(() => {
    const c = query.data;
    if (!c) return;
    setForm({
      whatsapp: formatBrazilianPhone(c.whatsapp), phone: formatBrazilianPhone(c.phone), email: c.email ?? "", address: c.address ?? "",
      businessHours: c.businessHours ?? "", whatsappMessage: c.whatsappMessage ?? "", legalName: c.legalName ?? "", cnpj: formatCnpj(c.cnpj),
      instagram: c.social.instagram ?? "", facebook: c.social.facebook ?? "", youtube: c.social.youtube ?? "", tiktok: c.social.tiktok ?? "",
    });
  }, [query.data]);

  const save = trpc.superAdmin.updateContactSettings.useMutation({
    onSuccess: async () => {
      toast.success("Contatos salvos. A página pública já mostra os dados novos.");
      await utils.superAdmin.contactSettings.invalidate();
      await utils.platform.publicContact.invalidate();
    },
    onError: error => toast.error(error.message || "Não foi possível salvar."),
  });

  const set = (key: keyof FormState) => (event: { target: { value: string } }) => {
    setForm(current => ({ ...current, [key]: event.target.value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = normalizePlatformContactInput(toPayload(form));
    if (!result.ok) {
      setErrors(result.errors);
      toast.error(Object.values(result.errors)[0] ?? "Confira os campos.");
      return;
    }
    setErrors({});
    save.mutate(toPayload(form));
  };

  const preview = normalizePlatformContactInput(toPayload(form));
  const previewLink = preview.ok ? buildPlatformWhatsAppLink(preview.value) : null;

  const field = (key: keyof FormState, label: string, placeholder: string, hint?: string, maxLength = 200) => (
    <div className="space-y-1.5">
      <Label htmlFor={`pc-${key}`} className="text-white/70 text-sm">{label}</Label>
      <Input id={`pc-${key}`} value={form[key]} onChange={set(key)} placeholder={placeholder} maxLength={maxLength} className={inputClass} aria-invalid={Boolean(errors[key])} />
      {errors[key] ? <p className="text-xs text-red-400">{errors[key]}</p> : hint ? <p className="text-xs text-white/40">{hint}</p> : null}
    </div>
  );

  if (query.isLoading) {
    return <div className="flex items-center text-white/60 py-8"><Loader2 className="h-5 w-5 animate-spin mr-3" /> Carregando contatos...</div>;
  }
  if (query.isError) {
    return <p className="text-red-300 text-sm py-6">Não foi possível carregar os contatos agora. Recarregue a página.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white text-base">Canais de atendimento</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {field("whatsapp", "WhatsApp comercial", "(11) 91234-5678", "Botão flutuante e link “Falar no WhatsApp” da página de venda.", 20)}
          {field("phone", "Telefone fixo ou alternativo", "(11) 3456-7890", "Opcional.", 20)}
          {field("email", "E-mail de contato", "contato@idefazei.com.br", "Exibido na página de venda e no Fale conosco.", 160)}
          {field("address", "Localização", "São Paulo, SP — Brasil", "Cidade/estado ou endereço completo. Deixe vazio para ocultar.")}
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="pc-businessHours" className="text-white/70 text-sm">Horário de atendimento</Label>
            <Textarea id="pc-businessHours" rows={3} value={form.businessHours} onChange={set("businessHours")} maxLength={300} placeholder={"Segunda a sexta: 8h às 18h\nSábado: 9h às 13h"} className={inputClass} />
            {errors.businessHours ? <p className="text-xs text-red-400">{errors.businessHours}</p> : <p className="text-xs text-white/40">Uma faixa por linha (até 6 linhas).</p>}
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="pc-whatsappMessage" className="text-white/70 text-sm">Mensagem inicial do WhatsApp</Label>
            <Input id="pc-whatsappMessage" value={form.whatsappMessage} onChange={set("whatsappMessage")} maxLength={200} placeholder={DEFAULT_WHATSAPP_MESSAGE} className={inputClass} />
            {errors.whatsappMessage ? <p className="text-xs text-red-400">{errors.whatsappMessage}</p> : <p className="text-xs text-white/40">Texto que já aparece escrito quando a pessoa clica no botão.</p>}
            {previewLink && <a href={previewLink} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c9a84c] underline">Testar o link do WhatsApp</a>}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white text-base">Redes sociais</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {field("instagram", "Instagram", "https://www.instagram.com/idefazei", undefined, 300)}
          {field("facebook", "Facebook", "https://www.facebook.com/idefazei", undefined, 300)}
          {field("youtube", "YouTube", "https://www.youtube.com/@idefazei", undefined, 300)}
          {field("tiktok", "TikTok", "https://www.tiktok.com/@idefazei", undefined, 300)}
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white text-base">Dados da empresa (rodapé)</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {field("legalName", "Razão social", "Nome da empresa", "Passa confiança ao visitante. Opcional.", 120)}
          {field("cnpj", "CNPJ", "00.000.000/0000-00", "Opcional.", 18)}
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={save.isPending} className="bg-[#c9a84c] hover:bg-[#b8943e] text-[#0f1923] font-bold">
          {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar contatos
        </Button>
        <p className="text-xs text-white/40">Campos vazios não aparecem na página pública.</p>
      </div>
    </form>
  );
}
