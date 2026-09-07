const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const databasePath = process.env.DATABASE_PATH || path.join(__dirname, "clinical.db");
const db = new sqlite3.Database(databasePath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) reject(error);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

async function addColumnIfMissing(table, definition) {
  const column = definition.split(/\s+/)[0];
  const columns = await all(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

const ready = (async () => {
  await run("PRAGMA foreign_keys = ON");
  await run("PRAGMA journal_mode = WAL");

  await run(`CREATE TABLE IF NOT EXISTS clinicas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    criado_em TEXT NOT NULL
  )`);
  await run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clinica_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    senha_hash TEXT NOT NULL,
    papel TEXT NOT NULL DEFAULT 'admin',
    criado_em TEXT NOT NULL,
    oauth_subject TEXT,
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS sessoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expira_em TEXT NOT NULL,
    criado_em TEXT NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  )`);
  await run(`CREATE TABLE IF NOT EXISTS casos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clinica_id INTEGER,
    usuario_id INTEGER,
    paciente TEXT NOT NULL,
    evidencias TEXT,
    raciocinio TEXT,
    decisao TEXT NOT NULL,
    medico TEXT NOT NULL,
    data TEXT NOT NULL,
    case_reference TEXT,
    professional_role TEXT,
    deidentified INTEGER NOT NULL DEFAULT 0,
    idempotency_key TEXT,
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )`);
  await addColumnIfMissing("casos", "clinica_id INTEGER");
  await addColumnIfMissing("casos", "usuario_id INTEGER");
  await addColumnIfMissing("casos", "case_reference TEXT");
  await addColumnIfMissing("casos", "professional_role TEXT");
  await addColumnIfMissing("casos", "deidentified INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing("casos", "idempotency_key TEXT");
  await addColumnIfMissing("usuarios", "oauth_subject TEXT");
  await addColumnIfMissing("usuarios", "crm TEXT");
  await addColumnIfMissing("clinicas", "telefone TEXT");
  await addColumnIfMissing("clinicas", "cidade TEXT");
  await addColumnIfMissing("clinicas", "uf TEXT");
  await addColumnIfMissing("clinicas", "especialidade TEXT");
  await addColumnIfMissing("clinicas", "cnpj TEXT");
  await addColumnIfMissing("clinicas", "site TEXT");

  await run(`CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clinica_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    recurso TEXT NOT NULL,
    recurso_id INTEGER,
    detalhes TEXT,
    data TEXT NOT NULL,
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )`);
  await run("CREATE INDEX IF NOT EXISTS idx_casos_clinica_data ON casos (clinica_id, data DESC)");
  await run("CREATE INDEX IF NOT EXISTS idx_auditoria_clinica_data ON auditoria (clinica_id, data DESC)");
  await run("CREATE INDEX IF NOT EXISTS idx_sessoes_token ON sessoes (token_hash)");
  await run("CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_oauth_subject ON usuarios (oauth_subject) WHERE oauth_subject IS NOT NULL");
  await run("CREATE UNIQUE INDEX IF NOT EXISTS idx_casos_idempotencia ON casos (clinica_id, idempotency_key) WHERE idempotency_key IS NOT NULL");
})();

ready.catch((error) => {
  console.error("Erro ao preparar banco SQLite:", error.message);
});

module.exports = { db, run, get, all, ready };
