import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Escola de Fundamentos", () => {
  it("organiza a gestão em quatro áreas sem duplicar o conteúdo existente", () => {
    const source = readFileSync(
      resolve(process.cwd(), "client/src/pages/EscolaFundamentos.tsx"),
      "utf8"
    );
    const areas = readFileSync(
      resolve(
        process.cwd(),
        "client/src/pages/foundation/FoundationAdminAreas.tsx"
      ),
      "utf8"
    );

    expect(source).toContain("FoundationAreaNav");
    expect(source).toContain("FoundationStudentsArea");
    expect(source).toContain('activeArea === "aulas"');
    expect(source).toContain('activeArea === "organizacao"');
    expect(areas).toContain('id: "estudos"');
    expect(areas).toContain('id: "alunos"');
    expect(areas).toContain('id: "aulas"');
    expect(areas).toContain('id: "organizacao"');
    expect(source).toContain("StudyManagement");
    expect(source).toContain("TeacherLearningReview");
  });

  it("compartilha o tema da igreja entre a navegação e a experiência do aluno", () => {
    const source = readFileSync(
      resolve(process.cwd(), "client/src/pages/EscolaFundamentos.tsx"),
      "utf8"
    );
    const areas = readFileSync(
      resolve(
        process.cwd(),
        "client/src/pages/foundation/FoundationAdminAreas.tsx"
      ),
      "utf8"
    );
    const student = readFileSync(
      resolve(
        process.cwd(),
        "client/src/pages/foundation/StudentLearningExperience.tsx"
      ),
      "utf8"
    );

    expect(source).toContain(
      "createFoundationTheme(primaryColor, secondaryColor)"
    );
    expect(source).toContain("theme={foundationTheme}");
    expect(areas).toContain("aria-pressed={active}");
    expect(areas).toContain("theme.primaryForeground");
    expect(student).toContain('from "./FoundationTheme"');
    expect(student).toContain("theme.primaryForeground");
    expect(student).not.toContain("function createFoundationTheme(");
  });

  it("cria o estudo com etapas prontas e mantém a prévia no mesmo fluxo", () => {
    const source = readFileSync(
      resolve(process.cwd(), "client/src/pages/EscolaFundamentos.tsx"),
      "utf8"
    );
    const preview = readFileSync(
      resolve(
        process.cwd(),
        "client/src/pages/foundation/FoundationStudyPreviewDialog.tsx"
      ),
      "utf8"
    );
    const previewPage = readFileSync(
      resolve(
        process.cwd(),
        "client/src/pages/foundation/FoundationStudyPreviewPage.tsx"
      ),
      "utf8"
    );
    const editor = readFileSync(
      resolve(
        process.cwd(),
        "client/src/pages/foundation/FoundationStudyEditor.tsx"
      ),
      "utf8"
    );

    expect(editor).toContain('template: "biblico"');
    expect(editor).toContain("Rascunho salvo.");
    expect(editor).toContain("Salvar rascunho");
    expect(editor).toContain("Salvar e continuar");
    expect(editor).toContain("Publicar estudo");
    expect(source).toContain("Retirar da publicação");
    expect(editor).toContain("Prepare o estudo na mesma ordem");
    expect(source).toContain("Organizar módulos existentes");
    expect(editor).toContain("Visualizar como aluno");
    expect(editor).toContain("Prévia em tela cheia");
    expect(previewPage).toContain("FoundationStudyPreviewDialog");
    expect(preview).toContain("Nada nesta tela cria progresso");
    expect(preview).not.toContain("useMutation");
  });

  it("organiza a árvore administrativa e carrega as partes somente quando o estudo é aberto", () => {
    const source = readFileSync(
      resolve(process.cwd(), "client/src/pages/EscolaFundamentos.tsx"),
      "utf8"
    );
    const trailItem = readFileSync(
      resolve(process.cwd(), "client/src/pages/foundation/StudyTrailItem.tsx"),
      "utf8"
    );
    const partList = readFileSync(
      resolve(process.cwd(), "client/src/pages/foundation/StudyPartList.tsx"),
      "utf8"
    );

    expect(source).toContain(
      'import { StudyTrailItem } from "./foundation/StudyTrailItem"'
    );
    expect(source).toContain("<StudyTrailItem");
    expect(source).not.toContain("<StudyContent");
    expect(trailItem).toContain("listQuestionBlocks.useQuery");
    expect(trailItem).toContain("manageStudyQuestions.useQuery");
    expect(trailItem).toContain("listStudyMaterials.useQuery");
    expect(trailItem).toContain("enabled: expanded");
    expect(trailItem).toContain("Ver partes, perguntas e materiais");
    expect(trailItem).toContain("Visualizar ${study.title} como aluno");
    expect(partList).toContain("Partes do estudo");
    expect(partList).toContain("questionsByBlock");
    expect(partList).toContain("StudyPartQuestions");
    expect(
      readFileSync(
        resolve(process.cwd(), "client/src/pages/foundation/StudyPartRow.tsx"),
        "utf8"
      )
    ).toContain("Ver perguntas desta etapa");
    expect(
      readFileSync(
        resolve(
          process.cwd(),
          "client/src/pages/foundation/StudyPartQuestions.tsx"
        ),
        "utf8"
      )
    ).toContain("Perguntas da parte");
  });

  it("oferece editor contextual das partes sem perder a ordem do estudo", () => {
    const partList = readFileSync(
      resolve(process.cwd(), "client/src/pages/foundation/StudyPartList.tsx"),
      "utf8"
    );
    const editor = readFileSync(
      resolve(process.cwd(), "client/src/pages/foundation/StudyPartEditor.tsx"),
      "utf8"
    );
    const row = readFileSync(
      resolve(process.cwd(), "client/src/pages/foundation/StudyPartRow.tsx"),
      "utf8"
    );
    const router = readFileSync(
      resolve(process.cwd(), "server/routers.ts"),
      "utf8"
    );

    expect(partList).toContain("Nova etapa");
    expect(partList).toContain("<StudyQuestionEditor");
    const questionEditor = readFileSync(
      resolve(
        process.cwd(),
        "client/src/pages/foundation/StudyQuestionEditor.tsx"
      ),
      "utf8"
    );
    expect(questionEditor).toContain("Adicionar pergunta");
    expect(questionEditor).toContain("createStudyQuestion.useMutation");
    expect(partList).toContain("updateQuestionBlock");
    expect(partList).toContain("moveQuestionBlock");
    expect(editor).toContain("foundation-study-part-editor");
    expect(editor).toContain("Etapa disponível para o aluno");
    expect(row).toContain("Mover");
    expect(router).toContain("updateQuestionBlock: tenantProcedure");
    expect(router).toContain("moveQuestionBlock: tenantProcedure");
  });

  it("oferece o roteiro pedagógico de seis passos sem criar uma segunda estrutura", () => {
    const editor = readFileSync(
      resolve(
        process.cwd(),
        "client/src/pages/foundation/FoundationStudyEditor.tsx"
      ),
      "utf8"
    );

    expect(editor).toContain('"Informações"');
    expect(editor).toContain('"Leia"');
    expect(editor).toContain('"Entenda"');
    expect(editor).toContain('"Responda"');
    expect(editor).toContain('"Aplique"');
    expect(editor).toContain('"Revisar e publicar"');
    expect(editor).toContain("Ver etapas");
    expect(editor).toContain("Salvar e continuar");
    expect(editor).toContain("Voltar à edição");
    expect(editor).toContain("Modo prévia");
    expect(editor).toContain("salva resposta, progresso");
    expect(editor).toContain("StudyQuestionEditor");
  });

  it("orienta a criação de turma, matrícula e conclusão", () => {
    const source = readFileSync(
      resolve(process.cwd(), "client/src/pages/EscolaFundamentos.tsx"),
      "utf8"
    );

    expect(source).toContain("Criar turma");
    expect(source).toContain("estruture módulos, estudos");
    expect(source).toContain("Crie o estudo, monte as etapas");
    expect(source).toContain("Um único caminho para preparar o estudo");
    expect(source).toContain("Abrir Estudos");
    expect(source).toContain("Administradores de estudos");
    expect(source).toContain("canManageStudies");
    expect(source).toContain("Biblioteca Digital");
    expect(source).toContain("Materiais do estudo");
    expect(source).toContain("attachStudyMaterial");
    expect(source).toContain("Trilha de aprendizado");
    expect(source).toContain("O módulo apenas organiza a trilha");
    expect(source).toContain("createModule");
    expect(source).toContain("FoundationImportDialog");
    expect(source).toContain("Preencher por Excel");
    const importDialogSource = readFileSync(
      resolve(
        process.cwd(),
        "client/src/pages/foundation/FoundationImportDialog.tsx"
      ),
      "utf8"
    );
    expect(importDialogSource).toContain("Importar gabarito Excel");
    expect(importDialogSource).toContain("Confirmar importação");
    expect(importDialogSource).toContain("DialogDescription");
  });

  it("oferece ao discípulo uma preparação única sem escolha de curso", () => {
    const source = [
      readFileSync(
        resolve(process.cwd(), "client/src/pages/EscolaFundamentos.tsx"),
        "utf8"
      ),
      readFileSync(
        resolve(
          process.cwd(),
          "client/src/pages/foundation/StudentLearningExperience.tsx"
        ),
        "utf8"
      ),
    ].join("\n");

    expect(source).toContain("studentPath");
    expect(source).toContain("Minha preparação");
    expect(source).toContain("Você não precisa escolher uma turma");
    expect(source).toContain("estudo disponível");
    expect(source).toContain("Concluir estudo");
    expect(source).toContain("Estudo da semana");
    expect(source).toContain("Preparação concluída");
    expect(source).toContain("Sequência da preparação");
    expect(source).toContain("ETAPA {selectedBlockIndex + 1} DE");
    expect(source).toContain("{blocks.length}");
  });
});
