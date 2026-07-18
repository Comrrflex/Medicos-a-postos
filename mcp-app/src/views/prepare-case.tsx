import "../index.css";
import { useToolInfo, useCallTool } from "../helpers.js";

export default function PrepareCase() {
  const { output, responseMetadata, isPending } = useToolInfo<"prepare_case">();
  const { callTool, data, isPending: isSaving, isSuccess } = useCallTool("create_case");
  if (isPending || !output) return <div className="app">Validando a prévia…</div>;
  const draft = output.draft;
  const save = () => callTool({ previewToken: responseMetadata.previewToken, confirmed: true, idempotencyKey: crypto.randomUUID() });

  if (isSuccess) return <main className="app"><div className="success"><strong>Registro criado</strong><br />{data.structuredContent.caseReference}</div></main>;
  return <main className="app" data-llm={`Prévia desidentificada do caso ${draft.caseReference}, ainda não salva`}>
    <div className="header"><div><h2>Revisar antes de salvar</h2><span className="muted">Caso {draft.caseReference}</span></div></div>
    <div className="warning">Confirme somente se o conteúdo não identifica nenhuma pessoa.</div>
    <section className="detail">
      <div className="label">Função profissional</div><p className="value">{draft.professionalRole}</p>
      {draft.evidence && <><div className="label">Evidências</div><p className="value">{draft.evidence}</p></>}
      {draft.reasoning && <><div className="label">Raciocínio</div><p className="value">{draft.reasoning}</p></>}
      <div className="label">Decisão</div><p className="value">{draft.decision}</p>
    </section>
    <button className="confirm" onClick={save} disabled={isSaving}>{isSaving ? "Salvando…" : "Confirmar e salvar"}</button>
  </main>;
}
