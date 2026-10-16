// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FoundationStudyEditor } from "./FoundationStudyEditor";
import {
  createMemoryFoundationCreationStorage,
  setFoundationCreationStorageAdapter,
} from "./foundationCreationOutbox";

type Callbacks = {
  onSuccess?: (data: any) => void;
  onError?: (error?: unknown) => void;
};
const fixture = vi.hoisted(() => ({
  parts: [] as unknown[],
  questions: [] as unknown[],
  updatePart: vi.fn(),
  updateStudy: vi.fn(),
  createStudy: vi.fn(),
  otherMutation: vi.fn(),
  questionCallbacks: {} as Callbacks,
  partCallbacks: {} as Callbacks,
  studyCallbacks: {} as Callbacks,
  createCallbacks: {} as Callbacks,
  invalidate: vi.fn().mockResolvedValue(undefined),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { success: fixture.success, error: fixture.error },
}));
vi.mock("@/lib/trpc", () => {
  const invalidate = { invalidate: fixture.invalidate };
  const mutation = (name: "part" | "study" | "create") => ({
    useMutation: (options: Callbacks) => {
      if (name === "part") fixture.partCallbacks = options;
      if (name === "study") fixture.studyCallbacks = options;
      if (name === "create") fixture.createCallbacks = options;
      return {
        isPending: false,
        mutate:
          name === "part"
            ? fixture.updatePart
            : name === "study"
              ? fixture.updateStudy
              : fixture.createStudy,
      };
    },
  });
  return {
    trpc: {
      useUtils: () => ({
        escolaFundamentos: {
          listStudies: invalidate,
          listModules: invalidate,
          listQuestionBlocks: invalidate,
          manageStudyQuestions: invalidate,
        },
      }),
      escolaFundamentos: {
        listQuestionBlocks: {
          useQuery: () => ({ data: fixture.parts, isLoading: false }),
        },
        manageStudyQuestions: {
          useQuery: () => ({ data: fixture.questions, isLoading: false }),
        },
        updateQuestionBlock: mutation("part"),
        updateStudy: mutation("study"),
        createStudy: mutation("create"),
        createStudyQuestion: {
          useMutation: (options: Callbacks) => {
            fixture.questionCallbacks = options;
            return { isPending: false, mutate: fixture.otherMutation };
          },
        },
      },
    },
  };
});
const props = {
  creationAccountId: 42,
  open: true,
  study: {
    id: 77,
    courseId: 11,
    moduleId: null,
    title: "Estudo sintético de Entenda",
    weekStart: "2026-10-16",
    content: "Introdução preservada",
    active: false,
  },
  churchId: 101,
  courses: [{ id: 11, name: "Turma sintética de validação" }],
  modules: [],
  primaryColor: "#1e3a5f",
  secondaryColor: "#c9a84c",
  onOpenChange: vi.fn(),
  onSaved: vi.fn(),
};
function go(label: string, description: string) {
  const button = screen
    .getAllByRole("button")
    .find(
      b =>
        b.textContent?.includes(label) && b.textContent?.includes(description)
    );
  if (!button) throw Error("Etapa ausente na fixture");
  fireEvent.click(button);
}
async function openEntenda() {
  const view = render(<FoundationStudyEditor {...props} />);
  go("Entenda", "Explicação principal");
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Explicação para o aluno") as HTMLTextAreaElement)
        .value
    ).toBe("Explicação antiga de Entenda")
  );
  return view;
}
function confirmPart() {
  const payload = fixture.updatePart.mock.calls.at(-1)![0];
  act(() =>
    fixture.partCallbacks.onSuccess?.({
      ...(fixture.parts.find((p: any) => p.id === payload.blockId) as object),
      ...payload,
      id: payload.blockId,
    })
  );
}
beforeEach(() => {
  setFoundationCreationStorageAdapter(createMemoryFoundationCreationStorage());
  fixture.parts = ["Leia", "Entenda — A graça", "Responda", "Aplique"].map(
    (title, position) => ({
      id: 81 + position,
      studyId: 77,
      churchId: 101,
      title,
      content:
        position === 1 ? "Explicação antiga de Entenda" : "Conteúdo " + title,
      reflectionPrompt:
        position === 1
          ? "Como você explicaria a graça com suas palavras?"
          : null,
      position,
      active: true,
    })
  );
  fixture.questions = [];
  fixture.invalidate.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const existingQuestion = {
  block: { id: 83 },
  question: {
    id: 201,
    prompt: "Pergunta antiga preservada",
    options: [
      { id: "id-livre-1", label: "Alternativa histórica correta" },
      { id: "id-livre-2", label: "Alternativa histórica incorreta" },
      { id: "id-livre-3", label: "Terceira histórica" },
    ],
    correctOptionId: "id-livre-1",
    explanation: "Explicação antiga protegida na prévia",
  },
};
function openStage(label: string, description: string) {
  const view = render(<FoundationStudyEditor {...props} />);
  go(label, description);
  return view;
}
function fillNewQuestion() {
  fireEvent.change(screen.getByLabelText("Pergunta", { exact: true }), {
    target: { value: "Como praticar o cuidado?" },
  });
  fireEvent.change(screen.getByLabelText("Alternativa A"), {
    target: { value: "Ouvir a pessoa" },
  });
  fireEvent.change(screen.getByLabelText("Alternativa B"), {
    target: { value: "Ignorar a pessoa" },
  });
  fireEvent.change(screen.getByLabelText("Explicação depois da resposta"), {
    target: {
      value: "Ouvir ajuda a compreender a necessidade. Retome o exemplo.",
    },
  });
}
describe("Fase 4 — Responda, Aplique e revisão, com API simulada", () => {
  it("preserva as perguntas e IDs antigos e ordena orientação, perguntas e Para refletir", () => {
    fixture.questions = [existingQuestion];
    openStage("Responda", "Perguntas e gabarito");
    const main = within(screen.getByRole("main"));
    const orientation = main.getByLabelText("Orientação antes das perguntas");
    const question = main.getByText("Pergunta antiga preservada", {
      exact: true,
    });
    const reflection = main.getByLabelText(/Para refletir/);
    expect(
      orientation.compareDocumentPosition(question) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      question.compareDocumentPosition(reflection) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(main.getByText("C. Terceira histórica")).toBeTruthy();
    expect(fixture.questions[0]).toEqual(existingQuestion);
    expect(fixture.otherMutation).not.toHaveBeenCalled();
    expect(fixture.updatePart).not.toHaveBeenCalled();
  });
  it("abre a pergunta dentro da etapa, bloqueia continuar e conserva seus campos ao retornar da prévia", () => {
    openStage("Responda", "Perguntas e gabarito");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar pergunta" }));
    fillNewQuestion();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(
      (
        screen.getByRole("button", {
          name: "Salvar e continuar",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    go("Aplique", "Prática da semana");
    expect(
      screen.getByRole("heading", { level: 2, name: "Responda" })
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Visualizar como aluno" })
    );
    const modal = within(screen.getAllByRole("dialog").at(-1)!);
    expect(
      modal.queryByText("Como praticar o cuidado?", { exact: true })
    ).toBeNull();
    fireEvent.click(
      modal.getAllByRole("button", { name: "Voltar à edição" }).at(-1)!
    );
    expect(
      (
        screen.getByLabelText("Pergunta", {
          exact: true,
        }) as HTMLTextAreaElement
      ).value
    ).toBe("Como praticar o cuidado?");
    expect(fixture.otherMutation).not.toHaveBeenCalled();
  });
  it("inclui a pergunta confirmada na lista e prévia sem depender de uma reconsulta e sem duplicá-la", async () => {
    const view = openStage("Responda", "Perguntas e gabarito");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar pergunta" }));
    fillNewQuestion();
    fireEvent.click(screen.getByRole("button", { name: "Salvar pergunta" }));
    await waitFor(() => expect(fixture.otherMutation).toHaveBeenCalledTimes(1));
    await act(async () => {
      fixture.questionCallbacks.onSuccess?.({ id: 202, replayed: false });
    });
    expect(
      within(screen.getByRole("main")).getByText("Como praticar o cuidado?", {
        exact: true,
      })
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Salvar e continuar",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
    const payload = fixture.otherMutation.mock.calls[0][0];
    fixture.questions = [
      { block: { id: 83 }, question: { ...payload, id: 202 } },
    ];
    view.rerender(<FoundationStudyEditor {...props} />);
    expect(
      within(screen.getByRole("main")).getAllByText(
        "Como praticar o cuidado?",
        { exact: true }
      )
    ).toHaveLength(1);
    fireEvent.click(
      screen.getByRole("button", { name: "Visualizar como aluno" })
    );
    const modal = within(screen.getAllByRole("dialog").at(-1)!);
    expect(
      modal.getByText("Como praticar o cuidado?", { exact: true })
    ).toBeTruthy();
    expect(modal.queryByText(payload.explanation, { exact: true })).toBeNull();
    fireEvent.click(modal.getByRole("button", { name: "Ignorar a pessoa" }));
    fireEvent.click(modal.getByRole("button", { name: "Conferir resposta" }));
    expect(modal.getByText("Vamos revisar", { exact: true })).toBeTruthy();
    expect(modal.getByText(payload.explanation, { exact: true })).toBeTruthy();
    expect(fixture.updatePart).not.toHaveBeenCalled();
    expect(fixture.updateStudy).not.toHaveBeenCalled();
  });
  it("Aplique destaca uma ação prática e mantém a reflexão opcional, no mesmo bloco", () => {
    openStage("Aplique", "Prática da semana");
    expect(
      screen.getByText("Proponha uma ação simples para praticar nesta semana.")
    ).toBeTruthy();
    expect(document.querySelector("details")?.open).toBe(false);
    fireEvent.change(screen.getByLabelText("Aplicação prática"), {
      target: { value: "Nesta semana, ofereça ajuda concreta a uma pessoa." },
    });
    fireEvent.change(screen.getByLabelText(/Para refletir/), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect(fixture.updatePart).toHaveBeenCalledWith(
      expect.objectContaining({
        churchId: 101,
        studyId: 77,
        blockId: 84,
        content: "Nesta semana, ofereça ajuda concreta a uma pessoa.",
        reflectionPrompt: null,
      })
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Aplique" })
    ).toBeTruthy();
    confirmPart();
    expect(
      screen.getByRole("heading", { level: 2, name: "Aplique" })
    ).toBeTruthy();
    expect(fixture.updateStudy).not.toHaveBeenCalled();
  });
  it("Salvar e continuar em Aplique aguarda confirmação antes da revisão e não publica", () => {
    openStage("Aplique", "Prática da semana");
    fireEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Aplique" })
    ).toBeTruthy();
    confirmPart();
    expect(
      screen.getByRole("heading", { level: 2, name: "Revisar e publicar" })
    ).toBeTruthy();
    expect(fixture.updateStudy).not.toHaveBeenCalled();
    expect(screen.getByText("Rascunho", { exact: true })).toBeTruthy();
  });
  it("falha de Aplique classifica o erro, preserva conteúdo/reflexão e impede publicação", () => {
    openStage("Aplique", "Prática da semana");
    fireEvent.change(screen.getByLabelText("Aplicação prática"), {
      target: { value: "Prática preservada após erro" },
    });
    fireEvent.change(screen.getByLabelText(/Para refletir/), {
      target: { value: "Reflexão preservada após erro" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }));
    act(() =>
      fixture.partCallbacks.onError?.({
        data: { code: "FORBIDDEN" },
        message: "detalhe interno não exibido",
      })
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Aplique" })
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Aplicação prática") as HTMLTextAreaElement).value
    ).toBe("Prática preservada após erro");
    expect(
      (screen.getByLabelText(/Para refletir/) as HTMLTextAreaElement).value
    ).toBe("Reflexão preservada após erro");
    expect(screen.getByRole("alert").textContent).toContain(
      "não tem permissão"
    );
    expect(screen.getByRole("alert").textContent).not.toContain(
      "detalhe interno"
    );
    expect(fixture.success).not.toHaveBeenCalled();
    go("Revisar e publicar", "Conferência final");
    fireEvent.click(screen.getByRole("button", { name: "Publicar estudo" }));
    expect(fixture.updateStudy).not.toHaveBeenCalled();
  });
  it("não avança nem limpa o rascunho se a resposta retorna conteúdo antigo ou outro bloco", () => {
    openStage("Aplique", "Prática da semana");
    fireEvent.change(screen.getByLabelText("Aplicação prática"), {
      target: { value: "Texto novo aguardando confirmação" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }));
    act(() => fixture.partCallbacks.onSuccess?.(fixture.parts[3]));
    expect(
      screen.getByRole("heading", { level: 2, name: "Aplique" })
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Aplicação prática") as HTMLTextAreaElement).value
    ).toBe("Texto novo aguardando confirmação");
    expect(screen.getByRole("alert").textContent).toContain(
      "não confirmou o conteúdo"
    );
    expect(fixture.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }));
    const request = fixture.updatePart.mock.calls.at(-1)![0];
    act(() =>
      fixture.partCallbacks.onSuccess?.({
        ...(fixture.parts[3] as object),
        ...request,
        id: 999,
      })
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Aplique" })
    ).toBeTruthy();
    expect(fixture.success).not.toHaveBeenCalled();
  });
  it("não envia conteúdo vazio ao servidor e permite corrigir sem perder a reflexão", () => {
    openStage("Aplique", "Prática da semana");
    fireEvent.change(screen.getByLabelText("Aplicação prática"), {
      target: { value: "  " },
    });
    fireEvent.change(screen.getByLabelText(/Para refletir/), {
      target: { value: "Reflexão local" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }));
    expect(fixture.updatePart).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(
      "Preencha o conteúdo"
    );
    expect(
      (screen.getByLabelText(/Para refletir/) as HTMLTextAreaElement).value
    ).toBe("Reflexão local");
    fireEvent.change(screen.getByLabelText("Aplicação prática"), {
      target: { value: "Ação válida" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }));
    confirmPart();
    expect(
      screen.getByRole("heading", { level: 2, name: "Revisar e publicar" })
    ).toBeTruthy();
    expect(fixture.updatePart).toHaveBeenCalledTimes(1);
    expect(fixture.updateStudy).not.toHaveBeenCalled();
  });
  it("revisão sinaliza alterações não salvas e bloqueia publicação sem apagar o rascunho", () => {
    openStage("Aplique", "Prática da semana");
    fireEvent.change(screen.getByLabelText("Aplicação prática"), {
      target: { value: "Prática local não salva" },
    });
    go("Revisar e publicar", "Conferência final");
    expect(screen.getByText("Alterações não salvas")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Publicar estudo" }));
    expect(fixture.updateStudy).not.toHaveBeenCalled();
    go("Aplique", "Prática da semana");
    expect(
      (screen.getByLabelText("Aplicação prática") as HTMLTextAreaElement).value
    ).toBe("Prática local não salva");
  });
  it("prévia de Aplique mantém aplicação, Para refletir e anotação nessa ordem, sem gravar", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    openStage("Aplique", "Prática da semana");
    fireEvent.change(screen.getByLabelText("Aplicação prática"), {
      target: { value: "Ação prática sintética" },
    });
    fireEvent.change(screen.getByLabelText(/Para refletir/), {
      target: { value: "Como praticar nesta semana?" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Visualizar como aluno" })
    );
    const modal = within(screen.getAllByRole("dialog").at(-1)!);
    const practice = modal.getByText("Ação prática sintética", { exact: true });
    const reflection = modal.getByText("Como praticar nesta semana?", {
      exact: true,
    });
    const note = modal.getByLabelText("Minha anotação em Aplique");
    expect(
      practice.compareDocumentPosition(reflection) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      reflection.compareDocumentPosition(note) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    fireEvent.change(note, { target: { value: "Nota apenas local" } });
    fireEvent.click(
      modal.getAllByRole("button", { name: "Voltar à edição" }).at(-1)!
    );
    expect(
      (screen.getByLabelText("Aplicação prática") as HTMLTextAreaElement).value
    ).toBe("Ação prática sintética");
    expect(fixture.updatePart).not.toHaveBeenCalled();
    expect(fixture.updateStudy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
