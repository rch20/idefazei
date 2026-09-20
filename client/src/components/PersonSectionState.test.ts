import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../..");
const source = readFileSync(resolve(root, "client/src/components/PersonSectionState.tsx"), "utf8");

describe("PersonSectionState", () => {
  it("declara os estados de leitura previstos para a ficha", () => {
    expect(source).toContain('export type PersonSectionStateKind = "loading" | "empty" | "error" | "unavailable" | "refreshing";');
    expect(source).toContain('data-state-kind={kind}');
  });

  it("diferencia loading, erro, indisponibilidade e vazio", () => {
    expect(source).toContain('role={role}');
    expect(source).toContain('aria-live={kind === "error" ? "assertive" : "polite"}');
    expect(source).toContain('kind === "error" && "border-rose-200');
    expect(source).toContain('kind === "unavailable" && "border-amber-200');
    expect(source).toContain('kind === "empty" && "border-dashed');
  });

  it("oferece retry somente quando uma leitura autorizada fornece onRetry", () => {
    expect(source).toContain('kind === "error" && onRetry');
    expect(source).toContain('onClick={onRetry}');
    expect(source).toContain('disabled={retrying}');
    expect(source).toContain("Tentar novamente");
  });

  it("mantém a atualização em segundo plano acessível e compacta", () => {
    expect(source).toContain('aria-busy={isBusy}');
    expect(source).toContain('kind === "loading" || kind === "refreshing"');
    expect(source).toContain("O último conteúdo válido continua visível");
    expect(source).toContain("min-h-11");
  });
});
