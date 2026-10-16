#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, relative, dirname, extname, basename, join, normalize } from "node:path";
import process from "node:process";

const projectRoot = resolve(import.meta.dirname, "..");
const distRoot = resolve(process.argv[2] ?? join(projectRoot, "dist/public"));
const baselinePath = resolve(process.env.BUNDLE_BASELINE ?? join(projectRoot, "scripts/bundle-baseline.json"));
const reportPath = resolve(process.env.BUNDLE_REPORT ?? join(projectRoot, "artifacts/bundle-report.json"));
const warnGrowth = Number(process.env.BUNDLE_WARN_GROWTH_PERCENT ?? 10);
const failGrowth = Number(process.env.BUNDLE_FAIL_GROWTH_PERCENT ?? 25);
const maxEntryBytes = Number(process.env.BUNDLE_MAX_ENTRY_BYTES ?? 650_000);
const maxChunkBytes = Number(process.env.BUNDLE_MAX_CHUNK_BYTES ?? 650_000);
const maxCssBytes = Number(process.env.BUNDLE_MAX_CSS_BYTES ?? 350_000);
const maxLocalFiles = Number(process.env.BUNDLE_MAX_LOCAL_FILES ?? 5000);

const errors = [];
const warnings = [];
const checked = [];
const graph = new Map();

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readText(file) {
  return readFileSync(file, "utf8");
}

function listFiles(dir) {
  const result = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(path));
    else result.push(path);
  }
  return result;
}

function logicalName(file) {
  const name = basename(file);
  return name.replace(/-[A-Za-z0-9_-]{8}(?=\.[^.]+$)/, "");
}

function cleanReference(value) {
  return value.split("#", 1)[0].split("?", 1)[0];
}

function isLocalReference(value) {
  return value.startsWith("./") || value.startsWith("../") || value.startsWith("/assets/");
}

function resolveLocalReference(ownerFile, reference) {
  const clean = cleanReference(reference);
  const candidate = clean.startsWith("/assets/")
    ? resolve(distRoot, `.${clean}`)
    : resolve(dirname(ownerFile), clean);
  return normalize(candidate);
}

function extractModuleReferences(text) {
  const references = new Set();
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bexport\s*(?:\*|\{[^}]*\})\s*from\s*["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (match[1] && isLocalReference(match[1])) references.add(match[1]);
    }
  }
  return [...references];
}

function extractHtmlReferences(text) {
  const references = new Set();
  const pattern = /(?:src|href)=["']([^"']+)["']/g;
  for (const match of text.matchAll(pattern)) {
    const value = match[1];
    if (value.startsWith("/assets/")) references.add(value);
  }
  return [...references];
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function percentChange(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function findCycles() {
  const state = new Map();
  const stack = [];
  const cycles = [];

  function visit(node) {
    const currentState = state.get(node) ?? 0;
    if (currentState === 1) {
      const index = stack.indexOf(node);
      cycles.push([...stack.slice(index), node]);
      return;
    }
    if (currentState === 2) return;
    state.set(node, 1);
    stack.push(node);
    for (const dependency of graph.get(node) ?? []) visit(dependency);
    stack.pop();
    state.set(node, 2);
  }

  for (const node of graph.keys()) visit(node);
  return cycles;
}

if (!existsSync(distRoot)) fail(`Diretório de build ausente: ${distRoot}`);
const publicFiles = existsSync(distRoot) ? listFiles(distRoot) : [];
const assetFiles = publicFiles.filter((file) => file.endsWith(".js") || file.endsWith(".css"));
if (assetFiles.length === 0) fail("Nenhum arquivo JS/CSS foi encontrado no build");
if (assetFiles.length > maxLocalFiles) fail(`Quantidade de arquivos JS/CSS acima do limite: ${assetFiles.length} > ${maxLocalFiles}`);

const indexHtml = join(distRoot, "index.html");
if (!existsSync(indexHtml)) fail("dist/public/index.html não existe");

const fileSet = new Set(publicFiles.map((file) => normalize(file)));
const metrics = {};

for (const file of assetFiles) {
  const bytes = readFileSync(file);
  const rel = relative(distRoot, file).replaceAll("\\", "/");
  const isJavaScript = file.endsWith(".js");
  const isCss = file.endsWith(".css");
  const text = bytes.toString("utf8");
  const references = isJavaScript ? extractModuleReferences(text) : [];
  const localDependencies = [];

  for (const reference of references) {
    const target = resolveLocalReference(file, reference);
    if (!fileSet.has(target)) {
      fail(`${rel} importa asset ausente: ${reference}`);
    } else if (target.endsWith(".js") || target.endsWith(".css")) {
      localDependencies.push(relative(distRoot, target).replaceAll("\\", "/"));
    }
  }

  graph.set(rel, localDependencies);
  metrics[rel] = {
    logicalName: logicalName(file),
    type: isJavaScript ? "js" : isCss ? "css" : extname(file).slice(1),
    bytes: bytes.byteLength,
    gzipBytes: gzipSync(bytes, { level: 9 }).byteLength,
  };
  checked.push(rel);
}

if (existsSync(indexHtml)) {
  for (const reference of extractHtmlReferences(readText(indexHtml))) {
    const target = resolveLocalReference(indexHtml, reference);
    if (!fileSet.has(target)) fail(`index.html referencia asset ausente: ${reference}`);
  }
}

const cycles = findCycles();

for (const rel of checked) {
  const metric = metrics[rel];
  if (metric.type === "js") {
    const file = join(distRoot, rel);
    const source = readText(file);
    try {
      execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    } catch (error) {
      fail(`Sintaxe JavaScript inválida em ${rel}: ${error.message}`);
    }
    if (/vendor-react(?:[-.][A-Za-z0-9_-]+)?\.js$/i.test(rel)) {
      fail(`Chunk manual de React detectado: ${rel}`);
    }
  }
  if (metric.type === "js" && basename(rel).startsWith("index-")) {
    if (metric.bytes > maxEntryBytes) fail(`Entrypoint acima do limite: ${rel} = ${formatBytes(metric.bytes)} > ${formatBytes(maxEntryBytes)}`);
  } else if (metric.type === "js" && metric.bytes > maxChunkBytes) {
    warn(`Chunk acima do limite advisory: ${rel} = ${formatBytes(metric.bytes)} > ${formatBytes(maxChunkBytes)}`);
  } else if (metric.type === "css" && metric.bytes > maxCssBytes) {
    fail(`CSS acima do limite: ${rel} = ${formatBytes(metric.bytes)} > ${formatBytes(maxCssBytes)}`);
  }
}

let baseline = null;
if (existsSync(baselinePath)) {
  try {
    baseline = JSON.parse(readText(baselinePath));
  } catch (error) {
    fail(`Baseline inválido: ${baselinePath} (${error.message})`);
  }
}

function logicalReference(value) {
  return value.replace(/-[A-Za-z0-9_-]{8}(?=\.[^.]+$)/, "");
}

const cycleKey = (cycle) => cycle.map(logicalReference).join(" -> ");
const baselineCycleKeys = new Set((baseline?.cycles ?? []).map(cycleKey));
for (const cycle of cycles) {
  if (!baselineCycleKeys.has(cycleKey(cycle))) {
    fail(`Novo ciclo estático entre chunks: ${cycleKey(cycle)}`);
  }
}

const baselineByLogicalName = new Map();
for (const value of Object.values(baseline?.files ?? {})) {
  const candidates = baselineByLogicalName.get(value.logicalName) ?? [];
  candidates.push({ ...value, used: false });
  baselineByLogicalName.set(value.logicalName, candidates);
}

for (const [rel, metric] of Object.entries(metrics)) {
  const candidates = baselineByLogicalName.get(metric.logicalName) ?? [];
  candidates.sort((left, right) => Math.abs(left.bytes - metric.bytes) - Math.abs(right.bytes - metric.bytes));
  const previous = candidates.find((candidate) => !candidate.used);
  if (previous) previous.used = true;
  if (!previous) {
    if (metric.bytes > maxChunkBytes) warn(`Novo chunk grande sem baseline: ${rel} = ${formatBytes(metric.bytes)}`);
    continue;
  }
  const rawGrowth = percentChange(metric.bytes, previous.bytes);
  const gzipGrowth = percentChange(metric.gzipBytes, previous.gzipBytes);
  if (rawGrowth !== null && rawGrowth > failGrowth) fail(`Crescimento bloqueante em ${rel}: ${rawGrowth.toFixed(1)}%`);
  else if (rawGrowth !== null && rawGrowth > warnGrowth) warn(`Crescimento de ${rel}: ${rawGrowth.toFixed(1)}%`);
  if (gzipGrowth !== null && gzipGrowth > warnGrowth) warn(`Crescimento gzip de ${rel}: ${gzipGrowth.toFixed(1)}%`);
}

const report = {
  generatedAt: new Date().toISOString(),
  distRoot,
  thresholds: { warnGrowth, failGrowth, maxEntryBytes, maxChunkBytes, maxCssBytes },
  files: metrics,
  graph: Object.fromEntries(graph.entries()),
  cycles,
  errors,
  warnings,
  status: errors.length === 0 ? "pass" : "fail",
};
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`BUNDLE_REPORT=${reportPath}`);
console.log(`BUNDLE_FILES=${checked.length}`);
console.log(`BUNDLE_CYCLES=${cycles.length}`);
console.log(`BUNDLE_WARNINGS=${warnings.length}`);
console.log(`BUNDLE_ERRORS=${errors.length}`);
for (const message of warnings) console.warn(`WARN ${message}`);
for (const message of errors) console.error(`ERROR ${message}`);

if (errors.length > 0) process.exit(1);
