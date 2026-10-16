import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Award, BookOpen, Droplets, GraduationCap, Save, Upload, Eye, Loader2, Plus, Pencil, Archive, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { uploadChurchMedia } from "@/lib/mediaUpload";
import { CertificateArtboard } from "@/components/CertificateArtboard";
import { CERTIFICATE_TEMPLATE_COPY, type CertificateTemplateOverride, type CertificateType } from "@shared/certificateTemplate";
// ─── VERSÍCULOS PADRÃO ────────────────────────────────────────────────────────

const DEFAULT_VERSES = {
  fundamentos:
    '"Toda a Escritura é inspirada por Deus e útil para o ensino, para a repreensão, para a correção e para a instrução na justiça." — 2 Timóteo 3:16',
  batismo:
    '"Portanto ide, fazei discípulos de todas as nações, batizando-os em nome do Pai, e do Filho, e do Espírito Santo." — Mateus 28:19',
  lideres:
    '"E o que ouviste de mim por muitas testemunhas, isso confia a homens fiéis, que sejam idôneos para também ensinarem os outros." — 2 Timóteo 2:2',
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function ConfiguracoesCertificados() {
  const { churchId, churchName } = useChurch();
  const utils = trpc.useUtils();

  const { data: config, isLoading } = trpc.certificates.getConfig.useQuery(
    { churchId },
    { enabled: !!churchId }
  );
  const customTypesQuery = trpc.certificates.listCustomTypes.useQuery(
    { churchId },
    { enabled: !!churchId }
  );
  const { data: people = [] } = trpc.people.list.useQuery({ churchId }, { enabled: !!churchId });

  const [pastorName, setPastorName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [signatureLabel, setSignatureLabel] = useState("Pastor(a) Presidente");
  const [verseFundamentos, setVerseFundamentos] = useState(DEFAULT_VERSES.fundamentos);
  const [verseBatismo, setVerseBatismo] = useState(DEFAULT_VERSES.batismo);
  const [verseLideres, setVerseLideres] = useState(DEFAULT_VERSES.lideres);
  const [templateFundamentos, setTemplateFundamentos] = useState<CertificateTemplateOverride>({ modelKey: "modern-v1", title: CERTIFICATE_TEMPLATE_COPY.fundamentos.title, subtitle: CERTIFICATE_TEMPLATE_COPY.fundamentos.subtitle, body: CERTIFICATE_TEMPLATE_COPY.fundamentos.body });
  const [templateBatismo, setTemplateBatismo] = useState<CertificateTemplateOverride>({ modelKey: "modern-v1", title: CERTIFICATE_TEMPLATE_COPY.batismo.title, subtitle: CERTIFICATE_TEMPLATE_COPY.batismo.subtitle, body: CERTIFICATE_TEMPLATE_COPY.batismo.body });
  const [templateLideres, setTemplateLideres] = useState<CertificateTemplateOverride>({ modelKey: "modern-v1", title: CERTIFICATE_TEMPLATE_COPY.lideres.title, subtitle: CERTIFICATE_TEMPLATE_COPY.lideres.subtitle, body: CERTIFICATE_TEMPLATE_COPY.lideres.body });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [previewType, setPreviewType] = useState<CertificatePreviewType | null>(null);
  const [previewCustom, setPreviewCustom] = useState<CustomCertificateRow | null>(null);
  const [customTypeDialogOpen, setCustomTypeDialogOpen] = useState(false);
  const [customTypeEditingId, setCustomTypeEditingId] = useState<number | null>(null);
  const [customTypeDraft, setCustomTypeDraft] = useState<CustomCertificateDraft>(EMPTY_CUSTOM_TYPE);
  const [archiveTarget, setArchiveTarget] = useState<CustomCertificateRow | null>(null);
  const [emitTarget, setEmitTarget] = useState<CustomCertificateRow | null>(null);
  const [emitPersonId, setEmitPersonId] = useState("");

  // Preencher formulário com dados salvos
  useEffect(() => {
    if (config) {
      setPastorName(config.pastorName);
      setLogoUrl(config.logoUrl);
      setSignatureLabel(config.signatureLabel || "Pastor(a) Presidente");
      setVerseFundamentos(config.verseFundamentos || DEFAULT_VERSES.fundamentos);
      setVerseBatismo(config.verseBatismo || DEFAULT_VERSES.batismo);
      setVerseLideres(config.verseLideres || DEFAULT_VERSES.lideres);
      if (config.templates) {
        setTemplateFundamentos(config.templates.fundamentos);
        setTemplateBatismo(config.templates.batismo);
        setTemplateLideres(config.templates.lideres);
      }
    }
  }, [config]);

  const saveMutation = trpc.certificates.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Configurações de certificado salvas!");
      utils.certificates.getConfig.invalidate();
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  });

  const customTypeUtils = trpc.useUtils();
  const createCustomTypeMutation = trpc.certificates.createCustomType.useMutation({
    onSuccess: () => {
      toast.success("Novo tipo de certificado criado!");
      setCustomTypeDialogOpen(false);
      setCustomTypeDraft(EMPTY_CUSTOM_TYPE);
      customTypeUtils.certificates.listCustomTypes.invalidate({ churchId });
    },
    onError: (error) => toast.error(error.message || "Erro ao criar tipo de certificado"),
  });
  const updateCustomTypeMutation = trpc.certificates.updateCustomType.useMutation({
    onSuccess: () => {
      toast.success("Tipo de certificado atualizado!");
      setCustomTypeDialogOpen(false);
      setCustomTypeEditingId(null);
      setCustomTypeDraft(EMPTY_CUSTOM_TYPE);
      customTypeUtils.certificates.listCustomTypes.invalidate({ churchId });
    },
    onError: (error) => toast.error(error.message || "Erro ao atualizar tipo de certificado"),
  });
  const archiveCustomTypeMutation = trpc.certificates.archiveCustomType.useMutation({
    onSuccess: () => {
      toast.success("Tipo de certificado arquivado.");
      setArchiveTarget(null);
      customTypeUtils.certificates.listCustomTypes.invalidate({ churchId });
    },
    onError: (error) => toast.error(error.message || "Erro ao arquivar tipo de certificado"),
  });

  const emitCustomCertificateMutation = trpc.certificates.generate.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success("Certificado gerado.");
      setEmitTarget(null);
      setEmitPersonId("");
    },
    onError: (error) => toast.error(error.message || "Não foi possível gerar o certificado."),
  });

  function openNewCustomType() {
    setCustomTypeEditingId(null);
    setCustomTypeDraft(EMPTY_CUSTOM_TYPE);
    setCustomTypeDialogOpen(true);
  }

  function openEditCustomType(customType: CustomCertificateRow) {
    setCustomTypeEditingId(customType.id);
    setCustomTypeDraft({ name: customType.name, title: customType.title, subtitle: customType.subtitle, body: customType.body, verse: customType.verse || "" });
    setCustomTypeDialogOpen(true);
  }

  function handleCustomTypeSave() {
    const payload = { churchId, ...customTypeDraft, verse: customTypeDraft.verse || undefined };
    if (customTypeEditingId) {
      updateCustomTypeMutation.mutate({ ...payload, id: customTypeEditingId });
    } else {
      createCustomTypeMutation.mutate(payload);
    }
  }

  function previewCustomType(customType: CustomCertificateRow) {
    setPreviewType("fundamentos");
    setPreviewCustom(customType);
  }

  function openEmitCustomType(customType: CustomCertificateRow) {
    setEmitTarget(customType);
    setEmitPersonId("");
  }

  function closePreview(open: boolean) {
    if (!open) {
      setPreviewType(null);
      setPreviewCustom(null);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo deve ter no máximo 2MB");
      return;
    }
    setUploadingLogo(true);
    try {
      const result = await uploadChurchMedia(file, { purpose: "certificate_logo", resourceType: "image" });
      setLogoUrl(result.optimizedUrl);
      toast.success("Logo enviado com sucesso!");
    } catch {
      toast.error("Erro ao enviar logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  function handleSave() {
    saveMutation.mutate({
      churchId,
      pastorName,
      logoUrl,
      signatureLabel,
      verseFundamentos,
      verseBatismo,
      verseLideres,
      templates: {
        fundamentos: { ...templateFundamentos, modelKey: "modern-v1" as const },
        batismo: { ...templateBatismo, modelKey: "modern-v1" as const },
        lideres: { ...templateLideres, modelKey: "modern-v1" as const },
      },
    });
  }

  function handlePreview(type: "fundamentos" | "batismo" | "lideres") {
    setPreviewCustom(null);
    setPreviewType(type);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
          <Award className="h-6 w-6 text-[#c9a84c]" />
          Personalização de Certificados
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure o nome do pastor, cargo, versículos e logo que aparecerão nos certificados
          gerados pela sua igreja.
        </p>
      </div>

      {/* Dados do Signatário */}
      <Card className="border border-[#c9a84c]/20">
        <CardHeader>
          <CardTitle className="text-[#1e3a5f] text-lg">Dados do Signatário</CardTitle>
          <CardDescription>
            Nome e cargo que aparecem na linha de assinatura de todos os certificados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pastorName">Nome do Pastor / Líder</Label>
              <Input
                id="pastorName"
                placeholder="Ex: Rev. João da Silva"
                value={pastorName}
                onChange={(e) => setPastorName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signatureLabel">Cargo / Título</Label>
              <Input
                id="signatureLabel"
                placeholder="Ex: Pastor Presidente, Bispa, Presbítero"
                value={signatureLabel}
                onChange={(e) => setSignatureLabel(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo da Igreja */}
      <Card className="border border-[#c9a84c]/20">
        <CardHeader>
          <CardTitle className="text-[#1e3a5f] text-lg">Logo da Igreja</CardTitle>
          <CardDescription>
            Imagem PNG ou JPG (máx. 2MB) que aparecerá no cabeçalho dos certificados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo da igreja"
                className="h-16 w-16 object-contain rounded border border-[#c9a84c]/30 bg-white p-1"
              />
            )}
            <div className="flex-1 space-y-2">
              <Label htmlFor="logoUrl">URL do Logo</Label>
              <Input
                id="logoUrl"
                placeholder="https://... ou use o botão para enviar"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <label htmlFor="logoUpload">
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={uploadingLogo}
                    asChild
                  >
                    <span>
                      {uploadingLogo ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Enviar Logo
                    </span>
                  </Button>
                </label>
                <input
                  id="logoUpload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <span className="text-xs text-muted-foreground">PNG, JPG ou WebP — máx. 2MB</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo por tipo, com design protegido */}
      <Card className="border border-[#c9a84c]/20">
        <CardHeader>
          <CardTitle className="text-[#1e3a5f] text-lg">Conteúdo dos Certificados</CardTitle>
          <CardDescription>
            Personalize o nome da formação e a frase de reconhecimento. O modelo visual moderno permanece protegido para manter a aparência profissional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <CertificateTemplateEditor label="Escola de Fundamentos" value={templateFundamentos} onChange={setTemplateFundamentos} />
          <Separator />
          <CertificateTemplateEditor label="Batismo nas Águas" value={templateBatismo} onChange={setTemplateBatismo} />
          <Separator />
          <CertificateTemplateEditor label="Escola de Líderes" value={templateLideres} onChange={setTemplateLideres} />
        </CardContent>
      </Card>

      {/* Novos tipos de certificado */}
      <Card className="border border-[#c9a84c]/20">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-[#1e3a5f] text-lg">Outros tipos de certificado</CardTitle>
            <CardDescription>
              Crie uma nova formação usando o mesmo modelo moderno protegido. O design não é editável.
            </CardDescription>
          </div>
          <Button type="button" size="sm" className="shrink-0 bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90" onClick={openNewCustomType}>
            <Plus className="mr-1 h-4 w-4" />
            Novo tipo
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {customTypesQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando tipos personalizados...</div>
          ) : customTypesQuery.data?.length ? (
            customTypesQuery.data.map((customType) => (
              <div key={customType.id} className="flex flex-col gap-3 rounded-xl border border-[#c9a84c]/20 bg-[#fcf9f3] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[#1e3a5f]">{customType.name}</p>
                    <span className="rounded-full bg-[#f8f4eb] px-2 py-1 text-[10px] font-medium text-[#8c6e2f]">Modelo moderno</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{customType.subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => previewCustomType(customType)}><Eye className="mr-1 h-4 w-4" />Pré-visualizar</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => openEmitCustomType(customType)}><Award className="mr-1 h-4 w-4" />Emitir</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => openEditCustomType(customType)}><Pencil className="mr-1 h-4 w-4" />Editar</Button>
                  <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => setArchiveTarget(customType)}><Archive className="mr-1 h-4 w-4" />Arquivar</Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-[#c9a84c]/30 bg-[#fcf9f3] p-5 text-sm text-muted-foreground">
              Nenhum tipo adicional criado. Os três tipos padrão continuam disponíveis acima.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Versículos por Tipo */}
      <Card className="border border-[#c9a84c]/20">
        <CardHeader>
          <CardTitle className="text-[#1e3a5f] text-lg">Versículos por Tipo de Certificado</CardTitle>
          <CardDescription>
            Personalize o versículo bíblico que aparece no rodapé de cada tipo de certificado.
            Deixe em branco para usar o versículo padrão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Escola de Fundamentos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#c9a84c]" />
                Escola de Fundamentos
              </Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handlePreview("fundamentos")}
              >
                <Eye className="h-3 w-3 mr-1" />
                Pré-visualizar
              </Button>
            </div>
            <Textarea
              placeholder={DEFAULT_VERSES.fundamentos}
              value={verseFundamentos}
              onChange={(e) => setVerseFundamentos(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <Separator />

          {/* Batismo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-[#06b6d4]" />
                Batismo nas Águas
              </Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handlePreview("batismo")}
              >
                <Eye className="h-3 w-3 mr-1" />
                Pré-visualizar
              </Button>
            </div>
            <Textarea
              placeholder={DEFAULT_VERSES.batismo}
              value={verseBatismo}
              onChange={(e) => setVerseBatismo(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <Separator />

          {/* Escola de Líderes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-[#6366f1]" />
                Escola de Líderes
              </Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handlePreview("lideres")}
              >
                <Eye className="h-3 w-3 mr-1" />
                Pré-visualizar
              </Button>
            </div>
            <Textarea
              placeholder={DEFAULT_VERSES.lideres}
              value={verseLideres}
              onChange={(e) => setVerseLideres(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button
          className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white px-8"
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>

      <CertificatePreviewDialog
        open={previewType !== null}
        type={previewType}
        customType={previewCustom}
        churchName={churchName}
        pastorName={pastorName}
        signatureLabel={signatureLabel}
        logoUrl={logoUrl}
        verse={previewType === "fundamentos" ? verseFundamentos : previewType === "batismo" ? verseBatismo : verseLideres}
        template={previewType === "fundamentos" ? templateFundamentos : previewType === "batismo" ? templateBatismo : templateLideres}
        onOpenChange={closePreview}
      />

      <CustomCertificateEmissionDialog
        open={emitTarget !== null}
        customType={emitTarget}
        people={people as Array<{ id: number; fullName: string }>}
        selectedPersonId={emitPersonId}
        pending={emitCustomCertificateMutation.isPending}
        onOpenChange={(open) => !open && setEmitTarget(null)}
        onPersonChange={setEmitPersonId}
        onEmit={() => {
          const person = (people as Array<{ id: number; fullName: string }>).find((item) => String(item.id) === emitPersonId);
          if (!emitTarget || !person) return;
          emitCustomCertificateMutation.mutate({ type: "fundamentos", customTypeId: emitTarget.id, memberName: person.fullName, churchId, personId: person.id });
        }}
      />

      <CustomCertificateDialog
        open={customTypeDialogOpen}
        draft={customTypeDraft}
        editing={customTypeEditingId !== null}
        pending={createCustomTypeMutation.isPending || updateCustomTypeMutation.isPending}
        onOpenChange={setCustomTypeDialogOpen}
        onChange={setCustomTypeDraft}
        onSave={handleCustomTypeSave}
      />

      <AlertDialog open={archiveTarget !== null} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar tipo de certificado?</AlertDialogTitle>
            <AlertDialogDescription>
              “{archiveTarget?.name}” deixará de aparecer como tipo ativo. Certificados já emitidos não serão alterados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveTarget && archiveCustomTypeMutation.mutate({ churchId, id: archiveTarget.id })}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

type CertificatePreviewType = "fundamentos" | "batismo" | "lideres";
type CustomCertificateDraft = {
  name: string;
  title: string;
  subtitle: string;
  body: string;
  verse: string;
};
type CustomCertificateRow = Omit<CustomCertificateDraft, "verse"> & {
  id: number;
  churchId: number;
  modelKey: string;
  verse: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const EMPTY_CUSTOM_TYPE: CustomCertificateDraft = {
  name: "",
  title: "CERTIFICADO DE CONCLUSÃO",
  subtitle: "",
  body: "concluiu com êxito a formação oferecida pela igreja.",
  verse: "",
};

type CertificateTemplateEditorProps = {
  label: string;
  value: CertificateTemplateOverride;
  onChange: (value: CertificateTemplateOverride) => void;
};

function CertificateTemplateEditor({ label, value, onChange }: CertificateTemplateEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-[#1e3a5f]">{label}</Label>
        <span className="rounded-full bg-[#f8f4eb] px-2 py-1 text-[10px] font-medium text-[#8c6e2f]">Modelo moderno</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Título superior</Label>
          <Input value={value.title} maxLength={160} onChange={(e) => onChange({ ...value, title: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Nome da formação</Label>
          <Input value={value.subtitle} maxLength={180} onChange={(e) => onChange({ ...value, subtitle: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Frase de reconhecimento</Label>
        <Textarea value={value.body} maxLength={500} rows={2} className="resize-none text-sm" onChange={(e) => onChange({ ...value, body: e.target.value })} />
      </div>
    </div>
  );
}

type CustomCertificateEmissionDialogProps = {
  open: boolean;
  customType: CustomCertificateRow | null;
  people: Array<{ id: number; fullName: string }>;
  selectedPersonId: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonChange: (personId: string) => void;
  onEmit: () => void;
};

function CustomCertificateEmissionDialog({ open, customType, people, selectedPersonId, pending, onOpenChange, onPersonChange, onEmit }: CustomCertificateEmissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Emitir certificado</DialogTitle>
          <DialogDescription>Selecione a pessoa que receberá “{customType?.name}”. A emissão usa o modelo moderno protegido.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Pessoa da igreja</Label>
            <Select value={selectedPersonId} onValueChange={onPersonChange}>
              <SelectTrigger><SelectValue placeholder="Selecione uma pessoa" /></SelectTrigger>
              <SelectContent>{people.map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="rounded-lg bg-[#f8f4eb] p-3 text-xs text-[#6f5a2c]">A emissão gera um PDF com o nome da pessoa selecionada e mantém o histórico dos certificados já emitidos.</div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" className="bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90" disabled={!selectedPersonId || pending} onClick={onEmit}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
            {pending ? "Gerando…" : "Gerar PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type CustomCertificateDialogProps = {
  open: boolean;
  draft: CustomCertificateDraft;
  editing: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (draft: CustomCertificateDraft) => void;
  onSave: () => void;
};

function CustomCertificateDialog({ open, draft, editing, pending, onOpenChange, onChange, onSave }: CustomCertificateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar tipo de certificado" : "Novo tipo de certificado"}</DialogTitle>
          <DialogDescription>
            O conteúdo é personalizado pela igreja, mas o modelo moderno, as margens e a composição permanecem protegidos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="customTypeName">Nome da formação</Label>
            <Input id="customTypeName" placeholder="Ex.: Escola de Discípulos" value={draft.name} maxLength={160} onChange={(e) => onChange({ ...draft, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customTypeTitle">Título do certificado</Label>
              <Input id="customTypeTitle" placeholder="CERTIFICADO DE CONCLUSÃO" value={draft.title} maxLength={160} onChange={(e) => onChange({ ...draft, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customTypeSubtitle">Subtítulo</Label>
              <Input id="customTypeSubtitle" placeholder="Nome da formação" value={draft.subtitle} maxLength={180} onChange={(e) => onChange({ ...draft, subtitle: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customTypeBody">Frase de reconhecimento</Label>
            <Textarea id="customTypeBody" rows={3} maxLength={500} value={draft.body} onChange={(e) => onChange({ ...draft, body: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customTypeVerse">Versículo ou mensagem opcional</Label>
            <Textarea id="customTypeVerse" rows={3} maxLength={500} placeholder="Você pode usar um versículo ou uma mensagem da igreja." value={draft.verse} onChange={(e) => onChange({ ...draft, verse: e.target.value })} />
          </div>
          <div className="rounded-lg bg-[#f8f4eb] p-3 text-xs text-[#6f5a2c]">
            O modelo visual usado será <strong>Moderno</strong>. Não é necessário configurar fonte, moldura, posição ou tamanho dos elementos.
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" className="bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90" disabled={pending || !draft.name.trim() || !draft.subtitle.trim() || !draft.body.trim()} onClick={onSave}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {editing ? "Salvar alterações" : "Criar tipo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type CertificatePreviewDialogProps = {
  open: boolean;
  type: CertificatePreviewType | null;
  customType?: CustomCertificateRow | null;
  churchName: string;
  pastorName: string;
  signatureLabel: string;
  logoUrl: string;
  verse: string;
  template: CertificateTemplateOverride;
  onOpenChange: (open: boolean) => void;
};

function CertificatePreviewDialog({ open, type, customType, churchName, pastorName, signatureLabel, logoUrl, verse, template, onOpenChange }: CertificatePreviewDialogProps) {
  const [zoom, setZoom] = useState(1);
  if (!type) return null;

  const effectiveTemplate = customType
    ? { modelKey: "modern-v1", title: customType.title, subtitle: customType.subtitle, body: customType.body }
    : template;
  const effectiveVerse = customType?.verse || verse;
  const dateLabel = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  function resetZoom() {
    setZoom(1);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-[#17283d] p-0 text-white sm:h-[calc(100dvh-2rem)] sm:w-[min(96vw,1280px)] sm:rounded-2xl sm:border sm:border-[#c9a84c]/30">
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-white/10 bg-[#1e3a5f] px-4 py-3 pr-14 text-left sm:px-6">
          <div>
            <DialogTitle className="text-base font-semibold text-white sm:text-lg">Prévia do certificado</DialogTitle>
            <DialogDescription className="mt-0.5 text-xs text-white/65 sm:text-sm">Modelo moderno · proporção A4 horizontal</DialogDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10 hover:text-white" onClick={() => setZoom((value) => Math.max(0.75, Number((value - 0.15).toFixed(2))))} aria-label="Reduzir zoom">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10 hover:text-white" onClick={resetZoom} aria-label="Restaurar zoom">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10 hover:text-white" onClick={() => setZoom((value) => Math.min(1.8, Number((value + 0.15).toFixed(2))))} aria-label="Aumentar zoom">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <span className="ml-1 min-w-12 text-center text-xs tabular-nums text-white/70">{Math.round(zoom * 100)}%</span>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto overscroll-contain bg-[#17283d] p-4 sm:p-8">
          <div className="flex min-h-full min-w-full items-center justify-center">
            <div className="w-[min(92vw,1123px)] shrink-0 transition-transform duration-200" style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
              <CertificateArtboard
                type={type}
                memberName="Nome do Membro"
                churchName={churchName}
                pastorName={pastorName}
                signatureLabel={signatureLabel}
                verse={effectiveVerse}
                dateLabel={dateLabel}
                template={effectiveTemplate}
                logoUrl={logoUrl}
                className="block h-auto w-full overflow-visible rounded-[2px] shadow-2xl"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 bg-[#1e3a5f] px-4 py-3 text-center text-xs text-white/65 sm:px-6">
          A prévia respeita a proporção original do documento. Use os controles de zoom para conferir o nome, a mensagem e as assinaturas antes de salvar.
        </div>
      </DialogContent>
    </Dialog>
  );
}
