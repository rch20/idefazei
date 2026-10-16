#!/usr/bin/env python3
"""Teste de MySQL real exclusivamente descartável no Sandbox, sem TCP/VPS/env."""
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
parser.add_argument('--output', default='/home/ubuntu/foundation-idempotencia-20261016/mysql-integration')
args = parser.parse_args()
root = Path(args.binaries_root).resolve()
mysql = root/'usr/bin/mysql'
mysqld = root/'usr/sbin/mysqld'
if not mysql.is_file() or not mysqld.is_file():
    raise SystemExit('MYSQL8_DISPOSABLE_BINARIES_REQUIRED')
out = Path(args.output).resolve(); out.mkdir(parents=True, exist_ok=True)
work = Path(tempfile.mkdtemp(prefix='idefazei-idempotency-mysql8-', dir='/tmp'))
work.chmod(0o700)
data = work/'data'; data.mkdir(mode=0o700)
socket = work/'mysql.sock'
env = os.environ.copy()
env['LD_LIBRARY_PATH'] = str(root/'usr/lib/x86_64-linux-gnu')
# Nunca utilizar credenciais/endereços de aplicação nos testes.
env.pop('DATABASE_URL', None)
env['FOUNDATION_DISPOSABLE_MYSQL'] = 'sandbox-only'
env['FOUNDATION_DISPOSABLE_SOCKET'] = str(socket)
env['CI'] = '1'
server = None

def query(sql, database=None):
    command = [str(mysql), '--no-defaults', '--socket='+str(socket), '--user=root', '--batch', '--skip-column-names']
    if database: command += ['--database='+database]
    p = subprocess.run(command, input=sql, text=True, capture_output=True, env=env, timeout=20)
    if p.returncode: raise RuntimeError('DISPOSABLE_MYSQL_QUERY_FAILED')
    return p.stdout.strip()

schema = """
CREATE TABLE foundation_studies (
 id INT PRIMARY KEY AUTO_INCREMENT,churchId INT NOT NULL,courseId INT NOT NULL,moduleId INT NULL,
 title VARCHAR(160) NOT NULL,weekStart DATE NULL,summary VARCHAR(500) NULL,content TEXT NULL,
 position INT NOT NULL DEFAULT 0,active BOOLEAN NOT NULL DEFAULT 1,createdByChurchUserId INT NOT NULL,
 createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE foundation_study_blocks (
 id INT PRIMARY KEY AUTO_INCREMENT,churchId INT NOT NULL,studyId INT NOT NULL,title VARCHAR(160) NOT NULL,
 content TEXT NOT NULL,reflectionPrompt TEXT NULL,position INT NOT NULL DEFAULT 0,active BOOLEAN NOT NULL DEFAULT 1,
 createdByChurchUserId INT NOT NULL,createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE foundation_questions (
 id INT PRIMARY KEY AUTO_INCREMENT,churchId INT NOT NULL,blockId INT NOT NULL,prompt TEXT NOT NULL,
 options JSON NOT NULL,correctOptionId VARCHAR(80) NOT NULL,explanation TEXT NOT NULL,
 position INT NOT NULL DEFAULT 0,active BOOLEAN NOT NULL DEFAULT 1,createdByChurchUserId INT NOT NULL,
 createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
"""
try:
    print('MYSQL8_DISPOSABLE_INITIALIZING', flush=True)
    p = subprocess.run([str(mysqld), '--no-defaults', '--initialize-insecure', '--basedir='+str(root/'usr'), '--datadir='+str(data), '--log-error='+str(work/'init.log')], env=env, capture_output=True, timeout=45)
    if p.returncode: raise RuntimeError('DISPOSABLE_MYSQL_INIT_FAILED')
    server = subprocess.Popen([str(mysqld), '--no-defaults', '--basedir='+str(root/'usr'), '--datadir='+str(data), '--socket='+str(socket), '--pid-file='+str(work/'mysql.pid'), '--skip-networking', '--mysqlx=OFF', '--secure-file-priv='+str(work), '--log-error='+str(work/'server.log'), '--innodb-buffer-pool-size=64M'], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    deadline = time.monotonic()+20
    while True:
        if server.poll() is not None: raise RuntimeError('DISPOSABLE_MYSQL_START_FAILED')
        try:
            version = query('SELECT VERSION();')
            break
        except RuntimeError:
            if time.monotonic()>deadline: raise
            time.sleep(.3)
    assert version.startswith('8.0.')
    assert query('SELECT @@socket;') == str(socket)
    query('CREATE DATABASE foundation_idempotency_test;')
    query(schema, 'foundation_idempotency_test')
    migration = project/'drizzle/0096_foundation_creation_idempotency.sql'
    if not migration.is_file(): raise RuntimeError('MIGRATION_0096_NOT_PREPARED')
    query(migration.read_text(), 'foundation_idempotency_test')
    print('MYSQL8_DISPOSABLE_READY_MIGRATION_APPLIED='+version, flush=True)
    command = ['pnpm', 'exec', 'vitest', 'run', 'server/foundation-creation-mysql.integration.test.ts', '--reporter=verbose', '--reporter=json', '--outputFile.json='+str(out/'vitest.json')]
    with (out/'vitest.log').open('w') as logfile:
        result = subprocess.run(command, cwd=project, env=env, stdout=logfile, stderr=subprocess.STDOUT, timeout=180)
    report = {'mysql_version':version, 'socket_only':True, 'vps_access':False, 'migration_sha256':hashlib.sha256(migration.read_bytes()).hexdigest(), 'test_exit_code':result.returncode, 'temporaries_removed_on_exit':True}
    if (out/'vitest.json').is_file():
        totals = json.loads((out/'vitest.json').read_text())
        report.update({'tests_pass':totals.get('numPassedTests'), 'tests_fail':totals.get('numFailedTests'), 'tests_pending':totals.get('numPendingTests')})
    (out/'summary.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report, indent=2), flush=True)
    if result.returncode: raise SystemExit(result.returncode)
finally:
    if server is not None and server.poll() is None:
        try: query('SHUTDOWN;')
        except Exception: server.terminate()
        try: server.wait(timeout=15)
        except subprocess.TimeoutExpired: server.kill(); server.wait(timeout=5)
    shutil.rmtree(work)
    print('MYSQL8_DISPOSABLE_STOPPED_AND_REMOVED', flush=True)
