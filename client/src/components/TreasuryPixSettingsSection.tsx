import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, KeyRound, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";

type PixKeyType = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria" | "outro";

type Props = {
  churchId: number;
  canManageStructure: boolean;
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
}: Props) {
  const utils = trpc.useUtils();
  const pixSettingsQuery = trpc.treasury.pixSettings.useQuery(
    { churchId },
    { enabled: Boolean(churchId) }
  );
  const [form, setForm] = useState<PixForm>(EMPTY_FORM);

  useEffect(() => {
    const settings = pixSettingsQuery.data;
    if (!settings) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({
      pixKeyType: settings.pixKeyType,
      pixKey: settings.pixKey,
      recipientName: settings.recipientName,
      institutionName: settings.institutionName ?? "",
    });
  }, [pixSettingsQuery.data]);

  const savePixSettings = trpc.treasury.savePixSettings.useMutation({
    onSuccess: async () => {
      await utils.treasury.pixSettings.invalidate({ churchId });
      toast.success("Chave PIX salva para esta igreja.");
    },
    onError: error =>
      toast.error(error.message || "Não foi possível salvar a chave PIX."),
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

  const settings = pixSettingsQuery.data;

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
      </CardContent>
    </Card>
  );
}
