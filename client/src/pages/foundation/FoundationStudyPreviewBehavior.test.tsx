// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreviewPane } from "./FoundationStudyEditor";
const block = {
  id: 41,
  churchId: 1,
  studyId: 2,
  title: "Responda",
  content: "Orientação",
  position: 2,
  active: true,
  reflectionPrompt: "Como aplicar esta verdade?",
};
const question = {
  block: { id: 41 },
  question: {
    id: 51,
    prompt: "Qual atitude constrói?",
    options: [
      { id: "a", label: "Encorajar" },
      { id: "b", label: "Destruir" },
    ],
    correctOptionId: "a",
    explanation: "EXPLICAÇÃO PROTEGIDA",
  },
};
const props = {
  title: "Estudo sintético",
  summary: "",
  content: "",
  block,
  questions: [question],
  primaryColor: "#1e3a5f",
  secondaryColor: "#c9a84c",
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("prévia pedagógica sem persistência", () => {
  it("oculta a explicação até conferir uma tentativa, sem chamar a API", () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    render(<PreviewPane {...props} />);
    expect(screen.queryByText("EXPLICAÇÃO PROTEGIDA")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Encorajar" }));
    expect(screen.queryByText("EXPLICAÇÃO PROTEGIDA")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Conferir resposta" }));
    expect(screen.getByText("Resposta correta")).toBeTruthy();
    expect(screen.getByText("EXPLICAÇÃO PROTEGIDA")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("mostra resultado incorreto e permite corrigir a alternativa localmente", () => {
    render(<PreviewPane {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Destruir" }));
    fireEvent.click(screen.getByRole("button", { name: "Conferir resposta" }));
    expect(screen.getByText("Vamos revisar")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Encorajar" }));
    expect(screen.queryByText("EXPLICAÇÃO PROTEGIDA")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Conferir resposta" }));
    expect(screen.getByText("Resposta correta")).toBeTruthy();
  });
  it("mantém textos diferentes nas etapas ao ir e voltar na prévia", () => {
    const { rerender } = render(<PreviewPane {...props} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Nota em Responda" },
    });
    const leia = { ...block, id: 42, title: "Leia", position: 0 };
    rerender(<PreviewPane {...props} block={leia} />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Nota em Leia" },
    });
    rerender(<PreviewPane {...props} />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
      "Nota em Responda"
    );
  });
  it("não inventa reflexão quando o professor deixa o campo vazio", () => {
    render(
      <PreviewPane {...props} block={{ ...block, reflectionPrompt: null }} />
    );
    expect(screen.queryByText("Para refletir")).toBeNull();
    expect(screen.getByLabelText("Minha anotação em Responda")).toBeTruthy();
  });
  it("coloca perguntas antes da reflexão e a anotação depois da reflexão", () => {
    render(<PreviewPane {...props} />);
    const questionElement = screen.getByText("Qual atitude constrói?");
    const promptElement = screen.getByText("Como aplicar esta verdade?");
    const note = screen.getByLabelText("Minha anotação em Responda");
    expect(
      questionElement.compareDocumentPosition(promptElement) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      promptElement.compareDocumentPosition(note) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
  it("descarta as anotações da prévia ao fechar e abrir novamente", () => {
    const { unmount } = render(<PreviewPane {...props} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Só local" },
    });
    unmount();
    render(<PreviewPane {...props} />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
  });
});
