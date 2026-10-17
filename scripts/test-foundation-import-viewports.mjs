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
  process.env.FOUNDATION_IMPORT_QA_OUTPUT ||
    "/home/ubuntu/foundation-excel-v2-20261017/browser-matrix"
);
await fs.mkdir(output, { recursive: true });
const temp = await fs.mkdtemp(
  path.join(os.tmpdir(), "foundation-import-v2-ui-")
);
const assets = new Map();
const results = [];
const pageErrors = [];
let browser, server;
const preview = {
  draftId: 91,
  expiresAt: "2099-12-31T00:00:00Z",
  sourceFilename: "modelo-sintetico.xlsx",
  payload: {
    templateVersion: 2,
    courseId: 10,
    courseName: "Turma sintética",
    study: {
      title: "Conhecendo o amor de Deus — QA isolado",
      weekStart: "2026-10-19",
      summary: null,
      content: null,
      moduleTitle: null,
      publish: false,
    },
    blocks: ["Leia", "Entenda", "Responda", "Aplique"].map(
      (title, position) => ({
        title,
        position,
        content: `Conteúdo sintético da etapa ${title}.\n\nUm novo parágrafo preservado para revisão.`,
        reflectionPrompt:
          position === 0 ? "Qual atitude expressa esse ensinamento?" : null,
        publish: true,
      })
    ),
    questions: [
      {
        blockTitle: "Responda",
        blockPosition: 2,
        prompt: "Qual atitude demonstra amor?",
        options: [..."abcdef"].map(id => ({
          id,
          label: `Alternativa ${id.toUpperCase()} para revisão editorial`,
        })),
        correctOptionId: "f",
        explanation: "A explicação é apenas conteúdo sintético de QA.",
        publish: true,
      },
    ],
    class: null,
    materials: [],
  },
  summary: {
    templateVersion: 2,
    studyTitle: "Conhecendo o amor de Deus — QA isolado",
    weekStart: "2026-10-19",
    counts: { blocks: 4, questions: 1, materials: 0 },
    classIncluded: false,
    publishStudy: false,
    errors: 0,
    warnings: 0,
    problems: [],
  },
};
if (process.env.FOUNDATION_IMPORT_LONG_CONTENT === "1") {
  preview.payload.study.title += " — " + "titulo".repeat(20);
  preview.payload.study.content =
    "Introdução sintética\n\n" + "ReferenciaEditorial".repeat(60);
  preview.payload.blocks[3].content += "\n\n" + "AplicacaoPratica".repeat(60);
  preview.payload.questions[0].options[5].label +=
    " " + "alternativa".repeat(35);
}
try {
  await build({
    stdin: {
      contents: `import {createRoot} from 'react-dom/client';import {FoundationImportDialog} from './client/src/pages/foundation/FoundationImportDialog';window.__preview=${JSON.stringify(preview)};window.__calls=[];createRoot(document.getElementById('root')).render(<main className='p-4'><h1>Importação — fixture isolada</h1><FoundationImportDialog courseId={10} courseName='Turma sintética' onImported={()=>{window.__calls.push({kind:'imported'});}}/></main>);`,
      resolveDir: root,
      loader: "tsx",
    },
    outfile: path.join(temp, "app.js"),
    bundle: true,
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    alias: { "@": path.join(root, "client/src") },
    logLevel: "silent",
    plugins: [
      {
        name: "isolated-import-adapters",
        setup(b) {
          b.onResolve(
            { filter: /(?:^@\/lib\/trpc$|^@\/lib\/foundationImportUpload$)/ },
            args => ({ path: args.path, namespace: "qa-api" })
          );
          b.onLoad({ filter: /.*/, namespace: "qa-api" }, args => ({
            loader: "js",
            resolveDir: root,
            contents: args.path.endsWith("/trpc")
              ? `import{useState}from'react';function mutation(kind,opts){const[p,setP]=useState(false);return{isPending:p,mutate:async input=>{setP(true);window.__calls.push({kind,input});await Promise.resolve();opts?.onSuccess?.({studyId:101});setP(false);}}}export const trpc={foundationImport:{confirm:{useMutation:opts=>mutation('confirm',opts)},cancel:{useMutation:opts=>mutation('cancel',opts)}}};`
              : `export function getFoundationImportTemplateVersion(p){return p.payload.templateVersion??p.summary.templateVersion??1;}export async function uploadFoundationImportPreview(file,courseId){window.__calls.push({kind:'preview',courseId});const p=structuredClone(window.__preview);if(file.name.startsWith('invalido')){p.summary.errors=1;p.summary.problems=[{sheet:'PERGUNTAS',row:5,field:'Resposta correta',code:'RESPOSTA_CORRETA_INVALIDA',severity:'erro',message:'Indique uma alternativa preenchida.'}];}return p;}`,
          }));
          b.onResolve({ filter: /\.xlsx\?url$/ }, args => ({
            path: path
              .resolve(
                args.resolveDir,
                args.path.replace(/^@\//, path.join(root, "client/src/"))
              )
              .replace(/\?url$/, ""),
            namespace: "qa-document",
          }));
          b.onLoad({ filter: /.*/, namespace: "qa-document" }, async args => {
            const bytes = await fs.readFile(args.path);
            const hash = crypto
              .createHash("sha256")
              .update(bytes)
              .digest("hex");
            const url = `/assets/modelo-${hash.slice(0, 8)}.xlsx`;
            assets.set(url, { bytes, hash });
            return {
              loader: "js",
              contents: `export default ${JSON.stringify(url)};`,
            };
          });
        },
      },
    ],
  });
  const names = await fs.readdir(path.join(root, "dist/public/assets"));
  const css = await fs.readFile(
    path.join(
      root,
      "dist/public/assets",
      names.find(name => /^index-.*\.css$/.test(name))
    )
  );
  const js = await fs.readFile(path.join(temp, "app.js"));
  const requests = [];
  server = http.createServer((req, res) => {
    requests.push({ method: req.method, path: req.url });
    if (req.method !== "GET") {
      res.writeHead(405).end();
      return;
    }
    if (req.url === "/app.js")
      res.writeHead(200, { "Content-Type": "text/javascript" }).end(js);
    else if (req.url === "/style.css")
      res.writeHead(200, { "Content-Type": "text/css" }).end(css);
    else if (assets.has(req.url))
      res
        .writeHead(200, {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
        .end(assets.get(req.url).bytes);
    else if (req.url === "/")
      res
        .writeHead(200, { "Content-Type": "text/html" })
        .end(
          '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/app.js"></script></body></html>'
        );
    else res.writeHead(404).end();
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
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.route("**/*", route => {
      assert.equal(
        route.request().method(),
        "GET",
        "A fixture não pode gravar via HTTP"
      );
      assert.equal(new URL(route.request().url()).origin, base);
      return route.continue();
    });
    await page.goto(base);
    await page
      .getByRole("button", { name: "Importar gabarito Excel", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    const v2 = dialog.getByRole("link").filter({ hasText: /v2/i });
    assert.equal(await v2.count(), 1);
    const href = await v2.getAttribute("href");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      v2.click(),
    ]);
    assert.equal(await download.failure(), null);
    const downloaded = await fs.readFile(await download.path());
    assert.equal(
      crypto.createHash("sha256").update(downloaded).digest("hex"),
      assets.get(href).hash
    );
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "valido-sintetico.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: downloaded,
    });
    await dialog
      .getByRole("button", { name: "Validar e gerar prévia", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Importar como rascunho", exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () => window.__calls.filter(call => call.kind === "confirm").length
      ),
      0
    );
    for (const title of ["Leia", "Entenda", "Responda", "Aplique"]) {
      const article = dialog.getByRole("article").filter({
        has: page.getByRole("heading", { name: title, exact: true }),
      });
      assert.equal(await article.count(), 1);
      const body = await article.innerText();
      assert(body.includes(`Conteúdo sintético da etapa ${title}`));
      assert.equal(
        body.includes("Qual atitude demonstra amor?"),
        title === "Responda"
      );
    }
    assert(
      (await dialog.innerText()).includes(
        "Alternativa F para revisão editorial"
      )
    );
    const geometry = await dialog.evaluate(el => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        viewport: window.innerWidth,
        gridTemplate: getComputedStyle(el).gridTemplateColumns,
        samples: [...el.querySelectorAll("*")]
          .filter(n => n.getBoundingClientRect().right > window.innerWidth + 1)
          .slice(0, 4)
          .map(n => ({
            tag: n.tagName,
            classes: n.className,
            width: n.getBoundingClientRect().width,
            grid: getComputedStyle(n).gridTemplateColumns,
          })),
        overflow: el.scrollWidth > el.clientWidth + 1,
        longChildren: [...el.querySelectorAll("*")].filter(
          n =>
            n.getBoundingClientRect().width > 0 &&
            n.getBoundingClientRect().right > window.innerWidth + 1
        ).length,
      };
    });
    assert(
      geometry.left >= -1 &&
        geometry.right <= width + 1 &&
        !geometry.overflow &&
        geometry.longChildren === 0,
      JSON.stringify(geometry)
    );
    await page.screenshot({
      path: path.join(output, `import-preview-${width}.png`),
      fullPage: true,
    });
    await dialog
      .getByRole("article")
      .filter({
        has: page.getByRole("heading", { name: "Responda", exact: true }),
      })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(output, `import-stages-${width}.png`),
      fullPage: true,
    });
    await dialog
      .getByRole("button", { name: "Importar como rascunho", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    assert.deepEqual(
      await page.evaluate(() =>
        window.__calls.filter(call => call.kind === "confirm")
      ),
      [{ kind: "confirm", input: { draftId: 91 } }]
    );
    await page
      .getByRole("button", { name: "Importar gabarito Excel", exact: true })
      .click();
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "invalido-sintetico.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: downloaded,
    });
    await dialog
      .getByRole("button", { name: "Validar e gerar prévia", exact: true })
      .click();
    const confirm = dialog.getByRole("button", {
      name: "Importar como rascunho",
      exact: true,
    });
    await confirm.waitFor();
    assert.equal(await confirm.isDisabled(), true);
    assert((await dialog.innerText()).includes("RESPOSTA_CORRETA_INVALIDA"));
    assert.equal(pageErrors.length, 0);
    results.push({
      viewport: `${width}x${height}`,
      geometry,
      downloadHashValid: true,
      previewNoConfirm: true,
      explicitConfirmOnlyDraftId: true,
      errorsBlockConfirmation: true,
    });
    console.log(`IMPORT_VIEWPORT_PASS=${width}x${height}`);
    await context.close();
  }
  assert(requests.every(request => request.method === "GET"));
  await fs.writeFile(
    path.join(output, "summary.json"),
    JSON.stringify(
      {
        scope: "isolated-real-dialog-synthetic-api-not-authenticated-e2e",
        results,
        pageErrors,
        networkWrites: 0,
      },
      null,
      2
    ) + "\n"
  );
  console.log(`IMPORT_MATRIX_PASS=${results.length}`);
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await fs.rm(temp, { recursive: true, force: true });
}
