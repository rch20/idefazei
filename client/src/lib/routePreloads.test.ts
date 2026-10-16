import { describe, expect, it } from "vitest";
import { preloadRoute } from "./routePreloads";

describe("preloadRoute", () => {
  it("ignora rotas que não fazem parte do catálogo de preloads", () => {
    expect(preloadRoute("/app/rota-inexistente")).toBeUndefined();
  });

  it("normaliza query string e reutiliza a mesma promessa", () => {
    const first = preloadRoute("/app/pessoas?from=menu");
    const second = preloadRoute("/app/pessoas?from=mobile");

    expect(first).toBeDefined();
    expect(second).toBe(first);
  });
});
