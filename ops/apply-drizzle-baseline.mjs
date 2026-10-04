import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const projectRoot = process.env.PROJECT_ROOT || process.cwd();
const databaseUrl = process.env.DATABASE_URL;
const migrationsDir = path.join(projectRoot, "drizzle");
const journalPath = path.join(migrationsDir, "meta", "_journal.json");

if (!databaseUrl) throw new Error("DATABASE_URL_MISSING_FROM_PROTECTED_RUNTIME");

function splitSqlStatements(source) {
  const statements = [];
  let start = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === quote && next === quote) {
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === "-" && next === "-" && (source[index + 2] === " " || source[index + 2] === "\n" || source[index + 2] === "\r" || source[index + 2] === "\t")) {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "#") {
      lineComment = true;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if (char === ";") {
      const statement = source.slice(start, index).trim();
      if (statement) statements.push(statement);
      start = index + 1;
    }
  }

  const finalStatement = source.slice(start).trim();
  if (finalStatement) statements.push(finalStatement);
  return statements;
}

const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
if (!Array.isArray(journal.entries) || journal.entries.length === 0) {
  throw new Error("DRIZZLE_JOURNAL_EMPTY");
}

const knownMigrations = new Map();
for (const entry of journal.entries) {
  const filePath = path.join(migrationsDir, `${entry.tag}.sql`);
  const source = fs.readFileSync(filePath, "utf8");
  const hash = crypto.createHash("sha256").update(source).digest("hex");
  knownMigrations.set(hash, { entry, source, filePath });
}

const connection = await mysql.createConnection({ uri: databaseUrl, multipleStatements: false });
try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    )
  `);

  const [rows] = await connection.query(
    "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at ASC, id ASC",
  );
  const appliedHashes = new Set();
  for (const row of rows) {
    if (!knownMigrations.has(row.hash)) {
      throw new Error(`UNKNOWN_DRIZZLE_MIGRATION_HASH:${row.hash}`);
    }
    appliedHashes.add(row.hash);
  }

  for (const entry of journal.entries) {
    const filePath = path.join(migrationsDir, `${entry.tag}.sql`);
    const source = fs.readFileSync(filePath, "utf8");
    const hash = crypto.createHash("sha256").update(source).digest("hex");
    if (appliedHashes.has(hash)) {
      console.log(`DRIZZLE_BASELINE_${entry.tag}_ALREADY_APPLIED`);
      continue;
    }

    const segments = source
      .split("--> statement-breakpoint")
      .flatMap(segment => splitSqlStatements(segment));
    if (segments.length === 0) throw new Error(`DRIZZLE_BASELINE_EMPTY:${entry.tag}`);

    console.log(`DRIZZLE_BASELINE_${entry.tag}_APPLYING statements=${segments.length}`);
    for (const statement of segments) {
      await connection.query(statement);
    }
    await connection.execute(
      "INSERT INTO __drizzle_migrations (`hash`, `created_at`) VALUES (?, ?)",
      [hash, entry.when],
    );
    appliedHashes.add(hash);
    console.log(`DRIZZLE_BASELINE_${entry.tag}_APPLIED`);
  }
} finally {
  await connection.end();
}
