import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(process.cwd(), "client/src/pages/Mural.tsx"), "utf8");

describe("Mural — Avisos Públicos", () => {
  it("separa o mural interno da publicação pública", () => {
    expect(page).toContain("Exibir na página pública");
    expect(page).toContain("announcements.list.useQuery");
    expect(page).toContain("announcements.create.useMutation");
    expect(page).toContain("announcements.update.useMutation");
    expect(page).toContain("announcements.archivePublic.useMutation");
  });

  it("protege a experiência de publicação com datas, destaque e ação", () => {
    expect(page).toContain('id="announcement-start"');
    expect(page).toContain('id="announcement-expiry"');
    expect(page).toContain("Fixar como destaque no mural");
    expect(page).toContain('id="announcement-cta-label"');
    expect(page).toContain('id="announcement-cta-href"');
    expect(page).toContain("publicVisible");
  });

  it("usa o upload unificado do Cloudinary para imagem de aviso", () => {
    expect(page).toContain("uploadChurchMedia");
    expect(page).toContain('purpose: "announcement_image"');
    expect(page).toContain('resourceType: "image"');
    expect(page).toContain("Imagem vinculada ao aviso");
  });

  it("mantém ações claras e responsivas", () => {
    expect(page).toContain("Novo aviso");
    expect(page).toContain("Salvar e publicar");
    expect(page).toContain("Retirar");
    expect(page).toContain("max-h-[92dvh]");
    expect(page).toContain("overflow-y-auto");
  });
});
