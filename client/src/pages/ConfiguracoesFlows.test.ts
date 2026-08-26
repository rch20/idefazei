import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const settingsSource = readFileSync(resolve(root, "client/src/pages/Configuracoes.tsx"), "utf8");
const publicSettingsSource = readFileSync(resolve(root, "client/src/components/TenantPublicSettings.tsx"), "utf8");

describe("Fluxo estrutural da Configuração da Igreja", () => {
  it("organiza a configuração por seções com cartões de acesso rápido e navegação acessível", () => {
    expect(settingsSource).toContain("ConfigQuickCard");
    expect(settingsSource).toContain('const [activeTab, setActiveTab] = useState("geral")');
    expect(settingsSource).toContain('role="region" aria-label="Seções da configuração"');
    expect(settingsSource).toContain("Deslize horizontalmente para acessar todas as seções.");
    expect(settingsSource).toContain('Tabs value={activeTab} onValueChange={setActiveTab}');
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
  });

  it("diferencia o tema do site público da identidade do painel e mantém o fluxo de rascunho/publicação", () => {
    expect(publicSettingsSource).toContain("Tema da Página Pública");
    expect(publicSettingsSource).toContain("A Identidade Visual geral controla a experiência interna do painel");
    expect(publicSettingsSource).toContain("Salvar rascunho");
    expect(publicSettingsSource).toContain("Publicar página");
    expect(publicSettingsSource).toContain("sticky bottom-3");
    expect(publicSettingsSource).toContain("Ver prévia");
    expect(publicSettingsSource).toContain('id="tenant-public-preview"');
  });

  it("agrupa ordenação e visibilidade dos blocos com controles acessíveis", () => {
    expect(publicSettingsSource).toContain("ChevronUp");
    expect(publicSettingsSource).toContain("ChevronDown");
    expect(publicSettingsSource).toContain("Mover bloco ${labels[section.sectionType]} para cima");
    expect(publicSettingsSource).toContain("Mover bloco ${labels[section.sectionType]} para baixo");
    expect(publicSettingsSource).toContain("Exibir bloco ${labels[section.sectionType]}");
    expect(publicSettingsSource).not.toContain(">Subir</Button>");
    expect(publicSettingsSource).not.toContain(">Descer</Button>");
  });
});

export {};
