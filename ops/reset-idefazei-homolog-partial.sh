#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "ROOT_REQUIRED" >&2
  exit 1
fi

SERVICE_NAME="idefazei-homolog"
BASE_DIR="/opt/idefazei-homolog"
ENV_FILE="/etc/idefazei/homolog.env"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
DB_NAME="idefazei_homolog"
DB_USER="idefazei_stage_app"
APP_USER="idefazei-stage"
APP_GROUP="idefazei-stage"

fail() {
  echo "HOMOLOGATION_RESET_FAILED:$1" >&2
  exit 1
}

systemctl is-active --quiet idefazei || fail "PRODUCTION_SERVICE_NOT_ACTIVE_STOP"
if ss -ltn | grep -Eq '(^|[[:space:]])127\.0\.0\.1:3100([[:space:]]|$)'; then
  fail "PORT_3100_IN_USE_STOP"
fi
if systemctl is-active --quiet "${SERVICE_NAME}"; then
  fail "HOMOLOG_SERVICE_ACTIVE_REFUSING_TO_STOP"
fi

if [[ -f "${SERVICE_FILE}" ]]; then
  systemctl disable "${SERVICE_NAME}" >/dev/null 2>&1 || true
  rm -f "${SERVICE_FILE}"
  systemctl daemon-reload
fi

if mysql --protocol=socket -NBe "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${DB_NAME}'" | grep -qx "${DB_NAME}"; then
  mysql --protocol=socket -e "DROP DATABASE \`${DB_NAME}\`;"
fi
if mysql --protocol=socket -NBe "SELECT User FROM mysql.user WHERE User='${DB_USER}' AND Host='localhost'" | grep -qx "${DB_USER}"; then
  mysql --protocol=socket -e "DROP USER '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;"
fi

rm -f /usr/local/sbin/idefazei-homolog-ops
rm -f /etc/sudoers.d/manus-idefazei-homolog-ops
rm -f "${ENV_FILE}"
rm -rf -- "${BASE_DIR}"

if id -u "${APP_USER}" >/dev/null 2>&1; then
  userdel "${APP_USER}" >/dev/null 2>&1 || true
fi
if getent group "${APP_GROUP}" >/dev/null; then
  groupdel "${APP_GROUP}" >/dev/null 2>&1 || true
fi

systemctl is-active --quiet idefazei || fail "PRODUCTION_SERVICE_CHANGED"
if ss -ltn | grep -Eq '(^|[[:space:]])127\.0\.0\.1:3000([[:space:]]|$)'; then
  echo "PRODUCTION_PORT_3000_PRESENT=1"
else
  fail "PRODUCTION_PORT_3000_NOT_LISTENING"
fi

echo "HOMOLOG_PARTIAL_RESET=1"
echo "PRODUCTION_SERVICE=$(systemctl is-active idefazei)"
echo "PRODUCTION_PORT_3000=present"
