#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "ROOT_REQUIRED" >&2
  exit 2
fi

NGINX_FILES=(
  "/etc/nginx/sites-available/idefazei"
  "/etc/nginx/sites-enabled/idefazei"
)
BACKUPS=()

for nginx_file in "${NGINX_FILES[@]}"; do
  if [[ ! -f "$nginx_file" ]]; then
    echo "NGINX_SITE_NOT_FOUND=$nginx_file" >&2
    exit 1
  fi
  if ! grep -Fq 'location / {' "$nginx_file"; then
    echo "EXPECTED_LOCATION_NOT_FOUND=$nginx_file" >&2
    exit 1
  fi
done

for nginx_file in "${NGINX_FILES[@]}"; do
  if ! grep -Eq '^[[:space:]]*client_max_body_size[[:space:]]+' "$nginx_file"; then
    backup="${nginx_file}.backup-online-contribution-$(date -u +%Y%m%dT%H%M%SZ)"
    cp -a "$nginx_file" "$backup"
    BACKUPS+=("$backup")

    python3 - "$nginx_file" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
needle = "    location / {\n"
replacement = needle + "        # Online contribution proofs: the application enforces the 8 MiB file limit.\n        client_max_body_size 10m;\n"
if text.count(needle) != 1:
    raise SystemExit("EXPECTED_SINGLE_LOCATION_NOT_FOUND")
path.write_text(text.replace(needle, replacement, 1))
PY
  fi

  if ! grep -Fq 'client_max_body_size 10m;' "$nginx_file"; then
    for backup in "${BACKUPS[@]}"; do cp -a "$backup" "${backup%.backup-online-contribution-*}"; done
    echo "NGINX_LIMIT_WRITE_FAILED=$nginx_file" >&2
    exit 1
  fi
done

if ! nginx -t; then
  for backup in "${BACKUPS[@]}"; do cp -a "$backup" "${backup%.backup-online-contribution-*}"; done
  nginx -t
  echo "NGINX_CONFIG_ROLLED_BACK=1" >&2
  exit 1
fi

systemctl reload nginx

echo "NGINX_UPLOAD_LIMIT_UPDATED=1"
echo "CLIENT_MAX_BODY_SIZE=10m"
for backup in "${BACKUPS[@]}"; do echo "BACKUP_CREATED=$backup"; done
echo "NGINX_RELOADED=1"
