import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  MessageCircle,
  QrCode,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE,
  MAX_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE_LENGTH,
} from "../../../shared/onlineContribution";

type PixKeyType = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria" | "outro";

type Props = {
  churchId: number;
  canManageStructure: boolean;
  canManageThankYouMessage: boolean;
};

type PixForm = {
  pixKeyType: PixKeyType;
  pixKey: string;
  recipientName: string;
  institutionName: string;
};

const PIX_KEY_TYPES: Array<{ value: PixKeyType; label: string }> = [
  { value: "aleatoria", label: "Chave aleatória" },
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "outro", label: "Outro" },
];

const EMPTY_FORM: PixForm = {
  pixKeyType: "aleatoria",
  pixKey: "",
  recipientName: "",
  institutionName: "",
};

function pixKeyTypeLabel(value: PixKeyType) {
  return PIX_KEY_TYPES.find(item => item.value === value)?.label ?? value;
}

export function TreasuryPixSettingsSection({
  churchId,
  canManageStructure,
  canManageThankYouMessage,
}: Props) {
  const utils = trpc.useUtils();
  const pixSettingsQuery = trpc.treasury.pixSettings.useQuery(
    { churchId },
    { enabled: Boolean(churchId) }
  );
  const [form, setForm] = useState<PixForm>(EMPTY_FORM);
  const [thankYouMessage, setThankYouMessage] = useState(
    DEFAULT_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE
  );

  useEffect(() => {
    const settings = pixSettingsQuery.data;
    if (!settings) {
      setForm(EMPTY_FORM);
      setThankYouMessage(DEFAULT_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE);
      return;
    }
    setForm({
      pixKeyType: settings.pixKeyType,
      pixKey: settings.pixKey,
      recipientName: settings.recipientName,
      institutionName: settings.institutionName ?? "",
    });
    setThankYouMessage(
      settings.thankYouMessage?.trim() ||
        DEFAULT_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE
    );
  }, [pixSettingsQuery.data]);

  const savePixSettings = trpc.treasury.savePixSettings.useMutation({
    onSuccess: async () => {
      await utils.treasury.pixSettings.invalidate({ churchId });
      toast.success("Chave PIX salva para esta igreja.");
    },
    onError: error =>
      toast.error(error.message || "Não foi possível salvar a chave PIX."),
  });

  const saveThankYouMessage =
    trpc.treasury.updatePixThankYouMessage.useMutation({
      onSuccess: async () => {
        await Promise.all([
          utils.treasury.pixSettings.invalidate({ churchId }),
          utils.treasury.pixForMember.invalidate({ churchId }),
        ]);
        toast.success("Mensagem de agradecimento salva para esta igreja.");
      },
      onError: error =>
        toast.error(
          error.message ||
            "Não foi possível salvar a mensagem de agradecimento."
        ),
    });

  function updateForm(patch: Partial<PixForm>) {
    setForm(current => ({ ...current, ...patch }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pixKey = form.pixKey.trim();
    const recipientName = form.recipientName.trim();
    if (pixKey.length < 3) {
      toast.error("Informe uma chave PIX válida.");
      return;
    }
    if (recipientName.length < 2) {
      toast.error("Informe o nome do recebedor.");
      return;
    }

    savePixSettings.mutate({
      churchId,
      pixKeyType: form.pixKeyType,
      pixKey,
      recipientName,
      institutionName: form.institutionName.trim(),
    });
  }

  function submitThankYouMessage() {
    if (!settings) return;
    saveThankYouMessage.mutate({
      churchId,
      thankYouMessage: thankYouMessage.trim() || null,
    });
  }

  const settings = pixSettingsQuery.data;

  const thankYouEditor =
    settings && canManageThankYouMessage ? (
      <section
        className="mt-5 rounded-2xl border border-gold/25 bg-gold/5 p-4 sm:p-5"
        aria-labelledby="treasury-pix-thank-you-title"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3
              id="treasury-pix-thank-you-title"
              className="font-semibold text-navy"
            >
              Mensagem após o envio
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Esta mensagem aparecerá imediatamente ao discípulo depois que ele
              enviar o comprovante. A contribuição continuará pendente para a
              conferência da Tesouraria.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="treasury-pix-thank-you-message">
            Mensagem de agradecimento
          </Label>
          <Textarea
            id="treasury-pix-thank-you-message"
            value={thankYouMessage}
            maxLength={MAX_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE_LENGTH}
            rows={4}
            onChange={event => setThankYouMessage(event.target.value)}
            placeholder={DEFAULT_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE}
          />
          <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {thankYouMessage.length}/
              {MAX_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE_LENGTH} caracteres
            </span>
            <span>Texto simples, sem HTML.</span>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/80 bg-white/80 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">
            Prévia para o discípulo
          </p>
          <p className="mt-2 text-sm leading-relaxed text-navy">
            {thankYouMessage.trim() ||
              DEFAULT_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE}
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="gap-2 bg-white"
            onClick={() =>
              setThankYouMessage(DEFAULT_ONLINE_CONTRIBUTION_THANK_YOU_MESSAGE)
            }
            disabled={saveThankYouMessage.isPending}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Usar mensagem
            padrão
          </Button>
          <Button
            type="button"
            className="gap-2 bg-navy text-white hover:bg-navy/90"
            onClick={submitThankYouMessage}
            disabled={saveThankYouMessage.isPending}
          >
            {saveThankYouMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            )}
            {saveThankYouMessage.isPending ? "Salvando..." : "Salvar mensagem"}
          </Button>
        </div>
      </section>
    ) : null;

  return (
    <Card className="border-navy/15 bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl text-navy">
            <QrCode className="h-5 w-5 text-gold" aria-hidden="true" />
            Configuração da chave PIX
          </CardTitle>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Esta chave será exibida aos membros desta igreja quando iniciarem
            uma contribuição on-line.
          </p>
        </div>
        {settings ? (
          <Badge className="w-fit border-emerald-200 bg-emerald-50 text-emerald-800">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />{" "}
            Ativa · v{settings.version}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="w-fit border-amber-200 bg-amber-50 text-amber-800"
          >
            Ainda não configurada
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {pixSettingsQuery.isLoading ? (
          <div
            className="h-28 animate-pulse rounded-xl bg-slate-100"
            aria-label="Carregando configuração PIX"
          />
        ) : pixSettingsQuery.error ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          >
            Não foi possível carregar a configuração PIX desta igreja.
          </p>
        ) : canManageStructure ? (
          <form onSubmit={submit} className="space-y-4">
            {!settings && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
                Cadastre uma chave para que os membros possam ver para onde
                enviar o PIX.
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="treasury-pix-key-type">Tipo da chave *</Label>
                <Select
                  value={form.pixKeyType}
                  onValueChange={value =>
                    updateForm({ pixKeyType: value as PixKeyType })
                  }
                >
                  <SelectTrigger id="treasury-pix-key-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIX_KEY_TYPES.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="treasury-pix-key">Chave PIX *</Label>
                <div className="relative">
                  <KeyRound
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/60"
                    aria-hidden="true"
                  />
                  <Input
                    id="treasury-pix-key"
                    value={form.pixKey}
                    onChange={event =>
                      updateForm({ pixKey: event.target.value })
                    }
                    className="pl-9"
                    placeholder="Ex.: contato@igreja.com.br"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="treasury-pix-recipient">
                  Nome do recebedor *
                </Label>
                <Input
                  id="treasury-pix-recipient"
                  value={form.recipientName}
                  onChange={event =>
                    updateForm({ recipientName: event.target.value })
                  }
                  placeholder="Ex.: Igreja Cristã Viver"
                  autoComplete="organization"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="treasury-pix-institution">
                  Instituição financeira{" "}
                  <span className="font-normal text-muted-foreground">
                    (opcional)
                  </span>
                </Label>
                <Input
                  id="treasury-pix-institution"
                  value={form.institutionName}
                  onChange={event =>
                    updateForm({ institutionName: event.target.value })
                  }
                  placeholder="Ex.: Banco ou instituição"
                  autoComplete="organization"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-muted-foreground">
                A alteração fica registrada na auditoria financeira. Somente
                pastores podem alterar a chave PIX.
              </p>
              <Button
                type="submit"
                className="w-full gap-2 bg-navy text-white hover:bg-navy/90 sm:w-auto"
                disabled={savePixSettings.isPending}
              >
                {savePixSettings.isPending ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                )}
                {savePixSettings.isPending
                  ? "Salvando..."
                  : settings
                    ? "Atualizar chave PIX"
                    : "Salvar chave PIX"}
              </Button>
            </div>
          </form>
        ) : settings ? (
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm sm:grid-cols-3">
            <p>
              <span className="block text-xs text-muted-foreground">
                Tipo da chave
              </span>
              <strong className="text-navy">
                {pixKeyTypeLabel(settings.pixKeyType)}
              </strong>
            </p>
            <p>
              <span className="block text-xs text-muted-foreground">
                Chave PIX
              </span>
              <strong className="break-all text-navy">{settings.pixKey}</strong>
            </p>
            <p>
              <span className="block text-xs text-muted-foreground">
                Recebedor
              </span>
              <strong className="text-navy">
                {settings.recipientName}
                {settings.institutionName
                  ? ` · ${settings.institutionName}`
                  : ""}
              </strong>
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              A igreja ainda não configurou uma chave PIX. Solicite a um pastor
              que faça o cadastro nesta seção.
            </p>
          </div>
        )}
        {thankYouEditor}
      </CardContent>
    </Card>
  );
}
