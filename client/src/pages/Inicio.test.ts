import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getUpcomingEventsInOrder } from "./Inicio";

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

  it("ordena eventos futuros pela data e pelo horário civil e ignora eventos passados", () => {
    const events = getUpcomingEventsInOrder([
      { name: "Rede de Casais", startDate: "2026-09-19", startTime: "19:30" },
      { name: "Evento passado", startDate: "2026-09-03", startTime: "20:00" },
      { name: "Festa das Máscaras", startDate: "2026-09-05", startTime: "18:00" },
      { name: "Encontro seguinte", startDate: "2026-09-12", startTime: "09:00" },
    ], "2026-09-04");

    expect(events.map((event) => event.name)).toEqual(["Festa das Máscaras", "Encontro seguinte", "Rede de Casais"]);
  });

  it("renderiza a sequência de eventos e o link para a agenda completa", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Inicio.tsx"), "utf8");
    expect(source).toContain("const followingEvents = orderedEvents.slice(1, 3)");
    expect(source).toContain('aria-label="Eventos seguintes"');
    expect(source).toContain('Ver todos os eventos');
  });

  it("registra uma rota global sem abrir o Dashboard executivo", () => {
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    expect(app).toContain('const Inicio = lazy(() => import("./pages/Inicio"));');
    expect(app).toContain('<Route path="/app/inicio">');
    expect(app).toContain('<AppPage title="Início">');
    expect(app).toContain('requiredAccess="isExecutive"');
  });
});
