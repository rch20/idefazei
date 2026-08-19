import { describe, expect, it } from "vitest";

describe("Identidade da plataforma", () => {
  it("mantém o título oficial Ide Fazei configurado no ambiente", () => {
    expect(process.env.VITE_APP_TITLE).toBe("Ide Fazei");
  });
});
