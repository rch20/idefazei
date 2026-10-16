import { describe, expect, it } from "vitest";
import {
  buildEmailVerificationEmail,
  getEmailVerificationTokenTtlHours,
  getTenantEmailVerificationUrl,
  isEmailVerificationDeliveryConfigured,
} from "./emailVerification";

describe("email verification", () => {
  it("gera o link no subdomínio da igreja e codifica o token", () => {
    expect(getTenantEmailVerificationUrl("cristaviver", "abc+123")).toBe("https://cristaviver.idefazei.com.br/confirmar-email?token=abc%2B123");
  });

  it("mantém o conteúdo claro e escapa dados editoriais no HTML", () => {
    const content = buildEmailVerificationEmail({
      churchName: "Igreja <teste>",
      recipientName: "Maria & João",
      confirmationUrl: "https://example.com/confirmar-email?token=abc&next=1",
    });

    expect(content.text).toContain("Confirme seu e-mail");
    expect(content.text).toContain("expira em 24 horas");
    expect(content.html).toContain("Igreja &lt;teste&gt;");
    expect(content.html).toContain("Maria &amp; João");
    expect(content.html).toContain("token=abc&amp;next=1");
    expect(content.html).not.toContain("<script");
  });

  it("mantém o token válido por 24 horas", () => {
    expect(getEmailVerificationTokenTtlHours()).toBe(24);
  });

  it("não considera o envio configurado sem SMTP e flag de ativação", () => {
    expect(isEmailVerificationDeliveryConfigured()).toBe(false);
  });
});
