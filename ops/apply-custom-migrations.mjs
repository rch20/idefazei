#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const projectRoot = process.env.PROJECT_ROOT || process.cwd();
const databaseUrl = process.env.DATABASE_URL;
const ledgerPath = path.join(projectRoot, "drizzle", "custom-migrations.json");

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

    if (
      char === "-" &&
      next === "-" &&
      [" ", "\n", "\r", "\t"].includes(source[index + 2])
    ) {
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

function stripLeadingComments(statement) {
  return statement
    .replace(
      /^(?:\s*--[^\n]*(?:\n|$)|\s*#[^\n]*(?:\n|$)|\s*\/\*[\s\S]*?\*\/\s*)+/g,
      ""
    )
    .trim();
}

function unquoteIdentifier(identifier) {
  const value = identifier.trim();
  if (value.startsWith("`") && value.endsWith("`")) {
    return value.slice(1, -1).replaceAll("``", "`");
  }
  return value;
}

function quoteIdentifier(identifier) {
  return `\`${identifier.replaceAll("`", "``")}\``;
}

async function executeCompatibleStatement(connection, statement, migrationId) {
  const normalized = stripLeadingComments(statement);

  const addColumnMatch = normalized.match(
    /^ALTER\s+TABLE\s+(`[^`]+`|[A-Za-z0-9_]+)\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+(`[^`]+`|[A-Za-z0-9_]+)\s+([\s\S]+)$/i
  );
  if (addColumnMatch) {
    const tableName = unquoteIdentifier(addColumnMatch[1]);
    const columnName = unquoteIdentifier(addColumnMatch[2]);
    const [rows] = await connection.execute(
      `SELECT 1 FROM information_schema.columns WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
      [tableName, columnName]
    );
    if (rows.length > 0) {
      console.log(
        `CUSTOM_MIGRATION_${migrationId}_COLUMN_${tableName}_${columnName}_ALREADY_PRESENT`
      );
      return;
    }
    await connection.query(
      `ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${quoteIdentifier(columnName)} ${addColumnMatch[3]}`
    );
    return;
  }

  const indexMatch = normalized.match(
    /^CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+(`[^`]+`|[A-Za-z0-9_]+)\s+ON\s+(`[^`]+`|[A-Za-z0-9_]+)\s+([\s\S]+)$/i
  );
  if (indexMatch) {
    const indexName = unquoteIdentifier(indexMatch[2]);
    const tableName = unquoteIdentifier(indexMatch[3]);
    const [rows] = await connection.execute(
      `SELECT 1 FROM information_schema.statistics WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
      [tableName, indexName]
    );
    if (rows.length > 0) {
      console.log(
        `CUSTOM_MIGRATION_${migrationId}_INDEX_${tableName}_${indexName}_ALREADY_PRESENT`
      );
      return;
    }
    const compatibleSql = normalized.replace(/\s+IF\s+NOT\s+EXISTS\s+/i, " ");
    await connection.query(compatibleSql);
    return;
  }

  await connection.query(statement);
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL_MISSING_FROM_PROTECTED_RUNTIME");
}

const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
if (!Array.isArray(ledger.entries) || ledger.entries.length === 0) {
  throw new Error("CUSTOM_MIGRATION_LEDGER_EMPTY");
}

const connection = await mysql.createConnection({
  uri: databaseUrl,
  multipleStatements: false,
});

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS idefazei_custom_migrations (
      id VARCHAR(8) NOT NULL,
      file VARCHAR(255) NOT NULL,
      sha256 CHAR(64) NOT NULL,
      appliedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB
  `);

  for (const entry of ledger.entries) {
    if (
      !/^\d{4}$/.test(entry.id) ||
      typeof entry.file !== "string" ||
      !/^\w{64}$/.test(entry.sha256)
    ) {
      throw new Error(
        `CUSTOM_MIGRATION_LEDGER_ENTRY_INVALID:${entry.id ?? "unknown"}`
      );
    }

    const migrationPath = path.join(projectRoot, entry.file);
    if (
      !migrationPath.startsWith(`${projectRoot}${path.sep}`) ||
      !fs.existsSync(migrationPath)
    ) {
      throw new Error(`CUSTOM_MIGRATION_FILE_MISSING:${entry.file}`);
    }

    const sql = fs.readFileSync(migrationPath, "utf8");
    const actualSha256 = crypto.createHash("sha256").update(sql).digest("hex");
    if (actualSha256 !== entry.sha256) {
      throw new Error(`CUSTOM_MIGRATION_CHECKSUM_MISMATCH:${entry.id}`);
    }

    const [rows] = await connection.execute(
      "SELECT file, sha256 FROM idefazei_custom_migrations WHERE id = ? LIMIT 1",
      [entry.id]
    );
    const existing = rows[0];
    if (existing) {
      if (existing.file !== entry.file || existing.sha256 !== entry.sha256) {
        throw new Error(
          `CUSTOM_MIGRATION_RECORDED_CHECKSUM_MISMATCH:${entry.id}`
        );
      }
      console.log(`CUSTOM_MIGRATION_${entry.id}_ALREADY_APPLIED`);
      continue;
    }

    const statements = sql
      .split("--> statement-breakpoint")
      .flatMap(segment => splitSqlStatements(segment));
    if (statements.length === 0) {
      throw new Error(`CUSTOM_MIGRATION_EMPTY:${entry.id}`);
    }

    console.log(
      `CUSTOM_MIGRATION_${entry.id}_APPLYING statements=${statements.length}`
    );
    for (const statement of statements) {
      await executeCompatibleStatement(connection, statement, entry.id);
    }
    await connection.execute(
      "INSERT INTO idefazei_custom_migrations (id, file, sha256) VALUES (?, ?, ?)",
      [entry.id, entry.file, entry.sha256]
    );
    console.log(`CUSTOM_MIGRATION_${entry.id}_APPLIED`);
  }
} finally {
  await connection.end();
}
