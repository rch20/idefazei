// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { getBrowserSessionToken } from "./sessionToken";

const ADMIN_TOKEN = "admin-token";
const CHURCH_TOKEN = "church-token";

describe("getBrowserSessionToken", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("prioriza admin_token em qualquer rota administrativa", () => {
    window.localStorage.setItem("church_token", CHURCH_TOKEN);
    window.sessionStorage.setItem("admin_token", ADMIN_TOKEN);

    expect(getBrowserSessionToken("/admin")).toBe(ADMIN_TOKEN);
    expect(getBrowserSessionToken("/admin/igrejas")).toBe(ADMIN_TOKEN);
  });

  it("mantém church_token nas rotas da igreja", () => {
    window.localStorage.setItem("church_token", CHURCH_TOKEN);
    window.sessionStorage.setItem("admin_token", ADMIN_TOKEN);

    expect(getBrowserSessionToken("/tesouraria")).toBe(CHURCH_TOKEN);
  });

  it("usa admin_token como fallback fora de /admin quando não há sessão da igreja", () => {
    window.sessionStorage.setItem("admin_token", ADMIN_TOKEN);

    expect(getBrowserSessionToken("/login")).toBe(ADMIN_TOKEN);
  });
});
