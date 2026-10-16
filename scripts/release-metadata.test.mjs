import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const root = new URL(".", import.meta.url).pathname.replace(/\/scripts\/$/, "");
const stampScript = join(root, "scripts/stamp-release-source.mjs");
const manifestScript = join(root, "scripts/write-release-manifest.mjs");

function git(cwd, ...args) {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" }).trim();
}

function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), "idefazei-release-metadata-"));
  execFileSync("git", ["-c", "init.defaultBranch=main", "init", cwd], { stdio: "ignore" });
  git(cwd, "config", "user.email", "release-test@example.invalid");
  git(cwd, "config", "user.name", "Release Test");
  writeFileSync(join(cwd, "tracked.txt"), "tracked\n");
  git(cwd, "add", "tracked.txt");
  git(cwd, "commit", "-m", "test fixture");
  return cwd;
}

test("stamps branch and commit from a clean Git checkout", () => {
  const cwd = fixture();
  const output = join(cwd, "release-source.json");
  execFileSync(process.execPath, [stampScript, "--root", cwd, "--output", output], { stdio: "pipe" });
  const metadata = JSON.parse(readFileSync(output, "utf8"));
  assert.equal(metadata.branch, "main");
  assert.equal(metadata.commitSha, git(cwd, "rev-parse", "HEAD"));
  assert.equal(metadata.worktreeDirty, false);
});

test("rejects a dirty checkout by default", () => {
  const cwd = fixture();
  writeFileSync(join(cwd, "untracked.txt"), "dirty\n");
  assert.throws(() => execFileSync(process.execPath, [stampScript, "--root", cwd, "--output", join(cwd, "release-source.json")], { stdio: "pipe" }), /GIT_WORKTREE_DIRTY_RELEASE_BLOCKED/);
});

test("writes the package hash into the final manifest", () => {
  const cwd = fixture();
  const source = join(cwd, "release-source.json");
  const packagePath = join(cwd, "release.tar.gz");
  const output = join(cwd, "release-manifest.json");
  execFileSync(process.execPath, [stampScript, "--root", cwd, "--output", source], { stdio: "pipe" });
  writeFileSync(packagePath, "package bytes\n");
  execFileSync(process.execPath, [manifestScript, "--root", cwd, "--package", packagePath, "--source", source, "--output", output, "--release-id", "homolog-metadata-test", "--target", "homologacao"], { stdio: "pipe" });
  const manifest = JSON.parse(readFileSync(output, "utf8"));
  assert.equal(manifest.branch, "main");
  assert.equal(manifest.commitSha, git(cwd, "rev-parse", "HEAD"));
  assert.equal(manifest.packageSha256.length, 64);
  assert.equal(manifest.target, "homologacao");
});
