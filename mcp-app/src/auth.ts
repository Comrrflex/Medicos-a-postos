import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import * as jose from "jose";

const issuer = process.env.AUTH_ISSUER ?? "https://example.auth0.com/";
const audience = process.env.AUTH_AUDIENCE ?? process.env.SERVER_URL ?? "http://localhost:3000";
const jwksUrl = process.env.AUTH_JWKS_URL ?? new URL(".well-known/jwks.json", issuer).toString();
const jwks = jose.createRemoteJWKSet(new URL(jwksUrl));

export const oauthMetadata = {
  issuer,
  authorization_endpoint: new URL("authorize", issuer).toString(),
  token_endpoint: new URL("oauth/token", issuer).toString(),
  jwks_uri: jwksUrl,
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code", "refresh_token"],
  token_endpoint_auth_methods_supported: ["none"],
  code_challenge_methods_supported: ["S256"],
  scopes_supported: ["cases:read", "cases:write"],
};

export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  if (process.env.NODE_ENV !== "production" && process.env.DEV_BEARER_TOKEN === token) {
    return {
      token,
      clientId: "local-dev",
      scopes: ["cases:read", "cases:write"],
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      extra: { sub: "local-dev" },
    };
  }

  try {
    const { payload } = await jose.jwtVerify(token, jwks, { issuer, audience });
    if (!payload.sub) throw new InvalidTokenError("missing sub claim");
    const scopes = typeof payload.scope === "string" ? payload.scope.split(" ") : [];
    return {
      token,
      clientId: String(payload.client_id ?? payload.azp ?? "chatgpt"),
      scopes,
      expiresAt: payload.exp,
      extra: { sub: payload.sub },
    };
  } catch (error) {
    if (error instanceof InvalidTokenError) throw error;
    throw new InvalidTokenError("invalid access token");
  }
}
