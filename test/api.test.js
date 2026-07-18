const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "medicos-api-"));
process.env.DATABASE_PATH = path.join(testDirectory, "test.db");

const database = require("../database");
const { app } = require("../server");

let server;
let baseUrl;

async function request(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, options);
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}

test.before(async () => {
  await database.ready;
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => database.db.close(resolve));
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

test("protege casos, configura clínica e mantém isolamento", async () => {
  const anonymous = await request("/api/casos");
  assert.equal(anonymous.response.status, 401);

  const setup = await request("/api/configuracao/inicial", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clinica: "Clínica Teste", nome: "Admin Teste", email: "admin@teste.local", senha: "senha-segura-123" }),
  });
  assert.equal(setup.response.status, 201);
  assert.ok(setup.body.token);
  const auth = { Authorization: `Bearer ${setup.body.token}`, "Content-Type": "application/json" };

  const created = await request("/api/casos", {
    method: "POST", headers: auth,
    body: JSON.stringify({ paciente: "Paciente A", medico: "Dra. A", decisao: "Acompanhar", evidencias: "Exame", raciocinio: "Estável" }),
  });
  assert.equal(created.response.status, 201);

  const otherClinic = await database.run("INSERT INTO clinicas (nome, criado_em) VALUES (?, ?)", ["Outra Clínica", new Date().toISOString()]);
  await database.run(
    "INSERT INTO casos (clinica_id, paciente, decisao, medico, data) VALUES (?, ?, ?, ?, ?)",
    [otherClinic.lastID, "Paciente Invisível", "Conduta", "Dr. B", new Date().toISOString()]
  );
  const listed = await request("/api/casos", { headers: auth });
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body.length, 1);
  assert.equal(listed.body[0].paciente, "Paciente A");

  const audit = await request("/api/auditoria", { headers: auth });
  assert.equal(audit.response.status, 200);
  assert.ok(audit.body.eventos.some((event) => event.tipo === "CASO_CLINICO_REGISTRADO"));
});

test("cria usuário e permite login sem expor senha", async () => {
  const login = await request("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@teste.local", senha: "senha-segura-123" }),
  });
  const auth = { Authorization: `Bearer ${login.body.token}`, "Content-Type": "application/json" };
  const created = await request("/api/usuarios", {
    method: "POST", headers: auth,
    body: JSON.stringify({ nome: "Profissional", email: "pro@teste.local", senha: "outra-senha-123", papel: "profissional" }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.senha_hash, undefined);

  const professionalLogin = await request("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "pro@teste.local", senha: "outra-senha-123" }),
  });
  assert.equal(professionalLogin.response.status, 200);
  const forbidden = await request("/api/usuarios", { headers: { Authorization: `Bearer ${professionalLogin.body.token}` } });
  assert.equal(forbidden.response.status, 403);
});

test("SDK público aceita somente registros desidentificados e é idempotente", async () => {
  const admin = await database.get("SELECT id FROM usuarios WHERE email = ?", ["admin@teste.local"]);
  process.env.DEV_OAUTH_TOKEN = "oauth-test-token";
  process.env.DEV_OAUTH_USER_ID = String(admin.id);
  const headers = { Authorization: "Bearer oauth-test-token", "Content-Type": "application/json", "Idempotency-Key": "550e8400-e29b-41d4-a716-446655440000" };

  const identified = await request("/api/sdk/casos", {
    method: "POST", headers,
    body: JSON.stringify({ caseReference: "CASO-001", professionalRole: "Médica", evidence: "email: pessoa@exemplo.com", reasoning: "Avaliação", decision: "Acompanhar", deidentificationConfirmed: true }),
  });
  assert.equal(identified.response.status, 400);

  const payload = { caseReference: "CASO-001", professionalRole: "Médica", evidence: "Achado desidentificado", reasoning: "Avaliação estável", decision: "Acompanhar", deidentificationConfirmed: true };
  const created = await request("/api/sdk/casos", { method: "POST", headers, body: JSON.stringify(payload) });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.caseReference, "CASO-001");

  const repeated = await request("/api/sdk/casos", { method: "POST", headers, body: JSON.stringify(payload) });
  assert.equal(repeated.response.status, 200);
  assert.equal(repeated.body.id, created.body.id);

  const listed = await request("/api/sdk/casos?caseReference=CASO-001", { headers: { Authorization: "Bearer oauth-test-token" } });
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body.length, 1);
  assert.equal(listed.body[0].caseReference, "CASO-001");
  assert.equal(listed.body[0].paciente, undefined);
});
