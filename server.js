const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const crypto = require("crypto");
const path = require("path");
const database = require("./database");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_HOURS = Number(process.env.SESSION_HOURS) || 12;
const LIMITS = { paciente: 120, medico: 120, evidencias: 4000, raciocinio: 4000, decisao: 4000 };
const loginAttempts = new Map();
const SDK_LIMITS = { caseReference: 40, professionalRole: 80, evidence: 3000, reasoning: 3000, decision: 3000 };
const identifierPatterns = [
  /\b\d{3}\.??\d{3}\.??\d{3}-?\d{2}\b/,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}/,
  /\b(?:paciente|nome|cpf|telefone|e-mail|email|endereço|endereco|data de nascimento)\s*:/i,
];

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expectedHex] = String(stored).split(":");
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function publicUser(row) {
  return { id: row.id, nome: row.nome, email: row.email, papel: row.papel, clinica: { id: row.clinica_id, nome: row.clinica_nome } };
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  await database.run(
    "INSERT INTO sessoes (usuario_id, token_hash, expira_em, criado_em) VALUES (?, ?, ?, ?)",
    [userId, sha256(token), expires.toISOString(), now.toISOString()]
  );
  return { token, expiraEm: expires.toISOString() };
}

async function audit(user, type, resource, resourceId = null, details = null) {
  await database.run(
    `INSERT INTO auditoria (clinica_id, usuario_id, tipo, recurso, recurso_id, detalhes, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user.clinica_id, user.id, type, resource, resourceId, details ? JSON.stringify(details) : null, new Date().toISOString()]
  );
}

function validateCase(body = {}) {
  const caso = Object.fromEntries(Object.keys(LIMITS).map((field) => [field, text(body[field])]));
  if (["paciente", "decisao", "medico"].some((field) => !caso[field])) {
    return { error: "Paciente, decisão e médico são obrigatórios." };
  }
  const exceeded = Object.entries(LIMITS).find(([field, limit]) => caso[field].length > limit);
  if (exceeded) return { error: `O campo ${exceeded[0]} excede ${exceeded[1]} caracteres.` };
  return { caso };
}

function validateSdkCase(body = {}) {
  const draft = Object.fromEntries(Object.keys(SDK_LIMITS).map((field) => [field, text(body[field])]));
  draft.caseReference = draft.caseReference.toUpperCase();
  if (!body.deidentificationConfirmed) return { error: "Confirme que o conteúdo foi desidentificado." };
  if (!/^[A-Z0-9_-]{4,40}$/.test(draft.caseReference)) return { error: "Código de caso inválido." };
  if (!draft.professionalRole || !draft.decision) return { error: "Função profissional e decisão são obrigatórias." };
  const exceeded = Object.entries(SDK_LIMITS).find(([field, limit]) => draft[field].length > limit);
  if (exceeded) return { error: `O campo ${exceeded[0]} excede ${exceeded[1]} caracteres.` };
  const combined = Object.values(draft).join("\n");
  if (identifierPatterns.some((pattern) => pattern.test(combined))) return { error: "O conteúdo parece conter identificadores pessoais." };
  return { draft };
}

let authJwks;
async function authenticateSdkOAuth(req, res, next) {
  try {
    const match = String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ erro: "OAuth necessário." });
    if (process.env.NODE_ENV !== "production" && process.env.DEV_OAUTH_TOKEN === match[1]) {
      const user = await database.get(
        "SELECT u.*, c.nome AS clinica_nome FROM usuarios u JOIN clinicas c ON c.id = u.clinica_id WHERE u.id = ?",
        [Number(process.env.DEV_OAUTH_USER_ID)]
      );
      if (!user) return res.status(401).json({ erro: "Usuário OAuth de desenvolvimento inválido." });
      req.user = user;
      req.oauthScopes = ["cases:read", "cases:write"];
      return next();
    }
    if (!process.env.AUTH_ISSUER || !process.env.AUTH_AUDIENCE) {
      return res.status(503).json({ erro: "OAuth de produção ainda não configurado." });
    }
    const jose = await import("jose");
    authJwks ||= jose.createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL || new URL(".well-known/jwks.json", process.env.AUTH_ISSUER).toString()));
    const { payload } = await jose.jwtVerify(match[1], authJwks, { issuer: process.env.AUTH_ISSUER, audience: process.env.AUTH_AUDIENCE });
    const scopes = typeof payload.scope === "string" ? payload.scope.split(" ") : [];
    let user = await database.get(
      "SELECT u.*, c.nome AS clinica_nome FROM usuarios u JOIN clinicas c ON c.id = u.clinica_id WHERE u.oauth_subject = ?",
      [payload.sub]
    );
    const emailClaim = process.env.AUTH_EMAIL_CLAIM || "https://medicos-a-postos.com/email";
    const verifiedClaim = process.env.AUTH_EMAIL_VERIFIED_CLAIM || "https://medicos-a-postos.com/email_verified";
    const oauthEmail = typeof payload[emailClaim] === "string" ? payload[emailClaim].toLowerCase() : "";
    if (!user && oauthEmail && payload[verifiedClaim] === true) {
      const candidate = await database.get("SELECT * FROM usuarios WHERE email = ? AND oauth_subject IS NULL", [oauthEmail]);
      if (candidate) {
        await database.run("UPDATE usuarios SET oauth_subject = ? WHERE id = ? AND oauth_subject IS NULL", [payload.sub, candidate.id]);
        user = await database.get(
          "SELECT u.*, c.nome AS clinica_nome FROM usuarios u JOIN clinicas c ON c.id = u.clinica_id WHERE u.id = ?",
          [candidate.id]
        );
      }
    }
    if (!user) return res.status(403).json({ erro: "Conta OAuth não vinculada a uma clínica." });
    req.user = user;
    req.oauthScopes = scopes;
    next();
  } catch (error) {
    console.error("Falha OAuth SDK:", error.message);
    res.status(401).json({ erro: "Token OAuth inválido ou expirado." });
  }
}

function requireSdkScope(scope) {
  return (req, res, next) => req.oauthScopes.includes(scope) ? next() : res.status(403).json({ erro: `Escopo ${scope} necessário.` });
}

function sdkCase(row) {
  return {
    id: row.id,
    caseReference: row.case_reference,
    professionalRole: row.professional_role,
    evidence: row.evidencias || "",
    reasoning: row.raciocinio || "",
    decision: row.decisao,
    deidentificationConfirmed: true,
    createdAt: row.data,
  };
}

function loginRateLimit(req, res, next) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const recent = (loginAttempts.get(key) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (recent.length >= 10) return res.status(429).json({ erro: "Muitas tentativas. Aguarde 15 minutos." });
  recent.push(now);
  loginAttempts.set(key, recent);
  next();
}

async function authenticate(req, res, next) {
  try {
    const match = String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ erro: "Autenticação necessária." });
    const user = await database.get(
      `SELECT u.*, c.nome AS clinica_nome, s.id AS sessao_id
       FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id JOIN clinicas c ON c.id = u.clinica_id
       WHERE s.token_hash = ? AND s.expira_em > ?`,
      [sha256(match[1]), new Date().toISOString()]
    );
    if (!user) return res.status(401).json({ erro: "Sessão inválida ou expirada." });
    req.user = user;
    req.sessionTokenHash = sha256(match[1]);
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (req.user.papel !== "admin") return res.status(403).json({ erro: "Acesso restrito a administradores." });
  next();
}

const allowedOrigins = text(process.env.CORS_ORIGIN).split(",").map((item) => item.trim()).filter(Boolean);
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false }));
app.use(express.json({ limit: "32kb" }));
app.use(express.static(__dirname, { index: false }));

app.get("/health", async (req, res, next) => {
  try {
    await database.ready;
    res.json({ status: "ok", app: "Medicos a Postos", timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

app.get("/api/configuracao", async (req, res, next) => {
  try {
    await database.ready;
    const row = await database.get("SELECT COUNT(*) AS total FROM usuarios");
    res.json({ configurado: row.total > 0 });
  } catch (error) { next(error); }
});

app.post("/api/configuracao/inicial", async (req, res, next) => {
  try {
    await database.ready;
    const count = await database.get("SELECT COUNT(*) AS total FROM usuarios");
    if (count.total > 0) return res.status(409).json({ erro: "A configuração inicial já foi concluída." });
    const clinica = text(req.body.clinica);
    const nome = text(req.body.nome);
    const email = text(req.body.email).toLowerCase();
    const senha = String(req.body.senha || "");
    if (!clinica || !nome || !/^\S+@\S+\.\S+$/.test(email) || senha.length < 10) {
      return res.status(400).json({ erro: "Informe clínica, nome, e-mail válido e senha com ao menos 10 caracteres." });
    }
    const now = new Date().toISOString();
    await database.run("BEGIN IMMEDIATE");
    try {
      const createdClinic = await database.run("INSERT INTO clinicas (nome, criado_em) VALUES (?, ?)", [clinica, now]);
      const createdUser = await database.run(
        "INSERT INTO usuarios (clinica_id, nome, email, senha_hash, papel, criado_em) VALUES (?, ?, ?, ?, 'admin', ?)",
        [createdClinic.lastID, nome, email, hashPassword(senha), now]
      );
      await database.run("COMMIT");
      const user = { id: createdUser.lastID, clinica_id: createdClinic.lastID };
      await audit(user, "CONFIGURACAO_INICIAL", "clinica", createdClinic.lastID);
      const session = await createSession(createdUser.lastID);
      res.status(201).json({ token: session.token, expiraEm: session.expiraEm, usuario: { id: createdUser.lastID, nome, email, papel: "admin", clinica: { id: createdClinic.lastID, nome: clinica } } });
    } catch (error) {
      await database.run("ROLLBACK");
      throw error;
    }
  } catch (error) { next(error); }
});

app.post("/api/auth/login", loginRateLimit, async (req, res, next) => {
  try {
    await database.ready;
    const email = text(req.body.email).toLowerCase();
    const user = await database.get(
      "SELECT u.*, c.nome AS clinica_nome FROM usuarios u JOIN clinicas c ON c.id = u.clinica_id WHERE u.email = ?",
      [email]
    );
    if (!user || !verifyPassword(String(req.body.senha || ""), user.senha_hash)) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }
    const session = await createSession(user.id);
    await audit(user, "LOGIN", "sessao");
    res.json({ token: session.token, expiraEm: session.expiraEm, usuario: publicUser(user) });
  } catch (error) { next(error); }
});

app.get("/api/auth/me", authenticate, (req, res) => res.json({ usuario: publicUser(req.user) }));

app.post("/api/auth/logout", authenticate, async (req, res, next) => {
  try {
    await audit(req.user, "LOGOUT", "sessao");
    await database.run("DELETE FROM sessoes WHERE token_hash = ?", [req.sessionTokenHash]);
    res.status(204).end();
  } catch (error) { next(error); }
});

app.get("/api/usuarios", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const users = await database.all(
      "SELECT id, nome, email, papel, criado_em AS criadoEm FROM usuarios WHERE clinica_id = ? ORDER BY nome",
      [req.user.clinica_id]
    );
    res.json(users);
  } catch (error) { next(error); }
});

app.post("/api/usuarios", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const nome = text(req.body.nome);
    const email = text(req.body.email).toLowerCase();
    const senha = String(req.body.senha || "");
    const papel = req.body.papel === "admin" ? "admin" : "profissional";
    if (!nome || nome.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || senha.length < 10) {
      return res.status(400).json({ erro: "Informe nome, e-mail válido e senha com ao menos 10 caracteres." });
    }
    const created = await database.run(
      "INSERT INTO usuarios (clinica_id, nome, email, senha_hash, papel, criado_em) VALUES (?, ?, ?, ?, ?, ?)",
      [req.user.clinica_id, nome, email, hashPassword(senha), papel, new Date().toISOString()]
    );
    await audit(req.user, "USUARIO_CRIADO", "usuario", created.lastID, { papel });
    res.status(201).json({ id: created.lastID, nome, email, papel });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT") return res.status(409).json({ erro: "Este e-mail já está cadastrado." });
    next(error);
  }
});

app.put("/api/usuarios/:id/oauth", authenticate, requireAdmin, async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id) || !text(req.body.subject)) return res.status(400).json({ erro: "Usuário ou subject OAuth inválido." });
    const updated = await database.run(
      "UPDATE usuarios SET oauth_subject = ? WHERE id = ? AND clinica_id = ?",
      [text(req.body.subject), req.params.id, req.user.clinica_id]
    );
    if (!updated.changes) return res.status(404).json({ erro: "Usuário não encontrado." });
    await audit(req.user, "OAUTH_VINCULADO", "usuario", Number(req.params.id));
    res.status(204).end();
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT") return res.status(409).json({ erro: "Este acesso OAuth já está vinculado." });
    next(error);
  }
});

app.get("/api/sdk/casos", authenticateSdkOAuth, requireSdkScope("cases:read"), async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 20);
    const clauses = ["clinica_id = ?", "deidentified = 1", "case_reference IS NOT NULL"];
    const params = [req.user.clinica_id];
    if (text(req.query.caseReference)) { clauses.push("case_reference = ?"); params.push(text(req.query.caseReference).toUpperCase()); }
    if (text(req.query.query)) {
      clauses.push("(evidencias LIKE ? OR raciocinio LIKE ? OR decisao LIKE ?)");
      const query = `%${text(req.query.query).replace(/[%_]/g, "\\$&")}%`;
      params.push(query, query, query);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(req.query.from || ""))) { clauses.push("data >= ?"); params.push(`${req.query.from}T00:00:00.000Z`); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to || ""))) { clauses.push("data <= ?"); params.push(`${req.query.to}T23:59:59.999Z`); }
    params.push(limit);
    const rows = await database.all(
      `SELECT id, case_reference, professional_role, evidencias, raciocinio, decisao, data
       FROM casos WHERE ${clauses.join(" AND ")} ORDER BY data DESC LIMIT ?`, params
    );
    res.json(rows.map(sdkCase));
  } catch (error) { next(error); }
});

app.post("/api/sdk/casos", authenticateSdkOAuth, requireSdkScope("cases:write"), async (req, res, next) => {
  try {
    const result = validateSdkCase(req.body);
    if (result.error) return res.status(400).json({ erro: result.error });
    const idempotencyKey = text(req.headers["idempotency-key"]);
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(idempotencyKey)) return res.status(400).json({ erro: "Idempotency-Key UUID é obrigatório." });
    const existing = await database.get("SELECT * FROM casos WHERE clinica_id = ? AND idempotency_key = ?", [req.user.clinica_id, idempotencyKey]);
    if (existing) return res.json(sdkCase(existing));
    const draft = result.draft;
    const now = new Date().toISOString();
    const created = await database.run(
      `INSERT INTO casos (clinica_id, usuario_id, paciente, evidencias, raciocinio, decisao, medico, data, case_reference, professional_role, deidentified, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [req.user.clinica_id, req.user.id, draft.caseReference, draft.evidence, draft.reasoning, draft.decision, draft.professionalRole, now, draft.caseReference, draft.professionalRole, idempotencyKey]
    );
    await audit(req.user, "CASO_DESIDENTIFICADO_REGISTRADO", "caso", created.lastID);
    res.status(201).json({ id: created.lastID, ...draft, deidentificationConfirmed: true, createdAt: now });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT") return res.status(409).json({ erro: "Registro duplicado." });
    next(error);
  }
});

app.post("/api/casos", authenticate, async (req, res, next) => {
  try {
    const result = validateCase(req.body);
    if (result.error) return res.status(400).json({ erro: result.error });
    const { paciente, evidencias, raciocinio, decisao, medico } = result.caso;
    const data = new Date().toISOString();
    const created = await database.run(
      `INSERT INTO casos (clinica_id, usuario_id, paciente, evidencias, raciocinio, decisao, medico, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.clinica_id, req.user.id, paciente, evidencias, raciocinio, decisao, medico, data]
    );
    await audit(req.user, "CASO_CLINICO_REGISTRADO", "caso", created.lastID);
    res.status(201).json({ id: created.lastID, paciente, evidencias, raciocinio, decisao, medico, data });
  } catch (error) { next(error); }
});

app.get("/api/casos", authenticate, async (req, res, next) => {
  try {
    const rows = await database.all(
      `SELECT id, paciente, evidencias, raciocinio, decisao, medico, data
       FROM casos WHERE clinica_id = ? ORDER BY data DESC LIMIT 200`,
      [req.user.clinica_id]
    );
    res.json(rows);
  } catch (error) { next(error); }
});

app.get("/api/casos/:id", authenticate, async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ erro: "ID de caso inválido." });
    const row = await database.get(
      `SELECT id, paciente, evidencias, raciocinio, decisao, medico, data
       FROM casos WHERE id = ? AND clinica_id = ?`,
      [req.params.id, req.user.clinica_id]
    );
    if (!row) return res.status(404).json({ erro: "Caso clínico não encontrado." });
    res.json(row);
  } catch (error) { next(error); }
});

app.get("/api/auditoria", authenticate, async (req, res, next) => {
  try {
    const events = await database.all(
      `SELECT a.id, a.tipo, a.recurso, a.recurso_id AS recursoId, a.detalhes, a.data,
              u.nome AS usuario
       FROM auditoria a JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.clinica_id = ? ORDER BY a.data DESC LIMIT 500`,
      [req.user.clinica_id]
    );
    res.json({ total: events.length, eventos: events.map((event) => ({ ...event, detalhes: event.detalhes ? JSON.parse(event.detalhes) : null })) });
  } catch (error) { next(error); }
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.use((req, res) => res.status(404).json({ erro: "Rota não encontrada." }));
app.use((error, req, res, next) => {
  console.error("Erro interno:", error.message);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

let server;
async function start() {
  await database.ready;
  server = app.listen(PORT, () => console.log(`Medicos a Postos rodando em http://localhost:${PORT}`));
  return server;
}

if (require.main === module) start().catch((error) => { console.error(error); process.exit(1); });

module.exports = { app, start };
