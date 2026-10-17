import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium, webkit } from "@playwright/test";

const root = path.resolve(
  process.env.FOUNDATION_QA_PROJECT_ROOT ||
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
);
const output = path.resolve(
  process.env.FOUNDATION_QA_OUTPUT_DIR ||
    "/home/ubuntu/foundation-handouts-return-20261017/browser-matrix"
);
const viewports = [
  [375, 812],
  [390, 844],
  [768, 1024],
  [1280, 800],
];
const engines = [
  ["chromium", chromium],
  ["webkit", webkit],
];
const timeout = 10_000;

await fs.mkdir(output, { recursive: true });
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "foundation-handouts-"));
const files = new Map();
const compiledModules = new Map();
const requests = [];
const browserRequests = [];
const routeFailures = [];
const expectedRouteFailures = [];
const results = [];
const pageErrors = [];
const browsers = [];
let server;
let base;
let pureChunkPath;
let pureChunkPaths = [];
let appPath = "/app.js";
let cssName;
let failure = null;

const pdfHashByName = new Map([
  [
    "gabarito-fundamentos-simplificado-2-paginas.pdf",
    "b70c090a256f917dd1c14df5a0bad9463b11a767cf643e46f6d52bab6e7b5e8a",
  ],
  [
    "gabarito-fundamentos-completo-6-paginas.pdf",
    "a6a4c2abc2063ce6f021411222d659e684df87e9e3c5f35740f8df3acf66d15c",
  ],
]);

function assetRequest(pathname) {
  return /\.(?:pdf|webp)$/.test(pathname);
}

function parsePath(url) {
  return new URL(url, base || "http://127.0.0.1").pathname;
}

function checkBox(box, width, height, label) {
  assert(box, `${label}: bounding box ausente`);
  assert(box.width >= 0 && box.height >= 0, `${label}: dimensão inválida`);
  assert(box.x >= -1, `${label}: overflow à esquerda`);
  assert(box.y >= -1, `${label}: overflow acima da viewport`);
  assert(box.x + box.width <= width + 1, `${label}: overflow à direita`);
  assert(box.y + box.height <= height + 1, `${label}: overflow abaixo da viewport`);
}

async function waitForImage(page, locator, label) {
  await locator.waitFor({ state: "attached" });
  const handle = await locator.elementHandle();
  assert(handle, `${label}: handle ausente`);
  await page.waitForFunction(
    image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
    handle,
    { timeout }
  );
  const dimensions = await locator.evaluate(image => ({
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
  }));
  assert.equal(dimensions.complete, true, `${label}: imagem incompleta`);
  assert(dimensions.naturalWidth > 0, `${label}: largura natural inválida`);
  assert(dimensions.naturalHeight > 0, `${label}: altura natural inválida`);
}

async function closeExtraPages(context, originalPage) {
  for (const child of context.pages()) {
    if (child !== originalPage && !child.isClosed()) await child.close();
  }
}

async function listFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await listFiles(absolute)));
    else result.push(absolute);
  }
  return result;
}

async function buildFixture() {
  await build({
    stdin: {
      contents: `import {createRoot} from 'react-dom/client';import {FoundationStudyHandouts} from './client/src/pages/foundation/FoundationStudyHandouts';import {createFoundationTheme} from './client/src/pages/foundation/FoundationTheme';createRoot(document.getElementById('root')).render(<main className='mx-auto max-w-5xl space-y-4 p-4 sm:p-6'><h1 className='text-xl font-semibold'>Estudos</h1><div className='rounded-xl border p-4'><p className='font-semibold'>Preparar um estudo</p><p className='text-sm text-muted-foreground'>O estudo começa como rascunho.</p></div><FoundationStudyHandouts theme={createFoundationTheme('#8b2453','#f6e3a2')}/><p className='text-sm text-muted-foreground'>Fixture isolada do componente real, sem sessão ou banco.</p></main>);`,
      resolveDir: root,
      loader: "tsx",
    },
    bundle: true,
    outdir: temp,
    platform: "browser",
    format: "esm",
    splitting: true,
    entryNames: "app",
    chunkNames: "chunks/foundation-handout-pure-[hash]",
    jsx: "automatic",
    alias: { "@": path.join(root, "client/src") },
    plugins: [
      {
        name: "isolated-handout-urls",
        setup(plugin) {
          plugin.onResolve({ filter: /\.(?:pdf|webp)\?url$/ }, args => {
            const source = args.path.replace(/\?url$/, "");
            const resolved = source.startsWith("@/")
              ? path.join(root, "client/src", source.slice(2))
              : path.resolve(args.resolveDir, source);
            return { path: resolved, namespace: "handout-asset" };
          });
          plugin.onLoad(
            { filter: /\.(?:pdf|webp)$/, namespace: "handout-asset" },
            async args => {
              const bytes = await fs.readFile(args.path);
              const ext = path.extname(args.path).slice(1).toLowerCase();
              const hash = crypto.createHash("sha256").update(bytes).digest("hex");
              const url = `/assets/${path.basename(args.path, `.${ext}`)}-${hash.slice(0, 8)}.${ext}`;
              files.set(url, {
                bytes,
                hash,
                ext,
                mime: ext === "pdf" ? "application/pdf" : "image/webp",
              });
              return {
                contents: `export default ${JSON.stringify(url)};`,
                loader: "js",
              };
            }
          );
        },
      },
    ],
    logLevel: "silent",
  });

  const cssAssets = await fs.readdir(path.join(root, "dist/public/assets"));
  cssName = cssAssets
    .filter(name => /^index-.*\.css$/.test(name))
    .sort()
    .at(-1);
  assert(cssName, "CSS_BUILD_REQUIRED: dist/public/assets/index-*.css não encontrado");
  const css = await fs.readFile(path.join(root, "dist/public/assets", cssName));

  const generatedFiles = await listFiles(temp);
  const relativeFiles = generatedFiles.map(absolute =>
    path.relative(temp, absolute).split(path.sep).join("/")
  );
  assert(relativeFiles.includes("app.js"), "ESM_ENTRY_REQUIRED: app.js não gerado");
  const pureChunks = relativeFiles.filter(
    relative =>
      relative.startsWith("chunks/foundation-handout-pure-") &&
      relative.endsWith(".js")
  );
  assert(pureChunks.length >= 1, "ESM_PURE_CHUNK_REQUIRED: nenhum chunk puro gerado");
  pureChunkPaths = pureChunks.map(relative => `/${relative}`);

  for (const absolute of generatedFiles) {
    const relative = path.relative(temp, absolute).split(path.sep).join("/");
    const pathname = `/${relative}`;
    assert(pathname.endsWith(".js"), `módulo compilado inesperado: ${pathname}`);
    compiledModules.set(pathname, {
      bytes: await fs.readFile(absolute),
      mime: "text/javascript; charset=utf-8",
    });
  }
  assert(compiledModules.has(appPath), "app.js não está disponível para GET local");
  const entrySource = compiledModules.get(appPath).bytes.toString("utf8");
  const dynamicChunk = entrySource.match(
    /import\("(\.\/chunks\/foundation-handout-pure-[^"]+\.js)"\)/
  );
  assert(dynamicChunk, "ESM_LAZY_IMPORT_REQUIRED: app.js não referencia chunk puro por import() ESM");
  pureChunkPath = `/${dynamicChunk[1].replace(/^\.\//, "")}`;
  assert(
    pureChunkPaths.includes(pureChunkPath),
    `chunk lazy não pertence ao grafo puro: ${pureChunkPath}`
  );
  assert(
    pureChunkPaths.every(chunkPath => compiledModules.has(chunkPath)),
    "algum módulo do grafo puro não está disponível para GET local"
  );
  const pureSource = pureChunkPaths
    .map(chunkPath => compiledModules.get(chunkPath).bytes.toString("utf8"))
    .join("\n");
  assert(
    /simplificado|Páginas do gabarito/.test(pureSource),
    "chunk puro não contém o módulo de páginas compilado"
  );

  server = http.createServer((req, res) => {
    const parsed = new URL(req.url || "/", "http://127.0.0.1");
    const pathname = parsed.pathname;
    const entry = { method: req.method, path: pathname, status: 200 };
    requests.push(entry);
    if (req.method !== "GET") {
      entry.status = 405;
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("GET only");
      return;
    }
    const module = compiledModules.get(pathname);
    if (module) {
      res.writeHead(200, {
        "Content-Type": module.mime,
        "Cache-Control": "no-store",
      });
      res.end(module.bytes);
    } else if (pathname === "/style.css") {
      res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
      res.end(css);
    } else if (files.has(pathname)) {
      const asset = files.get(pathname);
      res.writeHead(200, { "Content-Type": asset.mime });
      res.end(asset.bytes);
    } else if (pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>'
      );
    } else {
      entry.status = 404;
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Asset not found");
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}

function assetRequestsSince(start) {
  return browserRequests.slice(start).filter(request => assetRequest(request.path));
}

function moduleRequestsSince(start) {
  return browserRequests
    .slice(start)
    .filter(request => request.path === pureChunkPath);
}

function assertNoPreviewRequests(start, label) {
  const previewRequests = browserRequests
    .slice(start)
    .filter(request => assetRequest(request.path) || request.path === pureChunkPath);
  assert.equal(
    previewRequests.length,
    0,
    `${label}: módulo/imagem/PDF solicitado antes do clique: ${JSON.stringify(previewRequests)}`
  );
}

async function createScenario(browserName, browser, width, height, mode) {
  const context = await browser.newContext({
    viewport: { width, height },
    acceptDownloads: true,
  });
  context.setDefaultTimeout(timeout);
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  const caseErrors = [];
  let markDelayedChunkEntered;
  let releaseDelayedChunk;
  const delayedChunkEntered = new Promise(resolve => {
    markDelayedChunkEntered = resolve;
  });
  const delayedChunkRelease = new Promise(resolve => {
    releaseDelayedChunk = resolve;
  });
  let delayedChunkWasReleased = false;

  const addPageErrorListener = (observedPage, prefix = "") => {
    observedPage.on("pageerror", error => {
      const message = `${prefix}${error.message}`;
      caseErrors.push(message);
      pageErrors.push({
        browser: browserName,
        viewport: `${width}x${height}`,
        scenario: mode,
        message,
      });
    });
  };
  addPageErrorListener(page);
  page.on("popup", popup => {
    addPageErrorListener(popup, "popup: ");
  });
  page.on("request", request => {
    browserRequests.push({
      browser: browserName,
      viewport: `${width}x${height}`,
      scenario: mode,
      method: request.method(),
      path: parsePath(request.url()),
    });
  });
  page.on("requestfailed", request => {
    const pathname = parsePath(request.url());
    const record = {
      browser: browserName,
      viewport: `${width}x${height}`,
      scenario: mode,
      method: request.method(),
      path: pathname,
      failure: request.failure()?.errorText || "unknown",
    };
    if (mode === "fail" && pathname === pureChunkPath) {
      expectedRouteFailures.push(record);
    } else {
      routeFailures.push(record);
    }
  });
  await page.route("**/*", async route => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (request.method() !== "GET") {
      routeFailures.push({
        browser: browserName,
        viewport: `${width}x${height}`,
        scenario: mode,
        reason: "non-GET",
        method: request.method(),
        path: requestUrl.pathname,
      });
      await route.abort();
      return;
    }
    if (requestUrl.origin !== base) {
      routeFailures.push({
        browser: browserName,
        viewport: `${width}x${height}`,
        scenario: mode,
        reason: "external-origin",
        method: request.method(),
        path: requestUrl.pathname,
      });
      await route.abort();
      return;
    }
    if (requestUrl.pathname === pureChunkPath && mode === "fail") {
      await route.abort("failed");
      return;
    }
    if (requestUrl.pathname === pureChunkPath && mode === "delay") {
      markDelayedChunkEntered();
      await delayedChunkRelease;
      await route.continue();
      return;
    }
    await route.continue();
  });

  return {
    context,
    page,
    caseErrors,
    delayedChunkEntered,
    releaseDelayedChunk: () => {
      if (!delayedChunkWasReleased) {
        delayedChunkWasReleased = true;
        releaseDelayedChunk();
      }
    },
    wasDelayedChunkReleased: () => delayedChunkWasReleased,
  };
}

async function openSchool(page, requestStart, label) {
  const initialUrl = `${base}/`;
  await page.goto(initialUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
  const details = page.locator("details");
  const summary = details.locator("summary");
  await summary.waitFor({ state: "visible" });
  assert.equal(await page.getByRole("link").count(), 0, `${label}: links inesperados antes da seleção`);
  assertNoPreviewRequests(requestStart, label);
  if (!(await details.evaluate(element => element.open))) await summary.click();
  assert.equal(await details.getAttribute("open"), "", `${label}: seção de gabaritos não abriu`);
  return { initialUrl, details, summary };
}

const handouts = [
  {
    key: "simplificado",
    label: "Simplificado — 2 páginas",
    filename: "gabarito-fundamentos-simplificado-2-paginas.pdf",
    pages: 2,
  },
  {
    key: "completo",
    label: "Completo — 6 páginas",
    filename: "gabarito-fundamentos-completo-6-paginas.pdf",
    pages: 6,
  },
];

async function runNormal(browserName, browser, width, height) {
  const scenario = await createScenario(browserName, browser, width, height, "normal");
  const { page, context, caseErrors } = scenario;
  const requestStart = browserRequests.length;
  try {
    const { initialUrl } = await openSchool(
      page,
      requestStart,
      `${browserName}:${width}x${height}:normal`
    );
    const details = page.locator("details");
    const modelResults = [];

    async function openModel(model) {
      const opener = page.getByRole("button", { name: `${model.label} PDF`, exact: true });
      await opener.scrollIntoViewIfNeeded();
      const openerScrollY = await page.evaluate(() => window.scrollY);
      await opener.click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ state: "visible" });
      assert.equal(page.url(), initialUrl, "URL mudou ao abrir a prévia");
      assert.equal(
        await dialog.getByRole("button", { name: "Voltar à Escola", exact: true }).count(),
        1
      );
      assert.equal(
        await dialog.getByRole("button", { name: "Fechar gabarito", exact: true }).count(),
        1
      );
      assert.equal(await dialog.getByRole("link", { name: "Baixar PDF", exact: true }).count(), 1);
      assert.equal(await dialog.locator("iframe, embed, object").count(), 0, "plugin externo na prévia");
      return { dialog, opener, openerScrollY };
    }

    async function inspectModel(model, screenshot) {
      const { dialog, opener, openerScrollY } = await openModel(model);
      const region = dialog.getByRole("region", { name: "Páginas do gabarito", exact: true });
      const images = dialog.locator("img");
      assert.equal(await images.count(), model.pages, `${model.key}: quantidade de páginas incorreta`);
      const first = images.first();
      const last = images.last();
      assert.equal(await first.getAttribute("loading"), "eager", `${model.key}: primeira página não eager`);
      assert.equal(await last.getAttribute("loading"), "lazy", `${model.key}: última página não lazy`);
      await waitForImage(page, first, `${model.key} primeira página`);

      const link = dialog.getByRole("link", { name: "Baixar PDF", exact: true });
      const href = await link.getAttribute("href");
      assert(href, `${model.key}: href ausente`);
      const assetPath = new URL(href, base).pathname;
      const pdf = files.get(assetPath);
      assert(pdf, `${model.key}: href não corresponde a asset compilado`);
      assert.equal(pdf.ext, "pdf");
      assert.equal(await link.getAttribute("download"), model.filename);
      assert.equal(await link.getAttribute("type"), "application/pdf");
      assert.equal(await link.getAttribute("target"), "_blank");
      const rel = (await link.getAttribute("rel"))?.split(/\s+/).filter(Boolean) || [];
      assert(rel.includes("noopener"), `${model.key}: rel sem noopener`);
      assert(rel.includes("noreferrer"), `${model.key}: rel sem noreferrer`);

      await region.evaluate(element => {
        element.scrollTop = element.scrollHeight;
        element.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
      await last.scrollIntoViewIfNeeded();
      await waitForImage(page, last, `${model.key} última página`);
      await region.evaluate(element => {
        element.scrollTop = element.scrollHeight;
        element.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
      const scrollState = await region.evaluate(element => ({
        top: element.scrollTop,
        max: element.scrollHeight - element.clientHeight,
      }));
      assert(scrollState.top >= scrollState.max - 2, `${model.key}: região não chegou ao fim`);

      const header = dialog.locator("header");
      const headerBox = await header.boundingBox();
      checkBox(headerBox, width, height, `${model.key} header após scroll fim`);
      const dialogBox = await dialog.boundingBox();
      checkBox(dialogBox, width, height, `${model.key} modal`);
      const overflow = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      assert(overflow.documentWidth <= overflow.viewportWidth, `${model.key}: overflow horizontal da página`);
      const boxes = await dialog.locator("header, [role=region], button, a").evaluateAll(elements =>
        elements.map(element => {
          const box = element.getBoundingClientRect();
          return { tag: element.tagName, x: box.x, y: box.y, width: box.width, height: box.height };
        })
      );
      boxes.forEach((box, index) => checkBox(box, width, height, `${model.key} elemento ${index}`));

      const pagesBeforeDownload = context.pages().length;
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout }),
        link.click(),
      ]);
      assert.equal(await download.failure(), null, `${model.key}: download falhou`);
      const downloadPath = await download.path();
      assert(downloadPath, `${model.key}: caminho de download ausente`);
      const bytes = await fs.readFile(downloadPath);
      assert.equal(bytes.subarray(0, 5).toString(), "%PDF-", `${model.key}: assinatura PDF inválida`);
      const downloadHash = crypto.createHash("sha256").update(bytes).digest("hex");
      assert.equal(downloadHash, pdf.hash, `${model.key}: hash do PDF divergente`);
      assert.equal(downloadHash, pdfHashByName.get(model.filename), `${model.key}: hash aprovado divergente`);
      assert.equal(await download.suggestedFilename(), model.filename);
      assert.equal(page.url(), initialUrl, `${model.key}: página original substituída pelo target blank`);
      assert(context.pages().length >= pagesBeforeDownload, `${model.key}: contexto perdeu a página original`);
      await closeExtraPages(context, page);

      if (screenshot) {
        await page.screenshot({
          path: path.join(output, `modal-${browserName}-${width}-${model.key}.png`),
          animations: "disabled",
          fullPage: false,
        });
      }

      return {
        key: model.key,
        pages: model.pages,
        firstPageLoaded: true,
        lastPageLoaded: true,
        headerInViewportAfterEnd: true,
        noOverflow: true,
        download: {
          filename: await download.suggestedFilename(),
          bytes: bytes.length,
          sha256: downloadHash,
          targetBlank: true,
          originalUrlPreserved: true,
        },
        dialog,
        opener,
        openerScrollY,
      };
    }

    async function closeModel(model, inspected, method) {
      if (method === "back") {
        await inspected.dialog.getByRole("button", { name: "Voltar à Escola", exact: true }).click();
      } else if (method === "close") {
        await inspected.dialog.getByRole("button", { name: "Fechar gabarito", exact: true }).click();
      } else {
        await page.keyboard.press("Escape");
      }
      await inspected.dialog.waitFor({ state: "hidden" });
      assert.equal(page.url(), initialUrl, `${model.key}: URL mudou ao fechar (${method})`);
      assert.equal(await page.getByRole("dialog").count(), 0, `${model.key}: dialog ainda aberto (${method})`);
      const openerHandle = await inspected.opener.elementHandle();
      assert(openerHandle, `${model.key}: opener foi desmontado (${method})`);
      await page.waitForFunction(element => element === document.activeElement, openerHandle, { timeout });
      const scrollY = await page.evaluate(() => window.scrollY);
      assert(Math.abs(scrollY - inspected.openerScrollY) <= 1, `${model.key}: posição da Escola não preservada (${method})`);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
        true,
        `${model.key}: overflow após fechar (${method})`
      );
    }

    const simplified = await inspectModel(handouts[0], width === 375 || width === 1280);
    await closeModel(handouts[0], simplified, "back");
    const complete = await inspectModel(handouts[1], width === 375 || width === 1280);
    await closeModel(handouts[1], complete, "close");
    const escapeCycle = await openModel(handouts[0]);
    await closeModel(handouts[0], escapeCycle, "escape");

    assert.equal(moduleRequestsSince(requestStart).length, 1, "chunk puro não foi lazy ou foi carregado mais de uma vez");
    assert.equal(caseErrors.length, 0, `pageerror(s): ${caseErrors.join(" | ")}`);
    const assetRequests = assetRequestsSince(requestStart);
    modelResults.push(simplified, complete);
    return {
      noAssetRequestsBeforeSelection: true,
      noPreviewModuleImagesPdfBeforeClick: true,
      pureChunkLoadedOnDemand: true,
      pureChunkRequests: moduleRequestsSince(requestStart).length,
      pdfRequests: assetRequests.filter(request => request.path.endsWith(".pdf")).length,
      webpRequests: assetRequests.filter(request => request.path.endsWith(".webp")).length,
      models: modelResults.map(({ dialog, opener, openerScrollY, ...model }) => model),
      closeRefocus: { voltar: true, fechar: true, escape: true },
      urlPreserved: true,
      noOverflow: true,
      noPageErrors: true,
      getOnly: true,
    };
  } finally {
    await context.close().catch(() => {});
  }
}

async function runChunkFailure(browserName, browser, width, height) {
  const scenario = await createScenario(browserName, browser, width, height, "fail");
  const { page, context, caseErrors } = scenario;
  const requestStart = browserRequests.length;
  const expectedFailureStart = expectedRouteFailures.length;
  try {
    const { initialUrl } = await openSchool(
      page,
      requestStart,
      `${browserName}:${width}x${height}:fail`
    );
    const opener = page.getByRole("button", { name: `${handouts[0].label} PDF`, exact: true });
    await opener.scrollIntoViewIfNeeded();
    const openerHandle = await opener.elementHandle();
    assert(openerHandle, "falha injetada: opener ausente");
    await opener.click();
    const alert = page.getByRole("alert");
    await alert.waitFor({ state: "visible" });
    assert.match(await alert.textContent(), /Não foi possível carregar o gabarito/);
    assert.equal(await page.getByRole("dialog").count(), 0, "falha injetada abriu dialog");
    assert.equal(page.url(), initialUrl, "falha injetada alterou URL");
    assert.equal(assetRequestsSince(requestStart).length, 0, "falha injetada solicitou imagem/PDF");
    assert.equal(moduleRequestsSince(requestStart).length, 1, "falha injetada não atingiu somente o chunk puro");

    const expectedFailures = expectedRouteFailures.slice(expectedFailureStart);
    assert.equal(expectedFailures.length, 1, `falha de request esperada ausente: ${JSON.stringify(expectedFailures)}`);
    assert.equal(expectedFailures[0].path, pureChunkPath, "request falho não era o chunk puro");
    const back = alert.getByRole("button", { name: "Voltar à Escola", exact: true });
    await back.click();
    await page.waitForFunction(
      () => !document.querySelector('[role="alert"]') && !document.querySelector('[role="dialog"]'),
      null,
      { timeout }
    );
    await page.waitForFunction(element => element === document.activeElement, openerHandle, { timeout });
    assert.equal(page.url(), initialUrl, "Voltar após falha alterou URL");
    assert.equal(await page.getByRole("button", { name: `${handouts[0].label} PDF`, exact: true }).count(), 1);
    assert.equal(caseErrors.length, 0, `pageerror(s) na falha esperada: ${caseErrors.join(" | ")}`);
    return {
      injectedOnlyPureChunkFailure: true,
      safeAlert: true,
      noDialogOrAppCrash: true,
      backClosed: true,
      urlPreserved: true,
      refocus: true,
      noPreviewImagesOrPdfs: true,
      expectedRequestFailed: true,
      expectedFailures: expectedFailures.length,
      noPageErrors: true,
    };
  } finally {
    await context.close().catch(() => {});
  }
}

async function runDelayedChunkCancel(browserName, browser, width, height) {
  const scenario = await createScenario(browserName, browser, width, height, "delay");
  const { page, context, caseErrors } = scenario;
  const requestStart = browserRequests.length;
  try {
    const { initialUrl } = await openSchool(
      page,
      requestStart,
      `${browserName}:${width}x${height}:delay`
    );
    const opener = page.getByRole("button", { name: `${handouts[0].label} PDF`, exact: true });
    await opener.scrollIntoViewIfNeeded();
    const openerHandle = await opener.elementHandle();
    assert(openerHandle, "cancelamento atrasado: opener ausente");
    await opener.click();
    await page.getByRole("status").waitFor({ state: "visible" });
    await scenario.delayedChunkEntered;

    const chunkFinished = page.waitForEvent("requestfinished", {
      predicate: request => parsePath(request.url()) === pureChunkPath,
      timeout,
    });
    await page.getByRole("status").getByRole("button", { name: "Voltar à Escola", exact: true }).click();
    await page.waitForFunction(
      () => !document.querySelector('[role="status"]') && !document.querySelector('[role="dialog"]'),
      null,
      { timeout }
    );
    await page.waitForFunction(element => element === document.activeElement, openerHandle, { timeout });
    assert.equal(page.url(), initialUrl, "cancelamento atrasado alterou URL antes da liberação");

    scenario.releaseDelayedChunk();
    await chunkFinished;
    await page.evaluate(
      () =>
        new Promise(resolve => {
          requestAnimationFrame(() => resolve());
        })
    );
    assert.equal(scenario.wasDelayedChunkReleased(), true, "resposta do chunk atrasado não foi liberada");
    assert.equal(await page.getByRole("dialog").count(), 0, "chunk atrasado abriu dialog após cancelamento");
    assert.equal(await page.getByRole("status").count(), 0, "status reapareceu após cancelamento");
    assert.equal(await page.getByRole("alert").count(), 0, "alerta inesperado após cancelamento");
    await page.evaluate(
      () =>
        new Promise(resolve => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        })
    );
    assert.equal(await page.getByRole("dialog").count(), 0, "dialog abriu depois de liberar chunk cancelado");
    assert.equal(page.url(), initialUrl, "cancelamento atrasado alterou URL depois da liberação");
    assert.equal(await page.getByRole("button", { name: `${handouts[0].label} PDF`, exact: true }).count(), 1);
    assert.equal(assetRequestsSince(requestStart).length, 0, "cancelamento atrasado solicitou imagem/PDF");
    assert.equal(moduleRequestsSince(requestStart).length, 1, "cancelamento atrasado carregou chunk mais de uma vez");
    assert.equal(caseErrors.length, 0, `pageerror(s) no cancelamento: ${caseErrors.join(" | ")}`);
    return {
      delayedOnlyPureChunk: true,
      cancelledWithBack: true,
      delayedResponseReleased: true,
      noDialogAfterRelease: true,
      noPreviewImagesOrPdfs: true,
      urlPreserved: true,
      refocus: true,
      noPageErrors: true,
    };
  } finally {
    scenario.releaseDelayedChunk();
    await context.close().catch(() => {});
  }
}

function browserResultFor(browserName, viewport, result) {
  return { browser: browserName, viewport, ...result };
}

try {
  await buildFixture();
  for (const [browserName, engine] of engines) {
    let browser;
    try {
      browser = await engine.launch({ headless: true });
    } catch (error) {
      if (browserName === "chromium") throw error;
      results.push({ browser: browserName, available: false, reason: String(error.message || error) });
      continue;
    }
    browsers.push(browser);
    for (const [width, height] of viewports) {
      const viewport = `${width}x${height}`;
      const result = await runNormal(browserName, browser, width, height);
      results.push(browserResultFor(browserName, viewport, result));
      console.log(`HANDOUT_VIEWPORT_PASS=${browserName}:${viewport}`);
    }
    const negativeViewport = viewports[0];
    const negativeViewportLabel = `${negativeViewport[0]}x${negativeViewport[1]}`;
    const failureResult = await runChunkFailure(
      browserName,
      browser,
      negativeViewport[0],
      negativeViewport[1]
    );
    results.push(browserResultFor(browserName, negativeViewportLabel, { scenario: "chunk-failure", ...failureResult }));
    console.log(`HANDOUT_NEGATIVE_PASS=${browserName}:${negativeViewportLabel}:chunk-failure`);
    const delayResult = await runDelayedChunkCancel(
      browserName,
      browser,
      negativeViewport[0],
      negativeViewport[1]
    );
    results.push(browserResultFor(browserName, negativeViewportLabel, { scenario: "chunk-delay-cancel", ...delayResult }));
    console.log(`HANDOUT_NEGATIVE_PASS=${browserName}:${negativeViewportLabel}:chunk-delay-cancel`);
  }
  assert(results.some(result => result.browser === "chromium" && result.scenario === undefined), "Chromium não executou a matriz normal");
  assert.equal(routeFailures.length, 0, `requisições bloqueadas inesperadas: ${JSON.stringify(routeFailures)}`);
  assert(requests.every(request => request.method === "GET"), "servidor recebeu método diferente de GET");
  assert.equal(pageErrors.length, 0, `pageerrors: ${JSON.stringify(pageErrors)}`);
  assert.equal(expectedRouteFailures.length, 2, `falhas esperadas de chunk: ${JSON.stringify(expectedRouteFailures)}`);
} catch (error) {
  failure = { message: error.message, stack: error.stack };
  process.exitCode = 1;
  console.error(`HANDOUT_MATRIX_FAIL=${error.message}`);
} finally {
  for (const browser of browsers) {
    if (!browser.isConnected()) continue;
    await browser.close().catch(() => {});
  }
  if (server) await new Promise(resolve => server.close(resolve));
  const summary = {
    status: failure ? "failed" : "passed",
    generatedAt: new Date().toISOString(),
    scope: "isolated-real-component-no-auth-no-db-no-vps",
    build: {
      format: "esm",
      splitting: true,
      entry: appPath,
      pureChunk: pureChunkPath,
      modulesServedAs: "GET text/javascript",
      css: cssName,
    },
    normalMatrix: "2 browsers x 4 viewports",
    negativeScenarios: "new page/context per scenario; one 375x812 run per available browser",
    browsers: results.map(result => result.browser).filter((value, index, values) => values.indexOf(value) === index),
    viewports: viewports.map(([width, height]) => `${width}x${height}`),
    results,
    pageErrors,
    routeFailures,
    expectedRouteFailures,
    writes: requests.filter(request => request.method !== "GET").length,
    pdfRequests: requests.filter(request => request.path.endsWith(".pdf")).length,
    webpRequests: requests.filter(request => request.path.endsWith(".webp")).length,
    moduleRequests: requests.filter(request => request.path.endsWith(".js")).length,
    totalRequests: requests.length,
    failure,
  };
  await fs.writeFile(path.join(output, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`OUTPUT=${output}`);
  if (!failure) console.log(`HANDOUT_MATRIX_PASS=${results.filter(result => result.scenario === undefined).length}`);
  await fs.rm(temp, { recursive: true, force: true });
}
