// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FoundationImportPreview } from "@/lib/foundationImportUpload";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  confirmUseMutation: vi.fn(),
  cancelUseMutation: vi.fn(),
  confirmMutate: vi.fn(),
  cancelMutate: vi.fn(),
  confirmOptions: null as { onSuccess?: () => void; onError?: (error: Error) => void } | null,
  cancelOptions: null as { onSuccess?: () => void; onError?: (error: Error) => void } | null,
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/foundationImportUpload", async () => {
  const actual = await vi.importActual<typeof import("@/lib/foundationImportUpload")>("@/lib/foundationImportUpload");
  return {
    ...actual,
    uploadFoundationImportPreview: mocks.upload,
  };
});

vi.mock("@/lib/trpc", () => ({
  trpc: {
    foundationImport: {
      confirm: {
        useMutation: (options: typeof mocks.confirmOptions) => {
          mocks.confirmOptions = options;
          return { mutate: mocks.confirmMutate, isPending: false };
        },
      },
      cancel: {
        useMutation: (options: typeof mocks.cancelOptions) => {
          mocks.cancelOptions = options;
          return { mutate: mocks.cancelMutate, isPending: false };
        },
      },
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess } }));

const DialogContext = React.createContext<{ open: boolean; onOpenChange: (open: boolean) => void }>({
  open: false,
  onOpenChange: () => {},
});

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) => (
    <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
  ),
  DialogTrigger: ({ children }: { children: React.ReactElement<{ onClick?: () => void }> }) => {
    const context = React.useContext(DialogContext);
    return React.cloneElement(children, { onClick: () => context.onOpenChange(true) });
  },
  DialogContent: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => {
    const context = React.useContext(DialogContext);
    return context.open ? <div {...props}>{children}</div> : null;
  },
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

import { FoundationImportDialog } from "./FoundationImportDialog";

function previewWith({
  templateVersion = 2,
  problems = [],
  optionsByQuestion = [2, 4, 6],
}: {
  templateVersion?: 1 | 2;
  problems?: FoundationImportPreview["summary"]["problems"];
  optionsByQuestion?: number[];
} = {}): FoundationImportPreview {
  const blocks = ["Leia", "Entenda", "Responda", "Aplique"].map((title, index) => ({
    position: index,
    title,
    content: `Conteúdo real de ${title}.`,
    reflectionPrompt: index === 1 ? null : `Reflexão real de ${title}.`,
    publish: false,
  }));
  const questions = optionsByQuestion.map((count, questionIndex) => ({
    blockTitle: "Responda",
    blockPosition: 2,
    prompt: `Pergunta ${questionIndex + 1}`,
    options: Array.from({ length: count }, (_, index) => ({ id: String.fromCharCode(97 + index), label: `Alternativa ${index + 1}` })),
    correctOptionId: count === 2 ? "a" : count === 4 ? "c" : "f",
    explanation: `Explicação ${questionIndex + 1}`,
    publish: false,
  }));
  return {
    draftId: 73,
    expiresAt: "2099-01-01T00:00:00.000Z",
    sourceFilename: templateVersion === 2 ? "estudo-v2.xlsx" : "estudo-legado.xlsx",
    payload: {
      templateVersion,
      courseId: 12,
      courseName: "Turma de Fundamentos",
      study: {
        title: "A fé no cotidiano",
        weekStart: "2026-10-19",
        publish: templateVersion === 1,
        summary: "Resumo preenchido no Excel.",
        content: "Introdução preenchida no Excel.",
        moduleTitle: null,
      },
      blocks,
      questions,
      class: null,
      materials: [],
    },
    summary: {
      templateVersion,
      studyTitle: "A fé no cotidiano",
      weekStart: "2026-10-19",
      counts: { blocks: 4, questions: questions.length, materials: 0 },
      classIncluded: false,
      publishStudy: templateVersion === 1,
      errors: problems.filter(problem => problem.severity === "erro").length,
      warnings: problems.filter(problem => problem.severity === "aviso").length,
      problems,
    },
  };
}

function openDialog() {
  render(<FoundationImportDialog courseId={12} courseName="Turma de Fundamentos" onImported={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Importar gabarito Excel" }));
}

async function uploadPreview(preview: FoundationImportPreview) {
  mocks.upload.mockResolvedValueOnce(preview);
  const input = document.querySelector<HTMLInputElement>("#foundation-import-file");
  if (!input) throw new Error("input de arquivo não encontrado");
  fireEvent.change(input, { target: { files: [new File(["xlsx"], "estudo.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })] } });
  fireEvent.click(screen.getByRole("button", { name: "Validar e gerar prévia" }));
  await waitFor(() => expect(screen.getByText(`Modelo detectado: ${preview.payload.templateVersion === 2 ? "v2" : "legado (v1)"}`)).toBeInTheDocument());
}

describe("FoundationImportDialog v2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirmOptions = null;
    mocks.cancelOptions = null;
  });

  afterEach(() => cleanup());

  it("faz upload apenas para prévia e não confirma automaticamente", async () => {
    openDialog();
    await uploadPreview(previewWith());

    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.confirmMutate).not.toHaveBeenCalled();
    expect(screen.getByText("Prévia real do estudo")).toBeInTheDocument();
    expect(screen.getByText("Resumo preenchido no Excel.")).toBeInTheDocument();
    expect(screen.getByText("Introdução preenchida no Excel.")).toBeInTheDocument();
  });

  it("mostra as quatro etapas, reflexão opcional e 2/4/6 alternativas sem inventar opcionais", async () => {
    openDialog();
    await uploadPreview(previewWith());

    for (const stage of ["Leia", "Entenda", "Responda", "Aplique"]) {
      expect(screen.getAllByRole("heading", { name: stage }).length).toBeGreaterThan(0);
    }
    const articles = screen.getAllByRole("article");
    expect(within(articles[0]).getByText("Conteúdo real de Leia.")).toBeInTheDocument();
    expect(within(articles[0]).queryByText("Conteúdo real de Entenda.")).not.toBeInTheDocument();
    expect(within(articles[1]).getByText("Conteúdo real de Entenda.")).toBeInTheDocument();
    expect(within(articles[1]).queryByText("Conteúdo real de Leia.")).not.toBeInTheDocument();
    expect(within(articles[2]).getByText("Conteúdo real de Responda.")).toBeInTheDocument();
    expect(within(articles[2]).queryByText("Conteúdo real de Aplique.")).not.toBeInTheDocument();
    expect(within(articles[3]).getByText("Conteúdo real de Aplique.")).toBeInTheDocument();
    expect(within(articles[3]).queryByText("Conteúdo real de Responda.")).not.toBeInTheDocument();
    expect(screen.getByText("Reflexão real de Leia.")).toBeInTheDocument();
    expect(screen.getAllByText("Não informado").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Alternativa 2/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Alternativa 4/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Alternativa 6/).length).toBeGreaterThan(0);
    expect(screen.getByText("Resposta correta: F — Alternativa 6")).toBeInTheDocument();
    expect(screen.queryByText("Minhas anotações")).not.toBeInTheDocument();
  });

  it("bloqueia confirmação com erro e orienta corrigir no Excel", async () => {
    const problem = {
      sheet: "PERGUNTAS",
      row: 7,
      field: "Alternativa C",
      code: "ALTERNATIVA_COM_LACUNA",
      message: "Preencha as alternativas em sequência.",
      severity: "erro" as const,
    };
    openDialog();
    await uploadPreview(previewWith({ problems: [problem] }));

    const confirm = screen.getByRole("button", { name: "Importar como rascunho" });
    expect(confirm).toBeDisabled();
    expect(screen.getByText(/PERGUNTAS!7 · Alternativa C · ALTERNATIVA_COM_LACUNA/)).toBeInTheDocument();
    expect(screen.getByText(/Corrija os campos indicados no Excel/)).toBeInTheDocument();
    expect(mocks.confirmMutate).not.toHaveBeenCalled();
  });

  it("confirma v2 somente com draftId, como rascunho, e resiste ao duplo clique", async () => {
    openDialog();
    await uploadPreview(previewWith());
    const confirm = screen.getByRole("button", { name: "Importar como rascunho" });

    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(mocks.confirmMutate).toHaveBeenCalledTimes(1);
    expect(mocks.confirmMutate).toHaveBeenCalledWith({ draftId: 73 });
    expect(screen.getByRole("button", { name: "Confirmando…" })).toBeDisabled();
  });

  it("mantém prévia e conteúdo após falha de confirmação", async () => {
    openDialog();
    await uploadPreview(previewWith());
    fireEvent.click(screen.getByRole("button", { name: "Importar como rascunho" }));

    expect(mocks.confirmOptions?.onError).toBeTypeOf("function");
    mocks.confirmOptions?.onError?.(new Error("Falha temporária"));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Falha temporária"));
    expect(screen.getByText("A fé no cotidiano")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importar como rascunho" })).not.toBeDisabled();
  });

  it("preserva o link do modelo legado e usa rótulos versionados", () => {
    openDialog();
    expect(screen.getByRole("link", { name: /Baixar modelo v2/ })).toHaveAttribute("download", "");
    expect(screen.getByRole("link", { name: /Baixar modelo legado \(compatibilidade\)/ })).toHaveAttribute("href", "/gabarito-fundamentos-template.xlsx");
  });

  it("mantém o botão e a mensagem compatíveis no modelo legado", async () => {
    openDialog();
    await uploadPreview(previewWith({ templateVersion: 1 }));

    expect(screen.getByText("Modelo detectado: legado (v1)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar importação" })).toBeInTheDocument();
    expect(screen.getByText(/A confirmação criará somente o estudo/)).toBeInTheDocument();
  });
});
