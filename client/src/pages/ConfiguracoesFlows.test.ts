import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const settingsSource = readFileSync(resolve(root, "client/src/pages/Configuracoes.tsx"), "utf8");
const publicSettingsSource = readFileSync(resolve(root, "client/src/components/TenantPublicSettings.tsx"), "utf8");
const publicPageSource = readFileSync(resolve(root, "client/src/pages/TenantPublicPage.tsx"), "utf8");
const manifestSource = readFileSync(resolve(root, "client/public/manifest.json"), "utf8");
const serviceWorkerSource = readFileSync(resolve(root, "client/public/sw.js"), "utf8");
const pwaHookSource = readFileSync(resolve(root, "client/src/hooks/useTenantPwaMeta.ts"), "utf8");
const visiteNosSource = readFileSync(resolve(root, "client/src/pages/VisiteNos.tsx"), "utf8");
const portalVisitanteSource = readFileSync(resolve(root, "client/src/pages/PortalVisitante.tsx"), "utf8");
const loginIgrejaSource = readFileSync(resolve(root, "client/src/pages/LoginIgreja.tsx"), "utf8");
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
    expect(settingsSource).toContain("const canSaveChurchSettings = activeTab === \"geral\" || activeTab === \"identidade\"");
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

  it("oferece um único upload do ícone PWA com os tamanhos iOS e instalação", () => {
    expect(settingsSource).toContain("tenant_pwa_icon");
    expect(settingsSource).toContain("Ícone do aplicativo");
    expect(settingsSource).toContain("iOS: 192×192 · PWA: 192×192 e 512×512");
    expect(settingsSource).toContain("Ícone PWA atualizado em todos os destinos.");
  });

  it("invalida o estado do tenant e do site após salvar a identidade", () => {
    expect(settingsSource).toContain("utils.churches.getById.invalidate");
    expect(settingsSource).toContain("utils.tenantPublic.adminPreview.invalidate");
    expect(settingsSource).toContain("utils.tenantPublic.current.invalidate");
    expect(settingsSource).toContain("setChurchForm((current) => ({ ...current, logoUrl: result.optimizedUrl }))");
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
    expect(visiteNosSource).toContain("useTenantPwaMeta");
    expect(portalVisitanteSource).toContain("useTenantPwaMeta");
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

  it("agrupa ordenação e visibilidade dos blocos com controles acessíveis", () => {
    expect(publicSettingsSource).toContain("ChevronUp");
    expect(publicSettingsSource).toContain("ChevronDown");
    expect(publicSettingsSource).toContain("Mover bloco ${labels[section.sectionType]} para cima");
    expect(publicSettingsSource).toContain("Mover bloco ${labels[section.sectionType]} para baixo");
    expect(publicSettingsSource).toContain("Exibir bloco ${labels[section.sectionType]}");
    expect(publicSettingsSource).not.toContain(">Subir</Button>");
    expect(publicSettingsSource).not.toContain(">Descer</Button>");
    expect(settingsSource).toContain("Conexões ativas");
    expect(settingsSource).toContain("Em planejamento");
  });
});

export {};
