#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, renameSync, chmodSync } from "node:fs";
import { basename, resolve } from "node:path";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function required(name) {
  const value = argumentValue(name);
  if (!value) throw new Error(`ARGUMENT_REQUIRED:${name}`);
  return value;
}

function sha256(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
}

const root = resolve(required("--root"));
const packagePath = resolve(required("--package"));
const releaseId = required("--release-id");
const target = required("--target");
const sourcePath = resolve(argumentValue("--source") ?? resolve(root, "release-source.json"));
const output = resolve(argumentValue("--output") ?? resolve(root, "release-manifest.json"));

const source = JSON.parse(readFileSync(sourcePath, "utf8"));
if (source.schemaVersion !== 1 || typeof source.branch !== "string" || typeof source.commitSha !== "string") {
  throw new Error("RELEASE_SOURCE_METADATA_INVALID");
}
if (!/^[0-9a-f]{40}$/.test(source.commitSha)) throw new Error("RELEASE_SOURCE_COMMIT_INVALID");
if (source.worktreeDirty !== false) throw new Error("RELEASE_SOURCE_WORKTREE_DIRTY");
if (!/^[A-Za-z0-9._/-]+$/.test(releaseId)) throw new Error("RELEASE_ID_INVALID");
if (!/^[A-Za-z0-9._-]+$/.test(target)) throw new Error("RELEASE_TARGET_INVALID");

const packageSha256 = sha256(packagePath);
const manifest = {
  schemaVersion: 2,
  releaseId,
  target,
  branch: source.branch,
  commitSha: source.commitSha,
  packageSha256,
  packageFile: basename(packagePath),
  sourceMetadata: "release-source.json",
  generatedAt: new Date().toISOString(),
};

const temp = `${output}.tmp-${process.pid}`;
writeFileSync(temp, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o640 });
chmodSync(temp, 0o640);
renameSync(temp, output);
console.log(`RELEASE_MANIFEST=${output}`);
console.log(`RELEASE_ID=${releaseId}`);
console.log(`TARGET=${target}`);
console.log(`BRANCH=${source.branch}`);
console.log(`COMMIT_SHA=${source.commitSha}`);
console.log(`PACKAGE_SHA256=${packageSha256}`);
