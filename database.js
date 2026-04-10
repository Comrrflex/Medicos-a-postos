const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "clinical.db");
const db = new sqlite3.Database(dbPath);

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

  db.run(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      acao TEXT NOT NULL,
      usuario TEXT NOT NULL,
      caso_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      FOREIGN KEY (caso_id) REFERENCES casos(id)
    )
  `);
"~/Documents/New project/clinical-trace-system/backend/database.js" 32L, 755B                                    
Last login: Fri Apr 10 15:21:33 on ttys029
cd '/Users/rodrigobaptistadasilva/Documents/New project/clinical-trace-system/backend' && /usr/bin/vim '+call cursor(1,1)' '/Users/rodrigobaptistadasilva/Documents/New project/clinical-trace-system/backend/database.js'
rodrigobaptistadasilva@Mac-mini-de-rodrigo ~ % cd '/Users/rodrigobaptistadasilva/Documents/New project/clinical-trace-system/backend' && /usr/bin/vim '+call cursor(1,1)' '/Users/rodrigobaptistadasilva/Documents/New project/clinical-trace-system/backend/database.js'
























const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "clinical.db");
const db = new sqlite3.Database(dbPath);

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

  db.run(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      acao TEXT NOT NULL,
      usuario TEXT NOT NULL,
      caso_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      FOREIGN KEY (caso_id) REFERENCES casos(id)
    )
  `);
"~/Documents/New project/clinical-trace-system/backend/database.js" 32L, 755B                                    
