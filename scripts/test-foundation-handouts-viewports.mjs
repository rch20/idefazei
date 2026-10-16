import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "@playwright/test";

const root = process.cwd();
const output = path.resolve(
  root,
  process.env.FOUNDATION_QA_OUTPUT_DIR || "artifacts/foundation-handouts-matrix"
);
await fs.mkdir(output, { recursive: true });
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "foundation-handouts-"));
const files = new Map();
let server, browser;
const results = [];
const errors = [];
const requests = [];
try {
  await build({
    stdin: {
      contents: `import {createRoot} from 'react-dom/client';import {FoundationStudyHandouts} from './client/src/pages/foundation/FoundationStudyHandouts';import {createFoundationTheme} from './client/src/pages/foundation/FoundationTheme';createRoot(document.getElementById('root')).render(<main className='mx-auto max-w-5xl space-y-4 p-4 sm:p-6'><h1 className='text-xl font-semibold'>Estudos</h1><div className='rounded-xl border p-4'><p className='font-semibold'>Preparar um estudo</p><p className='text-sm text-muted-foreground'>O estudo começa como rascunho.</p></div><FoundationStudyHandouts theme={createFoundationTheme('#8b2453','#f6e3a2')}/><p className='text-sm text-muted-foreground'>Fixture isolada do componente real, sem sessão ou banco.</p></main>);`,
      resolveDir: root,
      loader: "tsx",
    },
    bundle: true,
    outfile: path.join(temp, "app.js"),
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    alias: { "@": path.join(root, "client/src") },
    plugins: [
      {
        name: "isolated-pdf-urls",
        setup(b) {
          b.onResolve({ filter: /\.pdf\?url$/ }, args => ({
            path: args.path
              .replace("@/", path.join(root, "client/src/"))
              .replace(/\?url$/, ""),
            namespace: "handout",
          }));
          b.onLoad({ filter: /.*/, namespace: "handout" }, async args => {
            const bytes = await fs.readFile(args.path);
            const hash = crypto
              .createHash("sha256")
              .update(bytes)
              .digest("hex");
            const url = `/assets/${path.basename(args.path, ".pdf")}-${hash.slice(0, 8)}.pdf`;
            files.set(url, { bytes, hash });
            return {
              contents: `export default ${JSON.stringify(url)};`,
              loader: "js",
            };
          });
        },
      },
    ],
    logLevel: "silent",
  });
  const assets = await fs.readdir(path.join(root, "dist/public/assets"));
  const css = await fs.readFile(
    path.join(
      root,
      "dist/public/assets",
      assets.find(f => /^index-.*\.css$/.test(f))
    )
  );
  const js = await fs.readFile(path.join(temp, "app.js"));
  server = http.createServer((req, res) => {
    requests.push({ method: req.method, path: req.url });
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end();
      return;
    }
    if (req.url === "/app.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(js);
    } else if (req.url === "/style.css") {
      res.setHeader("Content-Type", "text/css");
      res.end(css);
    } else if (files.has(req.url)) {
      res.setHeader("Content-Type", "application/pdf");
      res.end(files.get(req.url).bytes);
    } else if (req.url === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/app.js"></script></body></html>'
      );
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Asset not found");
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  for (const [width, height] of [
    [375, 812],
    [390, 844],
    [768, 1024],
    [1280, 800],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      acceptDownloads: true,
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const request = route.request();
      assert.equal(request.method(), "GET");
      assert.equal(new URL(request.url()).origin, base);
      return route.continue();
    });
    await page.goto(base);
    const details = page.locator("details");
    await details.locator("summary").waitFor();
    assert.equal(
      await page.getByRole("link").count(),
      0,
      "Closed handouts must not expose visible links"
    );
    assert.equal(
      requests.filter(r => r.path.endsWith(".pdf")).length,
      width === 375 ? 0 : results.length * 2,
      "PDFs load only on click"
    );
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    assert.equal(await details.getAttribute("open"), "");
    const links = page.getByRole("link");
    assert.equal(await links.count(), 2);
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      ),
      true
    );
    await page.screenshot({
      path: path.join(output, `handouts-${width}.png`),
      fullPage: true,
    });
    const downloads = [];
    for (const label of [
      "Simplificado — 2 páginas PDF",
      "Completo — 6 páginas PDF",
    ]) {
      const link = page.getByRole("link", { name: label, exact: true });
      const box = await link.boundingBox();
      assert(box.height >= 44);
      const href = await link.getAttribute("href");
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        link.click(),
      ]);
      assert.equal(await download.failure(), null);
      const bytes = await fs.readFile(await download.path());
      assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
      assert.equal(
        crypto.createHash("sha256").update(bytes).digest("hex"),
        files.get(href).hash
      );
      assert.equal(
        download.suggestedFilename(),
        await link.getAttribute("download")
      );
      downloads.push({
        filename: download.suggestedFilename(),
        bytes: bytes.length,
        hash: files.get(href).hash,
      });
    }
    await details.locator("summary").click();
    assert.equal(await page.getByRole("link").count(), 0);
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      ),
      true
    );
    assert.equal(errors.length, 0);
    results.push({
      viewport: `${width}x${height}`,
      noOverflow: true,
      keyboardOpen: true,
      closedVisibility: true,
      noPageErrors: true,
      downloads,
    });
    console.log(`HANDOUT_VIEWPORT_PASS=${width}x${height}`);
    await context.close();
  }
  assert(requests.every(r => r.method === "GET"));
  await fs.writeFile(
    path.join(output, "summary.json"),
    JSON.stringify(
      {
        results,
        pageErrors: errors,
        writes: 0,
        pdfRequests: requests.filter(r => r.path.endsWith(".pdf")).length,
        scope: "isolated-real-component-no-auth-no-db",
      },
      null,
      2
    ) + "\n"
  );
  console.log(`HANDOUT_MATRIX_PASS=${results.length}\nOUTPUT=${output}`);
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await fs.rm(temp, { recursive: true, force: true });
}
