import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("LoginIgreja", () => {
  it("limita o cadastro comercial aos hosts institucionais da Ide Fazei", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/LoginIgreja.tsx"), "utf8");
    expect(source).toContain('hostname === "idefazei.com.br" || hostname === "www.idefazei.com.br"');
    expect(source).toContain("{isCommercialDomain && (");
    expect(source).toContain('href="/cadastro-igreja"');
  });

  it("oferece retorno explícito à página inicial pública", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/LoginIgreja.tsx"), "utf8");
    expect(source).toContain('Link href="/"');
    expect(source).toContain("Voltar para a página inicial");
    expect(source).toContain('aria-label={isTenantLogin ? `Página inicial da ${tenantName}`');
  });

  it("carrega a identidade pública somente quando o login pertence a um tenant", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/LoginIgreja.tsx"), "utf8");
    expect(source).toContain("const { data: tenantPublic } = trpc.tenantPublic.current.useQuery");
    expect(source).toContain("enabled: isTenantLogin");
    expect(source).toContain("tenantPublic?.church.name ?? \"Ide Fazei\"");
    expect(source).toContain("tenant-login-brand-mark");
  });

  it("leva todos os perfis para a Home interna global após o login", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/LoginIgreja.tsx"), "utf8");
    expect(source).toContain('import { getChurchHomePath } from "@/lib/churchHome";');
    expect(source).toContain("navigate(getChurchHomePath({ actorRole: data.user.role, roles: [data.user.role] }))");
    expect(source).not.toContain("accessSummary.fetch");
    expect(source).not.toContain('navigate("/app/dashboard")');
    expect(source).not.toContain('navigate("/app/membro")');
  });

  it("não renderiza a saudação de login como toast sobre a navegação móvel", () => {
    const loginSource = readFileSync(resolve(process.cwd(), "client/src/pages/LoginIgreja.tsx"), "utf8");
    const dashboardSource = readFileSync(resolve(process.cwd(), "client/src/pages/Dashboard.tsx"), "utf8");
    expect(loginSource).not.toContain("toast.success(`Bem-vindo(a)");
    expect(dashboardSource).toContain('aria-label="Saudação do painel"');
    expect(dashboardSource).toContain("Acompanhe o que está acontecendo na sua igreja.");
  });
});
