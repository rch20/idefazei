import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "AreaMembro.tsx"), "utf8");

describe("Área do Membro — contato e login", () => {
  it("oferece edição do próprio telefone e WhatsApp", () => {
    expect(source).toContain("updateMyContact");
    expect(source).toContain("Editar contato");
    expect(source).toContain('id="member-phone"');
    expect(source).toContain('id="member-whatsapp"');
  });

  it("explica que o contato cadastrado pode ser usado no login", () => {
    expect(source).toContain("Telefone para login");
    expect(source).toContain("Este número será aceito como identificador de login.");
    expect(source).toContain("O WhatsApp também pode ser usado no login.");
    expect(source).toContain("O e-mail continua sendo o mesmo.");
  });
});
