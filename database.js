const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./clinical.db", (err) => {
  if (err) {
    console.error("Erro ao conectar ao banco SQLite:", err.message);
    process.exit(1);
  }

  console.log("Banco SQLite conectado.");
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS casos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente TEXT NOT NULL,
      evidencias TEXT,
      raciocinio TEXT,
      decisao TEXT NOT NULL,
      medico TEXT NOT NULL,
      data TEXT NOT NULL
    )
  `);
});

module.exports = db;
