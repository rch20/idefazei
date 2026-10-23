import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/Batismo.tsx"), "utf8");
const adaptiveSource = readFileSync(resolve(process.cwd(), "client/src/components/AdaptiveFormDialog.tsx"), "utf8");

describe("Modal de inscrição no Batismo", () => {
  it("mantém a inscrição como modal compacto com seleção e confirmação", () => {
    expect(source).toContain("Inscrever em {cls.name}");
    expect(source).toContain("Confirmar Inscrição");
    expect(source).toContain("batismo.enroll");
    expect(source).toContain("<DialogContent className=\"sm:max-w-md\">");
  });

  it("exibe erro dentro do modal e limpa a mensagem ao selecionar outra pessoa", () => {
    expect(source).toContain("enrollError");
    expect(source).toContain("Erro ao inscrever");
    expect(source).toContain("role=\"alert\"");
    expect(source).toContain("setEnrollError(null)");
  });

  it("não converte a ação curta para o padrão adaptativo", () => {
    expect(source).not.toContain("AdaptiveFormDialogContent");
    expect(source).toContain("<DialogContent className=\"sm:max-w-md\">");
    expect(adaptiveSource).toContain("z-[200]");
  });
});

describe("Linha do inscrito no Batismo", () => {
  it("torna o nome clicável para abrir os dados da pessoa", () => {
    expect(source).toContain("useLocation");
    expect(source).toContain("navigate(`/app/pessoas?personId=${person.id}&section=resumo`)");
  });

  it("mostra o discipulador e um botão de WhatsApp para ele", () => {
    expect(source).toContain("getWhatsAppLinkWithMessage");
    expect(source).toContain("Discipulador: {disciplerName}");
    expect(source).toContain("disciplerWaLink");
  });

  it("permite cadastrar e inscrever uma pessoa nova (sem login) na turma", () => {
    expect(source).toContain("trpc.people.create.useMutation");
    expect(source).toContain("Nova pessoa");
    expect(source).toContain("Cadastrar e inscrever");
    expect(source).toContain("handleEnrollConfirm");
  });

  it("oferece um atalho para a preparação na Escola de Fundamentos", () => {
    expect(source).toContain("Preparação para o batismo");
    expect(source).toContain('navigate("/app/escola-fundamentos")');
  });

  it("permite designar o estudo de batismo e abri-lo direto", () => {
    expect(source).toContain("trpc.batismo.studyRef.useQuery");
    expect(source).toContain("trpc.batismo.setStudy.useMutation");
    expect(source).toContain("/app/escola-fundamentos?courseId=${studyRef.courseId}&studyId=${studyRef.studyId}");
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(router).toContain("setStudy: protectedProcedure");
    expect(router).toContain("getChurchBaptismStudyRef(input.churchId)");
  });

  it("abre um estudo por URL na tela de Fundamentos", () => {
    const fund = readFileSync(resolve(process.cwd(), "client/src/pages/EscolaFundamentos.tsx"), "utf8");
    expect(fund).toContain("useSearch");
    expect(fund).toContain('params.get("studyId")');
    expect(fund).toContain('params.get("courseId")');
  });

  it("busca o discipulador e o whatsapp no servidor", () => {
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const start = db.indexOf("export async function getBaptismEnrollments");
    const slice = db.slice(start, start + 900);
    expect(slice).toContain("baptism_discipler");
    expect(slice).toContain("people.discipledById");
    expect(slice).toContain("whatsapp: people.whatsapp");
  });
});

export {};
