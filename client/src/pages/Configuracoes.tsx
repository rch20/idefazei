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
import { getChurchToken, useChurchAuth } from "@/hooks/useChurchAuth";

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

const COMPLEMENTARY_ROLES = [
  { value: "consolidador", label: "Consolidador" },
  { value: "diacono", label: "Diácono" },
  { value: "tesoureiro", label: "Tesoureiro" },
  { value: "levita", label: "Levita" },
] as const;

export default function Configuracoes() {
  const { churchId } = useChurch();
  const { user } = useChurchAuth();
  const canManageAccounts = ["pastor_presidente", "pastor_local", "secretario"].includes(user?.role ?? "");
  const canManageRoles = ["pastor_presidente", "pastor_local"].includes(user?.role ?? "");
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
  const { data: churchUsers, refetch: refetchChurchUsers } = trpc.churchAuth.listUsers.useQuery(
    { churchId },
    { enabled: Boolean(churchId && canManageAccounts) }
  );
  const { data: people = [] } = trpc.people.list.useQuery({ churchId }, { enabled: !!churchId });
  const linkPersonMutation = trpc.churchAuth.linkPerson.useMutation({
    onSuccess: () => {
      refetchChurchUsers();
      toast.success("Conta vinculada à Pessoa com sucesso.");
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const updateAssignmentMutation = trpc.churchAuth.updateAssignment.useMutation({
    onSuccess: () => {
      refetchChurchUsers();
      toast.success("Pessoa e função atualizadas com sucesso.");
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const updateComplementaryRolesMutation = trpc.churchAuth.updateComplementaryRoles.useMutation({
    onSuccess: () => {
      refetchChurchUsers();
      toast.success("Funções complementares atualizadas.");
    },
    onError: (error: { message: string }) => toast.error(error.message),
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

            <div className="card-sacred mt-5 p-6">
              <h2 className="mb-2 border-b border-border pb-2 text-base font-semibold text-navy">Atribuição de Pessoas e Funções</h2>
              <p className="mb-4 text-sm text-muted-foreground">Selecione a Pessoa e defina a função que ela exercerá no sistema. A função e o vínculo determinam o escopo de atuação no Funil de Discipulado.</p>

              {(churchUsers ?? []).some((churchUser) => !churchUser.personId) && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <strong>Contas aguardando vínculo.</strong> Selecione a ficha de Pessoa de cada conta antes de atribuir funções. Sem esse vínculo, a conta não terá um escopo pastoral definido no Funil.
                </div>
              )}

              {!canManageAccounts ? (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Somente Pastores e Secretários podem administrar vínculos de contas.</p>
              ) : churchUsers?.length === 0 ? (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Nenhuma conta de acesso foi criada nesta igreja.</p>
              ) : (
                <div className="space-y-3">
                  {churchUsers?.map((churchUser) => (
                    <div key={churchUser.id} className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(180px,0.75fr)_minmax(150px,0.55fr)_minmax(235px,0.9fr)] lg:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-navy">{churchUser.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{churchUser.email} · {ROLES.find((role) => role.value === churchUser.role)?.label ?? churchUser.role}</p>
                      </div>
                      <label className="block">
                        <span className="sr-only">Pessoa vinculada à conta de {churchUser.name}</span>
                        <select
                          value={churchUser.personId ? String(churchUser.personId) : "unlinked"}
                          onChange={(event) => {
                            const personId = Number(event.target.value);
                            if (Number.isFinite(personId) && personId > 0) {
                              if (canManageRoles) {
                                updateAssignmentMutation.mutate({ churchId, userId: churchUser.id, personId, role: churchUser.role });
                              } else {
                                linkPersonMutation.mutate({ churchId, userId: churchUser.id, personId });
                              }
                            }
                          }}
                          disabled={linkPersonMutation.isPending || updateAssignmentMutation.isPending || updateComplementaryRolesMutation.isPending}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                        >
                          <option value="unlinked">Selecionar ficha de Pessoa</option>
                          {people.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="sr-only">Função de {churchUser.name}</span>
                        <select
                          value={churchUser.role}
                          onChange={(event) => {
                            if (churchUser.personId) {
                              updateAssignmentMutation.mutate({
                                churchId,
                                userId: churchUser.id,
                                personId: churchUser.personId,
                                role: event.target.value as typeof churchUser.role,
                              });
                            }
                          }}
                          disabled={!canManageRoles || !churchUser.personId || updateAssignmentMutation.isPending || updateComplementaryRolesMutation.isPending}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </select>
                      </label>
                      <fieldset className="min-w-0" disabled={!canManageRoles || !churchUser.personId || updateComplementaryRolesMutation.isPending}>
                        <legend className="mb-1 text-[11px] font-medium text-muted-foreground">Funções complementares</legend>
                        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                          {COMPLEMENTARY_ROLES.filter((role) => role.value !== churchUser.role).map((role) => {
                            const selected = churchUser.complementaryRoles.includes(role.value);
                            return (
                              <label key={role.value} className="flex cursor-pointer items-center gap-1.5 text-xs text-navy disabled:cursor-not-allowed disabled:opacity-60">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => {
                                    const roles = selected
                                      ? churchUser.complementaryRoles.filter((item) => item !== role.value)
                                      : [...churchUser.complementaryRoles, role.value];
                                    updateComplementaryRolesMutation.mutate({ churchId, userId: churchUser.id, roles });
                                  }}
                                  className="h-3.5 w-3.5 rounded border-input text-navy focus-visible:ring-gold"
                                />
                                {role.label}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    </div>
                  ))}
                </div>
              )}
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
