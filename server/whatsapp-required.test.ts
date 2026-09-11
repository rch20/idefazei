import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const registrationPage = readFileSync(resolve(root, "client/src/pages/CadastroDiscipulo.tsx"), "utf8");
const peoplePage = readFileSync(resolve(root, "client/src/pages/Pessoas.tsx"), "utf8");
const router = readFileSync(resolve(root, "server/routers.ts"), "utf8");

describe("WhatsApp obrigatório nos cadastros", () => {
  it("exige WhatsApp no cadastro público online", () => {
    expect(registrationPage).toContain("<span>WhatsApp *</span>");
    expect(registrationPage).toContain("required type=\"tel\"");
    expect(registrationPage).toContain("whatsapp: form.whatsapp.trim()");
    expect(router).toContain("whatsapp: whatsappInput,");
  });

  it("exige WhatsApp no cadastro manual de Pessoa", () => {
    expect(peoplePage).toContain("<Label>WhatsApp *</Label>");
    expect(peoplePage).toContain("required minLength={10}");
  });

  it("aceita máscara brasileira ou código 55, mas exige DDD e rejeita vazio", () => {
    expect(router).toContain('const whatsappInput = z.string().trim().min(1, "Informe o WhatsApp.")');
    expect(router).toContain("value.replace(/\\D/g, \"\")");
    expect(router).toContain("/^\\d{10,11}$/");
    expect(router).toContain("Informe um WhatsApp válido com DDD.");
  });
});
