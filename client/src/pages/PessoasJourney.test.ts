import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../..");
const pageSource = readFileSync(resolve(root, "client/src/pages/Pessoas.tsx"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");

describe("Ficha da Pessoa — jornada e escopo", () => {
  it("separa a ficha em resumo, participações, cuidado e histórico", () => {
    expect(pageSource).toContain('aria-label="Seções da ficha da Pessoa"');
    expect(pageSource).toContain('["resumo", "Resumo"]');
    expect(pageSource).toContain('["participacoes", "Participações"]');
    expect(pageSource).toContain('["cuidado", "Cuidado"]');
    expect(pageSource).toContain('["historico", "Histórico"]');
    expect(pageSource).toContain('personSection === "resumo"');
    expect(pageSource).toContain('personSection === "cuidado"');
    expect(pageSource).toContain('personSection === "historico"');
  });

  it("não expõe ações pastorais ministeriais para perfis não pastorais", () => {
    expect(pageSource).toContain("const canManageMinistryFunctions = isPastor;");
    expect(pageSource).toContain('personSection === "participacoes" && canManageMinistryFunctions');
    expect(pageSource).toContain('personSection === "cuidado" && canManageJourney');
  });

  it("mantém participação em Célula como consulta ou ação contextual", () => {
    expect(pageSource).toContain("Participação em Célula");
    expect(pageSource).toContain("const canManageCellParticipation");
    expect(pageSource).toContain("A integração e a transferência de Célula são feitas pelo Pastor ou pela liderança responsável.");
  });

  it("mantém atuações ministeriais como consulta e direciona a edição para o Ministério", () => {
    expect(pageSource).toContain("Atuações na equipe");
    expect(pageSource).toContain("Para adicionar ou alterar uma atuação, abra o painel do Ministério correspondente.");
    expect(pageSource).not.toContain("Adicionar atuação na equipe");
    expect(pageSource).not.toContain("saveMinistryFunction");
  });

  it("mostra um próximo passo único e leva cada pendência ao contexto correto", () => {
    expect(pageSource).toContain("const nextStepLabel");
    expect(pageSource).toContain('"Abrir Consolidação"');
    expect(pageSource).toContain('"Abrir Participações"');
    expect(pageSource).toContain('"Abrir Cuidado"');
    expect(pageSource).toContain('navigate("/app/consolidacao")');
    expect(pageSource).toContain('setPersonSection("participacoes")');
    expect(pageSource).toContain('setPersonSection("cuidado")');
  });

  it("protege a leitura de cuidado pelo escopo acessível da Pessoa", () => {
    expect(routerSource).toContain("await requireScopedPersonRead(ctx.user.id, input.churchId, input.personId);");
    expect(dbSource).toContain("coLeaderId: cells.coLeaderId");
  });

  it("oferece a lista de aniversariantes no mesmo contexto multi-tenant de Pessoas", () => {
    expect(pageSource).toContain("Aniversariantes");
    expect(pageSource).toContain("Hoje");
    expect(pageSource).toContain("Este mês");
    expect(pageSource).toContain("Mês dos aniversariantes");
    expect(pageSource).toContain("trpc.people.birthdays.useQuery");
    expect(pageSource).toContain("Pessoas sem data de nascimento não aparecem nesta lista.");
    expect(routerSource).toContain("birthdays: protectedProcedure");
    expect(routerSource).toContain("await requireChurchAdministrator(ctx.user.id, input.churchId);");
    expect(dbSource).toContain("getBirthdaysByChurch(churchId: number, month: number, day?: number)");
    expect(dbSource).toContain("eq(people.churchId, churchId)");
    expect(dbSource).toContain("isNotNull(people.birthDate)");
  });

  it("exige nascimento no cadastro completo e mantém indicação simples para membros", () => {
    expect(pageSource).toContain('<Label>Data de Nascimento *</Label>');
    expect(routerSource).toContain("birthDate: birthDateInput,");
    expect(routerSource).toContain("birthDate: birthDateInput.optional(),");
    expect(routerSource).toContain("if (!isSelfIndication && !input.birthDate)");
  });
});
