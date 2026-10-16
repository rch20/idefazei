// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentLearningExperience } from "./StudentLearningExperience";
import { createFoundationTheme } from "./FoundationTheme";

const fixture = vi.hoisted(() => ({
  path: {} as any,
  session: {} as any,
  calls: {} as Record<string, ReturnType<typeof vi.fn>>,
  queries: {} as Record<string, ReturnType<typeof vi.fn>>,
  callbacks: {} as Record<string, any>,
  invalidate: vi.fn().mockResolvedValue(undefined),
  setData: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  rejectNote: false,
}));
vi.mock("sonner", () => ({
  toast: { error: fixture.error, success: fixture.success },
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      escolaFundamentos: new Proxy(
        {},
        {
          get: () => ({
            invalidate: fixture.invalidate,
            setData: fixture.setData,
          }),
        }
      ),
    }),
    escolaFundamentos: new Proxy(
      {},
      {
        get: (_, name: string) => ({
          useQuery: (input: any, options: any) => {
            fixture.queries[name] ??= vi.fn();
            fixture.queries[name](input, options);
            const data =
              name === "studentPath" || name === "learningPath"
                ? fixture.path
                : name === "studySession" && options.enabled
                  ? fixture.session
                  : name === "studentHistory"
                    ? { items: [] }
                    : name === "listStudyMaterials"
                      ? []
                      : null;
            return { data, isLoading: false, refetch: fixture.invalidate };
          },
          useMutation: (callbacks: any) => {
            fixture.callbacks[name] = callbacks;
            fixture.calls[name] ??= vi.fn();
            return {
              isPending: false,
              mutate: (input: any) => fixture.calls[name](input),
              mutateAsync: async (input: any) => {
                fixture.calls[name](input);
                if (fixture.rejectNote && name === "saveBlockReflection")
                  throw new Error("Falha sintética");
                callbacks?.onSuccess?.({}, input);
                return {};
              },
            };
          },
        }),
      }
    ),
  },
}));

const props = { churchId: 101, theme: createFoundationTheme() };
function openStudy() {
  const view = render(<StudentLearningExperience {...props} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Começar estudo" })[0]);
  return view;
}
beforeEach(() => {
  fixture.calls = {};
  fixture.queries = {};
  fixture.callbacks = {};
  fixture.rejectNote = false;
  fixture.invalidate.mockResolvedValue(undefined);
  fixture.path = {
    course: { id: 11, name: "Turma sintética" },
    enrollment: { id: 22 },
    items: [
      {
        study: {
          id: 77,
          courseId: 11,
          title: "Estudo QA",
          active: true,
          content: "Introdução",
        },
        enrollmentId: 22,
        progress: null,
        available: true,
      },
    ],
  };
  fixture.session = {
    enrollmentId: 22,
    study: { id: 77, title: "Estudo QA", content: "Introdução" },
    progress: { status: "em_andamento", lastBlockPosition: 0 },
    resume: { blockId: 84, position: 0, label: "Leia" },
    blocks: [
      {
        id: 84,
        title: "Leia",
        content: "Conteúdo QA",
        position: 0,
        status: "atual",
        reflection: "Nota do servidor",
        questions: [],
      },
    ],
  };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("identidade de matrícula do aluno — API simulada", () => {
  it("registra a tentativa de resposta na matrícula da sessão", async () => {
    fixture.session.blocks[0].questions = [
      {
        id: 201,
        blockId: 84,
        prompt: "Pergunta QA",
        position: 0,
        options: [{ id: "a", label: "Alternativa sintética" }],
        isCorrect: false,
      },
    ];
    openStudy();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Alternativa sintética",
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Registrar resposta" }));
    expect(fixture.calls.answerQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        churchId: 101,
        courseId: 11,
        enrollmentId: 22,
        studyId: 77,
        questionId: 201,
        selectedOptionId: "a",
      })
    );
  });
  it("mantém a anotação legada de estudo sem blocos na matrícula correspondente", async () => {
    fixture.session.blocks = [];
    fixture.session.progress.reflection = "Anotação geral antiga";
    openStudy();
    const field = await screen.findByRole("textbox");
    fireEvent.change(field, { target: { value: "Anotação geral atualizada" } });
    fireEvent.click(screen.getByRole("button", { name: "Sair do estudo" }));
    await waitFor(() =>
      expect(fixture.calls.saveReflection).toHaveBeenCalledWith({
        churchId: 101,
        courseId: 11,
        enrollmentId: 22,
        studyId: 77,
        reflection: "Anotação geral atualizada",
      })
    );
    expect(fixture.calls.saveBlockReflection).not.toHaveBeenCalled();
  });
  it("consulta sessão e registra início/leitura usando o ID do cartão", async () => {
    openStudy();
    await screen.findByLabelText("Minha anotação em Leia");
    expect(fixture.calls.startLesson).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentId: 22, studyId: 77, courseId: 11 })
    );
    expect(fixture.calls.viewStudyBlock).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentId: 22, blockId: 84 })
    );
    expect(fixture.queries.studySession).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentId: 22, studyId: 77 }),
      expect.objectContaining({ enabled: true })
    );
  });
  it("salva anotação e atualiza somente o cache da matrícula correspondente antes de sair", async () => {
    openStudy();
    fireEvent.change(await screen.findByLabelText("Minha anotação em Leia"), {
      target: { value: "Nota nova sintética" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sair do estudo" }));
    await waitFor(() =>
      expect(fixture.calls.saveBlockReflection).toHaveBeenCalledWith({
        churchId: 101,
        courseId: 11,
        enrollmentId: 22,
        studyId: 77,
        blockId: 84,
        reflection: "Nota nova sintética",
      })
    );
    expect(fixture.setData).toHaveBeenCalledWith(
      { churchId: 101, courseId: 11, enrollmentId: 22, studyId: 77 },
      expect.any(Function)
    );
    await waitFor(() =>
      expect(screen.queryByLabelText("Minha anotação em Leia")).toBeNull()
    );
  });
  it("não troca matrícula/turma da sessão se o cartão atualizar durante uma edição", async () => {
    const view = openStudy();
    const field = await screen.findByLabelText("Minha anotação em Leia");
    fireEvent.change(field, { target: { value: "Rascunho matrícula 22" } });
    fixture.path = {
      ...fixture.path,
      course: { id: 12, name: "Nova turma" },
      enrollment: { id: 33 },
    };
    view.rerender(<StudentLearningExperience {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Sair do estudo" }));
    await waitFor(() =>
      expect(fixture.calls.saveBlockReflection).toHaveBeenCalledWith(
        expect.objectContaining({
          enrollmentId: 22,
          courseId: 11,
          reflection: "Rascunho matrícula 22",
        })
      )
    );
    expect(fixture.queries.studySession).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentId: 22, courseId: 11 }),
      expect.objectContaining({ enabled: true })
    );
  });
  it("preserva a anotação e permanece no estudo quando a gravação falha", async () => {
    fixture.rejectNote = true;
    openStudy();
    fireEvent.change(await screen.findByLabelText("Minha anotação em Leia"), {
      target: { value: "Nota pendente mantida" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sair do estudo" }));
    await waitFor(() =>
      expect(fixture.calls.saveBlockReflection).toHaveBeenCalledTimes(1)
    );
    expect(
      (screen.getByLabelText("Minha anotação em Leia") as HTMLTextAreaElement)
        .value
    ).toBe("Nota pendente mantida");
    expect(fixture.setData).not.toHaveBeenCalled();
  });
  it("conclui etapa e preparação na matrícula fixada", async () => {
    openStudy();
    await screen.findByLabelText("Minha anotação em Leia");
    fireEvent.click(screen.getByRole("button", { name: "Concluir etapa" }));
    await waitFor(() =>
      expect(fixture.calls.completeStudyBlock).toHaveBeenCalledWith(
        expect.objectContaining({ enrollmentId: 22, blockId: 84 })
      )
    );
    act(() =>
      fixture.callbacks.completeStudyBlock.onSuccess({
        completedBlockId: 84,
        nextBlock: null,
      })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Concluir preparação" })
    );
    await waitFor(() =>
      expect(fixture.calls.completeLesson).toHaveBeenCalledWith(
        expect.objectContaining({ enrollmentId: 22, studyId: 77 })
      )
    );
  });
});
