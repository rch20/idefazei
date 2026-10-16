#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function routeListArgument(name) {
  const raw = argumentValue(name);
  if (!raw) return [];
  const values = raw
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  if (values.some(value => !/^[A-Za-z0-9._-]+\.js$/.test(value))) {
    throw new Error(`${name.toUpperCase().replaceAll("-", "_")}_INVALID`);
  }
  if (new Set(values).size !== values.length) {
    throw new Error(`${name.toUpperCase().replaceAll("-", "_")}_DUPLICATE`);
  }
  return values.sort();
}

function runGit(root, args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
  }).trim();
}

const root = resolve(argumentValue("--root") ?? process.cwd());
const output = resolve(
  argumentValue("--output") ?? resolve(root, "release-source.json")
);
const frontendRouteChanges = {
  added: routeListArgument("--frontend-route-added"),
  removed: routeListArgument("--frontend-route-removed"),
};
if (
  frontendRouteChanges.added.some(route =>
    frontendRouteChanges.removed.includes(route)
  )
) {
  throw new Error("FRONTEND_ROUTE_ADDED_REMOVED_OVERLAP");
}

let branch;
let commitSha;
let dirty = false;
try {
  branch = runGit(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
  commitSha = runGit(root, ["rev-parse", "HEAD"]);
  dirty =
    runGit(root, ["status", "--porcelain", "--untracked-files=all"]).length > 0;
} catch (error) {
  throw new Error(
    `GIT_METADATA_UNAVAILABLE: ${error instanceof Error ? error.message : String(error)}`
  );
}

if (!/^[A-Za-z0-9._/-]{1,200}$/.test(branch) || branch === "HEAD") {
  throw new Error("GIT_BRANCH_INVALID");
}
if (!/^[0-9a-f]{40}$/.test(commitSha)) {
  throw new Error("GIT_COMMIT_SHA_INVALID");
}
if (dirty) {
  throw new Error("GIT_WORKTREE_DIRTY_RELEASE_BLOCKED");
}

const metadata = {
  schemaVersion: 1,
  branch,
  commitSha,
  worktreeDirty: dirty,
  generatedAt: new Date().toISOString(),
  frontendRouteChanges,
};

writeFileSync(output, `${JSON.stringify(metadata, null, 2)}\n`, {
  mode: 0o640,
});
console.log(`RELEASE_SOURCE=${output}`);
console.log(`BRANCH=${branch}`);
console.log(`COMMIT_SHA=${commitSha}`);
console.log(`WORKTREE_DIRTY=${dirty ? 1 : 0}`);
