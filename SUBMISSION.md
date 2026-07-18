# Public submission checklist

## Implemented

- Skybridge MCP server with `/mcp` endpoint.
- OAuth discovery and bearer-token verification.
- Per-tool OAuth scopes and accurate annotations.
- Deidentified-only search, signed preview and confirmed idempotent write.
- Widget views for search and confirmation.
- Explicit CSP with the API origin only.
- Privacy, support and terms pages.
- Plugin manifest scaffold.
- Automated API tests and production MCP build.

## Required external setup

- [ ] Deploy the REST API and database behind stable HTTPS.
- [ ] Create and configure the Auth0 production tenant, audience, scopes and custom verified-email claims.
- [ ] Add the ChatGPT OAuth callback URI shown by the submission portal.
- [ ] Deploy `mcp-app` to Alpic Cloud and set every variable from `mcp-app/.env.example`.
- [ ] Replace example URLs in the deployed environment with final domains.
- [ ] Host privacy, support and terms pages on the final public domain.
- [ ] Complete individual or business verification in OpenAI Platform.
- [ ] Confirm `api.apps.read` and `api.apps.write` permissions.
- [ ] Create a fictitious review clinic and demo user without MFA.
- [ ] Test all tools in MCP Inspector and ChatGPT Developer Mode on web and mobile.
- [ ] Capture a logo and accurate widget screenshots.
- [ ] Scan Tools in the plugin submission portal and verify annotations, schemas, CSP and OAuth.
- [ ] Add the assigned app ID to `plugin/medicos-a-postos/.app.json`.
- [ ] Add the deployed MCP URL to `plugin/medicos-a-postos/.mcp.json`.
- [ ] Submit test prompts, expected responses and annotation justifications.
