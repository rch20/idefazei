import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("entrega segura de assets e recuperação de bootstrap", () => {
  const staticSource = readFileSync(resolve(process.cwd(), "server/_core/vite.ts"), "utf8");
  const indexSource = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");

  it("não transforma um chunk ausente em index.html com HTTP 200", () => {
    expect(staticSource).toContain('app.use("/assets", express.static(path.join(distPath, "assets")))');
    expect(staticSource).toContain('app.use("/assets", (_req, res)');
    expect(staticSource).toContain('res.status(404).type("text/plain").send("Asset not found")');
    expect(staticSource.indexOf('app.use("/assets", (_req, res)')).toBeLessThan(staticSource.indexOf('app.use(express.static(distPath))'));
  });

  it("tenta uma única recarga com cache-buster para módulos antigos", () => {
    expect(indexSource).toContain('automaticRecoveryKey = "ide_fazei_bootstrap_recovery_v1"');
    expect(indexSource).toContain('freshUrl.searchParams.set("ide_fazei_reload", String(Date.now()))');
    expect(indexSource).toContain('sessionStorage.getItem(automaticRecoveryKey) === "1"');
    expect(indexSource).toContain('sessionStorage.removeItem(automaticRecoveryKey)');
    expect(indexSource).toContain('window.setTimeout(function () { window.location.replace(freshUrl.toString()); }, 80)');
  });
});
