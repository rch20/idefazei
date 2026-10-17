// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createFoundationTheme } from "./FoundationTheme";
import previewData from "./foundationHandoutPages";
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

async function openPreview(index = 0) {
  const model = FOUNDATION_STUDY_HANDOUTS[index];
  const button = screen.getByRole("button", { name: `${model.label} PDF` });
  button.focus();
  fireEvent.click(button);
  await screen.findByRole("dialog");
  return { model, button };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Gabaritos de estudo para impressão", () => {
  it("começa recolhido para não competir com Criar estudo", () => {
    const { container } = render(<FoundationStudyHandouts theme={theme} />);
    expect(container.querySelector("details")?.open).toBe(false);
    expect(container.querySelector("summary")?.textContent).toContain(
      "Gabaritos para imprimir"
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("oferece prévia interna dos dois modelos em vez de navegar diretamente ao PDF", () => {
    const { container } = openHandouts();
    expect(container.querySelector("details")?.open).toBe(true);
    FOUNDATION_STUDY_HANDOUTS.forEach(model => {
      const button = screen.getByRole("button", { name: `${model.label} PDF` });
      expect(button.getAttribute("aria-haspopup")).toBe("dialog");
      expect(button.getAttribute("type")).toBe("button");
      expect(button.getAttribute("href")).toBeNull();
    });
    expect(screen.queryByRole("link")).toBeNull();
  });

  it.each([0, 1])(
    "exibe todas as páginas e preserva o PDF original para download: modelo %s",
    async index => {
      openHandouts();
      const { model } = await openPreview(index);
      const dialog = screen.getByRole("dialog");
      expect(dialog.textContent).toContain(model.label.toLowerCase());
      expect(
        screen.getByRole("button", { name: "Voltar à Escola" })
      ).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "Fechar gabarito" })
      ).toBeTruthy();
      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(model.pages);
      images.forEach((img, page) => {
        expect(img.getAttribute("src")).toBe(
          previewData.pages[model.pages][page]
        );
        expect(img.getAttribute("alt")).toContain(
          `Página ${page + 1} de ${model.pages}`
        );
        expect(img.getAttribute("loading")).toBe(page === 0 ? "eager" : "lazy");
      });
      const download = screen.getByRole("link", { name: "Baixar PDF" });
      expect(download.getAttribute("href")).toBe(model.href);
      expect(download.getAttribute("download")).toBe(model.filename);
      expect(download.getAttribute("type")).toBe("application/pdf");
      expect(download.getAttribute("target")).toBe("_blank");
      expect(download.getAttribute("rel")).toBe("noopener noreferrer");
      expect(dialog.querySelectorAll("iframe, embed, object")).toHaveLength(0);
    }
  );

  it.each(["Voltar à Escola", "Fechar gabarito"])(
    "%s fecha e restaura o foco sem recolher os modelos",
    async name => {
      const { container } = openHandouts();
      const { button } = await openPreview();
      fireEvent.click(screen.getByRole("button", { name }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(button));
      expect(container.querySelector("details")?.open).toBe(true);
    }
  );

  it("Escape também fecha a prévia e permite abrir a outra versão", async () => {
    openHandouts();
    await openPreview();
    await waitFor(() =>
      expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(
        true
      )
    );
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await openPreview(1);
    expect(screen.getAllByRole("img")).toHaveLength(6);
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

  it("aplica a cor da igreja aos modelos e ao download", async () => {
    const { container } = openHandouts();
    expect(
      container
        .querySelector("summary")!
        .style.getPropertyValue("--handout-focus")
    ).toBe(theme.focusRing);
    FOUNDATION_STUDY_HANDOUTS.forEach(model => {
      expect(
        (
          screen.getByRole("button", {
            name: `${model.label} PDF`,
          }) as HTMLElement
        ).style.borderColor
      ).toBe("rgb(139, 36, 83)");
    });
    await openPreview();
    expect(
      (screen.getByRole("link", { name: "Baixar PDF" }) as HTMLElement).style
        .borderColor
    ).toBe("rgb(139, 36, 83)");
  });

  it("não consulta API nem carrega páginas/PDF antes de selecionar um modelo", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { container } = openHandouts();
    expect(fetch).not.toHaveBeenCalled();
    expect(
      container.querySelectorAll("iframe, embed, object, img")
    ).toHaveLength(0);
    await openPreview();
    expect(fetch).not.toHaveBeenCalled();
    expect(
      screen
        .getAllByRole("button")
        .every(button => button.getAttribute("type") === "button")
    ).toBe(true);
  });

  it("mantém os PDFs aprovados intactos e verifica as prévias geradas deles", () => {
    const directory = resolve("client/src/documents/foundation");
    const manifest = JSON.parse(
      readFileSync(
        resolve(directory, "handout-previews/source-manifest.json"),
        "utf8"
      )
    );
    const expected = [
      [
        "simplificado",
        "b70c090a256f917dd1c14df5a0bad9463b11a767cf643e46f6d52bab6e7b5e8a",
        2,
      ],
      [
        "completo",
        "a6a4c2abc2063ce6f021411222d659e684df87e9e3c5f35740f8df3acf66d15c",
        6,
      ],
    ] as const;
    expected.forEach(([name, hash, pages]) => {
      const bytes = readFileSync(
        resolve(directory, `gabarito-fundamentos-${name}.pdf`)
      );
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(hash);
      expect(manifest[name].pdfSha256).toBe(hash);
      expect(manifest[name].pages).toHaveLength(pages);
      for (const page of manifest[name].pages) {
        const image = readFileSync(
          resolve(directory, "handout-previews", page.file)
        );
        expect(image.subarray(8, 12).toString()).toBe("WEBP");
        expect(createHash("sha256").update(image).digest("hex")).toBe(
          page.sha256
        );
        expect(page.width).toBe(1241);
        expect(page.height).toBe(1754);
      }
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
