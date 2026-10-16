// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FoundationStudyEditor } from "./FoundationStudyEditor";
const fixture = vi.hoisted(() => ({
  parts: undefined as unknown,
  questions: [] as unknown[],
  mutate: vi.fn(),
}));
vi.mock("@/lib/trpc", () => {
  const mutation = {
    useMutation: () => ({ isPending: false, mutate: fixture.mutate }),
  };
  const invalidate = { invalidate: vi.fn().mockResolvedValue(undefined) };
  return {
    trpc: {
      useUtils: () => ({
        escolaFundamentos: {
          listStudies: invalidate,
          listModules: invalidate,
          listQuestionBlocks: invalidate,
        },
      }),
      escolaFundamentos: {
        listQuestionBlocks: {
          useQuery: () => ({ data: fixture.parts, isLoading: false }),
        },
        manageStudyQuestions: {
          useQuery: () => ({ data: fixture.questions, isLoading: false }),
        },
        createStudy: mutation,
        updateStudy: mutation,
        updateQuestionBlock: mutation,
        createStudyQuestion: mutation,
      },
    },
  };
});
const props = {
  open: true,
  study: {
    id: 7,
    courseId: 1,
    moduleId: null,
    title: "Estudo sintético",
    weekStart: "2026-10-16",
    content: "Introdução",
    active: false,
  },
  churchId: 1,
  courses: [{ id: 1, name: "Turma sintética" }],
  modules: [],
  primaryColor: "#1e3a5f",
  secondaryColor: "#c9a84c",
  onOpenChange: vi.fn(),
  onSaved: vi.fn(),
};
afterEach(() => {
  cleanup();
  fixture.parts = undefined;
  fixture.questions = [];
  fixture.mutate.mockClear();
});
function go(label: string, description: string) {
  const button = screen
    .getAllByRole("button")
    .find(
      b =>
        b.textContent?.includes(label) && b.textContent?.includes(description)
    );
  if (!button) throw Error("Etapa ausente");
  fireEvent.click(button);
}
describe("runtime do editor de estudo", () => {
  it("abre sem loop mesmo antes de chegar a consulta de partes", async () => {
    render(<FoundationStudyEditor {...props} />);
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Título do estudo") as HTMLInputElement).value
      ).toBe("Estudo sintético")
    );
    expect(fixture.mutate).not.toHaveBeenCalled();
  });
  it("preserva o texto editado ao trocar entre Leia e Entenda sem salvar", async () => {
    fixture.parts = ["Leia", "Entenda", "Responda", "Aplique"].map(
      (title, position) => ({
        id: position + 1,
        studyId: 7,
        churchId: 1,
        title,
        content: "Original " + title,
        position,
        active: true,
      })
    );
    render(<FoundationStudyEditor {...props} />);
    go("Leia", "Leitura para o aluno");
    await waitFor(() =>
      expect(screen.getByLabelText("Leitura do aluno")).toBeTruthy()
    );
    fireEvent.change(screen.getByLabelText("Leitura do aluno"), {
      target: { value: "Rascunho local Leia" },
    });
    go("Entenda", "Explicação principal");
    go("Leia", "Leitura para o aluno");
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Leitura do aluno") as HTMLTextAreaElement).value
      ).toBe("Rascunho local Leia")
    );
    expect(fixture.mutate).not.toHaveBeenCalled();
  });
  it("prioriza a leitura e preserva o nome personalizado e o mesmo bloco ao salvar", async () => {
    fixture.parts = [
      {
        id: 41,
        studyId: 7,
        churchId: 1,
        title: "Leia — O poder das palavras",
        content: "Texto antigo",
        reflectionPrompt: "Reflexão antiga",
        position: 0,
        active: true,
      },
    ];
    render(<FoundationStudyEditor {...props} />);
    go("Leia", "Leitura para o aluno");
    await waitFor(() =>
      expect(screen.getByLabelText("Leitura do aluno")).toBeTruthy()
    );
    expect(document.querySelector("details")?.open).toBe(false);
    expect(
      (screen.getByLabelText("Nome da etapa") as HTMLInputElement).value
    ).toBe("Leia — O poder das palavras");
    expect(
      screen.getByLabelText("Leitura do aluno").getAttribute("aria-describedby")
    ).toBe("foundation-editor-reading-help");
    fireEvent.change(screen.getByLabelText("Leitura do aluno"), {
      target: { value: "Leitura organizada" },
    });
    fireEvent.change(screen.getByLabelText(/Para refletir/), {
      target: { value: "O que chamou sua atenção?" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Salvar rascunho" })
    );
    expect(fixture.mutate).toHaveBeenCalledTimes(1);
    expect(fixture.mutate).toHaveBeenCalledWith({
      churchId: 1,
      studyId: 7,
      blockId: 41,
      title: "Leia — O poder das palavras",
      content: "Leitura organizada",
      reflectionPrompt: "O que chamou sua atenção?",
      active: true,
    });
  });
  it("volta da prévia para as informações sem perder a introdução não salva", async () => {
    render(<FoundationStudyEditor {...props} />);
    fireEvent.change(screen.getByLabelText("Introdução do estudo"), {
      target: { value: "Introdução local não salva" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Visualizar como aluno" })
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Voltar à edição" }).at(-1)!
    );
    expect(
      (screen.getByLabelText("Introdução do estudo") as HTMLTextAreaElement)
        .value
    ).toBe("Introdução local não salva");
    expect(fixture.mutate).not.toHaveBeenCalled();
  });
});
