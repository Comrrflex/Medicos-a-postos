# Médicos a Postos MCP App

The approved product specification is maintained in [`../SPEC.md`](../SPEC.md).

Implementation contract:

- Public, submission-ready ChatGPT app hosted on Alpic Cloud.
- OAuth 2.1 authentication through an established identity provider.
- Only deidentified clinical content; patient identifiers are prohibited.
- `search_cases` view returns complete results for its flow.
- `prepare_case` view creates a signed, non-persisted preview.
- `create_case` writes only after explicit confirmation and uses an idempotency key.
