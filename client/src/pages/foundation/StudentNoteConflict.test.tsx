// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentNoteConflict } from "./StudentNoteConflict";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const setup = (extra: Record<string, any> = {}) => {
  const props = {
    localText: "Meu rascunho B",
    remoteText: "Salvo em A",
    remoteVersion: 3,
    primaryColor: "#f5e1a4",
    primaryForeground: "#202020",
    onUseRemote: vi.fn(),
    onKeepMine: vi.fn(),
    onCombine: vi.fn(),
    ...extra,
  };
  const view = render(<StudentNoteConflict {...props} />);
  return { ...view, props };
};
describe("resolução explícita de conflito de uma nota", () => {
  it("mostra ambos os textos e a revisão sem decidir automaticamente", () => {
    const { props } = setup();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText("Meu rascunho B")).toBeTruthy();
    expect(screen.getByText("Salvo em A")).toBeTruthy();
    expect(props.onUseRemote).not.toHaveBeenCalled();
    expect(props.onKeepMine).not.toHaveBeenCalled();
    expect(props.onCombine).not.toHaveBeenCalled();
  });
  it("usar salvo exige clique explícito", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Usar o texto salvo" }));
    expect(props.onUseRemote).toHaveBeenCalledOnce();
    expect(props.onKeepMine).not.toHaveBeenCalled();
  });
  it("manter meu texto preserva a decisão separada", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Manter meu texto" }));
    expect(props.onKeepMine).toHaveBeenCalledOnce();
    expect(props.onUseRemote).not.toHaveBeenCalled();
  });
  it("combinar começa com o rascunho e só envia texto editado ao confirmar", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Combinar textos" }));
    const field = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(field.value).toBe("Meu rascunho B");
    expect(field.maxLength).toBe(4000);
    expect(props.onCombine).not.toHaveBeenCalled();
    fireEvent.change(field, {
      target: { value: "Texto combinado pelo aluno" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar texto final" })
    );
    expect(props.onCombine).toHaveBeenCalledWith("Texto combinado pelo aluno");
  });
  it("não oculta o vazio nem interpreta HTML como marcação", () => {
    const { container } = setup({
      localText: "",
      remoteText: "<script>seguro</script>",
    });
    expect(screen.getByText("(vazio)")).toBeTruthy();
    expect(screen.getByText("<script>seguro</script>")).toBeTruthy();
    expect(container.querySelector("script")).toBeNull();
  });
  it("bloqueia decisões enquanto uma operação está em curso", () => {
    const { props } = setup({ disabled: true });
    for (const button of screen.getAllByRole("button"))
      expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(props.onKeepMine).not.toHaveBeenCalled();
  });
  it("respeita cor e contraste da igreja", () => {
    setup();
    const button = screen.getByRole("button", { name: "Manter meu texto" });
    expect(button.style.backgroundColor).toBe("rgb(245, 225, 164)");
    expect(button.style.color).toBe("rgb(32, 32, 32)");
  });
  it("cópia local não seleciona nem grava qualquer versão", async () => {
    const copy = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: copy },
      configurable: true,
    });
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Copiar meu texto" }));
    await waitFor(() => expect(copy).toHaveBeenCalledWith("Meu rascunho B"));
    expect(props.onKeepMine).not.toHaveBeenCalled();
    expect(props.onCombine).not.toHaveBeenCalled();
  });
});
