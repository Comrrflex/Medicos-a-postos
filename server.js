
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

app.post("/api/casos", (req, res) => {
  const { paciente, evidencias = "", raciocinio = "", decisao, medico } = req.body;

  if (!paciente || !decisao || !medico) {
    return res.status(400).json({
      erro: "Paciente, decisão e médico são obrigatórios.",
    });
  }

  const data = new Date().toISOString();

  db.run(
    `INSERT INTO casos (paciente, evidencias, raciocinio, decisao, medico, data)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [paciente, evidencias, raciocinio, decisao, medico, data],
"~/Documents/New project/clinical-trace-system/backend/server.js" 87L, 2452B
