import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "drizzle/0038_milky_king_cobra.sql"), "utf8");
const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const media = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");

function announcementRouterSource() {
  return router.slice(router.indexOf("const announcementsRouter"), router.indexOf("const prayerRouter"));
}

describe("Avisos Públicos — contrato e isolamento", () => {
  it("possui campos de visibilidade, expiração, CTA e asset por tenant", () => {
    expect(schema).toContain('publicVisible: boolean("publicVisible").notNull().default(false)');
    expect(schema).toContain('publicStatus: mysqlEnum("publicStatus", ["rascunho", "publicado", "agendado", "arquivado"])');
    expect(schema).toContain('publicStartsAt: timestamp("publicStartsAt")');
    expect(schema).toContain('ctaHref: varchar("ctaHref", { length: 500 })');
    expect(schema).toContain('mediaAssetId: int("mediaAssetId")');
    expect(schema).toContain("announcements_church_public_idx");
    expect(migration).toContain("ALTER TABLE `announcements` ADD `publicVisible`");
  });

  it("lista o conteúdo público somente pelo tenant resolvido no host", () => {
    const source = announcementRouterSource();
    expect(source).toContain("publicList: publicProcedure");
    expect(source).toContain("if (!ctx.tenantSlug) return []");
    expect(source).toContain("getChurchBySlug(ctx.tenantSlug)");
    expect(db).toContain("eq(announcements.churchId, churchId)");
    expect(db).toContain("eq(announcements.publicVisible, true)");
    expect(db).toContain('eq(announcements.publicStatus, "publicado")');
    expect(db).toContain('eq(announcements.publicStatus, "agendado")');
  });

  it("exige autorização pastoral para colocar ou alterar um aviso público", () => {
    const source = announcementRouterSource();
    expect(source).toContain("if (input.publicVisible) {");
    expect(source).toContain("requireChurchPublicSitePublisher(ctx.user.id, input.churchId)");
    expect(source).toContain("validateAnnouncementMedia");
    expect(source).toContain("validateAnnouncementCta");
    expect(source).toContain("A expiração precisa ser posterior");
  });

  it("permite somente imagem de aviso pertencente ao mesmo tenant", () => {
    expect(media).toContain('"announcement_image"');
    expect(router).toContain('asset.purpose !== "announcement_image"');
    expect(router).toContain("getActiveMediaAssetById(mediaAssetId, churchId)");
  });

  it("mantém o mural interno separado da página pública", () => {
    const source = announcementRouterSource();
    expect(source).toContain("list: protectedProcedure");
    expect(source).toContain("publicList: publicProcedure");
    expect(source).toContain("archivePublic");
    expect(source).toContain('publicVisible: false');
  });
});
