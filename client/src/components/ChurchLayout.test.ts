import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("confirmação de logout no painel", () => {
  it("solicita confirmação antes de chamar o logout", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/ChurchLayout.tsx"), "utf8");

    expect(source).toContain("const [logoutOpen, setLogoutOpen] = useState(false);");
    expect(source).toContain("Sair da plataforma?");
    expect(source).toContain("Continuar aqui");
    expect(source).toContain("Sair agora");
    expect(source).toContain("onClick={logout}");
  });
});
