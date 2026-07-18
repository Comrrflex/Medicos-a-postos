# Médicos a Postos — ChatGPT App

## Status

Especificação validada em conversa. Alvo: publicação pública no diretório de apps da OpenAI.

## Value Proposition

O Médicos a Postos permite que médicos e clínicas pequenas consultem e registrem decisões clínicas **desidentificadas** por conversa, preservando rastreabilidade e isolamento por clínica.

**Problema:** registros clínicos e justificativas podem ficar dispersos, dificultando a recuperação do contexto de uma decisão.

**Usuários:** médicos autônomos e equipes de clínicas pequenas.

**Dor atual:** localizar registros, reconstruir contexto e documentar decisões exige navegação manual e consulta a fontes separadas.

**Ações centrais:**

1. Buscar e resumir registros desidentificados da clínica.
2. Abrir os detalhes retornados na própria busca.
3. Preparar e criar um registro clínico somente após confirmação explícita do profissional.

## Why LLM?

**Vantagem conversacional:** pedidos como “mostre os registros recentes da paciente Maria e resuma as decisões” substituem navegação e filtros manuais.

**Contribuição do modelo:** interpretar intenção, estruturar critérios de busca e apresentar contexto, evidências e decisões de modo claro.

**O que o modelo não possui:** acesso direto ao banco, identidade do profissional ou autorização para escrever. O servidor MCP fornece esses recursos após autenticação.

**Limite clínico:** o modelo não diagnostica, não recomenda tratamento e não substitui avaliação profissional. Ele consulta, organiza e registra somente conteúdo fornecido ou já armazenado.

**Confirmação:** qualquer ferramenta que altere dados exige confirmação explícita antes da execução.

## UI Overview

**Primeira visualização:** identificação da clínica e lista compacta de registros recentes, identificados somente por código de caso.

**Busca:** o usuário informa código de caso, período ou palavras-chave; a ferramenta retorna resultados completos e o widget apresenta uma lista curta.

**Detalhamento:** a seleção de um caso mostra contexto, evidências, raciocínio, decisão, profissional e data.

**Novo registro:** o modelo organiza campos desidentificados e apresenta uma prévia. A gravação ocorre apenas depois da confirmação do profissional de que não incluiu identificadores pessoais.

**Estado final:** o widget informa identificador do registro, horário e confirmação do evento de auditoria.

**Fora do widget:** gestão de usuários, recuperação de conta e administração permanecem na aplicação web.

## Product Context

- **Produto existente:** aplicação Node.js/Express com frontend web e API REST.
- **Persistência atual:** SQLite; a produção deverá usar persistência adequada ao ambiente hospedado.
- **Autenticação atual:** sessão Bearer própria.
- **Autenticação do app público:** OAuth 2.0, vinculando cada usuário à clínica correta.
- **Isolamento:** todos os casos, usuários e eventos de auditoria são particionados por clínica.
- **Hospedagem do MCP:** Alpic Cloud usando Skybridge.
- **Distribuição:** submissão pública pela OpenAI como app contido em plugin.
- **Endpoint:** URL MCP universal e pública em `/mcp`.
- **Administração:** continua disponível na aplicação web.
- **Dados proibidos no app público:** nome de paciente, CPF, telefone, e-mail, endereço, data de nascimento, identificadores governamentais, credenciais ou qualquer combinação que permita reidentificação.
- **Dados permitidos:** código interno não identificável e conteúdo clínico estritamente necessário, com consentimento e divulgação na política de privacidade.

## App Classification

**Archetype:** `submission-ready`.

Embora o fluxo tenha interação repetida, o requisito principal é publicação pública. A implementação deve usar o menor formato compatível com revisão, OAuth, CSP, metadados versionados e artefatos de submissão.

## Initial Tool Surface

### View `search_cases`

- Intenção: localizar registros da clínica autenticada.
- Tipo: leitura.
- Entrada: palavras-chave opcionais, código de caso opcional, intervalo de datas e limite limitado.
- Saída: resultados completos necessários à consulta, sem lazy loading, tokens, IDs internos de usuário ou dados não solicitados.
- UI: lista compacta e detalhe selecionável no mesmo widget.
- Anotações: `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false`, `idempotentHint: true`.

### View `prepare_case`

- Intenção: validar e exibir a prévia de um novo registro sem persistir dados.
- Tipo: leitura/validação local, sem mutação.
- Entrada: código de caso, função profissional, evidências, raciocínio, decisão e declaração de desidentificação.
- Saída: prévia normalizada, token assinado e indicação de que falta confirmação.
- UI: revisão dos campos e botão explícito de confirmação.
- Anotações: `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false`, `idempotentHint: true`.

### `create_case`

- Intenção: persistir uma prévia confirmada pelo profissional.
- Tipo: mutação privada e auditada.
- Entrada: token assinado da prévia e confirmação explícita.
- Saída: identificador, horário e evento de auditoria.
- Anotações: `readOnlyHint: false`, `destructiveHint: false`, `openWorldHint: false`, `idempotentHint: false`.

## Security and Submission Requirements

- OAuth 2.0 compatível com conexão do ChatGPT.
- HTTPS público e streaming confiável em `/mcp`.
- CSP com domínios exatos.
- Nenhum segredo, token, senha ou identificador interno em resultados de ferramentas.
- Política de privacidade e URL de suporte públicas.
- Conta de demonstração para revisão sem MFA.
- Dados de demonstração fictícios; nenhuma informação clínica real na revisão.
- Rejeição de campos identificáveis conhecidos e declaração obrigatória de desidentificação.
- Metadados de ferramenta, schemas, anotações e resource URI tratados como contrato versionado.
- Testes no MCP Inspector, ChatGPT web e mobile antes da submissão.

## Deployment and Publication

1. Desenvolvimento local e validação estática.
2. Teste do endpoint `/mcp` e do widget no ambiente local.
3. Deploy no Alpic Cloud.
4. Teste em ChatGPT Developer Mode.
5. Preparação de logo, descrição, política de privacidade, suporte, prompts de teste e screenshots.
6. Scan Tools e submissão no portal de plugins da OpenAI.
7. Publicação após aprovação.

## UX Flows and Final Architecture

### Consultar registros

1. Informar código de caso, período ou palavras-chave.
2. Receber uma lista curta com os dados necessários já carregados.
3. Selecionar um resultado para ver seus detalhes no mesmo widget.

**View:** `search_cases`. Não existe ferramenta separada de detalhe, evitando duplicação e lazy loading.

### Criar registro

1. Informar conteúdo desidentificado.
2. Declarar que nenhum identificador pessoal foi incluído.
3. Revisar a prévia no widget.
4. Confirmar explicitamente a gravação.
5. Receber identificador, horário e confirmação de auditoria.

**View:** `prepare_case`, que cria uma prévia assinada sem persistir dados.

**Tool:** `create_case`, chamada pelo widget somente após confirmação. A assinatura impede mudanças entre prévia e gravação; uma chave de idempotência impede duplicação por retry.
