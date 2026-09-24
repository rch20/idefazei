import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("runtime empacotado da importação Excel", () => {
  it("define require via createRequire no bundle ESM", () => {
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as { scripts?: { build?: string } };
    const build = packageJson.scripts?.build ?? "";

    expect(build).toContain("server/foundationImportRuntime.ts");
    expect(build).toContain("--format=esm");
    expect(build).toContain("createRequire");
    expect(build).toContain("const require = createRequire(import.meta.url)");
  });
});
