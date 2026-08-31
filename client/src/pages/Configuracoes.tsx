import { useEffect, useRef, useState } from "react";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Building2, ExternalLink, Palette, Users, Globe, MessageCircle, Save, Upload, UserCheck, UserX, ChevronRight, ShieldCheck, Eye, Plug, Smartphone, CheckCircle2, Settings2, RotateCcw, Share2, Copy } from "lucide-react";
import { useChurchAuth } from "@/hooks/useChurchAuth";
import { uploadChurchMedia } from "@/lib/mediaUpload";
import { TenantPublicSettings } from "@/components/TenantPublicSettings";
import { SOCIAL_PLATFORM_KEYS, SOCIAL_PLATFORM_META, type SocialPlatform } from "../../../shared/socialMedia";
import { normalizePastoralSupportConfig, normalizePastoralSupportUrl, DEFAULT_PASTORAL_SUPPORT_LABEL, DEFAULT_PASTORAL_SUPPORT_URL, type PastoralSupportConfig } from "../../../shared/pastoralSupport";

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

const SOCIAL_PLATFORM_FIELDS: Array<{ key: SocialPlatform; label: string; placeholder: string }> = SOCIAL_PLATFORM_KEYS.map((key) => ({
  key,
  label: SOCIAL_PLATFORM_META[key].label,
  placeholder: key === "instagram" ? "https://instagram.com/suaigreja" : key === "facebook" ? "https://facebook.com/suaigreja" : key === "youtube" ? "https://youtube.com/@suaigreja" : "https://tiktok.com/@suaigreja",
}));

type SocialMediaForm = Record<SocialPlatform, string>;
type PastoralSupportForm = Omit<PastoralSupportConfig, "url"> & { url: string };

function socialMediaFormFromValue(value: unknown): SocialMediaForm {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return SOCIAL_PLATFORM_KEYS.reduce<SocialMediaForm>((result, key) => {
    result[key] = typeof source[key] === "string" ? source[key] as string : "";
    return result;
  }, { instagram: "", facebook: "", youtube: "", tiktok: "" });
}

function pastoralSupportFormFromValue(value: unknown): PastoralSupportForm {
  const config = normalizePastoralSupportConfig(value);
  return { ...config, url: config.url ?? "" };
}

function normalizePastoralSupportInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return normalizePastoralSupportUrl(candidate);
}

function publicRegistrationUrl(slug: string) {
  if (typeof window !== "undefined" && window.location.hostname.startsWith(`${slug}.`) && window.location.hostname.endsWith(".idefazei.com.br")) {
    return `${window.location.origin}/cadastro`;
  }
  return `https://${slug}.idefazei.com.br/cadastro`;
}

function publicRegistrationShareMessage(churchName: string, title: string, message: string, link: string) {
  return `Olá! ${churchName} convida você a realizar seu cadastro e ficar por dentro de tudo o que acontece em nossa igreja.\n\n${title}\n${message}\n\nCadastre-se pelo link abaixo:\n${link}`;
}

const COMPLEMENTARY_ROLES = [
  { value: "consolidador", label: "Consolidador" },
  { value: "diacono", label: "Diácono" },
  { value: "tesoureiro", label: "Tesoureiro" },
  { value: "levita", label: "Levita" },
] as const;

export default function Configuracoes() {
  const { churchId } = useChurch();
  const utils = trpc.useUtils();
  const { user } = useChurchAuth();
  const canManageAccounts = ["pastor_presidente", "pastor_local"].includes(user?.role ?? "");
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
    socialMedia: socialMediaFormFromValue(church?.socialMedia),
    pastoralSupport: pastoralSupportFormFromValue(church?.pastoralSupport),
    publicRegistrationEnabled: church?.publicRegistrationEnabled ?? true,
    publicRegistrationTitle: church?.publicRegistrationTitle ?? "Cadastre-se e fique por perto",
    publicRegistrationMessage: church?.publicRegistrationMessage ?? "Faça seu cadastro e acompanhe tudo o que sua igreja tem preparado para você.",
  });
  const logoInputRef = useRef<HTMLInputElement>(null);
  const pwaIconInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingPwaIcon, setIsUploadingPwaIcon] = useState(false);
  const [pwaIconPreviewUrl, setPwaIconPreviewUrl] = useState<string | null>(church?.pwaIcon192Url ?? church?.logoUrl ?? null);
  const [activeTab, setActiveTab] = useState("geral");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

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
      socialMedia: socialMediaFormFromValue(church.socialMedia),
      pastoralSupport: pastoralSupportFormFromValue(church.pastoralSupport),
      publicRegistrationEnabled: church.publicRegistrationEnabled ?? true,
      publicRegistrationTitle: church.publicRegistrationTitle ?? "Cadastre-se e fique por perto",
      publicRegistrationMessage: church.publicRegistrationMessage ?? "Faça seu cadastro e acompanhe tudo o que sua igreja tem preparado para você.",
    });
    const effectivePreviewUrl = church.slug ? `/api/pwa/icon-192.png?tenant=${encodeURIComponent(church.slug)}&v=${encodeURIComponent(String(church.updatedAt?.getTime() ?? 0))}` : null;
    setPwaIconPreviewUrl(church.pwaIcon192Url ?? (church.logoUrl ? effectivePreviewUrl : null));
  }, [church]);

  const updateMutation = trpc.churches.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        refetch(),
        churchId ? utils.churches.getById.invalidate({ id: churchId }) : Promise.resolve(),
        utils.tenantPublic.adminPreview.invalidate(),
        utils.tenantPublic.current.invalidate(),
      ]);
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const useLogoAsPwaIconMutation = trpc.churches.useLogoAsPwaIcon.useMutation({
    onSuccess: async (updatedChurch) => {
      setPwaIconPreviewUrl(updatedChurch?.pwaIcon192Url ?? churchForm.logoUrl ?? null);
      await Promise.all([
        refetch(),
        churchId ? utils.churches.getById.invalidate({ id: churchId }) : Promise.resolve(),
        utils.tenantPublic.adminPreview.invalidate(),
        utils.tenantPublic.current.invalidate(),
      ]);
      toast.success("A logo agora é a fonte do ícone em todos os destinos.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const { data: churchUsers, refetch: refetchChurchUsers } = trpc.churchAuth.listUsers.useQuery(
    { churchId },
    { enabled: Boolean(churchId && canManageAccounts) }
  );
  const pendingRegistrationsQuery = trpc.churchAuth.pendingRegistrations.useQuery(
    { churchId },
    { enabled: Boolean(churchId && canManageAccounts) }
  );
  const { data: people = [] } = trpc.people.list.useQuery({ churchId }, { enabled: !!churchId });
  const { data: ministries = [] } = trpc.ministries.list.useQuery({ churchId }, { enabled: Boolean(churchId && canManageRoles) });
  const customFunctionsQuery = trpc.ministries.customFunctions.useQuery({ churchId }, { enabled: Boolean(churchId && canManageRoles) });
  const [rejectionTarget, setRejectionTarget] = useState<{ id: number; name: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [customFunctionForm, setCustomFunctionForm] = useState({ name: "", key: "", ministryId: "all", permissionPackage: "member" as const });
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
  const resolveRegistrationMutation = trpc.churchAuth.resolveRegistration.useMutation({
    onSuccess: async (_result, variables) => {
      await Promise.all([pendingRegistrationsQuery.refetch(), refetchChurchUsers()]);
      setRejectionTarget(null);
      setRejectionReason("");
      toast.success(variables.approved ? "Cadastro aprovado e acesso liberado." : "Cadastro rejeitado e acesso bloqueado.");
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const createCustomFunctionMutation = trpc.ministries.createCustomFunction.useMutation({
    onSuccess: async () => {
      await customFunctionsQuery.refetch();
      setCustomFunctionForm({ name: "", key: "", ministryId: "all", permissionPackage: "member" });
      toast.success("Função ministerial criada com o pacote de acesso selecionado.");
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const registrationLink = churchForm.slug ? publicRegistrationUrl(churchForm.slug) : "";
  const registrationShareText = registrationLink ? publicRegistrationShareMessage(churchForm.name || "A igreja", churchForm.publicRegistrationTitle, churchForm.publicRegistrationMessage, registrationLink) : "";
  const canUseNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleNativeShare = async () => {
    if (!registrationLink || !canUseNativeShare) {
      toast.info("Use WhatsApp ou Copiar link para compartilhar neste dispositivo.");
      return;
    }
    try {
      await navigator.share({ title: churchForm.publicRegistrationTitle, text: registrationShareText, url: registrationLink });
      setShareDialogOpen(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Não foi possível abrir o compartilhamento do celular.");
    }
  };

  const handleWhatsAppShare = () => {
    if (!registrationLink) return;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(registrationShareText)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setShareDialogOpen(false);
  };

  const handleCopyRegistrationLink = async (closeDialog = false) => {
    if (!registrationLink) return;
    if (!navigator.clipboard) {
      toast.error("Copie o link manualmente neste navegador.");
      return;
    }
    try {
      await navigator.clipboard.writeText(registrationLink);
      toast.success("Link de cadastro copiado.");
      if (closeDialog) setShareDialogOpen(false);
    } catch {
      toast.error("Não foi possível copiar o link. Copie-o manualmente.");
    }
  };

  const handleSave = () => {
    const normalizedPastoralUrl = normalizePastoralSupportInput(churchForm.pastoralSupport.url);
    if (churchForm.pastoralSupport.url.trim() && !normalizedPastoralUrl) {
      toast.error(`Informe exatamente uma URL HTTPS válida do Dedo de Prosa: ${DEFAULT_PASTORAL_SUPPORT_URL}`);
      setActiveTab("integracao");
      return;
    }
    updateMutation.mutate({
      id: churchId!,
      ...churchForm,
      pastoralSupport: {
        ...churchForm.pastoralSupport,
        url: normalizedPastoralUrl ?? "",
      },
    });
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
    setIsUploadingLogo(true);
    try {
      const result = await uploadChurchMedia(file, { purpose: "tenant_logo", resourceType: "image" });
      setChurchForm((current) => ({ ...current, logoUrl: result.optimizedUrl }));
      if (result.pwaIconSource === "derived" && result.icon192Url) setPwaIconPreviewUrl(result.icon192Url);
      updateMutation.mutate({ id: churchId!, logoUrl: result.optimizedUrl });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handlePwaIconUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) {
      toast.error("Escolha um ícone PNG, JPG ou WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("O ícone deve ter no máximo 2 MB.");
      return;
    }
    setIsUploadingPwaIcon(true);
    try {
      const result = await uploadChurchMedia(file, { purpose: "tenant_pwa_icon", resourceType: "image" });
      setPwaIconPreviewUrl(result.icon192Url ?? result.optimizedUrl);
      await Promise.all([
        refetch(),
        churchId ? utils.churches.getById.invalidate({ id: churchId }) : Promise.resolve(),
        utils.tenantPublic.adminPreview.invalidate(),
        utils.tenantPublic.current.invalidate(),
      ]);
      toast.success("Ícone PWA atualizado em todos os destinos.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o ícone PWA.");
    } finally {
      setIsUploadingPwaIcon(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  const canSaveChurchSettings = activeTab === "geral" || activeTab === "identidade" || activeTab === "integracao";
  const pastoralSupport = churchForm.pastoralSupport;
  const pastoralSupportUrl = normalizePastoralSupportUrl(pastoralSupport.url);
  const pastoralSupportConfigured = Boolean(pastoralSupportUrl);
  const pastoralSupportUrlInvalid = Boolean(pastoralSupport.url.trim()) && !pastoralSupportConfigured;
  const hasCustomPwaIcon = Boolean(church?.pwaIconAssetId) || church?.pwaIconSource === "custom";
  const effectivePwaIconUrl = pwaIconPreviewUrl ?? churchForm.logoUrl ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 animate-fade-in-up sm:p-6 lg:p-8">
      <header className="relative overflow-hidden rounded-3xl border border-navy/10 bg-gradient-to-br from-navy via-[#244d76] to-[#17324f] p-5 text-white shadow-lg sm:p-7">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70"><span className="rounded-full bg-white/10 px-2.5 py-1">Centro de configuração</span><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Tenant da igreja</span></div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Configurações da Igreja</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">Organize os dados institucionais, a marca, os acessos e a presença pública da sua igreja em um só lugar.</p>
          </div>
          {canSaveChurchSettings ? <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/80"><Settings2 className="h-4 w-4 shrink-0" /><span>Salvamento no final desta seção</span></div> : activeTab === "pagina-publica" ? <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/80"><Globe className="h-4 w-4 shrink-0" /><span>Salve e publique dentro do editor público</span></div> : <p className="text-xs text-white/70">Cada seção possui suas próprias ações.</p>}
        </div>
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-28 right-16 h-64 w-64 rounded-full border border-white/10" />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <ConfigQuickCard icon={Building2} title="Dados institucionais" description="Contato, endereço, visão e missão" active={activeTab === "geral"} onClick={() => setActiveTab("geral")} />
        <ConfigQuickCard icon={Palette} title="Marca da igreja" description="Logo, cores e pré-visualização" active={activeTab === "identidade"} onClick={() => setActiveTab("identidade")} />
        {canManageRoles && <ConfigQuickCard icon={Globe} title="Presença pública" description="Site, blocos, SEO e publicação" active={activeTab === "pagina-publica"} onClick={() => setActiveTab("pagina-publica")} />}
        <ConfigQuickCard icon={Users} title="Pessoas e acessos" description="Vínculos, perfis e funções" active={activeTab === "membros"} onClick={() => setActiveTab("membros")} />
        <ConfigQuickCard icon={Plug} title="Integrações" description="Conexões e automações futuras" active={activeTab === "integracao"} onClick={() => setActiveTab("integracao")} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="min-w-0 overflow-x-auto rounded-2xl" role="region" aria-label="Seções da configuração">
          <TabsList className="h-auto min-w-max gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
            <TabsTrigger value="geral" className="flex-none gap-2 px-3">
              <Building2 className="w-4 h-4" /> Geral
            </TabsTrigger>
            <TabsTrigger value="identidade" className="flex-none gap-2 px-3">
              <Palette className="w-4 h-4" /> Identidade Visual
            </TabsTrigger>
            {canManageRoles && <TabsTrigger value="pagina-publica" className="flex-none gap-2 px-3">
              <Globe className="w-4 h-4" /> Página Pública
            </TabsTrigger>}
            <TabsTrigger value="membros" className="flex-none gap-2 px-3">
              <Users className="w-4 h-4" /> Pessoas e acessos
            </TabsTrigger>
            <TabsTrigger value="integracao" className="flex-none gap-2 px-3">
              <Plug className="w-4 h-4" /> Integração
            </TabsTrigger>
          </TabsList>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground sm:hidden">Deslize horizontalmente para acessar todas as seções.</p>

          {/* Geral */}
          <TabsContent value="geral">
            <div className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-gold" /><h2 className="font-display text-2xl font-bold text-navy">Dados institucionais</h2></div><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Mantenha as informações que identificam sua igreja e aparecem nos canais de atendimento.</p></div><span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Somente esta igreja</span></div>
              <div className="grid gap-5 lg:grid-cols-2">
                <section className="card-sacred p-5 sm:p-6"><div className="border-b border-border pb-4"><h3 className="text-base font-semibold text-navy">Identificação</h3><p className="mt-1 text-sm text-muted-foreground">Nome e endereço público do seu tenant.</p></div><div className="mt-5 grid gap-4"><div><Label htmlFor="name">Nome da Igreja *</Label><Input id="name" value={churchForm.name} onChange={(e) => setChurchForm({ ...churchForm, name: e.target.value })} className="mt-1" placeholder="Ex.: Igreja Batista Central" /></div><div><Label htmlFor="slug">Subdomínio (slug) *</Label><div className="mt-1 flex min-w-0 items-center gap-2"><Input id="slug" value={churchForm.slug} onChange={(e) => setChurchForm({ ...churchForm, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="minha-igreja" /><span className="shrink-0 text-xs text-muted-foreground">.igrejaapp.com</span></div></div><div><Label htmlFor="address">Endereço</Label><Input id="address" value={churchForm.address} onChange={(e) => setChurchForm({ ...churchForm, address: e.target.value })} className="mt-1" placeholder="Rua das Flores, 123" /></div><div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3"><div><Label htmlFor="city">Cidade</Label><Input id="city" value={churchForm.city} onChange={(e) => setChurchForm({ ...churchForm, city: e.target.value })} className="mt-1" placeholder="São Paulo" /></div><div><Label htmlFor="state">Estado</Label><Input id="state" value={churchForm.state} onChange={(e) => setChurchForm({ ...churchForm, state: e.target.value.toUpperCase().slice(0, 2) })} className="mt-1 uppercase" placeholder="SP" maxLength={2} /></div></div></div></section>
                <section className="card-sacred p-5 sm:p-6"><div className="border-b border-border pb-4"><h3 className="text-base font-semibold text-navy">Canais de contato</h3><p className="mt-1 text-sm text-muted-foreground">Facilite o contato entre sua igreja e a comunidade.</p></div><div className="mt-5 grid gap-4"><div><Label htmlFor="phone">Telefone</Label><Input id="phone" value={churchForm.phone} onChange={(e) => setChurchForm({ ...churchForm, phone: e.target.value })} className="mt-1" placeholder="(11) 3333-4444" /></div><div><Label htmlFor="whatsapp">WhatsApp</Label><Input id="whatsapp" value={churchForm.whatsapp} onChange={(e) => setChurchForm({ ...churchForm, whatsapp: e.target.value })} className="mt-1" placeholder="(11) 99999-8888" /></div><div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={churchForm.email} onChange={(e) => setChurchForm({ ...churchForm, email: e.target.value })} className="mt-1" placeholder="contato@minhaigreja.com" /></div><div><Label htmlFor="website">Website</Label><Input id="website" value={churchForm.website} onChange={(e) => setChurchForm({ ...churchForm, website: e.target.value })} className="mt-1" placeholder="https://minhaigreja.com" /></div></div></section>
              </div>
              <section className="card-sacred p-5 sm:p-6">
                <div className="flex items-start gap-3 border-b border-border pb-4"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy"><Share2 className="h-4 w-4" /></span><div><h3 className="text-base font-semibold text-navy">Redes sociais</h3><p className="mt-1 text-sm text-muted-foreground">Cadastre os canais oficiais. Eles aparecerão no rodapé da página pública somente quando estiverem preenchidos.</p></div></div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {SOCIAL_PLATFORM_FIELDS.map((platform) => <div key={platform.key}><Label htmlFor={`social-${platform.key}`}>{platform.label}</Label><Input id={`social-${platform.key}`} type="url" inputMode="url" value={churchForm.socialMedia[platform.key]} onChange={(event) => setChurchForm({ ...churchForm, socialMedia: { ...churchForm.socialMedia, [platform.key]: event.target.value } })} className="mt-1" placeholder={platform.placeholder} autoComplete="url" /><p className="mt-1 text-xs text-muted-foreground">{SOCIAL_PLATFORM_META[platform.key].description}. Use um endereço HTTPS oficial.</p></div>)}
                </div>
                <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs leading-relaxed text-muted-foreground">Os links são validados no servidor e aceitam somente os domínios oficiais de cada plataforma. Deixe em branco para ocultar uma rede do site.</p>
              </section>
              <section className="card-sacred p-5 sm:p-6">
                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-base font-semibold text-navy">Convite e cadastro público</h3><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Compartilhe uma página de entrada com a identidade da sua igreja. Cadastros feitos por este link oficial são aprovados automaticamente como membros comuns; outras formas de cadastro continuam sujeitas à aprovação da liderança.</p></div><Switch checked={churchForm.publicRegistrationEnabled} onCheckedChange={(enabled) => setChurchForm({ ...churchForm, publicRegistrationEnabled: enabled })} aria-label="Ativar cadastro público" /></div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div><Label htmlFor="public-registration-title">Título da página</Label><Input id="public-registration-title" value={churchForm.publicRegistrationTitle} maxLength={140} onChange={(event) => setChurchForm({ ...churchForm, publicRegistrationTitle: event.target.value })} className="mt-1" placeholder="Cadastre-se e fique por perto" /><p className="mt-1 text-xs text-muted-foreground">Um título curto funciona melhor no celular.</p></div>
                  <div><Label htmlFor="public-registration-message">Mensagem de boas-vindas</Label><Textarea id="public-registration-message" value={churchForm.publicRegistrationMessage} maxLength={500} onChange={(event) => setChurchForm({ ...churchForm, publicRegistrationMessage: event.target.value })} className="mt-1" rows={3} placeholder="Faça seu cadastro e acompanhe tudo o que sua igreja tem preparado para você." /><p className="mt-1 text-xs text-muted-foreground">{churchForm.publicRegistrationMessage.length}/500 caracteres</p></div>
                </div>
                <div className="mt-4 rounded-xl border border-gold/25 bg-gold/5 p-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-gold">Link oficial da igreja</p><p className="mt-1 break-all font-mono text-xs leading-relaxed text-navy">{churchForm.slug ? registrationLink : "Salve o subdomínio para gerar o link"}</p><p className="mt-1 text-xs text-muted-foreground">Compartilhe com uma mensagem pronta ou copie somente o endereço.</p></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button type="button" className="w-full gap-2 bg-navy text-white hover:bg-navy-light sm:w-auto" disabled={!churchForm.slug} onClick={() => setShareDialogOpen(true)}><Share2 className="h-4 w-4" />Compartilhar cadastro</Button><Button type="button" variant="outline" className="w-full gap-2 bg-white text-navy sm:w-auto" disabled={!churchForm.slug} onClick={() => void handleCopyRegistrationLink()}><Copy className="h-4 w-4" />Copiar link</Button></div></div>
                <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Compartilhar cadastro</DialogTitle><DialogDescription>Escolha como deseja enviar o convite da {churchForm.name || "igreja"}. A mensagem já incluirá o link oficial.</DialogDescription></DialogHeader><div className="grid gap-2 py-2"><Button type="button" className="h-auto justify-start gap-3 whitespace-normal bg-navy px-4 py-3 text-left text-white hover:bg-navy-light" onClick={() => void handleNativeShare()} disabled={!canUseNativeShare}><Smartphone className="h-5 w-5 shrink-0" /><span><strong className="block">Compartilhar pelo celular</strong><small className="font-normal opacity-80">{canUseNativeShare ? "Escolha WhatsApp, Mensagens, Mail ou outro aplicativo." : "Indisponível neste navegador; use WhatsApp ou Copiar link."}</small></span></Button><Button type="button" variant="outline" className="h-auto justify-start gap-3 whitespace-normal px-4 py-3 text-left" onClick={handleWhatsAppShare}><MessageCircle className="h-5 w-5 shrink-0 text-emerald-600" /><span><strong className="block">WhatsApp</strong><small className="font-normal text-muted-foreground">Abrir com a mensagem e o link já preparados.</small></span></Button><Button type="button" variant="outline" className="h-auto justify-start gap-3 px-4 py-3 text-left" onClick={() => void handleCopyRegistrationLink(true)}><Copy className="h-5 w-5 shrink-0" /><span><strong className="block">Copiar link</strong><small className="font-normal text-muted-foreground">Copiar somente o endereço do cadastro.</small></span></Button></div></DialogContent></Dialog>
              </section>
              <section className="card-sacred p-5 sm:p-6"><div className="border-b border-border pb-4"><h3 className="text-base font-semibold text-navy">Mensagem da igreja</h3><p className="mt-1 text-sm text-muted-foreground">Registre a visão e a missão que orientam sua comunidade.</p></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><div><Label htmlFor="vision">Visão</Label><Textarea id="vision" value={churchForm.vision} onChange={(e) => setChurchForm({ ...churchForm, vision: e.target.value })} className="mt-1" placeholder="A visão da sua igreja..." rows={5} /></div><div><Label htmlFor="mission">Missão</Label><Textarea id="mission" value={churchForm.mission} onChange={(e) => setChurchForm({ ...churchForm, mission: e.target.value })} className="mt-1" placeholder="A missão da sua igreja..." rows={5} /></div></div></section>
              <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Revise os dados e salve somente esta seção.</p><Button className="w-full gap-2 bg-navy text-white hover:bg-navy-light sm:w-auto" onClick={handleSave} disabled={updateMutation.isPending}><Save className="h-4 w-4" />{updateMutation.isPending ? "Salvando..." : "Salvar alterações"}</Button></div>
            </div>
          </TabsContent>

          {/* Identidade Visual */}
          <TabsContent value="identidade">
            <div className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-2"><Palette className="h-5 w-5 text-gold" /><h2 className="font-display text-2xl font-bold text-navy">Identidade Visual</h2></div>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Defina a aparência principal do painel e dos materiais da sua igreja. As mudanças ficam no rascunho até você salvar.</p>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />Configuração por igreja</span>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(280px,0.88fr)]">
                <section className="card-sacred p-5 sm:p-6">
                  <div className="border-b border-border pb-4"><h3 className="text-base font-semibold text-navy">Marca principal</h3><p className="mt-1 text-sm text-muted-foreground">Use uma logo nítida para identificar sua igreja em todos os espaços.</p></div>
                  <div className="mt-5">
                    <Label htmlFor="church-logo-trigger">Logo da Igreja</Label>
                    <input ref={logoInputRef} aria-label="Selecionar logo da igreja" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleLogoUpload} />
                    <button id="church-logo-trigger" type="button" onClick={() => logoInputRef.current?.click()} disabled={isUploadingLogo} className="mt-2 flex w-full min-w-0 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 text-center transition-colors hover:border-gold/60 hover:bg-gold/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:cursor-wait disabled:opacity-70 sm:p-8">
                      {churchForm.logoUrl ? <img src={churchForm.logoUrl} alt="Logo atual da igreja" className="h-20 w-20 rounded-2xl object-contain shadow-sm" /> : <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm"><Upload className="h-8 w-8" /></span>}
                      <span className="text-sm font-semibold text-navy">{isUploadingLogo ? "Enviando logo..." : churchForm.logoUrl ? "Clique para substituir a logo" : "Clique para enviar a logo"}</span>
                      <span className="text-xs text-muted-foreground">PNG, JPG ou WebP · máximo de 2 MB</span>
                    </button>
                  </div>
                </section>

                <section className="card-sacred p-5 sm:p-6">
                  <div className="border-b border-border pb-4"><div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-gold" /><h3 className="text-base font-semibold text-navy">Ícone do aplicativo</h3></div><p className="mt-1 text-sm text-muted-foreground">A logo é a fonte automática por padrão. Um upload quadrado personalizado tem prioridade e pode ser restaurado depois.</p></div>
                  <div className="mt-5 space-y-4">
                    <input ref={pwaIconInputRef} aria-label="Selecionar ícone PWA da igreja" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handlePwaIconUpload} />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                      <button type="button" onClick={() => pwaIconInputRef.current?.click()} disabled={isUploadingPwaIcon} className="flex min-w-0 flex-1 items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-4 text-left transition-colors hover:border-gold/60 hover:bg-gold/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:cursor-wait disabled:opacity-70">
                        {effectivePwaIconUrl ? <img src={effectivePwaIconUrl} alt="Prévia do ícone efetivo PWA" className="h-16 w-16 shrink-0 rounded-2xl bg-white object-contain p-1 shadow-sm" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-navy text-gold shadow-sm"><Smartphone className="h-7 w-7" /></span>}
                        <span className="min-w-0"><strong className="block text-sm font-semibold text-navy">{isUploadingPwaIcon ? "Enviando ícone..." : hasCustomPwaIcon ? "Substituir ícone personalizado" : "Enviar ícone personalizado"}</strong><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">PNG, JPG ou WebP · máximo de 2 MB · prefira uma imagem quadrada</span></span>
                      </button>
                      {hasCustomPwaIcon && <Button type="button" variant="outline" className="gap-2 border-navy/15 bg-white text-navy hover:bg-navy/5 sm:w-44" onClick={() => useLogoAsPwaIconMutation.mutate({ id: churchId! })} disabled={useLogoAsPwaIconMutation.isPending || !churchForm.logoUrl}><RotateCcw className="h-4 w-4" />{useLogoAsPwaIconMutation.isPending ? "Restaurando..." : "Usar logo como ícone"}</Button>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />iOS: 192×192 · PWA: 192×192 e 512×512 · favicon e atalhos usam a mesma fonte efetiva</div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[{ label: "Logo institucional", value: churchForm.logoUrl, alt: "Prévia da logo institucional" }, { label: "Aba do navegador", value: effectivePwaIconUrl, alt: "Prévia do favicon" }, { label: "Atalho móvel", value: effectivePwaIconUrl, alt: "Prévia do atalho móvel" }].map((preview) => <div key={preview.label} className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-semibold text-navy">{preview.label}</p><div className="mt-2 flex h-14 items-center justify-center rounded-xl bg-slate-50">{preview.value ? <img src={preview.value} alt={preview.alt} className="h-10 w-10 rounded-lg object-contain" /> : <span className="text-[11px] text-muted-foreground">Ainda não enviada</span>}</div></div>)}
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{hasCustomPwaIcon ? "Fonte efetiva: ícone personalizado. A logo continua preservada e pode voltar a ser usada sem excluir este asset." : churchForm.logoUrl ? "Fonte efetiva: derivado quadrado da logo, com composição que preserva a marca inteira." : "Fonte efetiva: fallback padrão até que a logo institucional seja enviada."}</p>
                  </div>
                </section>

                <section className="card-sacred p-5 sm:p-6">
                  <div className="border-b border-border pb-4"><h3 className="text-base font-semibold text-navy">Paleta da igreja</h3><p className="mt-1 text-sm text-muted-foreground">Escolha uma cor principal e uma cor de destaque para a interface.</p></div>
                  <div className="mt-5 grid gap-3">
                    <label className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><span className="text-sm font-semibold text-navy">Cor primária</span><span className="mt-1 block text-xs text-muted-foreground">Navegação e superfícies principais</span><div className="mt-3 flex min-w-0 items-center gap-3"><input type="color" aria-label="Selecionar cor primária" value={churchForm.primaryColor} onChange={(event) => setChurchForm({ ...churchForm, primaryColor: event.target.value })} className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" /><Input aria-label="Código hexadecimal da cor primária" value={churchForm.primaryColor} onChange={(event) => setChurchForm({ ...churchForm, primaryColor: event.target.value })} placeholder="#1e3a5f" className="min-w-0 font-mono uppercase" /></div></label>
                    <label className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><span className="text-sm font-semibold text-navy">Cor de destaque</span><span className="mt-1 block text-xs text-muted-foreground">Botões, detalhes e chamadas</span><div className="mt-3 flex min-w-0 items-center gap-3"><input type="color" aria-label="Selecionar cor de destaque" value={churchForm.secondaryColor} onChange={(event) => setChurchForm({ ...churchForm, secondaryColor: event.target.value })} className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" /><Input aria-label="Código hexadecimal da cor de destaque" value={churchForm.secondaryColor} onChange={(event) => setChurchForm({ ...churchForm, secondaryColor: event.target.value })} placeholder="#c9a84c" className="min-w-0 font-mono uppercase" /></div></label>
                  </div>
                </section>
              </div>

              <section className="overflow-hidden rounded-2xl border border-navy/10 bg-gradient-to-br from-navy via-[#244d76] to-[#17324f] p-5 shadow-md sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-white"><Eye className="h-4 w-4 text-white/70" /><h3 className="text-base font-semibold">Prévia da identidade</h3></div><p className="mt-1 text-sm text-white/70">Veja como a combinação de logo, nome e cores aparece no painel.</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">Ao vivo</span></div>
                <div className="mt-5 flex min-w-0 items-center gap-3 rounded-2xl bg-white/10 p-4 sm:p-5"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/95 text-lg font-bold text-navy">{churchForm.logoUrl ? <img src={churchForm.logoUrl} alt="Prévia da logo da igreja" className="h-full w-full object-contain p-1" /> : churchForm.name?.[0] ?? "I"}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{churchForm.name || "Nome da Igreja"}</p><p className="truncate text-xs" style={{ color: churchForm.secondaryColor }}>{churchForm.slug || "slug"}.igrejaapp.com</p></div><div className="ml-auto hidden h-8 w-8 shrink-0 rounded-full sm:block" style={{ backgroundColor: churchForm.secondaryColor }} /></div>
              </section>
              <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">A logo, cores e ícone só ficam ativos após salvar.</p><Button className="w-full gap-2 bg-navy text-white hover:bg-navy-light sm:w-auto" onClick={handleSave} disabled={updateMutation.isPending}><Save className="h-4 w-4" />{updateMutation.isPending ? "Salvando..." : "Salvar identidade"}</Button></div>
            </div>
          </TabsContent>

          {canManageRoles && <TabsContent value="pagina-publica">
            <TenantPublicSettings ministries={ministries} />
          </TabsContent>}

          {/* Perfis e Hierarquia */}
          <TabsContent value="membros">
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <ConfigMetricCard icon={Users} label="Contas de acesso" value={String(churchUsers?.length ?? 0)} detail="Usuários vinculados à igreja" />
              <ConfigMetricCard icon={UserCheck} label="Pessoas cadastradas" value={String(people.length)} detail="Fichas disponíveis para vínculo" />
              <ConfigMetricCard icon={ShieldCheck} label="Pendências" value={String(pendingRegistrationsQuery.data?.length ?? 0)} detail="Cadastros aguardando aprovação" tone={(pendingRegistrationsQuery.data?.length ?? 0) > 0 ? "warning" : "success"} />
            </div>
            <div className="card-sacred p-5 sm:p-6">
              <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-semibold text-navy text-base">Perfis de acesso</h2><p className="mt-1 text-sm text-muted-foreground">Os perfis definem o alcance geral da conta. Participações e atuações são administradas dentro da Célula ou do Ministério.</p></div><span className="w-fit rounded-full bg-navy/5 px-2.5 py-1 text-xs font-semibold text-navy">{ROLES.length} perfis disponíveis</span></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ROLES.map((role, i) => (
                  <div key={role.value} className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-xs font-bold text-navy">{i + 1}</div>
                    <div className="min-w-0"><span className="block truncate text-sm font-medium text-navy">{role.label}</span><span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">{role.value}</span></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-sacred mt-5 p-6">
              <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-base font-semibold text-navy">Vínculo da conta com a Pessoa</h2><p className="mt-1 text-sm text-muted-foreground">Vincule cada conta à sua ficha de Pessoa e defina apenas o perfil geral de acesso. Participações e atuações são gerenciadas nos painéis de Células e Ministérios.</p></div><span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Escopo por conta</span></div>

              {(churchUsers ?? []).some((churchUser) => !churchUser.personId) && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <strong>Contas aguardando vínculo.</strong> Selecione a ficha de Pessoa de cada conta antes de atribuir funções. Sem esse vínculo, a conta não terá um escopo pastoral definido no Funil.
                </div>
              )}

              {!canManageAccounts ? (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Somente Pastores podem administrar vínculos de contas.</p>
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

            {canManageAccounts && (
              <div className="card-sacred mt-5 p-6">
                <div className="flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-navy">Cadastros aguardando aprovação</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Novos cadastros só recebem acesso após a análise de um Pastor.</p>
                  </div>
                  <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">{pendingRegistrationsQuery.data?.length ?? 0} pendente{(pendingRegistrationsQuery.data?.length ?? 0) === 1 ? "" : "s"}</span>
                </div>

                {pendingRegistrationsQuery.isLoading ? (
                  <div className="mt-4 h-20 animate-pulse rounded-xl bg-muted" />
                ) : (pendingRegistrationsQuery.data ?? []).length === 0 ? (
                  <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">Não há novos cadastros aguardando análise.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {(pendingRegistrationsQuery.data ?? []).map((registration) => (
                      <article key={registration.id} className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-navy">{registration.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{registration.email}</p>
                        </div>
                        <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-auto sm:flex">
                          <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" disabled={resolveRegistrationMutation.isPending} onClick={() => { setRejectionTarget({ id: registration.id, name: registration.name }); setRejectionReason(""); }}>
                            <UserX className="mr-1.5 h-4 w-4" />Rejeitar
                          </Button>
                          <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" disabled={resolveRegistrationMutation.isPending} onClick={() => resolveRegistrationMutation.mutate({ churchId, userId: registration.id, approved: true })}>
                            <UserCheck className="mr-1.5 h-4 w-4" />Aprovar
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="card-sacred mt-5 p-6">
              <h2 className="border-b border-border pb-2 text-base font-semibold text-navy">Atuações avançadas (opcional)</h2>
              <p className="mt-2 text-sm text-muted-foreground">Este é um catálogo avançado para o Pastor. No uso diário, adicione Pessoas e atribua atuações dentro do painel do próprio Ministério; não use esta área para substituir a liderança estrutural.</p>
              {!canManageRoles ? (
                <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">Somente Pastores podem criar funções ministeriais personalizadas.</p>
              ) : <>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div><Label htmlFor="custom-function-name">Nome da função *</Label><Input id="custom-function-name" className="mt-1" value={customFunctionForm.name} onChange={(event) => setCustomFunctionForm((current) => ({ ...current, name: event.target.value, key: current.key || event.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") }))} placeholder="Ex.: Líder de Louvor" /></div>
                  <div><Label htmlFor="custom-function-key">Código interno *</Label><Input id="custom-function-key" className="mt-1 font-mono" value={customFunctionForm.key} onChange={(event) => setCustomFunctionForm((current) => ({ ...current, key: event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_") }))} placeholder="lider_louvor" /></div>
                  <div><Label htmlFor="custom-function-ministry">Ministério</Label><select id="custom-function-ministry" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={customFunctionForm.ministryId} onChange={(event) => setCustomFunctionForm((current) => ({ ...current, ministryId: event.target.value }))}><option value="all">Disponível em todos os Ministérios</option>{ministries.map((ministry) => <option key={ministry.id} value={ministry.id}>{ministry.name}</option>)}</select></div>
                  <div><Label htmlFor="custom-function-package">Pacote de acesso</Label><select id="custom-function-package" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={customFunctionForm.permissionPackage} onChange={(event) => setCustomFunctionForm((current) => ({ ...current, permissionPackage: event.target.value as typeof current.permissionPackage }))}><option value="member">Membro — acesso pessoal</option><option value="cell_leader">Liderança de Célula</option><option value="consolidator">Consolidação</option><option value="visitor">Visitação</option><option value="treasurer">Tesouraria</option><option value="ministry_leader">Liderança de Ministério</option><option value="communication_leader">Comunicação</option></select></div>
                </div>
                <div className="mt-3 flex justify-end"><Button type="button" className="bg-navy text-white hover:bg-navy-light" disabled={createCustomFunctionMutation.isPending || customFunctionForm.name.trim().length < 2 || customFunctionForm.key.trim().length < 2} onClick={() => createCustomFunctionMutation.mutate({ churchId, name: customFunctionForm.name.trim(), key: customFunctionForm.key.trim(), ministryId: customFunctionForm.ministryId === "all" ? undefined : Number(customFunctionForm.ministryId), permissionPackage: customFunctionForm.permissionPackage })}>{createCustomFunctionMutation.isPending ? "Criando…" : "Criar função"}</Button></div>
                <div className="mt-5 border-t border-border pt-4"><p className="text-sm font-semibold text-navy">Funções já criadas</p>{customFunctionsQuery.isLoading ? <div className="mt-3 h-14 animate-pulse rounded-lg bg-muted" /> : (customFunctionsQuery.data ?? []).length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Ainda não há funções personalizadas cadastradas.</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{(customFunctionsQuery.data ?? []).map((definition) => <div key={definition.id} className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-sm font-medium text-navy">{definition.name}</p><p className="mt-1 text-xs text-muted-foreground">{definition.key} · {definition.permissionPackage.replace(/_/g, " ")}</p></div>)}</div>}</div>
              </>}
            </div>
          </TabsContent>

          {/* Integração */}
          <TabsContent value="integracao">
            <div className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><Plug className="h-5 w-5 text-gold" /><h2 className="font-display text-2xl font-bold text-navy">Integrações</h2></div><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Conecte sua igreja a serviços externos sem tirar o controle do tenant.</p></div><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${pastoralSupport.enabled && pastoralSupportConfigured ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{pastoralSupport.enabled && pastoralSupportConfigured ? "Atendimento ativo" : "Nenhuma conexão ativa"}</span></div>
              <section className="card-sacred overflow-hidden p-5 sm:p-6">
                <div className="flex items-start gap-3 border-b border-border pb-4"><span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold"><MessageCircle className="h-5 w-5" /></span><div><h3 className="text-base font-semibold text-navy">Atendimento pastoral externo</h3><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Use o Dedo de Prosa para receber conversas e agendamentos. O Ide Fazei apenas encaminha o visitante, sem incorporar o serviço nem armazenar a conversa.</p></div></div>
                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(260px,.95fr)]">
                  <div className="min-w-0 space-y-4">
                    <div><Label htmlFor="pastoral-support-url">Link de atendimento *</Label><Input id="pastoral-support-url" type="url" inputMode="url" value={pastoralSupport.url} onChange={(event) => setChurchForm({ ...churchForm, pastoralSupport: { ...pastoralSupport, url: event.target.value } })} onBlur={() => { const value = pastoralSupport.url.trim(); if (!value) return; const normalized = normalizePastoralSupportInput(value); if (normalized) setChurchForm({ ...churchForm, pastoralSupport: { ...pastoralSupport, url: normalized } }); }} className={`mt-1 ${pastoralSupportUrlInvalid ? "border-rose-400 focus-visible:ring-rose-400" : ""}`} placeholder={DEFAULT_PASTORAL_SUPPORT_URL} autoComplete="url" aria-invalid={pastoralSupportUrlInvalid} /><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Aceitamos somente o endereço seguro do Dedo de Prosa: {DEFAULT_PASTORAL_SUPPORT_URL}. Se colar apenas o domínio, o HTTPS será completado automaticamente.</p>{pastoralSupportUrlInvalid && <p className="mt-1 text-xs font-medium text-rose-700">Use exatamente uma URL HTTPS do Dedo de Prosa, começando por https://.</p>}</div>
                    <div><Label htmlFor="pastoral-support-label">Nome do botão</Label><Input id="pastoral-support-label" value={pastoralSupport.label} maxLength={80} onChange={(event) => setChurchForm({ ...churchForm, pastoralSupport: { ...pastoralSupport, label: event.target.value } })} className="mt-1" placeholder={DEFAULT_PASTORAL_SUPPORT_LABEL} /><p className="mt-1 text-xs text-muted-foreground">Ex.: “Converse com o Pastor” ou “Fale com nossa equipe”.</p></div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-start justify-between gap-4"><div><Label htmlFor="pastoral-support-enabled" className="cursor-pointer text-sm font-semibold text-navy">Ativar atendimento pastoral</Label><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Quando desativado, o botão não aparece em nenhum ambiente.</p></div><Switch id="pastoral-support-enabled" checked={pastoralSupport.enabled} onCheckedChange={(enabled) => setChurchForm({ ...churchForm, pastoralSupport: { ...pastoralSupport, enabled } })} aria-label="Ativar atendimento pastoral externo" /></div></div>
                  </div>
                  <div className="min-w-0 space-y-4">
                    <div className="rounded-2xl border border-gold/25 bg-gold/5 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><div><p className="text-sm font-semibold text-navy">Onde o botão aparece?</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">As visibilidades são independentes. Você pode exibir o atendimento somente para visitantes, somente para usuários logados ou nos dois ambientes.</p></div></div><div className="mt-4 space-y-3"><div className="flex items-start justify-between gap-4 rounded-xl border border-white/70 bg-white/70 p-3"><div><Label htmlFor="pastoral-support-public" className="cursor-pointer text-sm font-semibold text-navy">Exibir para visitantes</Label><p className="mt-1 text-xs text-muted-foreground">Rodapé das páginas públicas</p></div><Switch id="pastoral-support-public" checked={pastoralSupport.showPublic} onCheckedChange={(showPublic) => setChurchForm({ ...churchForm, pastoralSupport: { ...pastoralSupport, showPublic } })} aria-label="Exibir atendimento para visitantes" /></div><div className="flex items-start justify-between gap-4 rounded-xl border border-white/70 bg-white/70 p-3"><div><Label htmlFor="pastoral-support-authenticated" className="cursor-pointer text-sm font-semibold text-navy">Exibir para discípulos/membros logados</Label><p className="mt-1 text-xs text-muted-foreground">Botão no cabeçalho da plataforma</p></div><Switch id="pastoral-support-authenticated" checked={pastoralSupport.showAuthenticated} onCheckedChange={(showAuthenticated) => setChurchForm({ ...churchForm, pastoralSupport: { ...pastoralSupport, showAuthenticated } })} aria-label="Exibir atendimento para usuários logados" /></div></div></div>
                    {pastoralSupport.enabled && !pastoralSupportConfigured && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Informe um link válido antes de ativar o atendimento. O endereço será validado no servidor.</p>}
                    {pastoralSupportUrlInvalid && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-900">O link informado não será aberto nem salvo. Corrija-o para o endereço HTTPS oficial do Dedo de Prosa.</p>}
                    {pastoralSupportConfigured && <a href={pastoralSupportUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-2 rounded-full border border-navy/15 bg-white px-3 py-2 text-xs font-semibold text-navy shadow-sm transition-colors hover:bg-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"><MessageCircle className="h-4 w-4 text-gold" /><span className="min-w-0 truncate">Prévia: {pastoralSupport.label || DEFAULT_PASTORAL_SUPPORT_LABEL}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" /></a>}
                  </div>
                </div>
              </section>
              <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-relaxed text-muted-foreground">O botão abre o Dedo de Prosa em uma nova aba e preserva a sessão do Ide Fazei.</p><Button className="w-full gap-2 bg-navy text-white hover:bg-navy-light sm:w-auto" onClick={handleSave} disabled={updateMutation.isPending || pastoralSupportUrlInvalid || (pastoralSupport.enabled && !pastoralSupportConfigured)}><Save className="h-4 w-4" />{updateMutation.isPending ? "Salvando..." : "Salvar integração"}</Button></div>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={Boolean(rejectionTarget)} onOpenChange={(open) => { if (!open) { setRejectionTarget(null); setRejectionReason(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar cadastro</DialogTitle>
              <DialogDescription>Informe o motivo para o cadastro de {rejectionTarget?.name ?? ""}. A conta permanecerá sem acesso à igreja.</DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="registration-rejection-reason">Motivo *</Label>
              <Textarea id="registration-rejection-reason" className="mt-1" rows={3} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Ex.: dados insuficientes; solicite à pessoa que atualize o cadastro." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setRejectionTarget(null); setRejectionReason(""); }}>Cancelar</Button>
              <Button type="button" className="bg-rose-600 text-white hover:bg-rose-700" disabled={!rejectionTarget || rejectionReason.trim().length < 3 || resolveRegistrationMutation.isPending} onClick={() => rejectionTarget && resolveRegistrationMutation.mutate({ churchId, userId: rejectionTarget.id, approved: false, rejectionReason: rejectionReason.trim() })}>
                Confirmar rejeição
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}

function ConfigMetricCard({ icon: Icon, label, value, detail, tone = "default" }: { icon: typeof Building2; label: string; value: string; detail: string; tone?: "default" | "warning" | "success" }) {
  const toneClass = tone === "warning" ? "bg-amber-50 text-amber-700" : tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-navy/5 text-navy";
  return <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-4 w-4" /></span><strong className="text-2xl font-bold tracking-tight text-navy">{value}</strong></div><p className="mt-3 truncate text-sm font-semibold text-navy">{label}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{detail}</p></article>;
}

function ConfigQuickCard({ icon: Icon, title, description, active, onClick }: { icon: typeof Building2; title: string; description: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={`group flex min-h-[116px] min-w-0 flex-col justify-between rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 ${active ? "border-navy bg-navy text-white shadow-md" : "border-slate-200 bg-white text-navy"}`}><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-white/15 text-white" : "bg-gold/10 text-gold"}`}><Icon className="h-4 w-4" /></span><span className="mt-3 flex min-w-0 items-end justify-between gap-2"><span className="min-w-0"><strong className={`block truncate text-sm ${active ? "text-white" : "text-navy"}`}>{title}</strong><span className={`mt-1 block line-clamp-2 text-xs leading-relaxed ${active ? "text-white/70" : "text-slate-500"}`}>{description}</span></span><ChevronRight className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${active ? "text-white/70" : "text-slate-400"}`} /></span></button>;
}
