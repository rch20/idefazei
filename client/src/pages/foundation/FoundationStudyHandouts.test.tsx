// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createFoundationTheme } from "./FoundationTheme";
import {
  FOUNDATION_STUDY_HANDOUTS,
  FoundationStudyHandouts,
} from "./FoundationStudyHandouts";

const theme = createFoundationTheme("#8b2453", "#f6e3a2");

function openHandouts() {
  const result = render(<FoundationStudyHandouts theme={theme} />);
  fireEvent.click(screen.getByText("Gabaritos para imprimir"));
  return result;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Gabaritos de estudo para impressão", () => {
  it("começa recolhido para não competir com Criar estudo", () => {
    const { container } = render(<FoundationStudyHandouts theme={theme} />);
    expect(container.querySelector("details")?.open).toBe(false);
    // jsdom does not model the native visibility of closed details; Chromium does.
    expect(container.querySelector("summary")?.textContent).toContain(
      "Gabaritos para imprimir"
    );
  });

  it("abre os dois modelos em PDF com nomes acessíveis e download nativo", () => {
    const { container } = openHandouts();
    expect(container.querySelector("details")?.open).toBe(true);
    const links = screen.getAllByRole("link") as HTMLAnchorElement[];
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toContain("Simplificado — 2 páginas");
    expect(links[1].textContent).toContain("Completo — 6 páginas");
    links.forEach((link, index) => {
      const model = FOUNDATION_STUDY_HANDOUTS[index];
      expect(link.getAttribute("href")).toBe(model.href);
      expect(link.getAttribute("download")).toBe(model.filename);
      expect(link.getAttribute("type")).toBe("application/pdf");
      expect(link.getAttribute("href")).not.toMatch(
        /^(data:|https?:|javascript:)/
      );
      expect(link.getAttribute("target")).toBeNull();
    });
  });

  it("explica o preenchimento manual e preserva as anotações do aluno", () => {
    openHandouts();
    expect(
      screen.getByText(/Estes PDFs não são importados automaticamente/)
    ).toBeTruthy();
    expect(
      screen.getByText(/continua sendo preenchido pelo aluno/)
    ).toBeTruthy();
    expect(screen.getByText(/Imprima frente e verso/)).toBeTruthy();
  });

  it("aplica a cor da igreja sem fixar verde ou dourado nos controles", () => {
    const { container } = openHandouts();
    const summary = container.querySelector("summary")!;
    expect(summary.style.getPropertyValue("--handout-focus")).toBe(
      theme.focusRing
    );
    screen.getAllByRole("link").forEach(link => {
      expect((link as HTMLElement).style.borderColor).toBe("rgb(139, 36, 83)");
      expect((link as HTMLElement).style.backgroundColor).not.toBe("");
    });
  });

  it("não consulta API nem carrega os PDFs ao renderizar ou abrir os modelos", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { container } = openHandouts();
    expect(fetch).not.toHaveBeenCalled();
    expect(container.querySelectorAll("iframe, embed, object")).toHaveLength(0);
    expect(
      container.querySelectorAll("button:not([type='button'])")
    ).toHaveLength(0);
  });

  it("mantém os arquivos iguais aos gabaritos aprovados, fora do JavaScript", () => {
    const expected = [
      [
        "simplificado",
        "b70c090a256f917dd1c14df5a0bad9463b11a767cf643e46f6d52bab6e7b5e8a",
      ],
      [
        "completo",
        "a6a4c2abc2063ce6f021411222d659e684df87e9e3c5f35740f8df3acf66d15c",
      ],
    ];
    expected.forEach(([name, hash]) => {
      const bytes = readFileSync(
        resolve(
          `client/src/documents/foundation/gabarito-fundamentos-${name}.pdf`
        )
      );
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(bytes.length).toBeGreaterThan(4096);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(hash);
    });
  });

  it("está no painel administrativo, preservando a saída anterior para o aluno", () => {
    const source = readFileSync(
      resolve("client/src/pages/EscolaFundamentos.tsx"),
      "utf8"
    );
    const management = source.slice(
      source.indexOf("function StudyManagement("),
      source.indexOf("export default function EscolaFundamentos(")
    );
    expect(management).toContain("<FoundationStudyHandouts");
    expect(source).toContain("if (!canManageStudies)");
    expect(source).toMatch(/\{canManageStudies\s*\?\s*\(\s*<StudyManagement/);
    const studentReturn = source.slice(
      source.indexOf("if (!canManageStudies)"),
      source.indexOf("if (coursesError)")
    );
    expect(studentReturn).toContain("<StudentLearningExperience");
    expect(studentReturn).not.toContain("FoundationStudyHandouts");
  });
});
