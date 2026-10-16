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

type Callbacks = { onSuccess?: (data: any) => void; onError?: () => void };
const fixture = vi.hoisted(() => ({
  parts: [] as unknown[],
  questions: [] as unknown[],
  updatePart: vi.fn(),
  updateStudy: vi.fn(),
  createStudy: vi.fn(),
  otherMutation: vi.fn(),
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
          useMutation: () => ({
            isPending: false,
            mutate: fixture.otherMutation,
          }),
        },
      },
    },
  };
});
const props = {
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
      ...(fixture.parts[1] as object),
      ...payload,
      id: payload.blockId,
    })
  );
}
beforeEach(() => {
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

describe("Fase 3 — Entenda e confirmação de salvamento, com API simulada", () => {
  it("carrega explicação e reflexão do bloco existente, com personalização secundária recolhida", async () => {
    await openEntenda();
    expect(
      (screen.getByLabelText("Nome da etapa") as HTMLInputElement).value
    ).toBe("Entenda — A graça");
    expect(document.querySelector("details")?.open).toBe(false);
    expect(
      (screen.getByLabelText(/Para refletir/) as HTMLTextAreaElement).value
    ).toBe("Como você explicaria a graça com suas palavras?");
    const explanation = screen.getByLabelText("Explicação para o aluno");
    expect(explanation.getAttribute("aria-describedby")).toBe(
      "foundation-editor-explanation-help"
    );
    expect(
      screen.getByText("Explique uma ideia central e dê um exemplo concreto.")
    ).toBeTruthy();
    expect(
      explanation.compareDocumentPosition(document.querySelector("details")!) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(fixture.updatePart).not.toHaveBeenCalled();
    expect(fixture.createStudy).not.toHaveBeenCalled();
  });

  it("Salvar rascunho envia conteúdo e reflexão ao mesmo bloco e permanece em Entenda após confirmação", async () => {
    await openEntenda();
    fireEvent.change(screen.getByLabelText("Explicação para o aluno"), {
      target: { value: "Uma ideia central.\nUm exemplo concreto." },
    });
    fireEvent.change(screen.getByLabelText(/Para refletir/), {
      target: { value: "Explique com suas palavras." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect(fixture.updatePart).toHaveBeenCalledTimes(1);
    expect(fixture.updatePart).toHaveBeenCalledWith({
      churchId: 101,
      studyId: 77,
      blockId: 82,
      title: "Entenda — A graça",
      content: "Uma ideia central.\nUm exemplo concreto.",
      reflectionPrompt: "Explique com suas palavras.",
      active: true,
    });
    confirmPart();
    expect(
      screen.getByRole("heading", { level: 2, name: "Entenda" })
    ).toBeTruthy();
    expect(fixture.updateStudy).not.toHaveBeenCalled();
    expect(screen.getByText("Rascunho", { exact: true })).toBeTruthy();
  });

  it("preserva explicação e reflexão não salvas ao visitar outra etapa e voltar", async () => {
    await openEntenda();
    fireEvent.change(screen.getByLabelText("Explicação para o aluno"), {
      target: { value: "Explicação local preservada" },
    });
    fireEvent.change(screen.getByLabelText(/Para refletir/), {
      target: { value: "Reflexão local preservada" },
    });
    go("Leia", "Leitura para o aluno");
    go("Entenda", "Explicação principal");
    expect(
      (screen.getByLabelText("Explicação para o aluno") as HTMLTextAreaElement)
        .value
    ).toBe("Explicação local preservada");
    expect(
      (screen.getByLabelText(/Para refletir/) as HTMLTextAreaElement).value
    ).toBe("Reflexão local preservada");
    expect(fixture.updatePart).not.toHaveBeenCalled();
  });

  it("ordena explicação, Para refletir e anotação pessoal na prévia e retorna sem salvar", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await openEntenda();
    fireEvent.click(
      screen.getByRole("button", { name: "Visualizar como aluno" })
    );
    const modal = within(screen.getAllByRole("dialog").at(-1)!);
    const explanation = modal.getByText("Explicação antiga de Entenda", {
      exact: true,
    });
    const reflection = modal.getByText(
      "Como você explicaria a graça com suas palavras?",
      { exact: true }
    );
    const note = modal.getByLabelText("Minha anotação em Entenda — A graça");
    expect(
      explanation.compareDocumentPosition(reflection) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      reflection.compareDocumentPosition(note) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    fireEvent.change(note, { target: { value: "Anotação somente na prévia" } });
    fireEvent.click(
      modal.getAllByRole("button", { name: "Voltar à edição" }).at(-1)!
    );
    expect(
      (screen.getByLabelText("Explicação para o aluno") as HTMLTextAreaElement)
        .value
    ).toBe("Explicação antiga de Entenda");
    expect(fixture.updatePart).not.toHaveBeenCalled();
    expect(fixture.updateStudy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("não inventa Para refletir quando vazio e mantém a anotação individual disponível", async () => {
    await openEntenda();
    fireEvent.change(screen.getByLabelText(/Para refletir/), {
      target: { value: "" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Visualizar como aluno" })
    );
    const modal = within(screen.getAllByRole("dialog").at(-1)!);
    expect(modal.queryByText("Para refletir", { exact: true })).toBeNull();
    expect(
      modal.getByLabelText("Minha anotação em Entenda — A graça")
    ).toBeTruthy();
    expect(fixture.updatePart).not.toHaveBeenCalled();
  });

  it("Salvar e continuar aguarda confirmação, bloqueia duplicidade e navegação e só então avança", async () => {
    await openEntenda();
    const save = screen.getByRole("button", { name: "Salvar e continuar" });
    fireEvent.click(save);
    fireEvent.click(save);
    go("Aplique", "Prática da semana");
    fireEvent.click(screen.getByRole("button", { name: "Fechar editor" }));
    expect(fixture.updatePart).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("heading", { level: 2, name: "Entenda" })
    ).toBeTruthy();
    expect(screen.getByText("Salvando no servidor…").getAttribute("role")).toBe(
      "status"
    );
    expect(
      (
        screen.getByLabelText("Explicação para o aluno") as HTMLTextAreaElement
      ).matches(":disabled")
    ).toBe(true);
    expect(fixture.success).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalled();
    confirmPart();
    expect(
      screen.getByRole("heading", { level: 2, name: "Responda" })
    ).toBeTruthy();
    expect(fixture.success).toHaveBeenCalledWith("Etapa salva.");
  });

  it("em falha mantém Entenda e o rascunho, permitindo tentar de novo sem publicar", async () => {
    await openEntenda();
    fireEvent.change(screen.getByLabelText("Explicação para o aluno"), {
      target: { value: "Texto preservado na falha" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }));
    act(() => fixture.partCallbacks.onError?.());
    expect(
      screen.getByRole("heading", { level: 2, name: "Entenda" })
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Explicação para o aluno") as HTMLTextAreaElement)
        .value
    ).toBe("Texto preservado na falha");
    expect(screen.getByRole("alert").textContent).toContain("Tente novamente");
    expect(fixture.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }));
    expect(fixture.updatePart).toHaveBeenCalledTimes(2);
    confirmPart();
    expect(
      screen.getByRole("heading", { level: 2, name: "Responda" })
    ).toBeTruthy();
    expect(fixture.updateStudy).not.toHaveBeenCalled();
  });

  it("uma reconsulta após salvar outra etapa não apaga o rascunho local de Entenda", async () => {
    const view = await openEntenda();
    fireEvent.change(screen.getByLabelText("Explicação para o aluno"), {
      target: { value: "Rascunho ainda não salvo" },
    });
    go("Leia", "Leitura para o aluno");
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    confirmPart();
    fixture.parts = fixture.parts.map(p => ({ ...(p as object) }));
    view.rerender(<FoundationStudyEditor {...props} />);
    go("Entenda", "Explicação principal");
    expect(
      (screen.getByLabelText("Explicação para o aluno") as HTMLTextAreaElement)
        .value
    ).toBe("Rascunho ainda não salvo");
  });

  it("Informações de estudo existente também aguarda a confirmação antes de ir para Leia", async () => {
    render(<FoundationStudyEditor {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Informações" })
    ).toBeTruthy();
    expect(fixture.updateStudy).toHaveBeenCalledTimes(1);
    act(() => fixture.studyCallbacks.onSuccess?.({ success: true }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Leia" })
    ).toBeTruthy();
  });

  it("cria um único rascunho e só vai para Leia depois de receber studyId", async () => {
    render(<FoundationStudyEditor {...props} study={null} />);
    fireEvent.change(screen.getByLabelText("Título do estudo"), {
      target: { value: "Novo estudo sintético" },
    });
    fireEvent.change(screen.getByLabelText("Início da semana"), {
      target: { value: "2026-10-16" },
    });
    const save = screen.getByRole("button", { name: "Salvar e continuar" });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(
      screen.getByRole("heading", { level: 2, name: "Informações" })
    ).toBeTruthy();
    expect(fixture.createStudy).toHaveBeenCalledTimes(1);
    act(() => fixture.createCallbacks.onSuccess?.({ studyId: 78 }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Leia" })
    ).toBeTruthy();
    expect(screen.getByText("Rascunho", { exact: true })).toBeTruthy();
  });

  it("Publicar estudo não declara sucesso em falha e atualiza o status somente depois da confirmação", async () => {
    render(<FoundationStudyEditor {...props} />);
    go("Revisar e publicar", "Conferência final");
    fireEvent.click(screen.getByRole("button", { name: "Publicar estudo" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar publicação" })
    );
    expect(fixture.updateStudy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 77, churchId: 101, active: true })
    );
    expect(fixture.success).not.toHaveBeenCalled();
    expect(screen.getByText("Rascunho", { exact: true })).toBeTruthy();
    act(() => fixture.studyCallbacks.onError?.());
    expect(screen.queryByText("Publicado", { exact: true })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Publicar estudo" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar publicação" })
    );
    act(() => fixture.studyCallbacks.onSuccess?.({ success: true }));
    expect(screen.getByText("Publicado", { exact: true })).toBeTruthy();
    expect(fixture.success).toHaveBeenCalledWith(
      "Estudo publicado para os alunos."
    );
  });

  it("não publica etapas locais ainda não salvas", async () => {
    await openEntenda();
    fireEvent.change(screen.getByLabelText("Explicação para o aluno"), {
      target: { value: "Alteração apenas local" },
    });
    go("Revisar e publicar", "Conferência final");
    fireEvent.click(screen.getByRole("button", { name: "Publicar estudo" }));
    expect(fixture.error).toHaveBeenCalledWith(
      "Salve as etapas alteradas antes de publicar."
    );
    expect(fixture.updateStudy).not.toHaveBeenCalled();
  });
});
