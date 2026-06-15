import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Award, BookOpen, Droplets, GraduationCap, Save, Upload, Eye, Loader2 } from "lucide-react";
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
  const { churchId } = useChurch();
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

  const previewMutation = trpc.certificates.generate.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      setPreviewType(null);
    },
    onError: () => {
      toast.error("Erro ao gerar pré-visualização");
      setPreviewType(null);
    },
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
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload falhou");
      const { url } = await res.json();
      setLogoUrl(url);
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
    previewMutation.mutate({
      type,
      memberName: "Nome do Membro",
      churchId,
      courseName: type === "fundamentos" ? "Escola de Fundamentos" : undefined,
      className: type === "lideres" ? "Turma de Líderes 2025" : undefined,
    });
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
                disabled={previewType === "fundamentos"}
                onClick={() => handlePreview("fundamentos")}
              >
                {previewType === "fundamentos" ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Eye className="h-3 w-3 mr-1" />
                )}
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
                disabled={previewType === "batismo"}
                onClick={() => handlePreview("batismo")}
              >
                {previewType === "batismo" ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Eye className="h-3 w-3 mr-1" />
                )}
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
                disabled={previewType === "lideres"}
                onClick={() => handlePreview("lideres")}
              >
                {previewType === "lideres" ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Eye className="h-3 w-3 mr-1" />
                )}
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
    </div>
  );
}
