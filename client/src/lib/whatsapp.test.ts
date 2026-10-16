import { describe, expect, it } from "vitest";
import { formatContactPhone, getWhatsAppLink, getWhatsAppLinkWithMessage } from "./whatsapp";

describe("contato WhatsApp de pedidos", () => {
  it("converte telefone brasileiro formatado para link internacional", () => {
    const link = getWhatsAppLink("(11) 99999-8888", "Maria");

    expect(link).toMatch(/^https:\/\/wa\.me\/5511999998888\?text=/);
    expect(decodeURIComponent(link!.split("text=")[1])).toBe(
      "Olá, Maria! Aqui é da equipe da igreja. Recebemos seu pedido de oração e gostaríamos de conversar com você."
    );
  });

  it("não duplica o código do Brasil quando ele já está presente", () => {
    expect(getWhatsAppLink("+55 (11) 99999-8888", "Maria")).toMatch(/^https:\/\/wa\.me\/5511999998888\?text=/);
  });

  it("não oferece link para telefone ausente ou curto demais", () => {
    expect(getWhatsAppLink(undefined, "Maria")).toBeNull();
    expect(getWhatsAppLink("123456789", "Maria")).toBeNull();
  });

  it("gera um link com mensagem contextual para contato de célula", () => {
    const link = getWhatsAppLinkWithMessage("(11) 98888-7777", "Olá! Gostaria de conhecer a Célula Esperança.");
    expect(link).toMatch(/^https:\/\/wa\.me\/5511988887777\?text=/);
    expect(decodeURIComponent(link!.split("text=")[1])).toBe("Olá! Gostaria de conhecer a Célula Esperança.");
  });

  it("preserva o telefone exibido sem espaços nas extremidades", () => {
    expect(formatContactPhone("  (11) 99999-8888  ")).toBe("(11) 99999-8888");
    expect(formatContactPhone("   ")).toBeNull();
  });
});
