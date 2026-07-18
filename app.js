const elements = {
  acesso: document.getElementById("acesso"), aplicacao: document.getElementById("aplicacao"),
  loginCard: document.getElementById("login-card"), setupCard: document.getElementById("setup-card"),
  loginForm: document.getElementById("login-form"), setupForm: document.getElementById("setup-form"),
  loginFeedback: document.getElementById("login-feedback"), setupFeedback: document.getElementById("setup-feedback"),
  form: document.getElementById("caso-form"), feedback: document.getElementById("feedback"),
  historico: document.getElementById("historico"), salvar: document.getElementById("salvar"),
  atualizar: document.getElementById("atualizar"), sair: document.getElementById("sair"),
  usuario: document.getElementById("usuario-atual"),
};

let token = sessionStorage.getItem("medicos_token");

function feedback(element, message = "", error = false) {
  element.textContent = message;
  element.classList.toggle("error", error);
}

async function api(url, options = {}) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) clearSession();
    throw new Error(body.erro || "Não foi possível concluir a operação.");
  }
  return body;
}

function saveSession(data) {
  token = data.token;
  sessionStorage.setItem("medicos_token", token);
  showApplication(data.usuario);
}

function clearSession() {
  token = null;
  sessionStorage.removeItem("medicos_token");
  elements.aplicacao.hidden = true;
  elements.acesso.hidden = false;
  elements.sair.hidden = true;
  elements.usuario.textContent = "";
}

function showApplication(user) {
  elements.acesso.hidden = true;
  elements.aplicacao.hidden = false;
  elements.sair.hidden = false;
  elements.usuario.textContent = `${user.nome} · ${user.clinica.nome}`;
  carregarCasos();
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function addField(container, label, value) {
  if (!value) return;
  const group = document.createElement("div");
  const title = document.createElement("strong");
  const content = document.createElement("p");
  title.textContent = label;
  content.textContent = value;
  group.append(title, content);
  container.appendChild(group);
}

function renderCases(cases) {
  elements.historico.replaceChildren();
  if (!cases.length) {
    const empty = document.createElement("p");
    empty.className = "meta";
    empty.textContent = "Nenhum registro encontrado nesta clínica.";
    elements.historico.appendChild(empty);
    return;
  }
  cases.forEach((item) => {
    const article = document.createElement("article");
    article.className = "case-item";
    const header = document.createElement("div");
    header.className = "case-title";
    const patient = document.createElement("h3");
    const date = document.createElement("time");
    patient.textContent = item.paciente;
    date.dateTime = item.data;
    date.textContent = formatDate(item.data);
    header.append(patient, date);
    article.appendChild(header);
    addField(article, "Profissional", item.medico);
    addField(article, "Evidências e contexto", item.evidencias);
    addField(article, "Raciocínio clínico", item.raciocinio);
    addField(article, "Decisão ou conduta", item.decisao);
    elements.historico.appendChild(article);
  });
}

async function carregarCasos() {
  elements.atualizar.disabled = true;
  try { renderCases(await api("/api/casos")); }
  catch (error) { renderCases([]); feedback(elements.feedback, error.message, true); }
  finally { elements.atualizar.disabled = false; }
}

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  feedback(elements.loginFeedback, "Entrando…");
  try {
    const body = Object.fromEntries(new FormData(elements.loginForm));
    saveSession(await api("/api/auth/login", { method: "POST", body: JSON.stringify(body) }));
    elements.loginForm.reset();
  } catch (error) { feedback(elements.loginFeedback, error.message, true); }
});

elements.setupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  feedback(elements.setupFeedback, "Criando ambiente…");
  try {
    const body = Object.fromEntries(new FormData(elements.setupForm));
    saveSession(await api("/api/configuracao/inicial", { method: "POST", body: JSON.stringify(body) }));
    elements.setupForm.reset();
  } catch (error) { feedback(elements.setupFeedback, error.message, true); }
});

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.salvar.disabled = true;
  feedback(elements.feedback, "Salvando…");
  try {
    const body = Object.fromEntries(new FormData(elements.form));
    const created = await api("/api/casos", { method: "POST", body: JSON.stringify(body) });
    elements.form.reset();
    feedback(elements.feedback, `Registro #${created.id} salvo com sucesso.`);
    await carregarCasos();
  } catch (error) { feedback(elements.feedback, error.message, true); }
  finally { elements.salvar.disabled = false; }
});

elements.atualizar.addEventListener("click", carregarCasos);
elements.sair.addEventListener("click", async () => {
  try { await api("/api/auth/logout", { method: "POST" }); } catch (_) { /* encerra localmente mesmo se a rede falhar */ }
  clearSession();
});

(async function initialize() {
  try {
    const config = await api("/api/configuracao");
    if (!config.configurado) {
      elements.loginCard.hidden = true;
      elements.setupCard.hidden = false;
      return;
    }
    if (token) showApplication((await api("/api/auth/me")).usuario);
  } catch (error) {
    clearSession();
    feedback(elements.loginFeedback, error.message, true);
  }
})();
