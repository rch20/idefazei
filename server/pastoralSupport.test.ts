import { describe, expect, it } from "vitest";
import {
  DEFAULT_PASTORAL_SUPPORT_LABEL,
  DEFAULT_PASTORAL_SUPPORT_URL,
  normalizePastoralSupportConfig,
  normalizePastoralSupportLabel,
  normalizePastoralSupportUrl,
  shouldShowPastoralSupport,
} from "../shared/pastoralSupport";

describe("pastoral support contract", () => {
  it("accepts only the configured secure Dedo de Prosa host", () => {
    expect(normalizePastoralSupportUrl(DEFAULT_PASTORAL_SUPPORT_URL)).toBe(`${DEFAULT_PASTORAL_SUPPORT_URL}/`);
    expect(normalizePastoralSupportUrl("http://dedodeprosa.diaebeleza.com.br")).toBeNull();
    expect(normalizePastoralSupportUrl("https://evil.example/dedo")).toBeNull();
    expect(normalizePastoralSupportUrl("https://dedodeprosa.diaebeleza.com.br:8443")).toBeNull();
    expect(normalizePastoralSupportUrl("https://user:pass@dedodeprosa.diaebeleza.com.br")).toBeNull();
  });

  it("normalizes labels and uses a safe default", () => {
    expect(normalizePastoralSupportLabel("  Fale   com  a equipe  ")).toBe("Fale com a equipe");
    expect(normalizePastoralSupportLabel("   ")).toBe(DEFAULT_PASTORAL_SUPPORT_LABEL);
    expect(normalizePastoralSupportLabel("x".repeat(100))).toHaveLength(80);
  });

  it("keeps public and authenticated visibility independent", () => {
    const config = normalizePastoralSupportConfig({ url: DEFAULT_PASTORAL_SUPPORT_URL, enabled: true, showPublic: true, showAuthenticated: false });
    expect(config).toMatchObject({ url: `${DEFAULT_PASTORAL_SUPPORT_URL}/`, enabled: true, showPublic: true, showAuthenticated: false });
    expect(shouldShowPastoralSupport(config, "public")).toBe(true);
    expect(shouldShowPastoralSupport(config, "authenticated")).toBe(false);
    expect(shouldShowPastoralSupport({ ...config, showPublic: false, showAuthenticated: true }, "public")).toBe(false);
    expect(shouldShowPastoralSupport({ ...config, showPublic: false, showAuthenticated: true }, "authenticated")).toBe(true);
  });

  it("never exposes an invalid or disabled configuration", () => {
    expect(normalizePastoralSupportConfig({ url: "javascript:alert(1)", enabled: true, showPublic: true, showAuthenticated: true })).toMatchObject({ url: null, enabled: true });
    expect(shouldShowPastoralSupport({ url: DEFAULT_PASTORAL_SUPPORT_URL, enabled: false, showPublic: true, showAuthenticated: true }, "public")).toBe(false);
    expect(shouldShowPastoralSupport({ url: "", enabled: true, showPublic: true, showAuthenticated: true }, "public")).toBe(false);
  });
});
