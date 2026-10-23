import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../..");
const pageSource = readFileSync(resolve(root, "client/src/pages/Oracao.tsx"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");

describe("Aba de Oração — acompanhamento", () => {
  it("mostra um resumo de pedidos em oração, atendidos e testemunhos", () => {
    expect(pageSource).toContain("Em oração");
    expect(pageSource).toContain("Atendidos");
    expect(pageSource).toContain("Testemunhos");
    expect(pageSource).toContain("pedidosAtivos");
    expect(pageSource).toContain("pedidosAtendidos");
  });

  it("exibe data e status em cada pedido e permite filtrar", () => {
    expect(pageSource).toContain("formatPrayerDate");
    expect(pageSource).toContain("pedidoFilter");
    expect(pageSource).toContain("r.createdAt");
  });

  it("permite ao gestor marcar um pedido como atendido e reabrir", () => {
    expect(pageSource).toContain("trpc.prayer.setAnswered.useMutation");
    expect(pageSource).toContain("Marcar como atendido");
    expect(pageSource).toContain("Reabrir");
  });

  it("protege a ação de atendido no servidor", () => {
    const start = routerSource.indexOf("setAnswered: protectedProcedure");
    expect(start).toBeGreaterThan(-1);
    const slice = routerSource.slice(start, start + 400);
    expect(slice).toContain("requirePrayerManager(ctx.user.id, input.churchId)");
    expect(slice).toContain("setPrayerRequestAnswered(input.id, input.churchId, input.answered)");
    expect(dbSource).toContain("export async function setPrayerRequestAnswered");
  });
});

export {};
