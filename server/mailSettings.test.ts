import { describe, expect, it, vi, beforeEach } from "vitest";

const store = vi.hoisted(() => ({ value: null as string | null }));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: vi.fn(async () => ({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => (store.value ? [{ value: store.value }] : []),
          }),
        }),
      }),
      insert: () => ({
        values: (row: { settingValue: string }) => ({
          onDuplicateKeyUpdate: async ({ set }: { set: { settingValue: string } }) => {
            store.value = set.settingValue ?? row.settingValue;
          },
        }),
      }),
    })),
  };
});

import { getMailAdminView, loadMailConfig, resolveMailConfig, saveMailConfig } from "./mailSettings";

describe("configuração de e-mail do Super Admin (SMTP guardado no banco)", () => {
  beforeEach(() => {
    store.value = null;
    process.env.JWT_SECRET = process.env.JWT_SECRET || "teste-segredo-local-para-criptografia";
  });

  it("sem nada salvo, usa o .env como reserva e fica desativado por padrão", async () => {
    const effective = await resolveMailConfig("passwordReset");
    expect(effective.host).toBe("smtp.gmail.com");
    expect(effective.enabled).toBe(false);
  });

  it("salva host/usuário/senha, guarda a senha criptografada e nunca em texto puro", async () => {
    await saveMailConfig(
      { host: "smtp.meudominio.com", port: 587, secure: false, user: "envio@meudominio.com", fromAddress: "nao-responda@meudominio.com", password: "senha-super-secreta", enablePasswordReset: true, enableEmailVerification: false },
      "super@admin.test"
    );
    const stored = await loadMailConfig();
    expect(stored.passwordEnc).not.toContain("senha-super-secreta");

    const view = await getMailAdminView();
    expect(view.configured).toBe(true);
    expect(view.passwordMasked).not.toBe(null);
    expect(view.passwordMasked).not.toContain("senha-super-secreta");

    const effective = await resolveMailConfig("passwordReset");
    expect(effective.password).toBe("senha-super-secreta");
    expect(effective.enabled).toBe(true);

    const other = await resolveMailConfig("emailVerification");
    expect(other.enabled).toBe(false);
  });

  it("recusa remetente com formato inválido", async () => {
    await expect(
      saveMailConfig(
        { host: "smtp.meudominio.com", port: 587, secure: false, user: "u", fromAddress: "nao-e-email", password: "x", enablePasswordReset: false, enableEmailVerification: false },
        "super@admin.test"
      )
    ).rejects.toThrow();
  });

  it("deixar a senha em branco ao salvar de novo mantém a senha já guardada", async () => {
    await saveMailConfig(
      { host: "smtp.meudominio.com", port: 587, secure: false, user: "envio@meudominio.com", fromAddress: "nao-responda@meudominio.com", password: "senha-super-secreta", enablePasswordReset: true, enableEmailVerification: false },
      "super@admin.test"
    );
    await saveMailConfig(
      { host: "smtp.meudominio.com", port: 587, secure: false, user: "envio@meudominio.com", fromAddress: "nao-responda@meudominio.com", enablePasswordReset: true, enableEmailVerification: true },
      "super@admin.test"
    );
    const effective = await resolveMailConfig("passwordReset");
    expect(effective.password).toBe("senha-super-secreta");
  });
});
