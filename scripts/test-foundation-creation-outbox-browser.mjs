#!/usr/bin/env node
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "@playwright/test";

const project = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const output =
  process.env.FOUNDATION_OUTBOX_QA_OUTPUT ??
  "/home/ubuntu/foundation-idempotencia-20261016/outbox-browser.json";
const result = await build({
  absWorkingDir: project,
  stdin: {
    contents:
      'import * as outbox from "./client/src/pages/foundation/foundationCreationOutbox"; import { clearFoundationCreationLocalDatabase } from "./client/src/lib/foundationCreationStorage"; window.outbox = outbox; window.clearLocalDatabase = clearFoundationCreationLocalDatabase;',
    resolveDir: project,
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  alias: { "@": path.join(project, "client/src") },
  define: { "process.env.NODE_ENV": '"production"' },
});
const js = result.outputFiles[0].contents;
const server = http.createServer((req, res) => {
  if (req.url === "/outbox.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(js);
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><title>QA sintético local</title><script src="/outbox.js"></script>'
    );
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser,
  requests = 0,
  external = 0;
const cases = [];
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.route("**/*", route => {
    requests++;
    if (
      !route
        .request()
        .url()
        .startsWith(origin + "/")
    ) {
      external++;
      return route.abort();
    }
    return route.continue();
  });
  const a = await context.newPage(),
    b = await context.newPage();
  await Promise.all([a.goto(origin), b.goto(origin)]);
  await Promise.all([
    a.waitForFunction(() => Boolean(window.outbox)),
    b.waitForFunction(() => Boolean(window.outbox)),
  ]);
  const begin = page =>
    page.evaluate(async () => {
      const scope = { origin: location.origin, churchId: 100, accountId: 42 };
      const snapshot = {
        churchId: 100,
        courseId: 55,
        moduleId: null,
        title: "Estudo sintético browser",
        weekStart: "2026-10-19",
        template: "biblico",
      };
      return window.outbox.beginFoundationCreation(
        scope,
        "study",
        "new",
        snapshot
      );
    });
  const [first, concurrent] = await Promise.all([begin(a), begin(b)]);
  assert.equal(first.clientRequestId, concurrent.clientRequestId);
  cases.push("claim_atomico_duas_abas_indexeddb_real");
  await a.reload();
  await a.waitForFunction(() => Boolean(window.outbox));
  assert.equal((await begin(a)).clientRequestId, first.clientRequestId);
  cases.push("recarregar_preserva_chave_snapshot");
  const isolated = await b.evaluate(async () =>
    window.outbox.beginFoundationCreation(
      { origin: location.origin, churchId: 100, accountId: 43 },
      "study",
      "new",
      {
        churchId: 100,
        courseId: 55,
        moduleId: null,
        title: "Outra conta sintética",
        weekStart: "2026-10-19",
        template: "biblico",
      }
    )
  );
  assert.notEqual(isolated.clientRequestId, first.clientRequestId);
  cases.push("isolamento_conta_real");
  await a.evaluate(async record => {
    await window.outbox.updateFoundationCreation(record, "unknown");
  }, first);
  assert.equal((await begin(b)).clientRequestId, first.clientRequestId);
  cases.push("estado_incerto_nao_gera_nova_chave");
  await a.evaluate(async record => {
    await window.outbox.confirmAndClearFoundationCreation(record, 301);
  }, first);
  const next = await begin(b);
  assert.notEqual(next.clientRequestId, first.clientRequestId);
  cases.push("confirmacao_permite_nova_operacao_deliberada");
  await a.evaluate(async record => {
    await window.outbox.updateFoundationCreation(record, "unknown");
    await window.outbox.confirmAndClearFoundationCreation(record, 301);
  }, first);
  assert.equal((await begin(b)).clientRequestId, next.clientRequestId);
  cases.push("callback_atrasado_nao_apaga_proxima_chave");
  await a.evaluate(async () =>
    window.outbox.clearFoundationCreationScope({
      origin: location.origin,
      churchId: 100,
      accountId: 42,
    })
  );
  const remaining = await b.evaluate(async () =>
    window.outbox.findFoundationCreation(
      { origin: location.origin, churchId: 100, accountId: 43 },
      "study",
      "new"
    )
  );
  assert.equal(remaining.clientRequestId, isolated.clientRequestId);
  cases.push("limpeza_preserva_outra_conta");
  await a.evaluate(async () => window.clearLocalDatabase());
  assert.equal(
    await b.evaluate(async () =>
      window.outbox.findFoundationCreation(
        { origin: location.origin, churchId: 100, accountId: 43 },
        "study",
        "new"
      )
    ),
    null
  );
  cases.push("limpeza_logout_sem_componente_montado");
  assert.equal(external, 0);
  const summary = {
    passed: cases.length,
    cases,
    real_indexeddb: true,
    real_chromium: true,
    two_pages: true,
    http_requests: requests,
    external_requests: external,
    vps_access: false,
    authentication: false,
    real_app_mutations: 0,
  };
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
