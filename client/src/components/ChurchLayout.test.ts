import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("confirmação de logout no painel", () => {
  it("solicita confirmação antes de chamar o logout", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/ChurchLayout.tsx"), "utf8");

    expect(source).toContain("const [logoutOpen, setLogoutOpen] = useState(false);");
    expect(source).toContain("Sair da plataforma?");
    expect(source).toContain("Continuar aqui");
    expect(source).toContain("Sair agora");
    expect(source).toContain("onClick={logout}");
  });

  it("implementa acordeão de grupos na sidebar para compactar a navegação", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/ChurchLayout.tsx"), "utf8");
    expect(source).toContain("const [expandedGroup, setExpandedGroup] = useState");
    expect(source).toContain("expandedGroup === group.key");
    expect(source).toContain("setExpandedGroup((current) => current === group.key ? null : group.key)");
    expect(source).toContain('aria-expanded={isExpanded}');
  });

  it("exibe o atendimento pastoral autenticado sem acoplar o serviço externo ao sistema", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/ChurchLayout.tsx"), "utf8");
    expect(source).toContain("shouldShowPastoralSupport(pastoralSupport, \"authenticated\")");
    expect(source).toContain("atendimento pastoral externo");
    expect(source).toContain('target="_blank" rel="noreferrer"');
    expect(source).toContain("shrink-0 max-w-[10rem]");
    expect(source).toContain("Atendimento pastoral");
    expect(source).toContain("sm:hidden");
    expect(source).toContain("const pastoralSupport = normalizePastoralSupportConfig(church?.pastoralSupport)");
  });

  it("mantém o TopBar e o shell autenticado estáveis durante a rolagem", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/ChurchLayout.tsx"), "utf8");
    expect(source).toContain('className="sticky top-0 z-30 flex h-14 shrink-0');
    expect(source).toContain('className="relative flex h-dvh min-h-screen min-w-0 overflow-x-hidden');
    expect(source).toContain('main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto');
  });

  it("filtra a navegação administrativa por capacidades centrais", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/ChurchLayout.tsx"), "utf8");
    expect(source).toContain("export type ChurchAccessSummary");
    expect(source).toContain('accessKey: "isExecutive"');
    expect(source).toContain('accessKey: "isCommunicationManager"');
    expect(source).toContain('accessKey: "isPastoralWorker"');
    expect(source).toContain("accessSummary?.[i.accessKey]");
    expect(source).toContain('label: "Pedidos de Oração"');
    expect(source).toContain('label: "Biblioteca"');
  });

  it("usa capacidade contextual para exibir Ministérios ao líder designado", () => {
    const layout = readFileSync(resolve(process.cwd(), "client/src/components/ChurchLayout.tsx"), "utf8");
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const ministerios = readFileSync(resolve(process.cwd(), "client/src/pages/Ministerios.tsx"), "utf8");
    expect(layout).toContain('canManageMinistry: boolean');
    expect(layout).toContain('accessKey: "canManageMinistry"');
    expect(app).toContain('requiredAccess="canManageMinistry"');
    expect(ministerios).toContain('const canCreateMinistry = roles.some');
    expect(ministerios).toContain('selectedMinistry?.canManage');
  });

  it("oferece Início, atalhos aprovados e mantém Meu painel no menu completo", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/ChurchLayout.tsx"), "utf8");
    expect(source).toContain("const quickAccessItems: QuickAccessItem[] = [");
    expect(source).toContain('function getMobileQuickAccessItems(homePath: string): QuickAccessItem[] {');
    expect(source).toContain('label: "Início", mobileLabel: "Início", path: homePath');
    expect(source).toContain('getChurchHomePath(accessSummary)');
    expect(source).toContain('label: "Pedido de oração", mobileLabel: "Oração", path: "/app/oracao"');
    expect(source).toContain('label: "Nova alma", mobileLabel: "Nova alma", path: "/app/almas"');
    expect(source).toContain('label: "Eventos", mobileLabel: "Eventos", path: "/app/eventos", accessKey: "isExecutive"');
    expect(source).toContain('label: "Painel do discípulo", mobileLabel: "Meu painel", path: "/app/membro"');
    expect(source).toContain('...quickAccessItems.filter((item) => item.path !== "/app/membro")');
    expect(source).toContain('{ icon: Users, label: "Área do Membro", path: "/app/membro", group: "membros" }');
    expect(source).toContain('aria-label="Acesso rápido"');
    expect(source).toContain('aria-label="Acesso rápido móvel"');
    expect(source).toContain('aria-label="Mais opções"');
    expect(source).toContain("event.stopPropagation()");
    expect(source).toContain("WebkitTransform: \"translateZ(0)\"");
    expect(source).toContain('aria-label="Fechar menu"');
    expect(source).toContain("z-[100]");
    expect(source).toContain("z-[120]");
    expect(source).toContain("fixed inset-x-3 bottom-3");
    expect(source).toContain("env(safe-area-inset-bottom)");
    expect(source).toContain("lg:hidden");
    expect(source).toContain("lg:block");
    expect(source).toContain("!item.accessKey || Boolean(accessSummary?.[item.accessKey])");
    expect(source).not.toContain('label: "Agenda"');
    expect(source).not.toContain('label: "Aprovações"');
    expect(source).not.toContain('label: "Indicações"');
  });

  it("mantém as ações de membro separadas do acesso administrativo", () => {
    const ganharAlmas = readFileSync(resolve(process.cwd(), "client/src/pages/GanharAlmas.tsx"), "utf8");
    const oracao = readFileSync(resolve(process.cwd(), "client/src/pages/Oracao.tsx"), "utf8");
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    expect(ganharAlmas).toContain("isLimitedMember");
    expect(ganharAlmas).toContain("Indicar nova alma");
    expect(oracao).toContain("trpc.prayer.mine.useQuery");
    expect(oracao).toContain("trpc.prayer.createMine.useMutation");
    expect(app).toContain("function AccessDenied");
    expect(app).toContain("requiredAccess");
  });
});
