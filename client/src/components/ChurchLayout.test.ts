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
    expect(source).toContain("const pastoralSupport = normalizePastoralSupportConfig(church?.pastoralSupport)");
  });

  it("mantém o TopBar e o shell autenticado estáveis durante a rolagem", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/ChurchLayout.tsx"), "utf8");
    expect(source).toContain('className="sticky top-0 z-30 flex h-14 shrink-0');
    expect(source).toContain('className="flex h-dvh min-h-screen min-w-0 overflow-hidden');
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
