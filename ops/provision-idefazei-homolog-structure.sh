#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "ROOT_REQUIRED" >&2
  exit 1
fi

PACKAGE_PATH="${1:-}"
RELEASE_ID="${2:-homolog-e66d8b8-structure}"
EXPECTED_PACKAGE_SHA256="00b94b9f4a091fd4eceb3e3173330486b5ec8dec401b1a9950cd8d1d6f515de1"

if [[ -z "${PACKAGE_PATH}" || ! -f "${PACKAGE_PATH}" ]]; then
  echo "USAGE: provision-idefazei-homolog-structure.sh PACKAGE_PATH [RELEASE_ID]" >&2
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
ENV_FILE="/etc/idefazei/homolog.env"
SERVICE_NAME="idefazei-homolog"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
DB_NAME="idefazei_homolog"
DB_USER="idefazei_stage_app"
PORT="3100"

fail() {
  echo "HOMOLOGATION_STRUCTURE_FAILED:$1" >&2
  exit 1
}

systemctl is-active --quiet idefazei || fail "PRODUCTION_SERVICE_NOT_ACTIVE_STOP"
if ss -ltn | grep -Eq '(^|[[:space:]])127\.0\.0\.1:3100([[:space:]]|$)'; then
  fail "PORT_3100_ALREADY_IN_USE"
fi
if systemctl is-active --quiet "${SERVICE_NAME}"; then
  fail "HOMOLOG_SERVICE_ALREADY_ACTIVE"
fi
if [[ -e "${RELEASE_DIR}" || -e "${CURRENT_LINK}" || -e "${ENV_FILE}" || -e "${SERVICE_FILE}" ]]; then
  fail "HOMOLOGATION_PATH_ALREADY_EXISTS_REFUSING_TO_OVERWRITE"
fi

actual_package_sha256="$(sha256sum "${PACKAGE_PATH}" | awk '{print $1}')"
[[ "${actual_package_sha256}" == "${EXPECTED_PACKAGE_SHA256}" ]] || fail "PACKAGE_CHECKSUM_MISMATCH"
PACKAGE_LIST="$(mktemp)"
trap 'rm -f "${PACKAGE_LIST}"' EXIT
tar -tzf "${PACKAGE_PATH}" > "${PACKAGE_LIST}"
if ! grep -Fxq './patches/exceljs@4.4.0.patch' "${PACKAGE_LIST}"; then
  fail "PACKAGE_PATCH_EXCELJS_MISSING"
fi
if grep -Eiq '(^|/)(\.env|\.env\.|.*\.env$|uploads/|data/|logs?/|backups?/|id_ed25519|authorized_keys)' "${PACKAGE_LIST}"; then
  fail "PACKAGE_CONTAINS_FORBIDDEN_PATH"
fi

echo "PRODUCTION_SERVICE_PRESERVED=$(systemctl is-active idefazei)"
echo "PACKAGE_SHA256=${actual_package_sha256}"

if ! getent group "${APP_GROUP}" >/dev/null; then
  groupadd --system "${APP_GROUP}"
fi
if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "/var/lib/${APP_USER}" --gid "${APP_GROUP}" --shell /usr/sbin/nologin "${APP_USER}"
fi
install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 0750 "/var/lib/${APP_USER}"
install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 0750 \
  "${BASE_DIR}/releases" "${BASE_DIR}/shared" "${BASE_DIR}/backups"
install -d -o root -g "${APP_GROUP}" -m 0750 /etc/idefazei
install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 0700 "${RELEASE_DIR}"

if mysql --protocol=socket -NBe "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${DB_NAME}'" | grep -qx "${DB_NAME}"; then
  fail "HOMOLOG_DATABASE_ALREADY_EXISTS"
fi
if mysql --protocol=socket -NBe "SELECT User FROM mysql.user WHERE User='${DB_USER}' AND Host='localhost'" | grep -qx "${DB_USER}"; then
  fail "HOMOLOG_DATABASE_USER_ALREADY_EXISTS"
fi

DB_PASSWORD="$(openssl rand -hex 32)"
JWT_SECRET="$(openssl rand -hex 48)"
INTERNAL_JOBS_TOKEN="$(openssl rand -hex 32)"
SUPER_ADMIN_SETUP_TOKEN="$(openssl rand -hex 32)"

mysql --protocol=socket <<SQL
CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

cat > "${ENV_FILE}" <<EOF
NODE_ENV=production
HOST=127.0.0.1
PORT=${PORT}
PUBLIC_APP_URL=https://homolog.idefazei.com.br
DATABASE_URL=mysql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:3306/${DB_NAME}
JWT_SECRET=${JWT_SECRET}
INTERNAL_JOBS_TOKEN=${INTERNAL_JOBS_TOKEN}
SUPER_ADMIN_SETUP_TOKEN=${SUPER_ADMIN_SETUP_TOKEN}
OWNER_OPEN_ID=homolog-test-owner
OWNER_NAME=Homologacao
PASSWORD_RESET_EMAIL_ENABLED=false
EMAIL_VERIFICATION_ENABLED=false
SECURITY_ALERT_CHANNEL=disabled
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
EOF
chown root:root "${ENV_FILE}"
chmod 600 "${ENV_FILE}"
unset DB_PASSWORD JWT_SECRET INTERNAL_JOBS_TOKEN SUPER_ADMIN_SETUP_TOKEN

tar -xzf "${PACKAGE_PATH}" --no-same-owner -C "${RELEASE_DIR}"
chown -R "${APP_USER}:${APP_GROUP}" "${RELEASE_DIR}"
runuser -u "${APP_USER}" -- env HOME="/var/lib/${APP_USER}" PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" CI=1 \
  bash -c "cd '${RELEASE_DIR}' && pnpm install --frozen-lockfile"

ln -s "${RELEASE_DIR}" "${CURRENT_LINK}"
chown -h "${APP_USER}:${APP_GROUP}" "${CURRENT_LINK}"

cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=Ide Fazei Homologacao
After=network-online.target mysql.service mariadb.service
Wants=network-online.target

[Service]
User=${APP_USER}
Group=${APP_GROUP}
WorkingDirectory=${CURRENT_LINK}
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/node ${CURRENT_LINK}/dist/index.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
chown root:root "${SERVICE_FILE}"
chmod 644 "${SERVICE_FILE}"
systemctl daemon-reload

cat > /usr/local/sbin/idefazei-homolog-ops <<'OPS'
#!/usr/bin/env bash
set -Eeuo pipefail

cmd="${1:-}"
BASE_DIR="/opt/idefazei-homolog"
CURRENT_LINK="${BASE_DIR}/current"
ENV_FILE="/etc/idefazei/homolog.env"
APP_USER="idefazei-stage"

load_env() {
  set +u
  . "${ENV_FILE}"
  set -u
}

case "${cmd}" in
  status)
    systemctl is-active idefazei-homolog || true
    printf 'PID=%s\n' "$(systemctl show -p MainPID --value idefazei-homolog)"
    ss -ltn | grep -E '127\.0\.0\.1:3100([[:space:]]|$)' || true
    printf 'PRODUCTION='; systemctl is-active idefazei
    ;;
  baseline)
    test -f "${CURRENT_LINK}/ops/apply-drizzle-baseline.mjs"
    load_env
    runuser -u "${APP_USER}" -- env HOME="/var/lib/${APP_USER}" DATABASE_URL="${DATABASE_URL}" PROJECT_ROOT="${CURRENT_LINK}" \
      node "${CURRENT_LINK}/ops/apply-drizzle-baseline.mjs"
    ;;
  migrations)
    test -f "${CURRENT_LINK}/ops/apply-custom-migrations.mjs"
    load_env
    runuser -u "${APP_USER}" -- env HOME="/var/lib/${APP_USER}" DATABASE_URL="${DATABASE_URL}" PROJECT_ROOT="${CURRENT_LINK}" \
      node "${CURRENT_LINK}/ops/apply-custom-migrations.mjs"
    ;;
  explain)
    test -f "${CURRENT_LINK}/ops/explain-financial-transactions.mjs"
    load_env
    runuser -u "${APP_USER}" -- env HOME="/var/lib/${APP_USER}" DATABASE_URL="${DATABASE_URL}" PROJECT_ROOT="${CURRENT_LINK}" \
      node "${CURRENT_LINK}/ops/explain-financial-transactions.mjs"
    ;;
  start)
    systemctl enable --now idefazei-homolog
    systemctl is-active --quiet idefazei-homolog
    ss -ltn | grep -E '127\.0\.0\.1:3100([[:space:]]|$)'
    systemctl is-active --quiet idefazei
    ;;
  *)
    echo 'usage: status | baseline | migrations | explain | start' >&2
    exit 2
    ;;
esac
OPS
chmod 755 /usr/local/sbin/idefazei-homolog-ops
chown root:root /usr/local/sbin/idefazei-homolog-ops
cat > /etc/sudoers.d/manus-idefazei-homolog-ops <<'SUDOERS'
manus ALL=(root) NOPASSWD: /usr/local/sbin/idefazei-homolog-ops
SUDOERS
chmod 440 /etc/sudoers.d/manus-idefazei-homolog-ops
visudo -cf /etc/sudoers.d/manus-idefazei-homolog-ops

systemctl is-active --quiet idefazei || fail "PRODUCTION_SERVICE_CHANGED"
ss -ltn | grep -E '127\.0\.0\.1:3000([[:space:]]|$)' >/dev/null || fail "PRODUCTION_PORT_3000_NOT_LISTENING"

echo "HOMOLOG_STRUCTURE_READY=1"
echo "HOMOLOG_SERVICE=${SERVICE_NAME}"
echo "HOMOLOG_PORT=${PORT}"
echo "HOMOLOG_DB=${DB_NAME}"
echo "HOMOLOG_SERVICE_STARTED=0"
echo "PRODUCTION_SERVICE=$(systemctl is-active idefazei)"
