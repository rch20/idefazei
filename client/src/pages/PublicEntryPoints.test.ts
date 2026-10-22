import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TRIAL_DAYS } from "@shared/billing";

const pagesRoot = resolve(process.cwd(), "client/src/pages");

describe("entry points públicos", () => {
  it("não expõe ações fantasma nem contatos de teste", () => {
    const landing = readFileSync(resolve(pagesRoot, "LandingPage.tsx"), "utf8");

    expect(landing).not.toContain('href="#"');
    expect(landing).not.toContain("5511999999999");
    expect(landing).toContain('href="/contato"');
  });

  it("não mostra o acesso do Super Admin na página de venda e orienta quem já é cliente", () => {
    const landing = readFileSync(resolve(pagesRoot, "LandingPage.tsx"), "utf8");

    expect(landing).not.toContain("/admin");
    expect(landing).toContain("Já é cliente?");
  });

  it("apresenta o produto por necessidades comuns das igrejas, sem uma visão ministerial como estrutura", () => {
    const landing = readFileSync(resolve(pagesRoot, "LandingPage.tsx"), "utf8");

    expect(landing).toContain("Mais organização para sua igreja.");
    expect(landing).toContain("Mais atenção a cada pessoa.");
    for (const area of [
      "Pessoas, membros e visitantes",
      "Acompanhamento e cuidado pastoral",
      "Ensino, cursos e formação",
      "Equipes, ministérios e voluntários",
      "Cultos, eventos e comunicação",
      "Finanças e administração",
    ]) {
      expect(landing).toContain(area);
    }
    expect(landing).not.toContain("Ganhar, Consolidar");
    expect(landing).not.toContain("Funil de Discipulado");
    // Recursos de uma visão específica aparecem dentro das áreas, como opção
    expect(landing).toContain("Escola de Fundamentos");
    expect(landing).toContain("Encontro com Deus");
    expect(landing).toContain("Não é preciso adotar todos os recursos");
  });

  it("não promete o que o sistema ainda não oferece", () => {
    const landing = readFileSync(resolve(pagesRoot, "LandingPage.tsx"), "utf8");

    for (const claim of ["API", "SLA", "Multi-campus", "multi-campus", "White-label", "IA Pastoral", "internacional", "idiomas", "configurável", "personalize os nomes", "Multi-Tenant", "criptografia", "LGPD"]) {
      expect(landing, `a página não deve prometer: ${claim}`).not.toContain(claim);
    }
  });

  it("anuncia o teste grátis real (sem cartão), lendo o número de dias de shared/billing.ts em vez de um valor fixo", () => {
    const landing = readFileSync(resolve(pagesRoot, "LandingPage.tsx"), "utf8");

    // A página usa a expressão {TRIAL_DAYS}, não um número fixo: se shared/billing.ts mudar o prazo, a página acompanha.
    expect(landing).toContain('import { TRIAL_DAYS } from "@shared/billing"');
    expect(landing).toContain("{TRIAL_DAYS} dias grátis");
    expect(landing).toContain("sem cartão");
    // Confirma que o valor por trás da expressão é mesmo um teste grátis real, e não zero/negativo.
    expect(TRIAL_DAYS).toBeGreaterThan(0);
  });

  it("leva o botão Ver Demo para a demonstração pública", () => {
    const landing = readFileSync(resolve(pagesRoot, "LandingPage.tsx"), "utf8");

    expect(landing).toContain('href="/demo"');
    expect(landing).not.toContain('href="/app/dashboard"');
  });

  it("mantém a Home antiga como alias da landing pública oficial", () => {
    const home = readFileSync(resolve(pagesRoot, "Home.tsx"), "utf8");

    expect(home).toContain('export { default } from "./LandingPage";');
    expect(home).not.toContain("getLoginUrl");
  });
});
