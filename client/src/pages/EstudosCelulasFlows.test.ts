import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const compactSource = (source: string) =>
  source
    .replace(/\s+/g, " ")
    .replace(/\basync\s+\(\s*([A-Za-z_$][\w$]*)\s*\)/g, "async $1")
    .replace(/\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>/g, "$1 =>")
    .replace(/\s+\./g, ".")
    .replace(/\.\s+/g, ".")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/,\s*}/g, "}")
    .replace(/\s+}/g, "}")
    .trim();

const page = compactSource(
  readFileSync(
    resolve(process.cwd(), "client/src/pages/EstudosCelulas.tsx"),
    "utf8"
  )
);
const router = compactSource(
  readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8")
);
const db = compactSource(
  readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8")
);
const schema = compactSource(
  readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8")
);
const media = compactSource(
  readFileSync(resolve(process.cwd(), "server/media.ts"), "utf8")
);
const mediaRoute = compactSource(
  readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8")
);
const migration = compactSource(
  readFileSync(
    resolve(process.cwd(), "drizzle/0055_strong_silver_centurion.sql"),
    "utf8"
  )
);

describe("Estudos de Células — biblioteca semanal", () => {
  it("modela estudo civil por semana, status e conteúdo estruturado", () => {
    expect(schema).toContain(compactSource("export const cellStudies"));
    expect(schema).toContain(
      compactSource('weekStart: date("weekStart", { mode: "string" })')
    );
    expect(schema).toContain(
      compactSource(
        'mysqlEnum("status", ["rascunho", "publicado", "arquivado"])'
      )
    );
    expect(page).toContain(compactSource("Semana de aplicação"));
    expect(page).toContain(compactSource("Perguntas para discussão"));
    expect(page).toContain(compactSource("Aplicação prática"));
  });

  it("separa o estudo de seus arquivos e links externos", () => {
    expect(schema).toContain(
      compactSource("export const cellStudyAttachments")
    );
    expect(schema).toContain(
      compactSource('mysqlEnum("kind", ["arquivo", "link"])')
    );
    expect(page).toContain(compactSource('purpose: "cell_study_attachment"'));
    expect(page).toContain(compactSource("Link externo"));
    expect(page).toContain(
      compactSource("baixe o PDF ou abra os materiais complementares")
    );
  });

  it("protege gestão e leitura no backend por igreja e função", () => {
    expect(router).toContain(
      compactSource("const cellStudiesRouter = router({")
    );
    expect(router).toContain(compactSource("requireCellStudyManager"));
    expect(router).toContain(compactSource("requireCellStudyReader"));
    expect(router).toContain(compactSource("getCellStudyReaderLeaderIds"));
    expect(router).toContain(compactSource("cellStudies: cellStudiesRouter"));
    expect(db).toContain(compactSource("eq(cellStudies.churchId, churchId)"));
  });

  it("permite delegação pastoral sem criar uma Pessoa fictícia", () => {
    expect(schema).toContain(
      compactSource("export const cellStudyAdministrators")
    );
    expect(router).toContain(compactSource("assignAdministrator"));
    expect(router).toContain(
      compactSource("requirePastor(ctx.user.id, input.churchId)")
    );
    expect(page).toContain(compactSource("Responsáveis pelos estudos"));
  });

  it("aceita PDF e anexos complementares no storage com limite próprio", () => {
    expect(media).toContain(compactSource('"cell_study_attachment"'));
    expect(mediaRoute).toContain(compactSource('"application/pdf"'));
    expect(mediaRoute).toContain(compactSource('"cell_study_attachment"'));
    expect(mediaRoute).toContain(compactSource("20 * 1024 * 1024"));
    expect(migration).toContain(compactSource("cell_study_attachments"));
    expect(migration).toContain(compactSource("cell_study_attachment"));
  });

  it("oferece o fluxo integrado de estudo pronto, com PDF principal e publicação", () => {
    expect(page).toContain(compactSource("Adicionar estudo pronto"));
    expect(page).toContain(compactSource("PDF recomendado"));
    expect(page).toContain(compactSource("Título do estudo"));
    expect(page).toContain(compactSource("Semana de aplicação"));
    expect(page).toContain(compactSource("Salvar como rascunho"));
    expect(page).toContain(compactSource("Publicar para líderes"));
    expect(page).toContain(compactSource("cellStudies.createReady"));
    expect(page).toContain(compactSource('purpose: "cell_study_attachment"'));
    expect(router).toContain(compactSource("createReady: protectedProcedure"));
    expect(router).toContain(compactSource("createReadyCellStudy"));
    expect(db).toContain(compactSource("db.transaction(async (tx)"));
    expect(db).toContain(compactSource("position: 0"));
  });

  it("oferece ações explícitas para abrir e baixar PDF na experiência mobile", () => {
    expect(page).toContain(compactSource("Abrir PDF"));
    expect(page).toContain(compactSource("Baixar PDF"));
    expect(page).toContain(
      compactSource("link.download = attachment.originalFilename")
    );
    expect(page).toContain(compactSource('target="_blank"'));
    expect(page).toContain(compactSource("application/pdf"));
    expect(page).toContain(
      compactSource('fetch(attachment.url, { mode: "cors" })')
    );
    expect(page).toContain(compactSource("URL.createObjectURL(pdfBlob)"));
    expect(page).toContain(
      compactSource("Permita pop-ups para abrir o PDF no navegador.")
    );
    expect(page).toContain(compactSource("sm:flex-row"));
  });

  it("mostra uma biblioteca resumida para líderes sem controles administrativos", () => {
    expect(page).toContain(compactSource("function LeaderStudyCards"));
    expect(page).toContain(compactSource("Ver estudo"));
    expect(page).toContain(compactSource("line-clamp-3"));
    expect(page).toContain(
      compactSource('canManage ? <div className="space-y-4">')
    );
    expect(page).toContain(compactSource("<StudyReaderDialog"));
    expect(page).toContain(compactSource("canManage={false}"));
    expect(page).toContain(compactSource("Adicionar estudo pronto"));
    expect(page).toContain(compactSource("Responsáveis pelos estudos"));
  });

  it("mantém a mesma biblioteca e valida o asset no tenant antes de associá-lo", () => {
    expect(page).not.toContain(compactSource("ReadyStudyLibrary"));
    expect(router).toContain(compactSource("createReadyCellStudy"));
    expect(db).toContain(
      compactSource("eq(mediaAssets.churchId, data.churchId)")
    );
    expect(db).toContain(
      compactSource('eq(mediaAssets.purpose, "cell_study_attachment")')
    );
  });
});
