#!/usr/bin/env python3
"""Write the final release manifest after the package has been extracted."""
from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
from pathlib import Path

BRANCH_RE = re.compile(r"^[A-Za-z0-9._/-]{1,200}$")
COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
RELEASE_RE = re.compile(r"^[A-Za-z0-9._-]+$")
TARGET_RE = RELEASE_RE


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--release-id", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--package-sha256", required=True)
    parser.add_argument("--package-file", required=True)
    args = parser.parse_args()

    source = json.loads(args.source.read_text(encoding="utf-8"))
    if source.get("schemaVersion") != 1:
        raise SystemExit("RELEASE_SOURCE_SCHEMA_INVALID")
    branch = source.get("branch")
    commit_sha = source.get("commitSha")
    if not isinstance(branch, str) or not BRANCH_RE.fullmatch(branch) or branch == "HEAD":
        raise SystemExit("RELEASE_SOURCE_BRANCH_INVALID")
    if not isinstance(commit_sha, str) or not COMMIT_RE.fullmatch(commit_sha):
        raise SystemExit("RELEASE_SOURCE_COMMIT_INVALID")
    if source.get("worktreeDirty") is not False:
        raise SystemExit("RELEASE_SOURCE_WORKTREE_DIRTY")
    if not RELEASE_RE.fullmatch(args.release_id):
        raise SystemExit("RELEASE_ID_INVALID")
    if not TARGET_RE.fullmatch(args.target):
        raise SystemExit("TARGET_INVALID")
    if not SHA256_RE.fullmatch(args.package_sha256):
        raise SystemExit("PACKAGE_SHA256_INVALID")
    if not args.package_file or "/" in args.package_file or "\\" in args.package_file:
        raise SystemExit("PACKAGE_FILE_INVALID")

    manifest = {
        "schemaVersion": 2,
        "releaseId": args.release_id,
        "target": args.target,
        "branch": branch,
        "commitSha": commit_sha,
        "packageSha256": args.package_sha256,
        "packageFile": args.package_file,
        "sourceMetadata": "release-source.json",
        "generatedAt": source.get("generatedAt"),
        "manifestGeneratedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{args.output.name}.", dir=args.output.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(manifest, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
        os.chmod(tmp_name, 0o640)
        os.replace(tmp_name, args.output)
    finally:
        try:
            os.unlink(tmp_name)
        except FileNotFoundError:
            pass

    print(f"RELEASE_MANIFEST={args.output}")
    print(f"RELEASE_ID={args.release_id}")
    print(f"TARGET={args.target}")
    print(f"BRANCH={branch}")
    print(f"COMMIT_SHA={commit_sha}")
    print(f"PACKAGE_SHA256={args.package_sha256}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
