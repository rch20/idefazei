#!/usr/bin/env node
/**
 * Cria o schema do banco de HOMOLOGAÇÃO a partir dos arquivos drizzle/*.sql.
 *
 * - Só roda em banco VAZIO (aborta se já houver tabelas), para nunca sobrescrever dados.
 * - Aplica os arquivos em ordem numérica, incluindo as migrações "custom-additive"
 *   listadas em drizzle/custom-migrations.json (0068 em diante).
 * - Divide cada arquivo em "--> statement-breakpoint", como o drizzle faz; arquivos sem
 *   marcador são divididos por ";" no fim de linha.
 *
 * Uso (dentro do container):
 *   docker compose -f docker-compose.staging.yml exec app node scripts/staging-db-init.mjs
 *
 * ATENÇÃO: este script ainda não foi executado contra um MySQL real. Rode primeiro
 * na homologação (nunca na produção) e confira o resultado.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

const host = new URL(url).hostname;
if (host !== "db") {
  console.error(
    `Recusado: o host do banco é "${host}", não o "db" da homologação. ` +
      "Este script só roda contra o MySQL do docker-compose.staging.yml."
  );
  process.exit(1);
}

const dir = join(process.cwd(), "drizzle");
const files = readdirSync(dir)
  .filter((f) => /^\d{4}_.+\.sql$/.test(f))
  .sort();

if (files.length === 0) {
  console.error(`Nenhum arquivo .sql encontrado em ${dir}.`);
  process.exit(1);
}

const conn = await mysql.createConnection({ uri: url, multipleStatements: false });

try {
  const [tables] = await conn.query("SHOW TABLES");
  if (tables.length > 0) {
    console.error(
      `O banco já tem ${tables.length} tabela(s). Abortado para não sobrescrever dados. ` +
        "Para recomeçar do zero: docker compose -f docker-compose.staging.yml down -v"
    );
    process.exit(1);
  }

  let applied = 0;
  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    const hasBreakpoints = sql.includes("--> statement-breakpoint");
    const statements = (hasBreakpoints ? sql.split("--> statement-breakpoint") : sql.split(/;\s*\n/))
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      try {
        await conn.query(statement);
      } catch (error) {
        console.error(`\nFalha em ${file}:\n${statement.slice(0, 300)}\n`);
        throw error;
      }
    }
    applied += 1;
    console.log(`ok  ${file} (${statements.length} comando(s))`);
  }

  console.log(`\nConcluído: ${applied} arquivo(s) aplicados.`);
} finally {
  await conn.end();
}
