import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Award, BookOpen, Droplets, GraduationCap, Save, Upload, Eye, Loader2 } from "lucide-react";
import { uploadChurchMedia } from "@/lib/mediaUpload";
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

  const [pastorName, setPastorName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [signatureLabel, setSignatureLabel] = useState("Pastor(a) Presidente");
  const [verseFundamentos, setVerseFundamentos] = useState(DEFAULT_VERSES.fundamentos);
  const [verseBatismo, setVerseBatismo] = useState(DEFAULT_VERSES.batismo);
  const [verseLideres, setVerseLideres] = useState(DEFAULT_VERSES.lideres);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [previewType, setPreviewType] = useState<"fundamentos" | "batismo" | "lideres" | null>(null);

  // Preencher formulário com dados salvos
  useEffect(() => {
    if (config) {
      setPastorName(config.pastorName);
      setLogoUrl(config.logoUrl);
      setSignatureLabel(config.signatureLabel || "Pastor(a) Presidente");
      setVerseFundamentos(config.verseFundamentos || DEFAULT_VERSES.fundamentos);
      setVerseBatismo(config.verseBatismo || DEFAULT_VERSES.batismo);
      setVerseLideres(config.verseLideres || DEFAULT_VERSES.lideres);
    }
  }, [config]);

  const saveMutation = trpc.certificates.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Configurações de certificado salvas!");
      utils.certificates.getConfig.invalidate();
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  });

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
    });
  }

  function handlePreview(type: "fundamentos" | "batismo" | "lideres") {
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
                disabled={false}
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
                disabled={false}
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
                disabled={false}
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
        churchName={churchName}
        pastorName={pastorName}
        signatureLabel={signatureLabel}
        logoUrl={logoUrl}
        verse={previewType === "fundamentos" ? verseFundamentos : previewType === "batismo" ? verseBatismo : verseLideres}
        onOpenChange={(open) => {
          if (!open) setPreviewType(null);
        }}
      />
    </div>
  );
}

type CertificatePreviewType = "fundamentos" | "batismo" | "lideres";

type CertificatePreviewDialogProps = {
  open: boolean;
  type: CertificatePreviewType | null;
  churchName: string;
  pastorName: string;
  signatureLabel: string;
  logoUrl: string;
  verse: string;
  onOpenChange: (open: boolean) => void;
};

const CERTIFICATE_PREVIEW_COPY: Record<CertificatePreviewType, { title: string; subtitle: string; body: string; course: string }> = {
  fundamentos: {
    title: "CERTIFICADO DE CONCLUSÃO",
    subtitle: "Escola de Fundamentos",
    body: "concluiu com êxito o curso de",
    course: "Escola de Fundamentos",
  },
  batismo: {
    title: "CERTIFICADO DE BATISMO",
    subtitle: "Batismo nas Águas",
    body: "foi batizado(a) nas águas em obediência ao mandamento de Cristo, professando publicamente sua fé e compromisso com o Evangelho.",
    course: "Batismo nas Águas",
  },
  lideres: {
    title: "CERTIFICADO DE FORMAÇÃO",
    subtitle: "Escola de Líderes",
    body: "concluiu com distinção o programa de formação de líderes",
    course: "Escola de Líderes",
  },
};

function CertificatePreviewDialog({ open, type, churchName, pastorName, signatureLabel, logoUrl, verse, onOpenChange }: CertificatePreviewDialogProps) {
  if (!type) return null;
  const copy = CERTIFICATE_PREVIEW_COPY[type];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-5xl overflow-y-auto border-[#c9a84c]/30 bg-[#f7f1e5] p-3 sm:p-6">
        <DialogHeader className="sr-only">
          <DialogTitle>Pré-visualização do certificado</DialogTitle>
          <DialogDescription>Exemplo visual usando os dados atuais do formulário. Nenhum arquivo definitivo é gerado.</DialogDescription>
        </DialogHeader>
        <div className="mx-auto w-full max-w-[842px]">
          <div className="relative aspect-[1.414/1] overflow-hidden border-[3px] border-[#c9a84c] bg-[#fcf9f3] p-2 shadow-xl sm:border-4 sm:p-3">
            <div className="absolute inset-2 border border-[#9a7d2e] sm:inset-3" />
            <div className="relative flex h-full flex-col overflow-hidden bg-[#f8f4eb] px-[7%] py-[5%] text-center text-[#1e3a5f]">
              <div className="pointer-events-none absolute -left-[12%] -top-[30%] h-[72%] w-[48%] rounded-full border-[10px] border-[#d5aa52]/80 sm:border-[14px]" />
              <div className="pointer-events-none absolute -bottom-[30%] -right-[12%] h-[72%] w-[48%] rounded-full border-[10px] border-[#d5aa52]/80 sm:border-[14px]" />
              <div className="pointer-events-none absolute inset-[4%] border border-[#b9964b]/70" />

              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-[4%]">
                  <div className="flex min-w-0 flex-1 items-center justify-center gap-[2%]">
                    {logoUrl ? <img src={logoUrl} alt="Logo da igreja" className="h-[12%] max-h-12 w-[12%] max-w-12 object-contain" /> : null}
                    <div className="min-w-0 text-left">
                      <p className="truncate font-serif text-[clamp(0.62rem,1.9vw,1.05rem)] tracking-[0.12em]">{churchName}</p>
                      <p className="text-[clamp(0.32rem,0.8vw,0.46rem)] tracking-[0.28em] text-[#9b7b36]">AMAR · SERVIR · TRANSFORMAR</p>
                    </div>
                  </div>
                  {verse ? <p className="hidden w-[23%] text-right text-[clamp(0.34rem,0.8vw,0.52rem)] italic leading-tight text-[#8c6e2f] sm:block">“{verse}”</p> : null}
                </div>

                <div className="relative mt-[4%] flex min-h-0 flex-1 flex-col items-center justify-start">
                  <p className="text-[clamp(0.45rem,1.1vw,0.68rem)] font-medium uppercase tracking-[0.22em] text-[#365b8a]">{copy.title}</p>
                  <h2 className="mt-[1%] max-w-[92%] font-serif text-[clamp(1.1rem,5vw,2.8rem)] font-semibold leading-[0.95] text-[#b8892e]">{copy.subtitle}</h2>
                  <div className="mt-[2.5%] h-px w-1/2 bg-[#b8892e]/70" />
                  <p className="mt-[3%] text-[clamp(0.45rem,1.1vw,0.68rem)] italic tracking-[0.15em] text-[#365b8a]">CERTIFICAMOS QUE</p>
                  <p className="mt-[2%] max-w-[90%] break-words font-serif text-[clamp(1rem,4.2vw,2.2rem)] font-semibold leading-tight text-[#1e3a5f]">Nome do Membro</p>
                  <div className="mt-[1.5%] h-0.5 w-1/4 bg-[#b8892e]" />
                  <p className="mt-[3%] line-clamp-2 max-w-[80%] whitespace-pre-line text-[clamp(0.48rem,1.25vw,0.72rem)] leading-relaxed text-[#365b8a]">{copy.body}</p>
                  <p className="mt-[2%] line-clamp-1 max-w-[82%] font-serif text-[clamp(0.62rem,1.8vw,0.94rem)] font-medium text-[#8c6e2f]">“{copy.course}”</p>
                </div>

                <div className="relative z-10 mt-[2%] shrink-0 border-t border-[#b9964b]/70 pt-[1.5%] text-[#365b8a]">
                  <p className="text-[clamp(0.42rem,1.05vw,0.6rem)]">{churchName} — {new Date().toLocaleDateString("pt-BR")}</p>
                  <div className="mt-[2%] grid grid-cols-2 gap-[8%] text-[clamp(0.4rem,0.95vw,0.56rem)] text-[#1e3a5f]">
                    <div className="flex flex-col items-center border-t border-[#1e3a5f] pt-[1%]">
                      <strong>{pastorName || "Nome do Pastor / Líder"}</strong>
                      <span>{signatureLabel || "Pastor(a) Presidente"}</span>
                    </div>
                    <div className="flex flex-col items-center border-t border-[#1e3a5f] pt-[1%]">
                      <strong>{churchName}</strong>
                      <span>Igreja</span>
                    </div>
                  </div>
                  {verse ? <p className="mt-[2%] line-clamp-2 text-[clamp(0.36rem,0.8vw,0.5rem)] italic leading-tight text-[#8c6e2f] sm:hidden">“{verse}”</p> : null}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">Prévia usando os dados atuais. Salve as configurações somente quando estiver satisfeito.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
