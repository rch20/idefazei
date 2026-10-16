// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentStageNotes } from "./StudentLearningExperience";
vi.mock("@/lib/trpc", () => ({ trpc: {} }));
afterEach(cleanup);
const props = {
  stageTitle: "Leia",
  prompt: "Qual expressão chamou sua atenção?",
  value: "Anotação sintética",
  onChange: vi.fn(),
  primaryColor: "#1e3a5f",
};
describe("anotação da etapa: apresentação e estado real", () => {
  it("ocupa a largura disponível e mantém label, limite e edição", () => {
    render(<StudentStageNotes {...props} />);
    const field = screen.getByLabelText(
      "Minha anotação em Leia"
    ) as HTMLTextAreaElement;
    expect(field.classList.contains("w-full")).toBe(true);
    expect(field.classList.contains("block")).toBe(true);
    expect(field.maxLength).toBe(4000);
    fireEvent.change(field, { target: { value: "Novo texto" } });
    expect(props.onChange).toHaveBeenCalledWith("Novo texto");
  });
  it("não diz salvo quando há uma alteração pendente", () => {
    render(<StudentStageNotes {...props} isUnsaved />);
    expect(screen.getByRole("status").textContent).toBe(
      "Alteração pendente de salvamento…"
    );
  });
  it("preserva o texto e informa a falha; depois mostra sucesso", () => {
    const { rerender } = render(
      <StudentStageNotes {...props} hasError isUnsaved />
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Não foi possível salvar"
    );
    expect(
      (screen.getByLabelText("Minha anotação em Leia") as HTMLTextAreaElement)
        .value
    ).toBe(props.value);
    rerender(<StudentStageNotes {...props} isSaving hasError />);
    expect(screen.getByRole("status").textContent).toBe("Salvando…");
    rerender(<StudentStageNotes {...props} />);
    expect(screen.getByRole("status").textContent).toBe(
      "Salvo automaticamente"
    );
  });
  it("omite reflexão vazia e mantém anotação independente", () => {
    render(<StudentStageNotes {...props} prompt=" " />);
    expect(screen.queryByText("Para refletir")).toBeNull();
    expect(screen.getByLabelText("Minha anotação em Leia")).toBeTruthy();
  });
  it("a prévia continua claramente descartável", () => {
    render(<StudentStageNotes {...props} preview hasError isUnsaved />);
    expect(screen.getByRole("status").textContent).toBe(
      "Somente prévia: esta anotação não será salva."
    );
  });
});
