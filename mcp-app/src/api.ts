import crypto from "node:crypto";

export type CaseDraft = {
  caseReference: string;
  professionalRole: string;
  evidence: string;
  reasoning: string;
  decision: string;
  deidentificationConfirmed: true;
};

export type CaseRecord = CaseDraft & { id: number; createdAt: string };

const apiBaseUrl = process.env.MEDICOS_API_BASE_URL ?? "http://127.0.0.1:3000";
const previewSecret = process.env.PREVIEW_SIGNING_SECRET ?? "local-development-only-change-me";

const identifierPatterns = [
  /\b\d{3}\.??\d{3}\.??\d{3}-?\d{2}\b/, // CPF-like
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}/,
  /\b(?:paciente|nome|cpf|telefone|e-mail|email|endereço|endereco|data de nascimento)\s*:/i,
];

export function validateDeidentifiedDraft(input: Omit<CaseDraft, "deidentificationConfirmed"> & { deidentificationConfirmed: boolean }): CaseDraft {
  const draft = {
    caseReference: input.caseReference.trim().toUpperCase(),
    professionalRole: input.professionalRole.trim(),
    evidence: input.evidence.trim(),
    reasoning: input.reasoning.trim(),
    decision: input.decision.trim(),
    deidentificationConfirmed: input.deidentificationConfirmed,
  };
  if (!draft.deidentificationConfirmed) throw new Error("Confirme que o conteúdo foi desidentificado.");
  if (!/^[A-Z0-9_-]{4,40}$/.test(draft.caseReference)) throw new Error("Use um código de caso não identificável com 4 a 40 caracteres.");
  if (!draft.professionalRole || !draft.decision) throw new Error("Função profissional e decisão são obrigatórias.");
  const combined = Object.values(draft).filter((value) => typeof value === "string").join("\n");
  if (identifierPatterns.some((pattern) => pattern.test(combined))) {
    throw new Error("A prévia parece conter identificadores pessoais. Remova-os antes de continuar.");
  }
  return { ...draft, deidentificationConfirmed: true };
}

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function signPreview(draft: CaseDraft) {
  if (process.env.NODE_ENV === "production" && !process.env.PREVIEW_SIGNING_SECRET) throw new Error("PREVIEW_SIGNING_SECRET não configurado.");
  const payload = encode({ draft, expiresAt: Date.now() + 10 * 60 * 1000 });
  const signature = crypto.createHmac("sha256", previewSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyPreview(token: string): CaseDraft {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new Error("Prévia inválida.");
  const expected = crypto.createHmac("sha256", previewSecret).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error("A prévia foi alterada.");
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as { draft: CaseDraft; expiresAt: number };
  if (parsed.expiresAt < Date.now()) throw new Error("A prévia expirou. Prepare o registro novamente.");
  return parsed.draft;
}

async function apiRequest<T>(path: string, accessToken: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(new URL(path, apiBaseUrl), {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { erro?: string }).erro ?? "A API clínica não respondeu corretamente.");
  return body as T;
}

export function searchCases(accessToken: string, query: URLSearchParams) {
  return apiRequest<CaseRecord[]>(`/api/sdk/casos?${query}`, accessToken);
}

export function createCase(accessToken: string, draft: CaseDraft, idempotencyKey: string) {
  return apiRequest<CaseRecord>("/api/sdk/casos", accessToken, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(draft),
  });
}
