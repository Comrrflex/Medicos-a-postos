const form = document.getElementById("caso-form");
const feedback = document.getElementById("feedback");
const historico = document.getElementById("historico");

async function carregarCasos() {
  try {
    const response = await fetch("/api/casos");
    if (!response.ok) {
      throw new Error("Falha ao carregar casos.");
    }
    const casos = await response.json();
    renderizarHistorico(casos);
  } catch (error) {
    renderizarHistorico([]);
    setFeedback(error.message, true);
  }
}

function renderizarHistorico(casos) {
  historico.innerHTML = "";

  if (!casos.length) {
    const empty = document.createElement("p");
    empty.className = "meta";
    empty.textContent = "Nenhum caso registrado ainda.";
    historico.appendChild(empty);
    return;
  }

"~/Documents/New project/clinical-trace-system/frontend/app.js" 104L, 2917B
