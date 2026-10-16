import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Devocional diário público", () => {
  const page = readFileSync(resolve(process.cwd(), "client/src/pages/DevocionalDiario.tsx"), "utf8");
  const home = readFileSync(resolve(process.cwd(), "client/src/pages/TenantPublicPage.tsx"), "utf8");
  const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
  const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
  const mural = readFileSync(resolve(process.cwd(), "client/src/pages/Mural.tsx"), "utf8");

  it("exibe o botão na página pública somente quando existe um devocional publicado", () => {
    expect(home).toContain("data.publicDevotional &&");
    expect(home).toContain('href="/devocional"');
    expect(home).toContain("Devocional diário");
    expect(db).toContain("getPublicDailyDevotionalByChurch");
    expect(db).toContain('eq(announcements.type, "devocional")');
  });

  it("mantém a leitura sem login e resolve o conteúdo pelo host do tenant", () => {
    expect(app).toContain('const DevocionalDiario = lazy(() => import("./pages/DevocionalDiario"));');
    expect(app).toContain('<Route path="/devocional" component={DevocionalDiario} />');
    expect(page).toContain("trpc.tenantPublic.current.useQuery");
    expect(page).toContain("A leitura é pública e não exige login.");
  });

  it("oferece compartilhamento nativo, WhatsApp e cópia do link", () => {
    expect(page).toContain("navigator.share");
    expect(page).toContain("https://wa.me/?text=");
    expect(page).toContain("navigator.clipboard.writeText");
    expect(page).toContain("Compartilhar pelo celular");
    expect(page).toContain("Copiar link");
  });

  it("reaproveita o Mural para publicação e agendamento por tenant", () => {
    expect(mural).toContain('type AnnouncementType = "aviso" | "evento" | "comunicado" | "devocional";');
    expect(mural).toContain("publicStartsAt");
    expect(mural).toContain("Exibir na página pública");
    expect(mural).toContain("O conteúdo será exibido na página pública sem exigir login.");
  });
});
