import { mcpAuthMetadataRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { McpServer } from "skybridge/server";
import { z } from "zod";
import { createCase, searchCases, signPreview, validateDeidentifiedDraft, verifyPreview } from "./api.js";
import { oauthMetadata, verifyAccessToken } from "./auth.js";

const serverUrl = new URL(process.env.SERVER_URL ?? "http://localhost:3000");
const apiDomain = new URL(process.env.MEDICOS_API_BASE_URL ?? "http://127.0.0.1:3000").origin;
const readAuthScheme = [{ type: "oauth2" as const, scopes: ["cases:read"] }];
const writeAuthScheme = [{ type: "oauth2" as const, scopes: ["cases:write"] }];

const server = new McpServer(
  { name: "medicos-a-postos", version: "1.0.0" },
  {
    capabilities: {},
    instructions: "Consulte e registre somente conteúdo clínico desidentificado. Nunca solicite nomes de pacientes, CPF, telefone, e-mail, endereço, data de nascimento ou outros identificadores. O app não diagnostica nem recomenda tratamento. Use prepare_case antes de create_case e só grave após confirmação explícita do profissional.",
  },
)
  .use(mcpAuthMetadataRouter({ oauthMetadata, resourceServerUrl: serverUrl }))
  .use("/mcp", requireBearerAuth({ verifier: { verifyAccessToken } }));

function tokenFrom(extra: { authInfo?: AuthInfo }) {
  if (!extra.authInfo?.token) throw new Error("Autenticação necessária.");
  return extra.authInfo.token;
}

const app = server.registerTool(
  {
    name: "search_cases",
    title: "Consultar registros desidentificados",
    description: "Use esta ferramenta quando o profissional quiser localizar registros clínicos desidentificados da própria clínica por código, período ou palavras-chave.",
    inputSchema: {
      caseReference: z.string().max(40).optional().describe("Código interno não identificável do caso"),
      query: z.string().max(120).optional().describe("Palavras-chave clínicas sem identificadores pessoais"),
      from: z.string().date().optional().describe("Data inicial em YYYY-MM-DD"),
      to: z.string().date().optional().describe("Data final em YYYY-MM-DD"),
      limit: z.number().int().min(1).max(20).default(10),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    securitySchemes: readAuthScheme,
    view: {
      component: "search-cases",
      description: "Lista compacta e detalhes de registros clínicos desidentificados.",
      csp: { connectDomains: [apiDomain], resourceDomains: [] },
    },
  },
  async (input, extra) => {
    const params = new URLSearchParams();
    if (input.caseReference) params.set("caseReference", input.caseReference);
    if (input.query) params.set("query", input.query);
    if (input.from) params.set("from", input.from);
    if (input.to) params.set("to", input.to);
    params.set("limit", String(input.limit));
    const cases = await searchCases(tokenFrom(extra), params);
    return {
      structuredContent: { cases },
      content: [{ type: "text", text: `${cases.length} registro(s) desidentificado(s) encontrado(s).` }],
    };
  },
).registerTool(
  {
    name: "prepare_case",
    title: "Revisar novo registro desidentificado",
    description: "Use esta ferramenta para validar e mostrar uma prévia antes de criar um registro. Ela não salva dados e exige declaração de desidentificação.",
    inputSchema: {
      caseReference: z.string().min(4).max(40),
      professionalRole: z.string().min(2).max(80),
      evidence: z.string().max(3000).default(""),
      reasoning: z.string().max(3000).default(""),
      decision: z.string().min(1).max(3000),
      deidentificationConfirmed: z.boolean().describe("True somente se nenhum identificador pessoal foi incluído"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    securitySchemes: writeAuthScheme,
    view: {
      component: "prepare-case",
      description: "Prévia desidentificada com confirmação explícita antes da gravação.",
      csp: { connectDomains: [apiDomain], resourceDomains: [] },
    },
  },
  async (input) => {
    const draft = validateDeidentifiedDraft(input);
    const previewToken = signPreview(draft);
    return {
      structuredContent: { draft, requiresConfirmation: true },
      content: [{ type: "text", text: "Prévia validada. O registro ainda não foi salvo; aguarde confirmação explícita." }],
      _meta: { previewToken },
    };
  },
).registerTool(
  {
    name: "create_case",
    title: "Criar registro desidentificado",
    description: "Use esta ferramenta somente depois que o profissional revisar a prévia e confirmar explicitamente a gravação do registro desidentificado.",
    inputSchema: {
      previewToken: z.string().min(20).describe("Token assinado retornado por prepare_case"),
      confirmed: z.literal(true).describe("Confirmação explícita do profissional"),
      idempotencyKey: z.string().uuid().describe("UUID único para impedir gravações duplicadas em retries"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    securitySchemes: writeAuthScheme,
  },
  async ({ previewToken, idempotencyKey }, extra) => {
    const draft = verifyPreview(previewToken);
    const created = await createCase(tokenFrom(extra), draft, idempotencyKey);
    return {
      structuredContent: { id: created.id, caseReference: created.caseReference, createdAt: created.createdAt, audited: true },
      content: [{ type: "text", text: `Registro ${created.caseReference} criado e auditado com sucesso.` }],
    };
  },
);

export default await app.run();
export type AppType = typeof app;
