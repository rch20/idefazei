import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type LedgerEntry = {
  id: string;
  file: string;
  sha256: string;
};

type MigrationLedger = {
  drizzleJournalBoundary: { idx: number; tag: string };
  entries: LedgerEntry[];
};

const root = resolve(import.meta.dirname, "..");
const ledger = JSON.parse(
  readFileSync(resolve(root, "drizzle/custom-migrations.json"), "utf8")
) as MigrationLedger;

describe("custom migration ledger", () => {
  it("keeps the custom sequence ordered after the Drizzle boundary", () => {
    expect(ledger.drizzleJournalBoundary).toEqual({
      idx: 67,
      tag: "0067_closed_blue_shield",
    });

    const ids = ledger.entries.map(entry => entry.id);
    expect(ids).toEqual([...ids].sort());
    expect(ids).toContain("0082");
    expect(ids).toContain("0083");
    expect(ids).toContain("0084");
    expect(ids).toContain("0085");
    expect(ids).toContain("0086");
  });

  it.each([
    ["0082", "drizzle/0082_church_email_verification.sql"],
    ["0084", "drizzle/0084_online_contributions.sql"],
    ["0085", "drizzle/0085_financial_transaction_date_index.sql"],
    ["0086", "drizzle/0086_online_contribution_thank_you_message.sql"],
  ])("has the recorded checksum for migration %s", (id, file) => {
    const entry = ledger.entries.find(candidate => candidate.id === id);
    expect(entry).toMatchObject({ id, file });

    const actual = createHash("sha256")
      .update(readFileSync(resolve(root, file)))
      .digest("hex");
    expect(entry?.sha256).toBe(actual);
  });
});
