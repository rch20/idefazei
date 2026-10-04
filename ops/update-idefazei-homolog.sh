#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "ROOT_REQUIRED" >&2
  exit 1
fi

PACKAGE_PATH="${1:-}"
RELEASE_ID="${2:-}"
if [[ -z "${PACKAGE_PATH}" || -z "${RELEASE_ID}" || ! -f "${PACKAGE_PATH}" ]]; then
  echo "USAGE: update-idefazei-homolog.sh PACKAGE_PATH RELEASE_ID" >&2
  exit 2
fi
if [[ ! "${RELEASE_ID}" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "INVALID_RELEASE_ID" >&2
  exit 2
fi

APP_USER="idefazei-stage"
APP_GROUP="idefazei-stage"
BASE_DIR="/opt/idefazei-homolog"
RELEASE_DIR="${BASE_DIR}/releases/${RELEASE_ID}"
CURRENT_LINK="${BASE_DIR}/current"
SERVICE_NAME="idefazei-homolog"
PORT="3100"
TENANT_HOST="homolog.idefazei.com.br"

fail() {
  echo "HOMOLOG_UPDATE_FAILED:$1" >&2
  exit 1
}

if ! systemctl is-active --quiet idefazei; then
  fail "PRODUCTION_SERVICE_NOT_ACTIVE"
fi
if ! systemctl is-active --quiet "${SERVICE_NAME}"; then
  fail "HOMOLOG_SERVICE_NOT_ACTIVE"
fi
if ! ss -ltn | grep -Eq "(^|[[:space:]])127\\.0\\.0\\.1:${PORT}([[:space:]]|$)"; then
  fail "HOMOLOG_PORT_NOT_LISTENING"
fi

PRODUCTION_PID_BEFORE="$(systemctl show -p MainPID --value idefazei)"
OLD_RELEASE="$(readlink -f "${CURRENT_LINK}" || true)"
[[ -n "${OLD_RELEASE}" && -d "${OLD_RELEASE}" ]] || fail "CURRENT_RELEASE_NOT_RESOLVED"
[[ ! -e "${RELEASE_DIR}" ]] || fail "RELEASE_PATH_ALREADY_EXISTS"
[[ ! -e "${CURRENT_LINK}.next" && ! -L "${CURRENT_LINK}.next" ]] || fail "STALE_NEXT_LINK_EXISTS"

PACKAGE_SHA256="$(sha256sum "${PACKAGE_PATH}" | awk '{print $1}')"
PACKAGE_LIST="$(mktemp)"
EXTRACT_DIR="$(mktemp -d "${BASE_DIR}/.update-${RELEASE_ID}.XXXXXX")"
SWAPPED=0
cleanup() {
  rm -f "${PACKAGE_LIST}"
  if [[ "${SWAPPED}" -eq 0 ]]; then
    rm -rf "${EXTRACT_DIR}"
  fi
}
trap cleanup EXIT

tar -tzf "${PACKAGE_PATH}" > "${PACKAGE_LIST}"
grep -Fxq './patches/exceljs@4.4.0.patch' "${PACKAGE_LIST}" || fail "PACKAGE_PATCH_EXCELJS_MISSING"
if grep -Eiq '(^|/)(\.env|\.env\.|.*\.env$|uploads/|data/|logs?/|backups?/|id_ed25519|authorized_keys)' "${PACKAGE_LIST}"; then
  fail "PACKAGE_CONTAINS_FORBIDDEN_PATH"
fi

echo "PRODUCTION_PID_BEFORE=${PRODUCTION_PID_BEFORE}"
echo "OLD_RELEASE=${OLD_RELEASE}"
echo "PACKAGE_SHA256=${PACKAGE_SHA256}"
echo "PACKAGE_CONTENTS_OK=1"

tar -xzf "${PACKAGE_PATH}" --no-same-owner -C "${EXTRACT_DIR}"
test -s "${EXTRACT_DIR}/dist/index.js" || fail "PACKAGE_DIST_INDEX_MISSING"
test -s "${EXTRACT_DIR}/dist/foundation-import-runtime.mjs" || fail "PACKAGE_IMPORT_RUNTIME_MISSING"
test -s "${EXTRACT_DIR}/dist/public/index.html" || fail "PACKAGE_FRONTEND_MISSING"
test -s "${EXTRACT_DIR}/package.json" || fail "PACKAGE_MANIFEST_MISSING"
test -s "${EXTRACT_DIR}/pnpm-lock.yaml" || fail "PACKAGE_LOCKFILE_MISSING"
node --check "${EXTRACT_DIR}/dist/index.js"
node --check "${EXTRACT_DIR}/dist/foundation-import-runtime.mjs"

mkdir -p "${BASE_DIR}/releases"
mv "${EXTRACT_DIR}" "${RELEASE_DIR}"
chown -R "${APP_USER}:${APP_GROUP}" "${RELEASE_DIR}"
runuser -u "${APP_USER}" -- env HOME="/var/lib/${APP_USER}" PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" CI=1 \
  bash -c "cd '${RELEASE_DIR}' && pnpm install --frozen-lockfile"
node --check "${RELEASE_DIR}/dist/index.js"

ln -s "${RELEASE_DIR}" "${CURRENT_LINK}.next"
mv -Tf "${CURRENT_LINK}.next" "${CURRENT_LINK}"
SWAPPED=1

wait_for_health() {
  local code=""
  for _ in $(seq 1 30); do
    if systemctl is-active --quiet "${SERVICE_NAME}" && \
      ss -ltn | grep -Eq "(^|[[:space:]])127\\.0\\.0\\.1:${PORT}([[:space:]]|$)"; then
      code="$(curl -sS --max-time 3 -o /dev/null -w '%{http_code}' -H "Host: ${TENANT_HOST}" "http://127.0.0.1:${PORT}/" 2>/dev/null || true)"
      if [[ "${code}" == "200" ]]; then
        return 0
      fi
    fi
    sleep 1
  done
  return 1
}

rollback() {
  echo "HOMOLOG_ROLLBACK_START=1" >&2
  rm -f "${CURRENT_LINK}.rollback"
  ln -s "${OLD_RELEASE}" "${CURRENT_LINK}.rollback"
  mv -Tf "${CURRENT_LINK}.rollback" "${CURRENT_LINK}"
  systemctl restart "${SERVICE_NAME}"
  if ! wait_for_health; then
    echo "HOMOLOG_ROLLBACK_HEALTH_FAILED=1" >&2
    exit 2
  fi
  echo "HOMOLOG_ROLLBACK_COMPLETE=1" >&2
}

if ! systemctl restart "${SERVICE_NAME}"; then
  rollback
  fail "HOMOLOG_SERVICE_RESTART_FAILED"
fi
if ! wait_for_health; then
  rollback
  fail "HOMOLOG_HEALTH_CHECK_FAILED"
fi

PRODUCTION_PID_AFTER="$(systemctl show -p MainPID --value idefazei)"
[[ "${PRODUCTION_PID_AFTER}" == "${PRODUCTION_PID_BEFORE}" ]] || {
  rollback
  fail "PRODUCTION_PID_CHANGED"
}

PROTECTED_CODE="$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' -H "Host: ${TENANT_HOST}" "http://127.0.0.1:${PORT}/api/trpc/people.primaryDisciplerHistory" 2>/dev/null || true)"
[[ "${PROTECTED_CODE}" == "401" ]] || {
  rollback
  fail "PROTECTED_ROUTE_EXPECTED_401_GOT_${PROTECTED_CODE}"
}

printf '%s\n' "${RELEASE_ID}" > "${BASE_DIR}/shared/active-release"
chown "${APP_USER}:${APP_GROUP}" "${BASE_DIR}/shared/active-release"
chmod 640 "${BASE_DIR}/shared/active-release"
printf 'HOMOLOG_UPDATE_SUCCESS\nRELEASE_ID=%s\nPACKAGE_SHA256=%s\nOLD_RELEASE=%s\nNEW_RELEASE=%s\nPRODUCTION_PID=%s\nPROTECTED_ROUTE=%s\n' \
  "${RELEASE_ID}" "${PACKAGE_SHA256}" "${OLD_RELEASE}" "${RELEASE_DIR}" "${PRODUCTION_PID_AFTER}" "${PROTECTED_CODE}"
