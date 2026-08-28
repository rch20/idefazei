import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const settingsSource = readFileSync(resolve(root, "client/src/pages/Configuracoes.tsx"), "utf8");
const publicSettingsSource = readFileSync(resolve(root, "client/src/components/TenantPublicSettings.tsx"), "utf8");
const publicPageSource = readFileSync(resolve(root, "client/src/pages/TenantPublicPage.tsx"), "utf8");
const publicFooterSource = readFileSync(resolve(root, "client/src/components/TenantPublicFooter.tsx"), "utf8");
const socialContractSource = readFileSync(resolve(root, "shared/socialMedia.ts"), "utf8");
const pastoralSupportContractSource = readFileSync(resolve(root, "shared/pastoralSupport.ts"), "utf8");
const manifestSource = readFileSync(resolve(root, "client/public/manifest.json"), "utf8");
const serviceWorkerSource = readFileSync(resolve(root, "client/public/sw.js"), "utf8");
const pwaHookSource = readFileSync(resolve(root, "client/src/hooks/useTenantPwaMeta.ts"), "utf8");
const visiteNosSource = readFileSync(resolve(root, "client/src/pages/VisiteNos.tsx"), "utf8");
const portalVisitanteSource = readFileSync(resolve(root, "client/src/pages/PortalVisitante.tsx"), "utf8");
const loginIgrejaSource = readFileSync(resolve(root, "client/src/pages/LoginIgreja.tsx"), "utf8");
const cadastroSource = readFileSync(resolve(root, "client/src/pages/CadastroDiscipulo.tsx"), "utf8");
const churchLayoutSource = readFileSync(resolve(root, "client/src/components/ChurchLayout.tsx"), "utf8");

describe("Fluxo estrutural da Configuração da Igreja", () => {
  it("organiza a configuração por seções com cartões de acesso rápido e navegação acessível", () => {
    expect(settingsSource).toContain("ConfigQuickCard");
    expect(settingsSource).toContain('const [activeTab, setActiveTab] = useState("geral")');
    expect(settingsSource).toContain('role="region" aria-label="Seções da configuração"');
    expect(settingsSource).toContain("Deslize horizontalmente para acessar todas as seções.");
    expect(settingsSource).toContain('Tabs value={activeTab} onValueChange={setActiveTab}');
    expect(settingsSource).toContain("ConfigMetricCard");
    expect(settingsSource).toContain("flex-none gap-2 px-3");
    expect(settingsSource).toContain("Salvar identidade");
  });

  it("mantém a ação de salvar contextual e evita confundir publicação com configuração geral", () => {
    expect(settingsSource).toContain("const canSaveChurchSettings = activeTab === \"geral\" || activeTab === \"identidade\" || activeTab === \"integracao\"");
    expect(settingsSource).toContain("Salve e publique dentro do editor público");
    expect(settingsSource).toContain("Salvar alterações");
    expect(settingsSource).not.toContain("Salvar Alterações");
  });

  it("apresenta a Identidade Visual em marca, paleta e prévia, sem alterar o contrato de upload", () => {
    expect(settingsSource).toContain("Marca principal");
    expect(settingsSource).toContain("Paleta da igreja");
    expect(settingsSource).toContain("Prévia da identidade");
    expect(settingsSource).toContain('aria-label="Selecionar logo da igreja"');
    expect(settingsSource).toContain("churchForm.primaryColor");
    expect(settingsSource).toContain("churchForm.secondaryColor");
    expect(settingsSource).toContain("Configurações da Igreja");
    expect(settingsSource).toContain("Dados institucionais");
    expect(settingsSource).toContain("Canais de contato");
    expect(settingsSource).toContain("A logo, cores e ícone só ficam ativos após salvar.");
  });

  it("personaliza e controla o cadastro público por tenant com link oficial copiável", () => {
    expect(settingsSource).toContain("Convite e cadastro público");
    expect(settingsSource).toContain("publicRegistrationEnabled");
    expect(settingsSource).toContain("publicRegistrationTitle");
    expect(settingsSource).toContain("publicRegistrationMessage");
    expect(settingsSource).toContain("Link oficial da igreja");
    expect(settingsSource).toContain("Copiar link");
    expect(cadastroSource).toContain("trpc.tenantPublic.current.useQuery");
    expect(cadastroSource).toContain("registration.enabled");
    expect(cadastroSource).toContain("TenantPublicShell");
    expect(cadastroSource).toContain("Cadastro recebido");
    expect(cadastroSource).toContain("A liderança da");
    expect(cadastroSource).toContain("Data de nascimento");
    expect(cadastroSource).toContain("Informe o CEP primeiro");
    expect(cadastroSource).toContain("https://viacep.com.br/ws/");
    expect(cadastroSource).toContain("Endereço preenchido");
    expect(cadastroSource).toContain("postal-code");
  });

  it("oferece configuração de redes sociais oficiais por tenant", () => {
    expect(settingsSource).toContain("Redes sociais");
    expect(settingsSource).toContain("socialMediaFormFromValue");
    expect(settingsSource).toContain('id={`social-${platform.key}`}');
    expect(settingsSource).toContain("SOCIAL_PLATFORM_META");
    expect(socialContractSource).toContain('instagram: { label: "Instagram"');
    expect(socialContractSource).toContain('facebook: { label: "Facebook"');
    expect(socialContractSource).toContain('youtube: { label: "YouTube"');
    expect(socialContractSource).toContain('tiktok: { label: "TikTok"');
    expect(settingsSource).toContain("Use um endereço HTTPS oficial.");
  });

  it("oferece um único upload do ícone PWA com os tamanhos iOS e instalação", () => {
    expect(settingsSource).toContain("tenant_pwa_icon");
    expect(settingsSource).toContain("Ícone do aplicativo");
    expect(settingsSource).toContain("iOS: 192×192 · PWA: 192×192 e 512×512");
    expect(settingsSource).toContain("Ícone PWA atualizado em todos os destinos.");
    expect(settingsSource).toContain("useLogoAsPwaIconMutation");
    expect(settingsSource).toContain("Usar logo como ícone");
    expect(settingsSource).toContain("Aba do navegador");
    expect(settingsSource).toContain("Atalho móvel");
    expect(settingsSource).toContain("Fonte efetiva:");
  });

  it("invalida o estado do tenant e do site após salvar a identidade", () => {
    expect(settingsSource).toContain("utils.churches.getById.invalidate");
    expect(settingsSource).toContain("utils.tenantPublic.adminPreview.invalidate");
    expect(settingsSource).toContain("utils.tenantPublic.current.invalidate");
    expect(settingsSource).toContain("setChurchForm((current) => ({ ...current, logoUrl: result.optimizedUrl }))");
  });

  it("reflete contatos e redes sociais somente quando configurados no rodapé público", () => {
    expect(publicPageSource).toContain("TenantPublicFooter");
    expect(publicFooterSource).toContain("normalizeSocialMediaLinks");
    expect(publicFooterSource).toContain("Redes sociais de");
    expect(publicFooterSource).toContain('target="_blank" rel="noreferrer"');
    expect(publicFooterSource).toContain("tenant-public-footer-social-links");
    expect(publicFooterSource).toContain("socialLinks.length > 0");
    expect(publicFooterSource).toContain("Site oficial");
  });

  it("propaga o tenant para head, manifest, notificações e cache do service worker", () => {
    expect(publicPageSource).toContain("useTenantPwaMeta");
    expect(manifestSource).toContain("/api/pwa/icon-192.png");
    expect(manifestSource).toContain("192x192");
    expect(manifestSource).toContain("512x512");
    expect(serviceWorkerSource).toContain('const CACHE_NAME = "ide-fazei-v5"');
    expect(serviceWorkerSource).toContain("/api/pwa/icon-192.png");
  });

  it("usa o mesmo contrato de identidade nas rotas públicas e no painel autenticado", () => {
    expect(pwaHookSource).toContain("apple-touch-icon");
    expect(pwaHookSource).toContain("manifest.json");
    expect(pwaHookSource).toContain("theme-color");
    expect(pwaHookSource).toContain("pwaIconVersion");
    expect(visiteNosSource).toContain("useTenantPwaMeta");
    expect(visiteNosSource).toContain("publicHeroEyebrow");
    expect(portalVisitanteSource).toContain("useTenantPwaMeta");
    expect(portalVisitanteSource).toContain("publicHeroEyebrow");
    expect(loginIgrejaSource).toContain("useTenantPwaMeta");
    expect(churchLayoutSource).toContain("useTenantPwaMeta");
  });

  it("diferencia o tema do site público da identidade do painel e mantém o fluxo de rascunho/publicação", () => {
    expect(publicSettingsSource).toContain("Tema da Página Pública");
    expect(publicSettingsSource).toContain("A Identidade Visual geral controla a experiência interna do painel");
    expect(publicSettingsSource).toContain("Salvar rascunho");
    expect(publicSettingsSource).toContain("Publicar página");
    expect(publicSettingsSource).toContain("sticky bottom-3");
    expect(publicSettingsSource).toContain("Ver prévia");
    expect(publicSettingsSource).toContain('id="tenant-public-preview"');
    expect(publicSettingsSource).toContain("PublicMetricCard");
    expect(publicSettingsSource).toContain("grid grid-cols-2 gap-2 sm:flex");
  });

  it("oferece presets, upload personalizado e retorno ao visual atual do hero", () => {
    expect(publicSettingsSource).toContain("Imagem principal do Hero");
    expect(publicSettingsSource).toContain("HERO_PRESETS");
    expect(publicSettingsSource).toContain("Enviar imagem da minha igreja");
    expect(publicSettingsSource).toContain("1920 × 1080 px, proporção 16:9");
    expect(publicSettingsSource).toContain('purpose: "tenant_public_hero"');
    expect(publicSettingsSource).toContain("Voltar ao visual atual");
    expect(publicPageSource).toContain("resolveHeroImage(hero)");
    expect(publicPageSource).toContain("tenant-public-hero-overlay");
  });

  it("permite configurar a frase de identificação do hero com fallback no editor público", () => {
    expect(publicSettingsSource).toContain("Frase de identificação");
    expect(publicSettingsSource).toContain("section.content.eyebrow");
    expect(publicSettingsSource).toContain("Comunidade de fé");
    expect(publicSettingsSource).toContain("Aparece acima do título no hero e no rodapé");
    expect(publicPageSource).toContain("getPublicHeroEyebrow");
    expect(publicFooterSource).toContain("DEFAULT_PUBLIC_HERO_EYEBROW");
  });

  it("configura o atendimento pastoral externo com visibilidade pública e autenticada independentes", () => {
    expect(settingsSource).toContain("Atendimento pastoral externo");
    expect(settingsSource).toContain('id="pastoral-support-url"');
    expect(settingsSource).toContain('id="pastoral-support-label"');
    expect(settingsSource).toContain('id="pastoral-support-enabled"');
    expect(settingsSource).toContain('id="pastoral-support-public"');
    expect(settingsSource).toContain('id="pastoral-support-authenticated"');
    expect(settingsSource).toContain("Salvar integração");
    expect(settingsSource).toContain("DEFAULT_PASTORAL_SUPPORT_URL");
    expect(pastoralSupportContractSource).toContain("normalizePastoralSupportUrl");
    expect(pastoralSupportContractSource).toContain("shouldShowPastoralSupport");
    expect(pastoralSupportContractSource).toContain("dedodeprosa.diaebeleza.com.br");
    expect(publicFooterSource).toContain("tenant-public-footer-support");
    expect(churchLayoutSource).toContain("showPastoralSupport");
  });

  it("agrupa ordenação e visibilidade dos blocos com controles acessíveis", () => {
    expect(publicSettingsSource).toContain("ChevronUp");
    expect(publicSettingsSource).toContain("ChevronDown");
    expect(publicSettingsSource).toContain("Mover bloco ${labels[section.sectionType]} para cima");
    expect(publicSettingsSource).toContain("Mover bloco ${labels[section.sectionType]} para baixo");
    expect(publicSettingsSource).toContain("Exibir bloco ${labels[section.sectionType]}");
    expect(publicSettingsSource).not.toContain(">Subir</Button>");
    expect(publicSettingsSource).not.toContain(">Descer</Button>");
    expect(settingsSource).toContain("Atendimento pastoral externo");
    expect(settingsSource).toContain("O botão abre o Dedo de Prosa em uma nova aba");
    expect(settingsSource).toContain("normalizePastoralSupportInput");
    expect(settingsSource).toContain("https://${trimmed}");
    expect(settingsSource).toContain("pastoralSupportUrlInvalid");
    expect(settingsSource).toContain("rel=\"noopener noreferrer\"");
  });
});

export {};
