// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { readBrowserStorage, removeBrowserStorage } from "./browserStorage";

describe("readBrowserStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("prefere o valor persistente quando ele existe", () => {
    window.localStorage.setItem("admin_token", "local-token");
    window.sessionStorage.setItem("admin_token", "session-token");

    expect(readBrowserStorage("admin_token")).toBe("local-token");
  });

  it("usa a sessão da aba quando o armazenamento persistente está vazio", () => {
    window.sessionStorage.setItem("admin_token", "session-token");

    expect(readBrowserStorage("admin_token")).toBe("session-token");
  });

  it("retorna null quando nenhum armazenamento contém a chave", () => {
    expect(readBrowserStorage("admin_token")).toBeNull();
  });

  it("remove a chave dos dois armazenamentos", () => {
    window.localStorage.setItem("admin_token", "local-token");
    window.sessionStorage.setItem("admin_token", "session-token");

    removeBrowserStorage("admin_token");

    expect(readBrowserStorage("admin_token")).toBeNull();
  });
});
