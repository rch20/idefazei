#!/usr/bin/env python3
"""
Acrescenta ao /usr/local/sbin/idefazei-production-deploy um caminho de APROVAÇÃO REGISTRADA
para o hash do servidor, sem remover nenhuma trava existente.

O que muda (3 pontos, todos ancorados em trechos exatos; se algum não bater, nada é alterado):
  1. funções novas antes de validate_runtime_compatibility (leem /etc/ide-fazei/approved-runtimes.d/*.conf);
  2. um novo `elif` ANTES do `else die SERVER_RUNTIME_DRIFT`: só aceita se hash do servidor, hash base (o ativo),
     commit do release-source.json e validade (<= 1 h) baterem com um arquivo root:root 600;
  3. no runtime de importação (foundation), aceita o hash aprovado quando o servidor foi aprovado.
Todos os outros casos aprovados à mão continuam intactos e avaliados primeiro.

Uso:  python3 patch-production-deploy.py --dry-run   (mostra o que mudaria; não grava)
      python3 patch-production-deploy.py --apply     (faz backup, grava e confere a sintaxe)
Desfazer: copiar de volta o backup indicado na saída.
"""
import difflib
import os
import shutil
import subprocess
import sys
import tempfile
import time

TARGET = os.environ.get("IDEFAZEI_DEPLOY_TARGET", "/usr/local/sbin/idefazei-production-deploy")
BACKUP_DIR = "/var/backups/idefazei"
APPROVAL_DIR = "/etc/ide-fazei/approved-runtimes.d"

FUNCS = r'''APPROVED_RUNTIMES_DIR="/etc/ide-fazei/approved-runtimes.d"

approved_conf_value() { sed -n "s/^$2=//p" "$1" | head -1; }

release_source_commit() {
  python3 -I - "$1" <<'APPROVED_SRC_PY'
import json, re, sys
try:
    d = json.load(open(sys.argv[1], encoding="utf-8"))
    ok = d.get("schemaVersion") == 1 and d.get("worktreeDirty") is False and re.fullmatch(r"[0-9a-f]{40}", d.get("commitSha", ""))
    print(d["commitSha"] if ok else "")
except Exception:
    print("")
APPROVED_SRC_PY
}

# approved_runtime_conf SERVER_SHA BASE_SERVER_SHA COMMIT [FOUNDATION_SHA]
# Aprovação = arquivo root:root 600, em pasta root 700, não expirado, com todos os campos iguais.
approved_runtime_conf() {
  local conf now exp
  [[ "$3" =~ ^[0-9a-f]{40}$ ]] || return 1
  [[ -d "$APPROVED_RUNTIMES_DIR" && "$(stat -c '%U:%a' "$APPROVED_RUNTIMES_DIR")" == "root:700" ]] || return 1
  now="$(date +%s)"
  for conf in "$APPROVED_RUNTIMES_DIR"/*.conf; do
    [[ -f "$conf" && ! -L "$conf" ]] || continue
    [[ "$(stat -c '%U:%G:%a' "$conf")" == "root:root:600" ]] || continue
    exp="$(approved_conf_value "$conf" EXPIRES_EPOCH)"
    [[ "$exp" =~ ^[0-9]+$ ]] || continue
    (( exp >= now )) || continue
    [[ "$(approved_conf_value "$conf" SERVER_SHA)" == "$1" ]] || continue
    [[ "$(approved_conf_value "$conf" BASE_SERVER_SHA)" == "$2" ]] || continue
    [[ "$(approved_conf_value "$conf" COMMIT)" == "$3" ]] || continue
    if [[ -n "${4:-}" ]]; then
      [[ "$(approved_conf_value "$conf" FOUNDATION_SHA)" == "$4" ]] || continue
    fi
    printf '%s\n' "$conf"
    return 0
  done
  return 1
}

# runtime de importação aprovado junto com o servidor (mesmo commit e mesmo servidor base)
approved_foundation_runtime() {
  local foundation_hash="$1" package_root="$2" active_root server_hash active_server commit
  active_root="$(assert_active_layout)"
  server_hash="$(sha256sum "$package_root/dist/index.js" | awk '{print $1}')"
  active_server="$(sha256sum "$active_root/dist/index.js" | awk '{print $1}')"
  commit="$(release_source_commit "$package_root/release-source.json")"
  approved_runtime_conf "$server_hash" "$active_server" "$commit" "$foundation_hash" >/dev/null
}

'''

ELIF = r'''  elif approved_runtime_conf "$package_hash" "$active_hash" "$(release_source_commit "$package_root/release-source.json")" >/dev/null; then
    printf 'SERVER_RUNTIME_CHANGE=APPROVED_BY_REGISTERED_CONFIG\n'
'''

A1 = "validate_runtime_compatibility() {\n"
A2 = "  else\n    die SERVER_RUNTIME_DRIFT:$server_relative\n  fi\n"
A3 = '    [[ "$package_hash" == "$active_hash" ]] || die FOUNDATION_RUNTIME_DRIFT:$foundation_relative\n'


def build(text):
    for name, anchor in (("A1", A1), ("A2", A2), ("A3", A3)):
        if text.count(anchor) != 1:
            sys.exit("ANCORA_%s_NAO_ENCONTRADA_OU_DUPLICADA (ocorrências=%d): nada foi alterado" % (name, text.count(anchor)))
    if "approved_runtime_conf" in text:
        sys.exit("JA_APLICADO: o programa já contém o caminho de aprovação")
    text = text.replace(A1, FUNCS + A1, 1)
    text = text.replace(A2, ELIF + A2, 1)
    text = text.replace(
        A3,
        '    [[ "$package_hash" == "$active_hash" ]] || approved_foundation_runtime "$package_hash" "$package_root" '
        '|| die FOUNDATION_RUNTIME_DRIFT:$foundation_relative\n',
        1,
    )
    return text


def syntax_ok(text):
    with tempfile.NamedTemporaryFile("w", suffix=".sh", delete=False) as handle:
        handle.write(text)
        name = handle.name
    try:
        return subprocess.run(["bash", "-n", name], capture_output=True, text=True)
    finally:
        os.unlink(name)


def main():
    mode = sys.argv[1] if len(sys.argv) == 2 else ""
    if mode not in ("--dry-run", "--apply"):
        sys.exit(__doc__)
    old = open(TARGET, encoding="utf-8").read()
    new = build(old)
    check = syntax_ok(new)
    if check.returncode != 0:
        sys.exit("SINTAXE_INVALIDA:\n" + check.stderr)
    diff = list(difflib.unified_diff(old.splitlines(), new.splitlines(), "antes", "depois", lineterm="", n=1))
    if mode == "--dry-run":
        print("\n".join(diff))
        print("\nDRY_RUN_OK linhas_antes=%d linhas_depois=%d sintaxe=ok" % (len(old.splitlines()), len(new.splitlines())))
        return
    if os.geteuid() != 0:
        sys.exit("ROOT_REQUIRED")
    stamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    os.makedirs(BACKUP_DIR, mode=0o700, exist_ok=True)
    backup = "%s/idefazei-production-deploy.before-approved-runtimes-%s" % (BACKUP_DIR, stamp)
    shutil.copy2(TARGET, backup)
    st = os.stat(TARGET)
    tmp = TARGET + ".new"
    with open(tmp, "w", encoding="utf-8") as handle:
        handle.write(new)
    os.chmod(tmp, st.st_mode & 0o7777)
    os.chown(tmp, st.st_uid, st.st_gid)
    os.replace(tmp, TARGET)
    os.makedirs(APPROVAL_DIR, mode=0o700, exist_ok=True)
    os.chmod(APPROVAL_DIR, 0o700)
    os.chown(APPROVAL_DIR, 0, 0)
    print("PATCH_APLICADO backup=%s" % backup)
    print("PASTA_DE_APROVACOES=%s (root 700)" % APPROVAL_DIR)


if __name__ == "__main__":
    main()
