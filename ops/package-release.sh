#!/usr/bin/env bash
set -Eeuo pipefail

PACKAGE_ROOT="${1:-}"
OUTPUT_PACKAGE="${2:-}"
SOURCE_ROOT="${3:-$(pwd)}"
SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUDITOR="${AUDITOR:-${SCRIPT_ROOT}/.github/scripts/audit_release_package.py}"

if [[ -z "$PACKAGE_ROOT" || -z "$OUTPUT_PACKAGE" || ! -d "$PACKAGE_ROOT" ]]; then
  echo "USAGE: package-release.sh PACKAGE_ROOT OUTPUT_PACKAGE [SOURCE_GIT_ROOT]" >&2
  exit 2
fi
if [[ "$OUTPUT_PACKAGE" != *.tar.gz ]]; then
  echo "OUTPUT_MUST_BE_TAR_GZ" >&2
  exit 2
fi
[[ -x "$AUDITOR" || -f "$AUDITOR" ]] || { echo "AUDITOR_NOT_FOUND" >&2; exit 2; }

mkdir -p "$(dirname "$OUTPUT_PACKAGE")"
STAGING="$(mktemp -d)"
LIST="${OUTPUT_PACKAGE%.tar.gz}.package.list"
DIGEST="${OUTPUT_PACKAGE}.sha256"
cleanup() { rm -rf "$STAGING"; }
trap cleanup EXIT

cp -a "$PACKAGE_ROOT"/. "$STAGING"/
STAMP_ARGS=()
if [[ -n "${FRONTEND_ROUTE_ADDED:-}" ]]; then
  STAMP_ARGS+=(--frontend-route-added "$FRONTEND_ROUTE_ADDED")
fi
if [[ -n "${FRONTEND_ROUTE_REMOVED:-}" ]]; then
  STAMP_ARGS+=(--frontend-route-removed "$FRONTEND_ROUTE_REMOVED")
fi
node "$SCRIPT_ROOT/scripts/stamp-release-source.mjs" \
  --root "$SOURCE_ROOT" \
  --output "$STAGING/release-source.json" \
  "${STAMP_ARGS[@]}" >/dev/null

for required in \
  ./dist/index.js \
  ./dist/foundation-import-runtime.mjs \
  ./dist/public/index.html \
  ./package.json \
  ./pnpm-lock.yaml \
  ./patches/exceljs@4.4.0.patch \
  ./release-source.json; do
  [[ -e "$STAGING/${required#./}" ]] || { echo "REQUIRED_PACKAGE_FILE_MISSING=$required" >&2; exit 3; }
done

rm -f "$OUTPUT_PACKAGE" "$LIST" "$DIGEST"
tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner -czf "$OUTPUT_PACKAGE" -C "$STAGING" .
tar -tzf "$OUTPUT_PACKAGE" > "$LIST"
grep -Fxq './release-source.json' "$LIST" || { echo "PACKAGE_RELEASE_SOURCE_MISSING" >&2; exit 4; }
python3 "$AUDITOR" "$OUTPUT_PACKAGE" \
  --required ./patches/exceljs@4.4.0.patch >/dev/null
sha256sum "$OUTPUT_PACKAGE" | tee "$DIGEST"
printf 'PACKAGE_READY=1\nPACKAGE=%s\nPACKAGE_LIST=%s\nPACKAGE_SHA256_FILE=%s\n' \
  "$OUTPUT_PACKAGE" "$LIST" "$DIGEST"
