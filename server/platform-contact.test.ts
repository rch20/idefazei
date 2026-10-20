import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getPlatformContact: vi.fn(),
  savePlatformContact: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const original = await importOriginal<typeof import("./db")>();
  return { ...original, getPlatformContact: dbMocks.getPlatformContact, savePlatformContact: dbMocks.savePlatformContact };
});

import { appRouter } from "./routers";
import {
  buildPlatformWhatsAppLink,
  EMPTY_PLATFORM_CONTACT,
  formatBrazilianPhone,
  formatCnpj,
  normalizeBrazilianPhone,
  normalizePlatformContactInput,
  parseStoredPlatformContact,
} from "../shared/platformContact";

const anonymous = { user: null, req: { protocol: "https", headers: {} }, res: {} } as unknown as TrpcContext;
const admin = {
  user: { id: 1, role: "admin", email: "root@idefazei.com.br", name: "Super Admin" },
  req: { protocol: "https", headers: {} },
  res: {},
} as unknown as TrpcContext;
const churchUser = {
  user: { id: 9, role: "pastor", email: "p@igreja.com", name: "Pastor" },
  req: { protocol: "https", headers: {} },
  res: {},
} as unknown as TrpcContext;

describe("regras de contato da plataforma", () => {
  it("normaliza telefone com máscara e +55", () => {
    expect(normalizeBrazilianPhone("(11) 91234-5678")).toBe("11912345678");
    expect(normalizeBrazilianPhone("+55 11 91234-5678")).toBe("11912345678");
    expect(normalizeBrazilianPhone("(11) 3456-7890")).toBe("1134567890");
    expect(normalizeBrazilianPhone("")).toBeNull();
    expect(normalizeBrazilianPhone("123")).toBe("invalid");
    expect(normalizeBrazilianPhone("(11) 81234-5678")).toBe("invalid"); // celular sem 9
  });

  it("formata telefone e CNPJ para exibição", () => {
    expect(formatBrazilianPhone("11912345678")).toBe("(11) 91234-5678");
    expect(formatBrazilianPhone("1134567890")).toBe("(11) 3456-7890");
    expect(formatCnpj("12345678000199")).toBe("12.345.678/0001-99");
  });

  it("monta o link do WhatsApp com a mensagem inicial codificada", () => {
    expect(buildPlatformWhatsAppLink({ whatsapp: null, whatsappMessage: null })).toBeNull();
    expect(buildPlatformWhatsAppLink({ whatsapp: "11912345678", whatsappMessage: "Olá, tudo bem?" })).toBe(
      "https://wa.me/5511912345678?text=Ol%C3%A1%2C%20tudo%20bem%3F"
    );
    expect(buildPlatformWhatsAppLink({ whatsapp: "11912345678", whatsappMessage: null })).toContain("https://wa.me/5511912345678?text=");
  });

  it("aceita contatos válidos e transforma campos vazios em ausentes", () => {
    const result = normalizePlatformContactInput({
      whatsapp: "(11) 91234-5678",
      phone: "",
      email: "  Contato@IdeFazei.com.br ",
      address: "São Paulo, SP",
      businessHours: "Seg a sex: 8h às 18h\r\nSáb: 9h às 13h",
      cnpj: "12.345.678/0001-99",
      social: { instagram: "https://www.instagram.com/idefazei", facebook: "" },
    });
    expect(result).toEqual({
      ok: true,
      value: {
        ...EMPTY_PLATFORM_CONTACT,
        whatsapp: "11912345678",
        email: "contato@idefazei.com.br",
        address: "São Paulo, SP",
        businessHours: "Seg a sex: 8h às 18h\nSáb: 9h às 13h",
        cnpj: "12345678000199",
        social: { instagram: "https://www.instagram.com/idefazei" },
      },
    });
  });

  it("rejeita dados inválidos informando o campo", () => {
    const result = normalizePlatformContactInput({
      whatsapp: "123",
      email: "sem-arroba",
      address: "<script>alert(1)</script>",
      cnpj: "123",
      social: { instagram: "http://instagram.com/x", youtube: "https://exemplo.com/canal" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(["address", "cnpj", "email", "instagram", "whatsapp", "youtube"]);
    }
  });

  it("limita o horário a 6 linhas", () => {
    const result = normalizePlatformContactInput({ businessHours: "1\n2\n3\n4\n5\n6\n7" });
    expect(result.ok).toBe(false);
  });

  it("lê valor guardado ausente, quebrado ou antigo sem falhar", () => {
    expect(parseStoredPlatformContact(null)).toEqual(EMPTY_PLATFORM_CONTACT);
    expect(parseStoredPlatformContact("{quebrado")).toEqual(EMPTY_PLATFORM_CONTACT);
    expect(parseStoredPlatformContact(JSON.stringify({ email: "a@b.co", whatsapp: "999" })).email).toBeNull();
  });
});

describe("rotas de contato da plataforma", () => {
  beforeEach(() => vi.clearAllMocks());

  it("a leitura pública devolve os contatos cadastrados", async () => {
    dbMocks.getPlatformContact.mockResolvedValue({ ...EMPTY_PLATFORM_CONTACT, email: "contato@idefazei.com.br" });
    const result = await appRouter.createCaller(anonymous).platform.publicContact();
    expect(result.email).toBe("contato@idefazei.com.br");
  });

  it("só o Super Admin lê e grava as configurações", async () => {
    await expect(appRouter.createCaller(anonymous).superAdmin.contactSettings()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(churchUser).superAdmin.updateContactSettings({ email: "x@y.co" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.savePlatformContact).not.toHaveBeenCalled();
  });

  it("o Super Admin grava contatos normalizados e registra quem alterou", async () => {
    dbMocks.savePlatformContact.mockResolvedValue(undefined);
    const result = await appRouter.createCaller(admin).superAdmin.updateContactSettings({ whatsapp: "(11) 91234-5678", email: "Contato@IdeFazei.com.br" });
    expect(result.whatsapp).toBe("11912345678");
    expect(dbMocks.savePlatformContact).toHaveBeenCalledWith(expect.objectContaining({ whatsapp: "11912345678", email: "contato@idefazei.com.br" }), "root@idefazei.com.br");
  });

  it("não grava quando há campo inválido", async () => {
    await expect(appRouter.createCaller(admin).superAdmin.updateContactSettings({ whatsapp: "123" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.savePlatformContact).not.toHaveBeenCalled();
  });
});
