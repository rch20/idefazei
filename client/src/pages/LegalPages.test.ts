import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("páginas legais públicas", () => {
  it("publica Termos e Privacidade e liga os links no rodapé e nos cadastros", () => {
    const app = read("client/src/App.tsx");
    expect(app).toContain('<Route path="/termos" component={Termos} />');
    expect(app).toContain('<Route path="/privacidade" component={Privacidade} />');
    expect(read("client/src/pages/LandingPage.tsx")).toContain('href="/privacidade"');
    expect(read("client/src/pages/CadastroIgreja.tsx")).toContain('href="/termos"');
    expect(read("client/src/pages/CadastroPublico.tsx")).toContain('href="/privacidade"');
    expect(read("client/src/pages/PortalVisitante.tsx")).toContain('href="/privacidade"');
  });

  it("cobre os pontos exigidos pela LGPD", () => {
    const privacy = read("client/src/pages/Privacidade.tsx");
    for (const text of ["controladora", "operador", "dados pessoais sensíveis", "Base legal", "Seus direitos", "Crianças e adolescentes", "Quanto tempo guardamos"]) {
      expect(privacy).toContain(text);
    }
  });

  it("cobre contratação, responsabilidades e cancelamento nos termos", () => {
    const terms = read("client/src/pages/Termos.tsx");
    for (const text of ["Responsabilidades da igreja", "Planos, pagamento e cancelamento", "Limitação de responsabilidade", "Lei aplicável"]) {
      expect(terms).toContain(text);
    }
  });
});
