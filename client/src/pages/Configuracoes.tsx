import { useEffect, useRef, useState } from "react";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Building2, Palette, Users, Globe, Save, Upload } from "lucide-react";
import { getChurchToken } from "@/hooks/useChurchAuth";

const ROLES = [
  { value: "pastor_presidente", label: "Pastor Presidente" },
  { value: "pastor_local", label: "Pastor Local" },
  { value: "supervisor", label: "Supervisor" },
  { value: "lider", label: "Líder" },
  { value: "consolidador", label: "Consolidador" },
  { value: "diacono", label: "Diácono" },
  { value: "secretario", label: "Secretário" },
  { value: "tesoureiro", label: "Tesoureiro" },
  { value: "membro", label: "Membro" },
];

export default function Configuracoes() {
  const { churchId } = useChurch();
  const { data: church, isLoading, refetch } = trpc.churches.getById.useQuery(
    { id: churchId! },
    { enabled: !!churchId }
  );

  const [churchForm, setChurchForm] = useState({
    name: church?.name ?? "",
    slug: church?.slug ?? "",
    logoUrl: church?.logoUrl ?? "",
    phone: church?.phone ?? "",
    whatsapp: church?.whatsapp ?? "",
    email: church?.email ?? "",
    website: church?.website ?? "",
    address: church?.address ?? "",
    city: church?.city ?? "",
    state: church?.state ?? "",
    vision: church?.vision ?? "",
    mission: church?.mission ?? "",
    primaryColor: church?.primaryColor ?? "#1e3a5f",
    secondaryColor: church?.secondaryColor ?? "#c9a84c",
  });
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (!church) return;
    setChurchForm({
      name: church.name ?? "",
      slug: church.slug ?? "",
      logoUrl: church.logoUrl ?? "",
      phone: church.phone ?? "",
      whatsapp: church.whatsapp ?? "",
      email: church.email ?? "",
      website: church.website ?? "",
      address: church.address ?? "",
      city: church.city ?? "",
      state: church.state ?? "",
      vision: church.vision ?? "",
      mission: church.mission ?? "",
      primaryColor: church.primaryColor ?? "#1e3a5f",
      secondaryColor: church.secondaryColor ?? "#c9a84c",
    });
  }, [church]);

  const updateMutation = trpc.churches.update.useMutation({
    onSuccess: () => toast.success("Configurações salvas com sucesso!"),
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const handleSave = () => {
    updateMutation.mutate({ id: churchId!, ...churchForm });
  };

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) {
      toast.error("Escolha uma imagem PNG, JPEG ou WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2 MB.");
      return;
    }
    const token = getChurchToken();
    if (!token) {
      toast.error("Sua sessão expirou. Entre novamente para enviar a logo.");
      return;
    }
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Não foi possível enviar a logo.");
      setChurchForm((current) => ({ ...current, logoUrl: result.url! }));
      updateMutation.mutate({ id: churchId!, logoUrl: result.url }, { onSuccess: () => { refetch(); toast.success("Logo atualizada com sucesso!"); } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
      <div className="p-6 max-w-4xl mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-navy">Configurações da Igreja</h1>
            <p className="text-sm text-muted-foreground mt-1">Personalize sua identidade e dados institucionais</p>
          </div>
          <Button
            className="bg-navy text-white hover:bg-navy-light gap-2"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>

        <Tabs defaultValue="geral">
          <TabsList className="mb-6">
            <TabsTrigger value="geral" className="gap-2">
              <Building2 className="w-4 h-4" /> Geral
            </TabsTrigger>
            <TabsTrigger value="identidade" className="gap-2">
              <Palette className="w-4 h-4" /> Identidade Visual
            </TabsTrigger>
            <TabsTrigger value="membros" className="gap-2">
              <Users className="w-4 h-4" /> Perfis e Hierarquia
            </TabsTrigger>
            <TabsTrigger value="integracao" className="gap-2">
              <Globe className="w-4 h-4" /> Integração
            </TabsTrigger>
          </TabsList>

          {/* Geral */}
          <TabsContent value="geral">
            <div className="card-sacred p-6 space-y-5">
              <h2 className="font-semibold text-navy text-base border-b border-border pb-2">Dados da Igreja</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome da Igreja *</Label>
                  <Input
                    id="name"
                    value={churchForm.name}
                    onChange={(e) => setChurchForm({ ...churchForm, name: e.target.value })}
                    className="mt-1"
                    placeholder="Ex: Igreja Batista Central"
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Subdomínio (slug) *</Label>
                  <div className="flex items-center mt-1">
                    <Input
                      id="slug"
                      value={churchForm.slug}
                      onChange={(e) => setChurchForm({ ...churchForm, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                      placeholder="minha-igreja"
                    />
                    <span className="ml-2 text-xs text-muted-foreground whitespace-nowrap">.igrejaapp.com</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={churchForm.phone}
                    onChange={(e) => setChurchForm({ ...churchForm, phone: e.target.value })}
                    className="mt-1"
                    placeholder="(11) 3333-4444"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={churchForm.whatsapp}
                    onChange={(e) => setChurchForm({ ...churchForm, whatsapp: e.target.value })}
                    className="mt-1"
                    placeholder="(11) 99999-8888"
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={churchForm.email}
                    onChange={(e) => setChurchForm({ ...churchForm, email: e.target.value })}
                    className="mt-1"
                    placeholder="contato@minhaigreia.com"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={churchForm.website}
                    onChange={(e) => setChurchForm({ ...churchForm, website: e.target.value })}
                    className="mt-1"
                    placeholder="https://minhaigreia.com"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={churchForm.address}
                    onChange={(e) => setChurchForm({ ...churchForm, address: e.target.value })}
                    className="mt-1"
                    placeholder="Rua das Flores, 123"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={churchForm.city}
                      onChange={(e) => setChurchForm({ ...churchForm, city: e.target.value })}
                      className="mt-1"
                      placeholder="São Paulo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={churchForm.state}
                      onChange={(e) => setChurchForm({ ...churchForm, state: e.target.value.toUpperCase().slice(0, 2) })}
                      className="mt-1"
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="vision">Visão</Label>
                <Textarea
                  id="vision"
                  value={churchForm.vision}
                  onChange={(e) => setChurchForm({ ...churchForm, vision: e.target.value })}
                  className="mt-1"
                  placeholder="A visão da sua igreja..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="mission">Missão</Label>
                <Textarea
                  id="mission"
                  value={churchForm.mission}
                  onChange={(e) => setChurchForm({ ...churchForm, mission: e.target.value })}
                  className="mt-1"
                  placeholder="A missão da sua igreja..."
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          {/* Identidade Visual */}
          <TabsContent value="identidade">
            <div className="card-sacred p-6 space-y-6">
              <h2 className="font-semibold text-navy text-base border-b border-border pb-2">Identidade Visual</h2>

              {/* Logo upload */}
              <div>
                <Label>Logo da Igreja</Label>
                <div role="button" tabIndex={0} onClick={() => logoInputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); logoInputRef.current?.click(); } }} className="mt-2 border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-colors">
                  <input ref={logoInputRef} aria-label="Selecionar logo da igreja" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleLogoUpload} />
                  {churchForm.logoUrl ? <img src={churchForm.logoUrl} alt="Logo atual da igreja" className="h-16 w-16 rounded-xl object-contain" /> : <Upload className="w-8 h-8 text-muted-foreground" />}
                  <p className="text-sm text-muted-foreground">Clique para enviar ou substituir a logo</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG ou WebP — máx. 2 MB</p>
                  <Button type="button" variant="outline" size="sm" disabled={isUploadingLogo} onClick={(event) => { event.stopPropagation(); logoInputRef.current?.click(); }}>
                    {isUploadingLogo ? "Enviando..." : "Selecionar Arquivo"}
                  </Button>
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="primaryColor">Cor Primária</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      id="primaryColor"
                      value={churchForm.primaryColor}
                      onChange={(e) => setChurchForm({ ...churchForm, primaryColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={churchForm.primaryColor}
                      onChange={(e) => setChurchForm({ ...churchForm, primaryColor: e.target.value })}
                      placeholder="#1e3a5f"
                      className="font-mono"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Cor Secundária (Destaque)</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      id="secondaryColor"
                      value={churchForm.secondaryColor}
                      onChange={(e) => setChurchForm({ ...churchForm, secondaryColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={churchForm.secondaryColor}
                      onChange={(e) => setChurchForm({ ...churchForm, secondaryColor: e.target.value })}
                      placeholder="#c9a84c"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <Label>Pré-visualização</Label>
                <div
                  className="mt-2 rounded-xl p-5 flex items-center gap-3"
                  style={{ backgroundColor: churchForm.primaryColor }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                    style={{ backgroundColor: churchForm.secondaryColor }}
                  >
                    {churchForm.name?.[0] ?? "I"}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{churchForm.name || "Nome da Igreja"}</p>
                    <p className="text-xs" style={{ color: churchForm.secondaryColor }}>
                      {churchForm.slug || "slug"}.igrejaapp.com
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Perfis e Hierarquia */}
          <TabsContent value="membros">
            <div className="card-sacred p-6">
              <h2 className="font-semibold text-navy text-base border-b border-border pb-2 mb-4">Hierarquia de Perfis</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Estes são os perfis disponíveis na sua plataforma. Cada perfil tem acesso diferenciado aos módulos.
              </p>
              <div className="space-y-2">
                {ROLES.map((role, i) => (
                  <div key={role.value} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-navy/10 flex items-center justify-center text-xs font-bold text-navy">
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium text-navy">{role.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{role.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Integração */}
          <TabsContent value="integracao">
            <div className="card-sacred p-6 space-y-4">
              <h2 className="font-semibold text-navy text-base border-b border-border pb-2">Integrações e API</h2>
              <div className="space-y-3">
                {[
                  { name: "WhatsApp Business API", desc: "Envio automático de mensagens e notificações", status: "Planejado" },
                  { name: "YouTube Live", desc: "Transmissão ao vivo integrada ao canal da igreja", status: "Planejado" },
                  { name: "PagSeguro / Mercado Pago", desc: "Recebimento de dízimos e ofertas online", status: "Planejado" },
                  { name: "Google Calendar", desc: "Sincronização de eventos com o Google Calendar", status: "Planejado" },
                ].map((integration) => (
                  <div key={integration.name} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/30">
                    <div>
                      <p className="font-medium text-navy text-sm">{integration.name}</p>
                      <p className="text-xs text-muted-foreground">{integration.desc}</p>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{integration.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}
