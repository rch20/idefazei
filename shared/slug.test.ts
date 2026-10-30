import { describe, it, expect } from "vitest";
import { isReservedChurchSlug, normalizeSlug } from "./slug";

describe("isReservedChurchSlug", () => {
  it("bloqueia o apex e subdomínios de infraestrutura/ambiente", () => {
    for (const slug of ["idefazei", "www", "admin", "api", "app", "demo", "homolog", "mail"]) {
      expect(isReservedChurchSlug(slug)).toBe(true);
    }
  });

  it("é insensível a maiúsculas e a espaços nas pontas", () => {
    expect(isReservedChurchSlug("  ADMIN ")).toBe(true);
    expect(normalizeSlug("  Demo ")).toBe("demo");
  });

  it("permite nomes normais de igreja", () => {
    for (const slug of ["igreja-viver", "batista-central", "ieq-centro", "monte-siao2"]) {
      expect(isReservedChurchSlug(slug)).toBe(false);
    }
  });
});
