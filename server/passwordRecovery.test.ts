import { describe, expect, it } from "vitest";
import { buildPasswordResetEmail, getPasswordResetMailConfig, getPasswordResetTokenTtlMinutes, getTenantResetUrl } from "./passwordRecovery";

describe("password recovery", () => {
  it("gera link no subdomínio correto da igreja", () => {
    expect(getTenantResetUrl("cristaviver", "abc+123")).toBe("https://cristaviver.idefazei.com.br/redefinir-senha?token=abc%2B123");
  });

  it("mantém o conteúdo neutro e informa validade e uso único", () => {
    const content = buildPasswordResetEmail({ churchName: "Cristã Viver", recipientName: "Maria", resetUrl: "https://cristaviver.idefazei.com.br/redefinir-senha?token=abc" });
    expect(content.text).toContain("Olá, Maria.");
    expect(content.text).toContain("Cristã Viver");
    expect(content.text).toContain("expira em 1 hora");
    expect(content.text).toContain("uma única vez");
    expect(content.html).toContain("Cristã Viver");
    expect(content.html).not.toContain("<script");
  });

  it("escapa nome da igreja no HTML", () => {
    const content = buildPasswordResetEmail({ churchName: "Igreja <teste>", recipientName: null, resetUrl: "https://example.com/redefinir-senha?token=abc" });
    expect(content.html).toContain("Igreja &lt;teste&gt;");
    expect(content.html).not.toContain("Igreja <teste>");
  });

  it("usa Gmail como default, mas permanece desativado sem senha SMTP", () => {
    const config = getPasswordResetMailConfig();
    expect(config.from).toBe("noreply.idefazei@gmail.com");
    expect(config.host).toBe("smtp.gmail.com");
    expect(config.enabled).toBe(false);
  });

  it("mantém o token válido por uma hora", () => {
    expect(getPasswordResetTokenTtlMinutes()).toBe(60);
  });
});
