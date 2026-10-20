import hashlib, importlib.machinery, importlib.util, json, os, re, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
loader = importlib.machinery.SourceFileLoader("applier", os.path.join(HERE, "idefazei-apply-migrations"))
spec = importlib.util.spec_from_loader("applier", loader)
A = importlib.util.module_from_spec(spec)
loader.exec_module(A)


class FakeDb:
    def __init__(self, rows=None, columns=None, indexes=None, types=None):
        self.rows = dict(rows or {})
        self.columns = set(columns or [])
        self.indexes = set(indexes or [])
        self.types = dict(types or {})
        self.executed = []

    def execute(self, sql): self.executed.append(sql)
    def ledger_rows(self): return dict(self.rows)
    def column_exists(self, t, c): return (t, c) in self.columns
    def index_exists(self, t, i): return (t, i) in self.indexes
    def column_type(self, t, c): return self.types.get((t, c), "")
    def record(self, mid, file, sha): self.rows[mid] = (file, sha)


def bundle(files, entries_override=None, kind="custom-additive"):
    d = tempfile.mkdtemp()
    os.makedirs(os.path.join(d, "drizzle"))
    entries = []
    for name, sql in files.items():
        open(os.path.join(d, "drizzle", name), "w", encoding="utf-8").write(sql)
        entries.append({"id": name[:4], "file": "drizzle/" + name, "kind": kind,
                        "sha256": hashlib.sha256(sql.encode()).hexdigest()})
    if entries_override is not None:
        entries = entries_override(entries)
    json.dump({"formatVersion": 1, "entries": entries}, open(os.path.join(d, "drizzle", "custom-migrations.json"), "w"))
    return d


class T(unittest.TestCase):
    def blocked(self, bundle_dir, db, code):
        with self.assertRaises(A.Blocked) as cm:
            A.make_plan(bundle_dir, db)
        self.assertEqual(cm.exception.code, code, cm.exception.detail)

    def test_aplica_aditiva_e_registra(self):
        b = bundle({"0099_a.sql": "CREATE TABLE `x` (`id` int NOT NULL);--> statement-breakpoint\nALTER TABLE `x` ADD COLUMN `c` int;--> statement-breakpoint\nCREATE INDEX `i` ON `x` (`c`);"})
        db = FakeDb(rows={"0098": ("drizzle/0098_z.sql", "a" * 64)})
        A.cmd_apply(b, db)
        self.assertEqual(len(db.executed), 3)
        self.assertIn("0099", db.rows)

    def test_nada_pendente(self):
        b = bundle({"0099_a.sql": "CREATE TABLE `x` (`id` int);"})
        e = json.load(open(os.path.join(b, "drizzle/custom-migrations.json")))["entries"][0]
        db = FakeDb(rows={"0099": (e["file"], e["sha256"])})
        plan = A.make_plan(b, db)
        self.assertEqual(plan["steps"], [])

    def test_registro_no_banco_diverge(self):
        b = bundle({"0099_a.sql": "CREATE TABLE `x` (`id` int);"})
        db = FakeDb(rows={"0099": ("drizzle/0099_a.sql", "b" * 64)})
        self.blocked(b, db, "REGISTRO_NO_BANCO_DIVERGE")

    def test_checksum_do_arquivo_diverge(self):
        b = bundle({"0099_a.sql": "CREATE TABLE `x` (`id` int);"})
        open(os.path.join(b, "drizzle/0099_a.sql"), "a").write(" ")
        self.blocked(b, FakeDb(), "CHECKSUM_DO_ARQUIVO_DIVERGE")

    def test_bloqueios(self):
        casos = {
            "DROP TABLE `x`": "COMANDO_NAO_ADITIVO",
            "TRUNCATE TABLE `x`": "COMANDO_NAO_ADITIVO",
            "DELETE FROM `x`": "COMANDO_NAO_ADITIVO",
            "UPDATE `x` SET a=1": "COMANDO_NAO_ADITIVO",
            "INSERT INTO `x` VALUES (1)": "COMANDO_NAO_ADITIVO",
            "RENAME TABLE `x` TO `y`": "COMANDO_NAO_ADITIVO",
            "CREATE TABLE `y` AS SELECT * FROM `x`": "COMANDO_NAO_ADITIVO",
            "CREATE TRIGGER t BEFORE INSERT ON x FOR EACH ROW SET NEW.a=1": "COMANDO_NAO_ADITIVO",
            "ALTER TABLE `x` DROP COLUMN `c`": "ALTER_NAO_ADITIVO",
            "ALTER TABLE `x` ADD COLUMN `c` int, DROP COLUMN `d`": "ALTER_NAO_ADITIVO",
            "ALTER TABLE `x` CHANGE `a` `b` int": "ALTER_NAO_ADITIVO",
            "ALTER TABLE `x` MODIFY COLUMN `a` varchar(5)": "ALTER_NAO_ADITIVO",
            "ALTER TABLE `x` RENAME TO `y`": "ALTER_NAO_ADITIVO",
            "ALTER TABLE `x` ADD PRIMARY KEY (`a`)": "ALTER_NAO_ADITIVO",
            "ALTER TABLE `x` ENGINE=MyISAM": "ALTER_NAO_ADITIVO",
            "ALTER TABLE `x` ADD COLUMN `c` int; DROP TABLE `x`": "COMANDO_NAO_ADITIVO",
            "/*!50100 DROP TABLE `x` */": "COMENTARIO_EXECUTAVEL",
            "ALTER TABLE `x;y` ADD COLUMN c int": "COMANDO_NAO_ADITIVO",
        }
        for sql, code in casos.items():
            with self.subTest(sql=sql):
                b = bundle({"0099_a.sql": sql})
                with self.assertRaises(A.Blocked) as cm:
                    A.make_plan(b, FakeDb())
                self.assertEqual(cm.exception.code, code, sql)

    def test_permitidos(self):
        for sql in [
            "CREATE TABLE IF NOT EXISTS `x` (`id` int, `n` varchar(5) DEFAULT 'drop table; select')",
            "CREATE UNIQUE INDEX IF NOT EXISTS `u` ON `x` (`a`)",
            "ALTER TABLE `x` ADD COLUMN IF NOT EXISTS `c` int NOT NULL DEFAULT 0 AFTER `a`",
            "ALTER TABLE x ADD INDEX i (a), ADD KEY k (b), ADD UNIQUE KEY u (c)",
            "ALTER TABLE x ADD CONSTRAINT fk FOREIGN KEY (a) REFERENCES y(id)",
            "ALTER TABLE `x` ADD COLUMN `c` int -- comentario\n, ADD COLUMN `d` int",
        ]:
            with self.subTest(sql=sql):
                A.make_plan(bundle({"0099_a.sql": sql}), FakeDb())

    def test_enum_ampliado_ok_e_reordenado_bloqueado(self):
        b = bundle({"0099_a.sql": "ALTER TABLE `x` MODIFY COLUMN `s` enum('a','b','c') NOT NULL"})
        db = FakeDb(types={("x", "s"): "enum('a','b')"})
        A.cmd_apply(b, db)
        db2 = FakeDb(types={("x", "s"): "enum('b','a')"})
        with self.assertRaises(A.Blocked) as cm:
            A.cmd_apply(b, db2)
        self.assertEqual(cm.exception.code, "ENUM_NAO_APENAS_AMPLIADO")
        self.assertEqual(db2.executed, [])
        db3 = FakeDb(types={("x", "s"): "varchar(5)"})
        with self.assertRaises(A.Blocked) as cm:
            A.cmd_apply(b, db3)
        self.assertEqual(cm.exception.code, "MODIFY_EM_COLUNA_QUE_NAO_E_ENUM")

    def test_if_not_exists_emulado(self):
        b = bundle({"0099_a.sql": "ALTER TABLE `x` ADD COLUMN IF NOT EXISTS `c` int;--> statement-breakpoint\nCREATE INDEX IF NOT EXISTS `i` ON `x` (`c`);"})
        db = FakeDb(columns={("x", "c")}, indexes={("x", "i")})
        A.cmd_apply(b, db)
        self.assertEqual(db.executed, [])
        self.assertIn("0099", db.rows)
        db2 = FakeDb()
        A.cmd_apply(b, db2)
        self.assertNotIn("IF NOT EXISTS", " ".join(db2.executed).upper())

    def test_legado_sem_registro_e_ignorado(self):
        b = bundle({"0050_a.sql": "CREATE TABLE `a` (`id` int)", "0099_b.sql": "CREATE TABLE `b` (`id` int)"})
        db = FakeDb(rows={"0098": ("f", "c" * 64)})
        plan = A.make_plan(b, db)
        self.assertEqual([e["id"] for e, _ in plan["steps"]], ["0099"])
        self.assertEqual(plan["legacy"], 1)

    def test_ordem_caminho_e_tipo(self):
        b = bundle({"0099_a.sql": "CREATE TABLE `a` (`id` int)", "0100_a.sql": "CREATE TABLE `b` (`id` int)"},
                   entries_override=lambda e: list(reversed(e)))
        self.blocked(b, FakeDb(), "LEDGER_FORA_DE_ORDEM")
        b = bundle({"0099_a.sql": "CREATE TABLE `a` (`id` int)"},
                   entries_override=lambda e: [dict(e[0], file="drizzle/../../etc/0099_x.sql")])
        self.blocked(b, FakeDb(), "ARQUIVO_FORA_DO_PADRAO")
        b = bundle({"0099_a.sql": "CREATE TABLE `a` (`id` int)"}, kind="custom-destructive")
        self.blocked(b, FakeDb(), "MIGRATION_NAO_ADITIVA")

    def test_falha_no_banco_nao_registra(self):
        class Boom(FakeDb):
            def execute(self, sql): raise RuntimeError("boom")
        b = bundle({"0099_a.sql": "CREATE TABLE `a` (`id` int)"})
        db = Boom()
        with self.assertRaises(A.Blocked) as cm:
            A.cmd_apply(b, db)
        self.assertEqual(cm.exception.code, "FALHA_NO_BANCO")
        self.assertNotIn("0099", db.rows)

    def test_migrations_reais_do_repositorio_sao_aditivas(self):
        root = os.path.abspath(os.path.join(HERE, "..", ".."))
        ledger = json.load(open(os.path.join(root, "drizzle", "custom-migrations.json")))
        total = 0
        for e in ledger["entries"]:
            sql = open(os.path.join(root, e["file"]), encoding="utf-8").read()
            self.assertEqual(hashlib.sha256(sql.encode()).hexdigest(), e["sha256"], e["id"])
            for seg in sql.split("--> statement-breakpoint"):
                for st in A.clean_statements(seg):
                    A.classify(st)
                    total += 1
        self.assertGreater(total, 50)


if __name__ == "__main__":
    unittest.main()
