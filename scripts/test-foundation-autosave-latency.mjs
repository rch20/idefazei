#!/usr/bin/env node
// Componentes reais + duas sessões independentes; API exclusivamente local/sintética.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import {
  FIXTURE_IDS,
  PROFILES,
  VIEWPORTS,
  buildInitialIdentity,
  guardRequest,
} from "../tests/autosave/support/latency-gates.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const full = process.argv.includes("--full");
const visual = process.argv.includes("--conflict-visual");
const verify = process.argv.includes("--verify") || visual;
const out =
  process.env.FOUNDATION_AUTOSAVE_OUTPUT_DIR ||
  "/home/ubuntu/foundation-note-versioning-20261017/browser-latency";
const temp = await fs.mkdtemp(
  path.join(os.tmpdir(), "foundation-autosave-latency-")
);
let server, browser;
const results = [],
  runtimeErrors = [],
  blockedExternal = [];
const modes = full
  ? PROFILES
  : PROFILES.filter(p => ["P0", "P4"].includes(p.name));
const views =
  full || verify
    ? VIEWPORTS
    : VIEWPORTS.filter(p => ["mobile-375", "desktop-1280"].includes(p.name));
const cases = ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08"];
let state, requests, fault, caseId, delay, gate;
const gates = new Set();
const normalize = text =>
  typeof text === "string" && text.trim() ? text.trim() : null;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const reply = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};
function reset(id, latency = 0) {
  state = buildInitialIdentity();
  requests = [];
  fault = null;
  caseId = id;
  delay = latency;
  gate = null;
}
function snapshot(blockId) {
  if (blockId == null)
    return {
      reflection: state.session.progress?.reflection ?? null,
      reflectionVersion: state.legacyVersion ?? 0,
    };
  const block = state.session.blocks.find(b => b.id === blockId);
  assert(block, "SYNTHETIC_BLOCK_REQUIRED");
  return {
    reflection: block.reflection ?? null,
    reflectionVersion: state.versions[blockId] ?? 0,
  };
}
function session() {
  return {
    ...state.session,
    progress: { ...state.session.progress, ...snapshot(null) },
    blocks: state.session.blocks.map(block => ({
      ...block,
      ...snapshot(block.id),
    })),
  };
}
async function hold() {
  await new Promise(resolve => gates.add(resolve));
}
function release() {
  for (const resolve of gates) resolve();
  gates.clear();
  gate = null;
}
async function route(req, res, procedure, input) {
  const record = {
    procedure,
    context: req.headers["x-foundation-context-id"],
    expectedVersion: input.expectedVersion,
    blockId: input.blockId,
    committed: false,
    status: null,
    receivedAt: Date.now(),
    responseAt: null,
  };
  requests.push(record);
  const writing = ["saveBlockReflection", "saveReflection"].includes(procedure);
  if (writing) {
    const writeIndex = saves().length - 1;
    if (["401", "403", "404", "before"].includes(fault)) {
      const status = fault === "before" ? 503 : Number(fault);
      record.status = status;
      record.responseAt = Date.now();
      reply(res, status, {
        ok: false,
        error: {
          code:
            { 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND" }[
              status
            ] || "INTERNAL_SERVER_ERROR",
          message: "SYNTHETIC_ERROR",
        },
      });
      return;
    }
    if (gate === "before-first" && writeIndex === 0) await hold();
    const applied =
      caseId === "J01" ? [100, 2000, 300, 4000][writeIndex] : delay;
    record.delayMs = applied ?? 0;
    if (applied) await wait(applied);
    const blockId = procedure === "saveReflection" ? null : input.blockId;
    const current = snapshot(blockId),
      text = normalize(input.reflection);
    if (
      !Number.isSafeInteger(input.expectedVersion) ||
      input.expectedVersion < 0
    ) {
      record.status = 428;
      reply(res, 428, {
        ok: false,
        error: {
          code: "PRECONDITION_REQUIRED",
          message: "NOTE_VERSION_REQUIRED",
        },
      });
      return;
    }
    if (
      input.expectedVersion > current.reflectionVersion ||
      (input.expectedVersion < current.reflectionVersion &&
        text !== current.reflection)
    ) {
      record.status = 409;
      record.responseAt = Date.now();
      reply(res, 409, {
        ok: false,
        error: { code: "CONFLICT", message: "NOTE_VERSION_CONFLICT" },
      });
      return;
    }
    const unchanged = text === current.reflection;
    const result = {
      success: true,
      reflection: text,
      reflectionVersion: current.reflectionVersion + (unchanged ? 0 : 1),
      unchanged,
    };
    if (blockId == null) {
      state.session.progress.reflection = text;
      state.legacyVersion = result.reflectionVersion;
    } else {
      state.session.blocks.find(b => b.id === blockId).reflection = text;
      state.versions[blockId] = result.reflectionVersion;
    }
    record.committed = true;
    record.unchanged = unchanged;
    if (gate === "after" || (gate === "after-first" && writeIndex === 0))
      await hold();
    if (fault === "lost") {
      record.status = 0;
      // Enviar cabeçalhos + corpo incompleto simula confirmação perdida sem
      // provocar o retry de conexão transparente do próprio Chromium.
      res.writeHead(200, {
        "content-type": "application/json",
        "content-length": "4096",
      });
      res.write('{"ok":');
      setImmediate(() => res.destroy());
      return;
    }
    record.status = 200;
    record.responseAt = Date.now();
    reply(res, 200, {
      ok: true,
      result: fault === "invalid" ? { success: true } : result,
    });
    return;
  }
  const value =
    procedure === "studySession"
      ? session()
      : ["studentPath", "learningPath"].includes(procedure)
        ? state.path
        : procedure === "getNoteSnapshot"
          ? snapshot(input.blockId)
          : procedure === "studentHistory"
            ? { items: [] }
            : procedure === "listStudyMaterials"
              ? []
              : procedure === "studyClass"
                ? null
                : procedure === "completeStudyBlock"
                  ? {
                      success: true,
                      completedBlockId: input.blockId,
                      nextBlock: null,
                    }
                  : { success: true };
  record.status = 200;
  record.responseAt = Date.now();
  reply(res, 200, { ok: true, result: value });
}
const saves = () =>
  requests.filter(r =>
    ["saveBlockReflection", "saveReflection"].includes(r.procedure)
  );
const bounded = async (predicate, message, timeout = 18000) => {
  await expect.poll(predicate, { timeout, message }).toBe(true);
};
const status = page =>
  page.locator('[role="status"]').filter({ hasText: "Salvo automaticamente" });
const field = (page, stage = "Leia") =>
  page.getByLabel(`Minha anotação em ${stage}`, { exact: true });
const tick = page => page.clock.runFor(700);
async function saved(page) {
  await expect(status(page)).toHaveCount(1, { timeout: 18000 });
}
async function makePage(view, id) {
  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    serviceWorkers: "block",
  });
  await context.route("**/*", route => {
    const url = route.request().url();
    if (url.startsWith(origin + "/")) return route.continue();
    blockedExternal.push({ kind: "blocked_external" });
    return route.abort();
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-10-17T02:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-17T02:00:01Z"));
  await page.addInitScript(
    ({ origin, id }) => {
      window.__FOUNDATION_TEST_ORIGIN__ = origin;
      window.__FOUNDATION_CONTEXT_ID__ = id;
    },
    { origin, id }
  );
  page.on("pageerror", error =>
    runtimeErrors.push({ message: String(error.message).slice(0, 300) })
  );
  page.setDefaultTimeout(18000);
  await page.goto(origin);
  await page
    .getByRole("button", { name: "Começar estudo", exact: true })
    .first()
    .click();
  await expect(field(page)).toBeVisible();
  return { page, context };
}
async function typeSave(page, text, stage = "Leia") {
  await field(page, stage).fill(text);
  await tick(page);
  await saved(page);
}
async function testCase(id, profile, view) {
  reset(id, profile.delayMs);
  const started = Date.now();
  let handle;
  const result = {
    id,
    profile: profile.name,
    delayMs: profile.delayMs,
    viewport: [view.width, view.height],
    status: "FAIL",
    persistence: "simulated",
  };
  console.log(`AUTOSAVE_CASE_START ${id} ${profile.name} ${view.name}`);
  try {
    handle = await makePage(view, `${id}-${profile.name}-${view.name}`);
    const page = handle.page;
    if (id === "A01") {
      for (const text of ["Curto", "Intermediário", "Final sintético"]) {
        await field(page).fill(text);
        await page.clock.runFor(500);
      }
      assert.equal(saves().length, 0);
      await tick(page);
      await saved(page);
      assert.equal(saves().length, 1);
      assert.equal(snapshot(84).reflection, "Final sintético");
    } else if (id === "A02") {
      gate = "after";
      await field(page).fill("Ainda não confirmado");
      await tick(page);
      await bounded(
        () => saves().some(r => r.committed),
        "commit sintético aguardando resposta"
      );
      assert.equal(await status(page).count(), 0);
      await expect(field(page)).toHaveValue("Ainda não confirmado");
      release();
      await saved(page);
    } else if (id === "A03") {
      gate = "before-first";
      await field(page).fill("Texto A");
      await tick(page);
      await bounded(() => saves().length === 1, "primeiro despacho");
      await field(page).fill("Texto B");
      await tick(page);
      assert.equal(saves().length, 1);
      release();
      await saved(page);
      assert.deepEqual(
        saves().map(r => r.expectedVersion),
        [0, 1]
      );
      assert.equal(snapshot(84).reflection, "Texto B");
      await expect(field(page)).toHaveValue("Texto B");
    } else if (id === "A04" || id === "A07" || id === "J01") {
      const stages =
        id === "A04"
          ? ["Leia", "Entenda"]
          : ["Leia", "Entenda", "Responda", "Aplique"];
      for (let i = 0; i < stages.length; i++) {
        if (i)
          await page
            .locator(`button[aria-label^="${i + 1}. ${stages[i]}"]:visible`)
            .first()
            .click();
        await typeSave(page, `${id} ${stages[i]}`, stages[i]);
      }
      assert.deepEqual(
        saves().map(r => r.blockId),
        stages.map((_, i) => 84 + i)
      );
      for (let i = 0; i < stages.length; i++)
        assert.equal(snapshot(84 + i).reflection, `${id} ${stages[i]}`);
      if (id === "A07") {
        await typeSave(page, "   ", "Aplique");
        assert.equal(snapshot(87).reflection, null);
      }
      if (id === "J01")
        assert.deepEqual(
          saves().map(r => r.delayMs),
          [100, 2000, 300, 4000]
        );
    } else if (id === "A05") {
      gate = "after";
      await field(page).fill("Saída deve aguardar");
      await page
        .getByRole("button", { name: "Sair do estudo", exact: true })
        .click();
      await bounded(() => gates.size > 0, "resposta retida");
      assert.equal(await field(page).count(), 1);
      assert.equal(saves().length, 1);
      release();
      await expect(field(page)).toHaveCount(0);
      assert.equal(snapshot(84).reflection, "Saída deve aguardar");
    } else if (id === "A06") {
      const stale = session();
      await field(page).fill("Rascunho preservado");
      await page.evaluate(
        data => window.__foundationAutosaveDebug.applySession(data),
        stale
      );
      await expect(field(page)).toHaveValue("Rascunho preservado");
      await tick(page);
      await saved(page);
      assert.equal(snapshot(84).reflection, "Rascunho preservado");
    } else if (id === "A08") {
      await typeSave(page, "Confirmado no aparelho A");
      const receiver = await makePage(view, "independent-receiver");
      try {
        await expect(field(receiver.page)).toHaveValue(
          "Confirmado no aparelho A"
        );
        assert.equal(snapshot(84).reflectionVersion, 1);
      } finally {
        await receiver.context.close();
      }
    }
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    );
    assert(fits, "OVERFLOW_HORIZONTAL");
    if (await field(page).count()) {
      const image = path.join(
        out,
        "screenshots",
        `${id}-${profile.name}-${view.name}.png`
      );
      await page.screenshot({ path: image, animations: "disabled" });
      result.screenshot = image;
    }
    result.status = "PASS";
  } catch (error) {
    result.failure = String(error.message).slice(0, 700);
  } finally {
    release();
    await handle?.context.close();
    result.durationMs = Date.now() - started;
    result.requests = requests.map(r => ({ ...r }));
  }
  console.log(`AUTOSAVE_CASE_END ${id} ${result.status}`);
  results.push(result);
}
async function failureCase(id, view) {
  reset(id);
  const started = Date.now();
  let handle;
  const result = {
    id,
    profile: "P0",
    viewport: [view.width, view.height],
    status: "FAIL",
    persistence: "simulated",
  };
  try {
    handle = await makePage(view, id);
    const page = handle.page;
    fault = { F01: "before", F02: "lost", F04: "invalid" }[id] ?? null;
    if (id === "F03") gate = "after-first";
    if (id === "F06") {
      gate = "after-first";
      await field(page).fill("A confirmado sem ACK");
      await tick(page);
      await bounded(() => gates.size > 0, "commit A com ACK retido");
      await field(page).fill("B posterior");
      await tick(page);
      assert.equal(saves().length, 1);
      await page.evaluate(
        data => window.__foundationAutosaveDebug.applySession(data),
        session()
      );
      await saved(page);
      assert.equal(saves()[0].responseAt, null);
      assert.equal(saves().length, 2);
      assert.equal(saves()[1].expectedVersion, 1);
      assert.equal(snapshot(84).reflection, "B posterior");
      release();
      await expect(field(page)).toHaveValue("B posterior");
    } else if (id === "F07") {
      gate = "after-first";
      await field(page).fill("Timeout preservado");
      await tick(page);
      await bounded(() => gates.size > 0, "commit pendente de confirmação");
      await page.clock.runFor(30_000);
      await expect(
        page.getByRole("button", { name: "Tentar salvar novamente" })
      ).toBeVisible();
      assert.equal(await status(page).count(), 0);
      assert.equal(saves().length, 1);
      release();
      await expect(field(page)).toHaveValue("Timeout preservado");
      await page
        .getByRole("button", { name: "Tentar salvar novamente" })
        .click();
      await saved(page);
      assert.equal(saves().length, 2);
      assert.equal(snapshot(84).reflectionVersion, 1);
      assert.equal(saves()[1].unchanged, true);
    } else if (id === "F05") {
      for (const code of ["401", "403", "404"]) {
        fault = code;
        await field(page).fill(`Erro ${code}`);
        await tick(page);
        await expect(
          page.getByRole("button", { name: "Tentar salvar novamente" })
        ).toBeVisible();
        await page.clock.runFor(5000);
      }
      assert.equal(saves().length, 3);
      assert.deepEqual(
        saves().map(r => r.status),
        [401, 403, 404]
      );
    } else {
      await field(page).fill(`${id} texto protegido`);
      await tick(page);
      if (id === "F03") {
        await bounded(() => gates.size > 0, "resposta pendente");
        await field(page).fill("Item seguinte");
        await tick(page);
        assert.equal(saves().length, 1);
        assert.equal(await status(page).count(), 0);
        release();
        await saved(page);
        assert.equal(snapshot(84).reflection, "Item seguinte");
      } else {
        await expect(
          page.getByRole("button", { name: "Tentar salvar novamente" })
        ).toBeVisible();
        await expect(field(page)).toHaveValue(`${id} texto protegido`);
        await page.clock.runFor(5000);
        assert.equal(saves().length, 1);
        assert.equal(await status(page).count(), 0);
        if (id === "F01") assert.equal(saves()[0].committed, false);
        else assert.equal(snapshot(84).reflectionVersion, 1);
        fault = null;
        await page
          .getByRole("button", { name: "Tentar salvar novamente" })
          .click();
        await saved(page);
        assert.equal(snapshot(84).reflectionVersion, 1);
        assert.equal(saves().length, 2);
        if (id !== "F01") assert.equal(saves()[1].unchanged, true);
      }
    }
    result.status = "PASS";
  } catch (error) {
    result.failure = String(error.message).slice(0, 700);
  } finally {
    release();
    await handle?.context.close();
    result.durationMs = Date.now() - started;
    result.requests = requests.map(r => ({ ...r }));
    results.push(result);
  }
  console.log(`AUTOSAVE_FAILURE_END ${id} ${result.status}`);
}
async function conflictCase(choice, view) {
  reset(`CONFLICT-${choice}`);
  let a, b;
  const result = {
    id: `CONFLICT-${choice}`,
    profile: "P0",
    viewport: [view.width, view.height],
    status: "FAIL",
    persistence: "simulated",
  };
  try {
    a = await makePage(view, "writer-a");
    b = await makePage(view, "writer-b");
    await field(a.page).fill("Texto A");
    await field(b.page).fill("Texto B");
    await tick(a.page);
    await saved(a.page);
    await tick(b.page);
    await expect(
      b.page.getByRole("button", { name: "Manter meu texto", exact: true })
    ).toBeVisible();
    assert.deepEqual(
      saves().map(r => r.status),
      [200, 409]
    );
    await expect(field(b.page)).toHaveValue("Texto B");
    await expect(b.page.getByRole("alertdialog")).toContainText("Texto A");
    await expect(b.page.getByRole("alertdialog")).toContainText("Texto B");
    const bounds = await b.page.getByRole("alertdialog").boundingBox();
    if (bounds && bounds.x + bounds.width > view.width + 1) {
      result.layout = await b.page.getByRole("alertdialog").evaluate(element => {
        const rows = [];
        for (let e = element; e && rows.length < 10; e = e.parentElement) {
          const r = e.getBoundingClientRect(), s = getComputedStyle(e);
          rows.push({ tag: e.tagName, classes: e.className, x: r.x, width: r.width, minWidth: s.minWidth, maxWidth: s.maxWidth, grid: s.gridTemplateColumns, display: s.display });
        }
        return rows;
      });
    }
    assert(
      bounds && bounds.x >= -1 && bounds.x + bounds.width <= view.width + 1,
      "CONFLICT_OUTSIDE_VIEWPORT"
    );
    assert(
      await b.page
        .getByRole("alertdialog")
        .evaluate(element => element.scrollWidth <= element.clientWidth + 1),
      "CONFLICT_OVERFLOW_HORIZONTAL"
    );
    await b.page.getByRole("alertdialog").screenshot({
      path: path.join(
        out,
        "screenshots",
        `CONFLICT-open-${choice}-${view.name}.png`
      ),
      animations: "disabled",
    });
    if (choice === "remote") {
      await b.page
        .getByRole("button", { name: "Usar o texto salvo", exact: true })
        .click();
      await saved(b.page);
      await expect(field(b.page)).toHaveValue("Texto A");
      assert.equal(saves().length, 2);
    } else if (choice === "mine") {
      await b.page
        .getByRole("button", { name: "Manter meu texto", exact: true })
        .click();
      await saved(b.page);
      assert.equal(snapshot(84).reflection, "Texto B");
      assert.equal(saves().at(-1).expectedVersion, 1);
    } else {
      await typeSave(a.page, "Terceiro texto C");
      assert.equal(snapshot(84).reflectionVersion, 2);
      await b.page
        .getByRole("button", { name: "Manter meu texto", exact: true })
        .click();
      await expect(b.page.getByRole("alertdialog")).toContainText(
        "Terceiro texto C"
      );
      assert.equal(saves().at(-1).status, 409);
      assert.equal(saves().at(-1).expectedVersion, 1);
      assert.equal(snapshot(84).reflection, "Terceiro texto C");
      await b.page
        .getByRole("button", { name: "Combinar textos", exact: true })
        .click();
      await b.page
        .getByLabel(/Texto final/)
        .fill("B + C combinados explicitamente");
      await b.page
        .getByRole("button", { name: "Confirmar texto final" })
        .click();
      await saved(b.page);
      assert.equal(saves().at(-1).expectedVersion, 2);
      assert.equal(snapshot(84).reflectionVersion, 3);
    }
    const image = path.join(
      out,
      "screenshots",
      `CONFLICT-${choice}-${view.name}.png`
    );
    await b.page.screenshot({ path: image, animations: "disabled" });
    result.screenshot = image;
    result.status = "PASS";
  } catch (error) {
    result.failure = String(error.message).slice(0, 700);
  } finally {
    release();
    await a?.context.close();
    await b?.context.close();
    result.requests = requests.map(r => ({ ...r }));
    results.push(result);
  }
  console.log(`AUTOSAVE_CONFLICT_END ${choice} ${result.status}`);
}
let origin;
try {
  await fs.mkdir(path.join(out, "screenshots"), { recursive: true });
  const jsx = `import React from 'react';import {createRoot} from 'react-dom/client';import {StudentLearningExperience} from ${JSON.stringify(path.join(root, "client/src/pages/foundation/StudentLearningExperience"))};import {createFoundationTheme} from ${JSON.stringify(path.join(root, "client/src/pages/foundation/FoundationTheme"))};createRoot(document.getElementById('root')).render(<main className="p-3"><StudentLearningExperience churchId={100} courseId={11} theme={createFoundationTheme('#1e3a5f','#c9a84c')}/></main>);`;
  await build({
    absWorkingDir: root,
    stdin: { contents: jsx, resolveDir: root, loader: "tsx" },
    bundle: true,
    outfile: path.join(temp, "app.js"),
    platform: "browser",
    jsx: "automatic",
    alias: {
      "@": path.join(root, "client/src"),
      "@shared": path.join(root, "shared"),
      "@/lib/trpc": path.join(
        root,
        "tests/autosave/support/browser-trpc-fixture.js"
      ),
    },
    define: { "import.meta.env": "{}" },
    logLevel: "silent",
  });
  const js = await fs.readFile(path.join(temp, "app.js"));
  const assets = await fs.readdir(path.join(root, "dist/public/assets"));
  const css = await fs.readFile(
    path.join(
      root,
      "dist/public/assets",
      assets.find(n => /^index-.*\.css$/.test(n))
    )
  );
  server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, origin ?? "http://127.0.0.1");
      if (url.pathname === "/app.js") {
        res.writeHead(200, { "content-type": "application/javascript" });
        res.end(js);
        return;
      }
      if (url.pathname === "/style.css") {
        res.writeHead(200, { "content-type": "text/css" });
        res.end(css);
        return;
      }
      if (url.pathname === "/__autosave_rpc") {
        let input = {};
        if (req.method === "GET")
          input = JSON.parse(url.searchParams.get("input") || "{}");
        else {
          let body = "";
          for await (const chunk of req) {
            body += chunk;
            if (body.length > 100000) throw Error("FIXTURE_BODY_LIMIT");
          }
          input = JSON.parse(body).input;
        }
        const procedure = url.searchParams.get("procedure");
        const guard = guardRequest({
          url: url.href,
          origin,
          method: req.method,
          procedure,
          input,
        });
        if (!guard.allowed) {
          reply(res, 403, {
            ok: false,
            error: { code: "FORBIDDEN", message: "FIXTURE_GUARD_BLOCKED" },
          });
          return;
        }
        await route(req, res, procedure, input);
        return;
      }
      res.writeHead(200, { "content-type": "text/html" });
      res.end(
        '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>'
      );
    } catch {
      if (!res.headersSent)
        reply(res, 500, {
          ok: false,
          error: { code: "INTERNAL_SERVER_ERROR", message: "FIXTURE_FAILURE" },
        });
      else res.destroy();
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  if (!verify) {
    for (const profile of modes)
      for (const view of views)
        for (const id of cases) await testCase(id, profile, view);
  } else if (!visual) {
    for (const view of views)
      await testCase("A03", { name: "P4", delayMs: 5000 }, view);
  }
  if (!visual) {
    for (const id of ["F01", "F02", "F03", "F04", "F05", "F06", "F07"])
      await failureCase(id, views[0]);
    await testCase("J01", { name: "JITTER", delayMs: 0 }, views[0]);
  }
  for (const view of views)
    for (const choice of ["remote", "mine", "third-writer"])
      await conflictCase(choice, view);
} catch (error) {
  results.push({
    id: "RUNNER",
    status: "FAIL",
    failure: String(error.message).slice(0, 700),
  });
} finally {
  release();
  await browser?.close();
  if (server) {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
  await fs.rm(temp, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: visual
      ? "conflict-visual"
      : verify
        ? "verify"
        : full
          ? "full"
          : "smoke",
    plannedMainMatrix: 160,
    executedMainMatrix: results.filter(r => cases.includes(r.id)).length,
    totalExecuted: results.length,
    pass: results.filter(r => r.status === "PASS").length,
    fail: results.filter(r => r.status !== "PASS").length,
    cases: results,
    runtimeErrors,
    blockedExternal,
    guards: {
      localhostOnly: true,
      authentication: false,
      mysql: false,
      production: false,
    },
    cleanup: {
      browserClosed: true,
      serverClosed: true,
      temporariesRemoved: true,
    },
    caveat:
      "Componentes React reais, API e persistência local sintética. Não equivale a E2E autenticado nem a aparelhos físicos.",
  };
  await fs.writeFile(
    path.join(out, "summary.json"),
    JSON.stringify(summary, null, 2) + "\n"
  );
  console.log(
    JSON.stringify({
      pass: summary.pass,
      fail: summary.fail,
      main: summary.executedMainMatrix,
      total: summary.totalExecuted,
      runtimeErrors: runtimeErrors.length,
      output: out,
    })
  );
  process.exitCode =
    summary.fail || runtimeErrors.length || blockedExternal.length ? 1 : 0;
}
