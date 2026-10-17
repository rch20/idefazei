#!/usr/bin/env python3
"""Valida CAS e a 0097 exclusivamente em MySQL 8 descartável, sem TCP/VPS."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

project = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--binaries-root', default='/home/ubuntu/foundation-producao-20261016/mysql8-test-binaries/root')
parser.add_argument('--output', default='/home/ubuntu/foundation-note-versioning-20261017/mysql-integration')
args = parser.parse_args()
root = Path(args.binaries_root).resolve()
mysql = root / 'usr/bin/mysql'
mysqld = root / 'usr/sbin/mysqld'
if not mysql.is_file() or not mysqld.is_file():
    raise SystemExit('MYSQL8_DISPOSABLE_BINARIES_REQUIRED')
out = Path(args.output).resolve()
out.mkdir(parents=True, exist_ok=True)
work = Path(tempfile.mkdtemp(prefix='idefazei-note-versions-mysql8-', dir='/tmp'))
work.chmod(0o700)
data = work / 'data'
data.mkdir(mode=0o700)
socket = work / 'mysql.sock'
env = os.environ.copy()
env['LD_LIBRARY_PATH'] = str(root / 'usr/lib/x86_64-linux-gnu')
env.pop('DATABASE_URL', None)
env.pop('FOUNDATION_DISPOSABLE_MYSQL', None)
env['FOUNDATION_NOTE_DISPOSABLE_MYSQL'] = 'sandbox-only'
env['FOUNDATION_DISPOSABLE_SOCKET'] = str(socket)
env['CI'] = '1'
server = None
report = {'kind': 'disposable-real-mysql-not-authenticated-e2e', 'socket_only': True, 'vps_access': False, 'test_exit_code': None}
exit_code = 1

def query(sql, database=None):
    command = [str(mysql), '--no-defaults', '--socket=' + str(socket), '--user=root', '--batch', '--skip-column-names']
    if database:
        if database != 'foundation_note_versions_test':
            raise RuntimeError('DISPOSABLE_DATABASE_REQUIRED')
        command += ['--database=' + database]
    result = subprocess.run(command, input=sql, text=True, capture_output=True, env=env, timeout=20)
    if result.returncode:
        raise RuntimeError('DISPOSABLE_MYSQL_QUERY_FAILED')
    return result.stdout.strip()

schema = """
CREATE TABLE foundation_lesson_progress (
 id INT PRIMARY KEY AUTO_INCREMENT,churchId INT NOT NULL,enrollmentId INT NOT NULL,studyId INT NOT NULL,
 status ENUM('nao_iniciada','em_andamento','concluida') NOT NULL DEFAULT 'nao_iniciada',
 lastBlockPosition INT NOT NULL DEFAULT 0,reflection TEXT NULL,startedAt TIMESTAMP NULL,lastAccessedAt TIMESTAMP NULL,completedAt TIMESTAMP NULL,
 reviewStatus ENUM('pendente','compreendeu','precisa_reforco','nao_participou') NOT NULL DEFAULT 'pendente',
 reviewNotes TEXT NULL,reviewedAt TIMESTAMP NULL,reviewedByChurchUserId INT NULL,releasedAt TIMESTAMP NULL,releasedByChurchUserId INT NULL,
 createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY foundation_lesson_progress_enrollment_study_unique(churchId,enrollmentId,studyId)
) ENGINE=InnoDB;
CREATE TABLE foundation_block_progress (
 id INT PRIMARY KEY AUTO_INCREMENT,churchId INT NOT NULL,enrollmentId INT NOT NULL,studyId INT NOT NULL,blockId INT NOT NULL,
 status ENUM('em_andamento','concluida') NOT NULL DEFAULT 'em_andamento',
 reflection TEXT NULL,firstViewedAt TIMESTAMP NULL,lastViewedAt TIMESTAMP NULL,completedAt TIMESTAMP NULL,
 createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY foundation_block_progress_enrollment_study_block_unique(churchId,enrollmentId,studyId,blockId)
) ENGINE=InnoDB;
"""
try:
    print('NOTE_MYSQL8_INITIALIZING', flush=True)
    initialized = subprocess.run([str(mysqld), '--no-defaults', '--initialize-insecure', '--basedir=' + str(root / 'usr'), '--datadir=' + str(data), '--log-error=' + str(work / 'init.log')], env=env, capture_output=True, timeout=45)
    if initialized.returncode:
        raise RuntimeError('DISPOSABLE_MYSQL_INIT_FAILED')
    server = subprocess.Popen([str(mysqld), '--no-defaults', '--basedir=' + str(root / 'usr'), '--datadir=' + str(data), '--socket=' + str(socket), '--pid-file=' + str(work / 'mysql.pid'), '--skip-networking', '--mysqlx=OFF', '--secure-file-priv=' + str(work), '--log-error=' + str(work / 'server.log'), '--innodb-buffer-pool-size=64M'], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    deadline = time.monotonic() + 20
    while True:
        if server.poll() is not None:
            raise RuntimeError('DISPOSABLE_MYSQL_START_FAILED')
        try:
            version = query('SELECT VERSION();')
            break
        except RuntimeError:
            if time.monotonic() > deadline:
                raise
            time.sleep(.3)
    assert version.startswith('8.0.')
    assert query('SELECT @@socket;') == str(socket)
    query('CREATE DATABASE foundation_note_versions_test;')
    query(schema, 'foundation_note_versions_test')
    query("INSERT INTO foundation_lesson_progress(churchId,enrollmentId,studyId,reflection,status) VALUES(100,22,77,'Legado geral preservado','concluida'); INSERT INTO foundation_block_progress(churchId,enrollmentId,studyId,blockId,reflection,status) VALUES(100,22,77,84,'Legado etapa preservado','concluida');", 'foundation_note_versions_test')
    before = query("SELECT reflection,status FROM foundation_lesson_progress UNION ALL SELECT reflection,status FROM foundation_block_progress;", 'foundation_note_versions_test')
    migration = project / 'drizzle/0097_foundation_note_versions.sql'
    if not migration.is_file():
        raise RuntimeError('MIGRATION_0097_NOT_PREPARED')
    query(migration.read_text(), 'foundation_note_versions_test')
    after = query("SELECT reflection,status FROM foundation_lesson_progress UNION ALL SELECT reflection,status FROM foundation_block_progress;", 'foundation_note_versions_test')
    assert before == after, 'LEGACY_TEXT_OR_PROGRESS_CHANGED_BY_MIGRATION'
    assert query("SELECT COUNT(*) FROM foundation_lesson_progress WHERE reflectionVersion=0;", 'foundation_note_versions_test') == '1'
    assert query("SELECT COUNT(*) FROM foundation_block_progress WHERE reflectionVersion=0;", 'foundation_note_versions_test') == '1'
    report.update({'mysql_version': version, 'migration_sha256': hashlib.sha256(migration.read_bytes()).hexdigest(), 'legacy_text_and_status_preserved': True})
    print('NOTE_MYSQL8_READY_MIGRATION_LOCAL_ONLY=' + version, flush=True)
    command = ['pnpm', 'exec', 'vitest', 'run', 'server/foundation-note-mysql.integration.test.ts', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + str(out / 'vitest.json')]
    with (out / 'vitest.log').open('w') as logfile:
        result = subprocess.run(command, cwd=project, env=env, stdout=logfile, stderr=subprocess.STDOUT, timeout=180)
    exit_code = result.returncode
    report['test_exit_code'] = exit_code
    if (out / 'vitest.json').is_file():
        totals = json.loads((out / 'vitest.json').read_text())
        report.update({'tests_pass': totals.get('numPassedTests'), 'tests_fail': totals.get('numFailedTests'), 'tests_pending': totals.get('numPendingTests')})
except Exception as error:
    report['runner_error'] = str(error) if isinstance(error, (RuntimeError, AssertionError)) else type(error).__name__
    if (work / 'server.log').is_file():
        shutil.copyfile(work / 'server.log', out / 'disposable-server-diagnostic.log')
finally:
    if server is not None and server.poll() is None:
        try:
            query('SHUTDOWN;')
        except Exception:
            server.terminate()
        try:
            server.wait(timeout=15)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=5)
    shutil.rmtree(work)
    report['process_stopped'] = server is None or server.poll() is not None
    report['temporaries_removed'] = not work.exists()
    (out / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2), flush=True)
    print('NOTE_MYSQL8_STOPPED_AND_REMOVED', flush=True)
raise SystemExit(exit_code)
