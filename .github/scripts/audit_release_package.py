#!/usr/bin/env python3
"""Audit a release tarball before transferring it to a tenant-aware server."""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
import tarfile
from pathlib import Path

FORBIDDEN = re.compile(
    r"(^|/)(?:\.env(?:\..*)?|uploads?(?:/|$)|data(?:/|$)|logs?(?:/|$)|"
    r"backups?(?:/|$)|dumps?(?:/|$)|node_modules(?:/|$)|\.git(?:/|$)|"
    r"id_ed25519(?:\..*)?|authorized_keys(?:/|$))",
    re.IGNORECASE,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path)
    parser.add_argument("--required", action="append", default=[])
    args = parser.parse_args()

    package = args.package.resolve()
    if not package.is_file() or package.stat().st_size == 0:
        print(f"PACKAGE_NOT_FOUND={package}", file=sys.stderr)
        return 2

    with tarfile.open(package, "r:gz") as archive:
        names = archive.getnames()

    forbidden = [name for name in names if FORBIDDEN.search(name)]
    if forbidden:
        print("FORBIDDEN_ENTRIES_PRESENT=1", file=sys.stderr)
        for name in forbidden[:20]:
            print(name, file=sys.stderr)
        return 3

    missing = [entry for entry in args.required if entry not in names]
    if missing:
        print(f"REQUIRED_ENTRIES_MISSING={missing}", file=sys.stderr)
        return 4

    digest = hashlib.sha256(package.read_bytes()).hexdigest()
    print(f"PACKAGE={package}")
    print(f"PACKAGE_SHA256={digest}")
    print(f"PACKAGE_ENTRIES={len(names)}")
    print("PACKAGE_SCOPE_AUDIT=PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
