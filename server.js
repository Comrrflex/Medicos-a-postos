const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// Segurança e middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Como seus arquivos estão na raiz do repositório,
// este servidor entrega index.html, app.js e style.css da própria pasta.
app.use(express.static(__dirname));

// Health check para Azure / monitoramento
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Clinical Trace System",
    timestamp: new Date().toISOString(),
  });
});

// Criar caso clínico
app.post("/api/casos", (req, res) => {
  const {
    paciente,
    evidencias = "",
    raciocinio = "",
    decisao,
    medico,
  } = req.body;

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
    function (err) {
      if (err) {
        return res.status(500).json({
          erro: "Erro ao salvar caso clínico.",
          detalhe: err.message,
        });
      }

      res.status(201).json({
        id: this.lastID,
        paciente,
        evidencias,
        raciocinio,
        decisao,
        medico,
        data,
      });
    }
  );
});

// Listar casos clínicos
app.get("/api/casos", (req, res) => {
  db.all(
    "SELECT * FROM casos ORDER BY data DESC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          erro: "Erro ao listar casos clínicos.",
          detalhe: err.message,
        });
      }

      res.json(rows);
    }
  );
});

// Consultar caso por ID
app.get("/api/casos/:id", (req, res) => {
  const { id } = req.params;

  db.get(
    "SELECT * FROM casos WHERE id = ?",
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          erro: "Erro ao consultar caso clínico.",
          detalhe: err.message,
        });
      }

      if (!row) {
        return res.status(404).json({
          erro: "Caso clínico não encontrado.",
        });
      }

      res.json(row);
    }
  );
});

// Trilha inicial de auditoria
app.get("/api/auditoria", (req, res) => {
  db.all(
    "SELECT id, paciente, medico, data FROM casos ORDER BY data DESC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          erro: "Erro ao listar auditoria.",
          detalhe: err.message,
        });
      }

      res.json({
        total: rows.length,
        eventos: rows.map((caso) => ({
          tipo: "CASO_CLINICO_REGISTRADO",
          casoId: caso.id,
          paciente: caso.paciente,
          medico: caso.medico,
          data: caso.data,
        })),
      });
    }
  );
});

// Fallback para abrir a aplicação web
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Inicialização
app.listen(PORT, () => {
  console.log(`Clinical Trace System rodando em http://localhost:${PORT}`);
});
