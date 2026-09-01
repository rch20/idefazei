import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "client/src/pages/EstudosCelulas.tsx"), "utf8");
const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const media = readFileSync(resolve(process.cwd(), "server/media.ts"), "utf8");
const mediaRoute = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "drizzle/0055_strong_silver_centurion.sql"), "utf8");

describe("Estudos de Células — biblioteca semanal", () => {
  it("modela estudo civil por semana, status e conteúdo estruturado", () => {
    expect(schema).toContain("export const cellStudies");
    expect(schema).toContain('weekStart: date("weekStart", { mode: "string" })');
    expect(schema).toContain('mysqlEnum("status", ["rascunho", "publicado", "arquivado"])');
    expect(page).toContain("Semana de aplicação");
    expect(page).toContain("Perguntas para discussão");
    expect(page).toContain("Aplicação prática");
  });

  it("separa o estudo de seus arquivos e links externos", () => {
    expect(schema).toContain("export const cellStudyAttachments");
    expect(schema).toContain('mysqlEnum("kind", ["arquivo", "link"])');
    expect(page).toContain('purpose: "cell_study_attachment"');
    expect(page).toContain("Link externo");
    expect(page).toContain("baixe o PDF ou abra os materiais complementares");
  });

  it("protege gestão e leitura no backend por igreja e função", () => {
    expect(router).toContain("const cellStudiesRouter = router({");
    expect(router).toContain("requireCellStudyManager");
    expect(router).toContain("requireCellStudyReader");
    expect(router).toContain("getCellStudyReaderLeaderIds");
    expect(router).toContain("cellStudies: cellStudiesRouter");
    expect(db).toContain("eq(cellStudies.churchId, churchId)");
  });

  it("permite delegação pastoral sem criar uma Pessoa fictícia", () => {
    expect(schema).toContain("export const cellStudyAdministrators");
    expect(router).toContain("assignAdministrator");
    expect(router).toContain("requirePastor(ctx.user.id, input.churchId)");
    expect(page).toContain("Responsáveis pelos estudos");
  });

  it("aceita PDF e anexos complementares no storage com limite próprio", () => {
    expect(media).toContain('"cell_study_attachment"');
    expect(mediaRoute).toContain('"application/pdf"');
    expect(mediaRoute).toContain('"cell_study_attachment"');
    expect(mediaRoute).toContain("20 * 1024 * 1024");
    expect(migration).toContain("cell_study_attachments");
    expect(migration).toContain("cell_study_attachment");
  });

  it("oferece o fluxo integrado de estudo pronto, com PDF principal e publicação", () => {
    expect(page).toContain("Adicionar estudo pronto");
    expect(page).toContain("PDF recomendado");
    expect(page).toContain("Título do estudo");
    expect(page).toContain("Semana de aplicação");
    expect(page).toContain("Salvar como rascunho");
    expect(page).toContain("Publicar para líderes");
    expect(page).toContain("cellStudies.createReady");
    expect(page).toContain('purpose: "cell_study_attachment"');
    expect(router).toContain("createReady: protectedProcedure");
    expect(router).toContain("createReadyCellStudy");
    expect(db).toContain("db.transaction(async (tx)");
    expect(db).toContain("position: 0");
  });

  it("mantém a mesma biblioteca e valida o asset no tenant antes de associá-lo", () => {
    expect(page).not.toContain("ReadyStudyLibrary");
    expect(router).toContain("createReadyCellStudy");
    expect(db).toContain('eq(mediaAssets.churchId, data.churchId)');
    expect(db).toContain('eq(mediaAssets.purpose, "cell_study_attachment")');
  });
});
