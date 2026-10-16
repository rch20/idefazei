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
import {
  createMemoryFoundationCreationStorage,
  setFoundationCreationStorageAdapter,
} from "./foundationCreationOutbox";
const fixture = vi.hoisted(() => ({
  mutate: vi.fn(),
  invalidate: vi.fn(),
  status: vi.fn(),
  fetch: vi.fn(),
  callbacks: {} as {
    onSuccess?: (data: any) => void;
    onError?: (error?: unknown) => void;
  },
  created: vi.fn(),
  busy: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@/hooks/useChurchAuth", () => ({
  useChurchAuth: () => ({ user: null }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      escolaFundamentos: {
        manageStudyQuestions: {
          invalidate: fixture.invalidate,
          fetch: fixture.fetch,
        },
        getCreationStatus: { fetch: fixture.status },
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
function Harness({
  inline = true,
  accountId = 42,
}: {
  inline?: boolean;
  accountId?: number;
}) {
  const [open, setOpen] = useState(true);
  return (
    <StudyQuestionEditor
      inline={inline}
      open={open}
      creationAccountId={accountId}
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
async function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Salvar pergunta" }));
  await waitFor(() => expect(fixture.mutate).toHaveBeenCalled());
}
async function fail(error?: unknown) {
  await act(async () => {
    fixture.callbacks.onError?.(error);
  });
}
async function confirm(id: number | null, replayed = false) {
  await act(async () => {
    fixture.callbacks.onSuccess?.({ id, replayed });
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  setFoundationCreationStorageAdapter(createMemoryFoundationCreationStorage());
  fixture.invalidate.mockResolvedValue(undefined);
  fixture.status.mockResolvedValue({ status: "not_found" });
  fixture.fetch.mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  setFoundationCreationStorageAdapter(null);
});

describe("formulário de pergunta e criação idempotente — API/armazenamento em memória", () => {
  it("mantém formulário inline e identidade visual recebida", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Salvar pergunta" }).style
        .backgroundColor
    ).toBe("rgb(112, 70, 170)");
    expect(fixture.mutate).not.toHaveBeenCalled();
  });
  it("mantém a abertura modal tradicional", () => {
    render(<Harness inline={false} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
  it("limita de duas a seis alternativas e bloqueia a sétima", () => {
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
  it("preserva IDs remanescentes e exige gabarito após remover a correta", async () => {
    render(<Harness />);
    fill();
    fireEvent.click(
      screen.getByRole("button", { name: "Adicionar alternativa" })
    );
    fireEvent.change(screen.getByLabelText("Alternativa C"), {
      target: { value: "Criticar" },
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
    await submit();
    expect(
      fixture.mutate.mock.calls[0][0].options.map((o: any) => o.id)
    ).toEqual(["a", "b"]);
    expect(fixture.mutate.mock.calls[0][0].correctOptionId).toBe("b");
  });
  it("bloqueia duplo clique, persiste UUID antes do envio e aguarda confirmação real", async () => {
    render(<Harness />);
    fill();
    const button = screen.getByRole("button", { name: "Salvar pergunta" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(fixture.mutate).toHaveBeenCalledTimes(1));
    expect(fixture.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        churchId: 42,
        studyId: 77,
        blockId: 93,
        prompt: "Qual atitude encoraja?",
        correctOptionId: "a",
        requestSchemaVersion: 1,
        clientRequestId: expect.stringMatching(/^[a-f0-9-]{36}$/),
      })
    );
    expect(fixture.created).not.toHaveBeenCalled();
    expect(fixture.toast).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain(
      "Salvando pergunta"
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByLabelText("Pergunta", { exact: true })).toBeTruthy();
    await confirm(301);
    await waitFor(() =>
      expect(fixture.created).toHaveBeenCalledWith(
        expect.objectContaining({
          block: { id: 93 },
          question: expect.objectContaining({ id: 301, correctOptionId: "a" }),
        })
      )
    );
    expect(screen.queryByLabelText("Pergunta", { exact: true })).toBeNull();
  });
  it("falha mantém campos e reutiliza exatamente chave e payload", async () => {
    render(<Harness />);
    fill();
    await submit();
    const original = fixture.mutate.mock.calls[0][0];
    await fail();
    expect(
      (
        screen.getByLabelText("Pergunta", {
          exact: true,
        }) as HTMLTextAreaElement
      ).value
    ).toBe(original.prompt);
    expect(screen.getByRole("alert").textContent).toContain(
      "campos continuam preenchidos"
    );
    expect(fixture.mutate).toHaveBeenCalledTimes(1);
    expect(fixture.created).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Salvar pergunta" }));
    await waitFor(() => expect(fixture.mutate).toHaveBeenCalledTimes(2));
    expect(fixture.mutate.mock.calls[1][0]).toEqual(original);
  });
  it("recarga/reabertura restaura snapshot e a UUID persistida", async () => {
    const view = render(<Harness />);
    fill();
    await submit();
    const original = fixture.mutate.mock.calls[0][0];
    await fail();
    view.unmount();
    render(<Harness />);
    await waitFor(() =>
      expect(
        (
          screen.getByLabelText("Pergunta", {
            exact: true,
          }) as HTMLTextAreaElement
        ).value
      ).toBe(original.prompt)
    );
    fireEvent.click(screen.getByRole("button", { name: "Salvar pergunta" }));
    await waitFor(() => expect(fixture.mutate).toHaveBeenCalledTimes(2));
    expect(fixture.mutate.mock.calls[1][0]).toEqual(original);
  });
  it("CONFLICT sem cause mantém texto e não cria outra chave automaticamente", async () => {
    render(<Harness />);
    fill();
    await submit();
    await fail({
      data: { code: "CONFLICT" },
      message: "Esta tentativa já foi usada com outro conteúdo.",
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "Seu texto foi preservado"
    );
    expect(fixture.mutate).toHaveBeenCalledTimes(1);
    expect(
      (
        screen.getByLabelText("Pergunta", {
          exact: true,
        }) as HTMLTextAreaElement
      ).value
    ).toBe("Qual atitude encoraja?");
  });
  it("consulta confirmed após resposta perdida sem reenviar e usa conteúdo atual", async () => {
    render(<Harness />);
    fill();
    await submit();
    await fail();
    fixture.status.mockResolvedValue({ status: "confirmed", id: 301 });
    fixture.fetch.mockResolvedValue([
      {
        block: { id: 93 },
        question: {
          id: 301,
          prompt: "Texto atualizado no servidor",
          options: [],
          correctOptionId: "a",
          explanation: "Atualizada",
        },
      },
    ]);
    fireEvent.click(
      screen.getByRole("button", { name: "Verificar salvamento" })
    );
    await waitFor(() =>
      expect(fixture.created).toHaveBeenCalledWith(
        expect.objectContaining({
          question: expect.objectContaining({
            id: 301,
            prompt: "Texto atualizado no servidor",
          }),
        })
      )
    );
    expect(fixture.mutate).toHaveBeenCalledTimes(1);
    expect(fixture.status).toHaveBeenCalledWith(
      expect.objectContaining({
        churchId: 42,
        operation: "question",
        clientRequestId: fixture.mutate.mock.calls[0][0].clientRequestId,
      })
    );
  });
  it("not_found preserva tentativa e não dispara criação alternativa", async () => {
    render(<Harness />);
    fill();
    await submit();
    await fail();
    fireEvent.click(
      screen.getByRole("button", { name: "Verificar salvamento" })
    );
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "não foi localizado"
      )
    );
    expect(fixture.mutate).toHaveBeenCalledTimes(1);
  });
  it("não confirma ID inválido nem limpa texto", async () => {
    render(<Harness />);
    fill();
    await submit();
    await confirm(null);
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
  it("falha de cache após commit não reabre o cadastro nem repete mutation", async () => {
    fixture.invalidate.mockRejectedValue(new Error("cache indisponível"));
    render(<Harness />);
    fill();
    await submit();
    await confirm(302);
    await waitFor(() => expect(fixture.invalidate).toHaveBeenCalled());
    expect(fixture.mutate).toHaveBeenCalledTimes(1);
    expect(fixture.created).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Pergunta", { exact: true })).toBeNull();
  });
  it("falha de storage bloqueia envio e preserva campos", async () => {
    const adapter = createMemoryFoundationCreationStorage();
    adapter.claim = async () => {
      throw new Error("quota outbox");
    };
    setFoundationCreationStorageAdapter(adapter);
    render(<Harness />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Salvar pergunta" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("armazenamento")
    );
    expect(fixture.mutate).not.toHaveBeenCalled();
  });
  it("identidade inválida não cria registros", async () => {
    render(<Harness accountId={0} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Salvar pergunta" }));
    expect(screen.getByRole("alert").textContent).toContain("identidade");
    expect(fixture.mutate).not.toHaveBeenCalled();
  });
});
