// @vitest-environment jsdom
import { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudyQuestionEditor } from "./StudyQuestionEditor";
const fixture = vi.hoisted(() => ({
  mutate: vi.fn(),
  invalidate: vi.fn(),
  callbacks: {} as {
    onSuccess?: (data: { id: number | null }) => void;
    onError?: () => void;
  },
  created: vi.fn(),
  busy: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      escolaFundamentos: {
        manageStudyQuestions: { invalidate: fixture.invalidate },
      },
    }),
    escolaFundamentos: {
      createStudyQuestion: {
        useMutation: (callbacks: typeof fixture.callbacks) => {
          fixture.callbacks = callbacks;
          return { mutate: fixture.mutate, isPending: false };
        },
      },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: fixture.toast } }));
const part = {
  id: 93,
  title: "Responda",
  content: "Orientação",
  position: 2,
  active: true,
};
function Harness({ inline = true }: { inline?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <StudyQuestionEditor
      inline={inline}
      open={open}
      churchId={42}
      studyId={77}
      part={part}
      onOpenChange={setOpen}
      onCreated={fixture.created}
      onBusyChange={fixture.busy}
      primaryColor="#7046aa"
    />
  );
}
function fill() {
  fireEvent.change(screen.getByLabelText("Pergunta", { exact: true }), {
    target: { value: "Qual atitude encoraja?" },
  });
  fireEvent.change(screen.getByLabelText("Alternativa A"), {
    target: { value: "Ouvir com atenção" },
  });
  fireEvent.change(screen.getByLabelText("Alternativa B"), {
    target: { value: "Ignorar" },
  });
  fireEvent.change(screen.getByLabelText("Explicação depois da resposta"), {
    target: { value: "Ouvir demonstra cuidado. Retome o exemplo da leitura." },
  });
}
beforeEach(() => {
  fixture.invalidate.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("Fase 4 — formulário contextual de perguntas, com API simulada", () => {
  it("não empilha modal na etapa Responda e usa a cor recebida da igreja", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Salvar pergunta" }).style
        .backgroundColor
    ).toBe("rgb(112, 70, 170)");
    expect(fixture.mutate).not.toHaveBeenCalled();
  });
  it("mantém a abertura em modal para o editor tradicional", () => {
    render(<Harness inline={false} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
  it("cria de duas a seis alternativas, mas bloqueia a sétima", () => {
    render(<Harness />);
    for (let i = 0; i < 4; i++)
      fireEvent.click(
        screen.getByRole("button", { name: "Adicionar alternativa" })
      );
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect(
      (
        screen.getByRole("button", {
          name: "Adicionar alternativa",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(fixture.mutate).not.toHaveBeenCalled();
  });
  it("mantém IDs das alternativas restantes e exige gabarito ao remover a alternativa correta", () => {
    render(<Harness />);
    fill();
    fireEvent.click(
      screen.getByRole("button", { name: "Adicionar alternativa" })
    );
    fireEvent.change(screen.getByLabelText("Alternativa C"), {
      target: { value: "Criticar sem ouvir" },
    });
    fireEvent.click(
      screen.getByRole("radio", { name: "Resposta correta: alternativa C" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Remover alternativa C" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Salvar pergunta" }));
    expect(screen.getByRole("alert").textContent).toContain(
      "Marque a resposta correta"
    );
    expect(fixture.mutate).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("radio", { name: "Resposta correta: alternativa B" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Salvar pergunta" }));
    expect(
      fixture.mutate.mock.calls[0][0].options.map((o: { id: string }) => o.id)
    ).toEqual(["a", "b"]);
    expect(fixture.mutate.mock.calls[0][0].correctOptionId).toBe("b");
  });
  it("envia o mesmo contrato tenant-aware uma única vez e aguarda confirmação", () => {
    render(<Harness />);
    fill();
    const button = screen.getByRole("button", { name: "Salvar pergunta" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(fixture.mutate).toHaveBeenCalledTimes(1);
    expect(fixture.mutate).toHaveBeenCalledWith({
      churchId: 42,
      studyId: 77,
      blockId: 93,
      prompt: "Qual atitude encoraja?",
      options: [
        { id: "a", label: "Ouvir com atenção" },
        { id: "b", label: "Ignorar" },
      ],
      correctOptionId: "a",
      explanation: "Ouvir demonstra cuidado. Retome o exemplo da leitura.",
    });
    expect(fixture.created).not.toHaveBeenCalled();
    expect(fixture.toast).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain(
      "Salvando pergunta"
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByLabelText("Pergunta", { exact: true })).toBeTruthy();
    act(() => fixture.callbacks.onSuccess?.({ id: 301 }));
    expect(fixture.created).toHaveBeenCalledWith(
      expect.objectContaining({
        block: { id: 93 },
        question: expect.objectContaining({ id: 301, correctOptionId: "a" }),
      })
    );
    expect(screen.queryByLabelText("Pergunta", { exact: true })).toBeNull();
  });
  it("falha mantém campos e permite nova tentativa explícita sem repetição automática", () => {
    render(<Harness />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Salvar pergunta" }));
    act(() => fixture.callbacks.onError?.());
    expect(
      (
        screen.getByLabelText("Pergunta", {
          exact: true,
        }) as HTMLTextAreaElement
      ).value
    ).toBe("Qual atitude encoraja?");
    expect(screen.getByRole("alert").textContent).toContain(
      "campos continuam preenchidos"
    );
    expect(fixture.mutate).toHaveBeenCalledTimes(1);
    expect(fixture.created).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Salvar pergunta" }));
    expect(fixture.mutate).toHaveBeenCalledTimes(2);
  });
  it("não declara sucesso quando o servidor não devolve identificador válido", () => {
    render(<Harness />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Salvar pergunta" }));
    act(() => fixture.callbacks.onSuccess?.({ id: null }));
    expect(screen.getByRole("alert").textContent).toContain(
      "não confirmou o identificador"
    );
    expect(fixture.created).not.toHaveBeenCalled();
    expect(fixture.toast).not.toHaveBeenCalled();
    expect(
      (
        screen.getByLabelText("Pergunta", {
          exact: true,
        }) as HTMLTextAreaElement
      ).value
    ).toBe("Qual atitude encoraja?");
  });
  it("uma falha de cache após sucesso não reabre nem duplica o cadastro", async () => {
    fixture.invalidate.mockRejectedValue(new Error("cache indisponível"));
    render(<Harness />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Salvar pergunta" }));
    await act(async () => {
      fixture.callbacks.onSuccess?.({ id: 302 });
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    await waitFor(() => expect(fixture.invalidate).toHaveBeenCalled());
    expect(fixture.mutate).toHaveBeenCalledTimes(1);
    expect(fixture.created).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Pergunta", { exact: true })).toBeNull();
  });
});
