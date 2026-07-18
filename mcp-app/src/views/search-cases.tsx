import "../index.css";
import { useState } from "react";
import { useToolInfo } from "../helpers.js";

export default function SearchCases() {
  const { output, isPending } = useToolInfo<"search_cases">();
  const cases = output?.cases ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = cases.find((item) => item.id === selectedId) ?? cases[0];

  if (isPending) return <div className="app">Consultando registros desidentificados…</div>;
  return (
    <main className="app" data-llm={selected ? `Visualizando caso desidentificado ${selected.caseReference}` : "Nenhum caso encontrado"}>
      <div className="header"><div><h2>Registros desidentificados</h2><span className="muted">{cases.length} resultado(s)</span></div></div>
      <div className="list">
        {cases.map((item) => (
          <button className={`case ${item.id === selected?.id ? "selected" : ""}`} key={item.id} onClick={() => setSelectedId(item.id)}>
            <strong>{item.caseReference}</strong><br /><span className="muted">{new Date(item.createdAt).toLocaleString("pt-BR")}</span>
          </button>
        ))}
      </div>
      {selected && <section className="detail">
        <h3>{selected.caseReference}</h3>
        <div className="label">Função profissional</div><p className="value">{selected.professionalRole}</p>
        {selected.evidence && <><div className="label">Evidências</div><p className="value">{selected.evidence}</p></>}
        {selected.reasoning && <><div className="label">Raciocínio</div><p className="value">{selected.reasoning}</p></>}
        <div className="label">Decisão</div><p className="value">{selected.decision}</p>
      </section>}
    </main>
  );
}
