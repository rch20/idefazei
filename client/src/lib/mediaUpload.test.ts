import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Contrato frontend de mídia", () => {
  it("usa o endpoint autenticado único e envia finalidade e tipo explicitamente", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/lib/mediaUpload.ts"), "utf8");
    expect(source).toContain('fetch("/api/media/upload"');
    expect(source).toContain('formData.append("purpose", options.purpose)');
    expect(source).toContain('formData.append("resourceType", options.resourceType)');
    expect(source).toContain("Authorization: `Bearer ${token}`");
    expect(source).toContain('"tenant_logo" | "tenant_pwa_icon" | "tenant_public_gallery" | "tenant_public_hero" | "certificate_logo" | "public_video"');
  });
});
