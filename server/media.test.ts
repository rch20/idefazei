import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const storagePut = vi.fn().mockResolvedValue({ key: "churches/100/tenant_logo/logo.png", url: "/manus-storage/churches/100/tenant_logo/logo.png" });

vi.mock("./storage", () => ({ storagePut }));

describe("Adaptador de mídia", () => {
  it("mantém o fallback existente quando Cloudinary ainda não está configurado", async () => {
    const { uploadMedia, isCloudinaryReady } = await import("./media");
    const result = await uploadMedia({
      churchId: 100,
      data: Buffer.from("fake-image"),
      mimeType: "image/png",
      resourceType: "image",
      purpose: "tenant_logo",
      originalFilename: "logo.png",
      uploadedByChurchUserId: 7,
    });

    expect(isCloudinaryReady()).toBe(false);
    expect(storagePut).toHaveBeenCalledWith(expect.stringContaining("churches/100/tenant_logo/"), expect.any(Buffer), "image/png");
    expect(result).toMatchObject({
      provider: "manus_storage",
      resourceType: "image",
      purpose: "tenant_logo",
      url: "/manus-storage/churches/100/tenant_logo/logo.png",
      publicId: null,
      mimeType: "image/png",
    });
  });

  it("separa finalidade e tipo de recurso para suportar imagens e vídeos", () => {
    const source = readFileSync(resolve(process.cwd(), "server/media.ts"), "utf8");
    expect(source).toContain('export type MediaResourceType = "image" | "video" | "raw";');
    expect(source).toContain('export type MediaPurpose =');
    expect(source).toContain('"tenant_logo"');
    expect(source).toContain('"tenant_pwa_icon"');
    expect(source).toContain("getPwaIconUrls");
    expect(source).toContain("getOptimizedMediaUrls");
    expect(source).toContain('fetch_format: fetchFormat');
    expect(source).toContain('resource_type: resourceTypeForCloudinary(input.resourceType)');
    expect(source).toContain("CLOUDINARY_CLOUD_NAME");
  });

  it("entrega a URL original no fallback quando não há Cloudinary configurado", async () => {
    const { getOptimizedMediaUrls } = await import("./media");
    expect(getOptimizedMediaUrls({ provider: "manus_storage", resourceType: "image", publicId: null, url: "/manus-storage/test.png" })).toEqual({
      optimizedUrl: "/manus-storage/test.png",
      webpUrl: null,
      avifUrl: null,
    });
  });

  it("mantém o registro de assets isolado por igreja e preparado para a migração aditiva", () => {
    const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
    const migration = readFileSync(resolve(process.cwd(), "drizzle/0036_tan_cerebro.sql"), "utf8");
    const pwaMigration = readFileSync(resolve(process.cwd(), "drizzle/0037_superb_korg.sql"), "utf8");
    expect(schema).toContain('export const mediaAssets = mysqlTable("media_assets"');
    expect(schema).toContain('pwaIcon192Url: text("pwaIcon192Url")');
    expect(schema).toContain('pwaIcon512Url: text("pwaIcon512Url")');
    expect(pwaMigration).toContain("tenant_pwa_icon");
    expect(pwaMigration).toContain("pwaIcon192Url");
    expect(pwaMigration).toContain("pwaIcon512Url");
    expect(schema).toContain('index("media_assets_church_idx").on(table.churchId)');
    expect(migration).toContain("CREATE TABLE `media_assets`");
    expect(migration).toContain("enum('cloudinary','manus_storage')");
    expect(migration).toContain("`churchId` int NOT NULL");
  });
});
