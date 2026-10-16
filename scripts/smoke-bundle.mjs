#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";

const baseUrl = (process.argv[2] ?? process.env.BUNDLE_BASE_URL ?? "").replace(/\/$/, "");
const reportPath = resolve(process.env.BUNDLE_SMOKE_REPORT ?? "artifacts/bundle-smoke-report.json");
const timeoutMs = Number(process.env.BUNDLE_SMOKE_TIMEOUT_MS ?? 15000);
const errors = [];
const checks = [];

if (!baseUrl) {
  console.error("Uso: node scripts/smoke-bundle.mjs https://homolog.example.com");
  process.exit(2);
}

function addCheck(name, details) {
  checks.push({ name, ...details });
  if (!details.ok) errors.push(`${name}: ${details.message ?? "falhou"}`);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, redirect: "follow", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function extractAssets(html) {
  const assets = new Set();
  const pattern = /(?:src|href)=["']([^"']+)["']/g;
  for (const match of html.matchAll(pattern)) {
    const value = match[1].split("#", 1)[0].split("?", 1)[0];
    if (value.startsWith("/assets/")) assets.add(value);
  }
  return [...assets].sort();
}

async function main() {
  const loginUrl = `${baseUrl}/login`;
  let html = "";
  try {
    const response = await fetchWithTimeout(loginUrl, { headers: { Accept: "text/html" } });
    html = await response.text();
    addCheck("login-html", {
      ok: response.status === 200 && /<html/i.test(html),
      status: response.status,
      bytes: Buffer.byteLength(html),
      message: `HTTP ${response.status} ou HTML inválido`,
    });
  } catch (error) {
    addCheck("login-html", { ok: false, message: error.message });
  }

  const assets = extractAssets(html);
  addCheck("login-assets-present", {
    ok: assets.length > 0,
    count: assets.length,
    message: "O HTML não referencia assets em /assets",
  });

  for (const asset of assets) {
    const url = new URL(asset, `${baseUrl}/`).toString();
    try {
      const response = await fetchWithTimeout(url, { headers: { Accept: "*/*" } });
      const contentType = response.headers.get("content-type") ?? "";
      const expectedType = asset.endsWith(".css") ? /css|text\/plain/i : /javascript|ecmascript|text\/plain/i;
      const content = await response.arrayBuffer();
      addCheck(`asset:${asset}`, {
        ok: response.status === 200 && expectedType.test(contentType) && content.byteLength > 0,
        status: response.status,
        contentType,
        bytes: content.byteLength,
        message: `HTTP ${response.status}, content-type ${contentType} ou corpo vazio`,
      });
    } catch (error) {
      addCheck(`asset:${asset}`, { ok: false, message: error.message });
    }
  }

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/trpc/people.primaryDisciplerHistory`, { headers: { Accept: "application/json" } });
    addCheck("protected-route", {
      ok: response.status === 401,
      status: response.status,
      message: `esperado HTTP 401 sem sessão, recebido HTTP ${response.status}`,
    });
  } catch (error) {
    addCheck("protected-route", { ok: false, message: error.message });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    checks,
    errors,
    status: errors.length === 0 ? "pass" : "fail",
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`BUNDLE_SMOKE_REPORT=${reportPath}`);
  console.log(`BUNDLE_SMOKE_CHECKS=${checks.length}`);
  console.log(`BUNDLE_SMOKE_ERRORS=${errors.length}`);
  for (const error of errors) console.error(`ERROR ${error}`);
  if (errors.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`ERROR ${error.message}`);
  process.exit(1);
});
