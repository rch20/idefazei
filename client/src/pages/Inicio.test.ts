import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Home interna global", () => {
  it("exibe acolhimento, mensagem do dia, próximo passo e vida da igreja", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Inicio.tsx"), "utf8");
    expect(source).toContain('trpc.tenantPublic.current.useQuery');
    expect(source).toContain('Bem-vindo à sua igreja');
    expect(source).toContain('Mensagem do dia');
    expect(source).toContain('Seu próximo passo');
    expect(source).toContain('Vida da igreja');
    expect(source).toContain('Ver minhas células');
  });

  it("não duplica a barra inferior com um bloco de acesso rápido", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Inicio.tsx"), "utf8");
    expect(source).not.toContain('Acesso rápido');
    expect(source).not.toContain('Pedido de oração');
    expect(source).not.toContain('Nova alma');
  });

  it("registra uma rota global sem abrir o Dashboard executivo", () => {
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    expect(app).toContain('const Inicio = lazy(() => import("./pages/Inicio"));');
    expect(app).toContain('<Route path="/app/inicio">');
    expect(app).toContain('<AppPage title="Início">');
    expect(app).toContain('requiredAccess="isExecutive"');
  });
});
