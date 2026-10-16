#!/usr/bin/env node
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL_MISSING_FROM_PROTECTED_RUNTIME");

const churchId = Number(process.env.EXPLAIN_CHURCH_ID || 1);
const accountId = Number(process.env.EXPLAIN_ACCOUNT_ID || 1);
const startDate = process.env.EXPLAIN_START_DATE || "2026-10-01";
const endDate = process.env.EXPLAIN_END_DATE || "2026-10-31";

if (!Number.isInteger(churchId) || !Number.isInteger(accountId)) {
  throw new Error("EXPLAIN_IDS_MUST_BE_INTEGER_FIXTURES");
}
if (
  !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
  !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
) {
  throw new Error("EXPLAIN_DATES_MUST_BE_ISO_CIVIL_DATES");
}

const connection = await mysql.createConnection({
  uri: databaseUrl,
  multipleStatements: false,
});
try {
  const [indexRows] = await connection.query(
    `SELECT INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
     FROM information_schema.statistics
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'financial_transactions'
       AND INDEX_NAME = 'financial_transactions_church_date_idx'
     ORDER BY SEQ_IN_INDEX`
  );
  console.log("INDEX_0085_STATE=" + JSON.stringify(indexRows));

  const [planRows] = await connection.execute(
    `EXPLAIN
     SELECT
       ft.id,
       ft.churchId,
       ft.accountId,
       ft.categoryId,
       ft.type,
       ft.amountCents,
       ft.transactionDate,
       ft.status,
       ft.createdAt
     FROM financial_transactions AS ft
     INNER JOIN financial_accounts AS fa
       ON fa.id = ft.accountId
      AND fa.churchId = ?
     INNER JOIN financial_categories AS fc
       ON fc.id = ft.categoryId
      AND fc.churchId = ?
     WHERE ft.churchId = ?
       AND ft.transactionDate >= ?
       AND ft.transactionDate <= ?
       AND ft.accountId = ?
       AND ft.status <> 'rascunho'
     ORDER BY ft.transactionDate DESC, ft.createdAt DESC`,
    [churchId, churchId, churchId, startDate, endDate, accountId]
  );
  console.log("EXPLAIN_PLAN=" + JSON.stringify(planRows));
} finally {
  await connection.end();
}
