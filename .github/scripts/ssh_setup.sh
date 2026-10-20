#!/usr/bin/env bash
# Prepara a conexão SSH do usuário ghdeploy. Lê as variáveis de ambiente
# DEPLOY_SSH_PRIVATE_KEY, DEPLOY_KNOWN_HOSTS e DEPLOY_SSH_HOST (nunca imprime os valores).
set -Eeuo pipefail
: "${DEPLOY_SSH_PRIVATE_KEY:?segredo GHDEPLOY_SSH_PRIVATE_KEY ausente}"
: "${DEPLOY_KNOWN_HOSTS:?segredo GHDEPLOY_KNOWN_HOSTS ausente}"
: "${DEPLOY_SSH_HOST:?variável DEPLOY_SSH_HOST ausente}"
umask 077
key="$RUNNER_TEMP/ghdeploy_key"
known="$RUNNER_TEMP/ghdeploy_known_hosts"
config="$RUNNER_TEMP/ghdeploy_ssh_config"
printf '%s\n' "$DEPLOY_SSH_PRIVATE_KEY" > "$key"
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > "$known"
cat > "$config" <<CFG
Host ide-fazei-deploy
  HostName ${DEPLOY_SSH_HOST}
  User ghdeploy
  IdentityFile ${key}
  IdentitiesOnly yes
  UserKnownHostsFile ${known}
  StrictHostKeyChecking yes
  BatchMode yes
  ConnectTimeout 15
  ServerAliveInterval 10
  ServerAliveCountMax 6
CFG
chmod 600 "$key" "$known" "$config"
{
  echo "DEPLOY_SSH_CONFIG=$config"
  echo "DEPLOY_SSH_KEY=$key"
  echo "DEPLOY_SSH_KNOWN=$known"
} >> "$GITHUB_ENV"
