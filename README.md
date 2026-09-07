# 🩺 Medicos a Postos  
**Sistema de rastreabilidade clínica com autenticação e API REST**

Sistema web para **registro e rastreabilidade de decisões clínicas**, com frontend dinâmico e API REST integrada.

---

## 🚀 Visão Geral

O **Medicos a Postos** é um MVP funcional que implementa um fluxo completo:

- Entrada de dados clínicos via interface web  
- Processamento e armazenamento via API REST  
- Visualização dinâmica de histórico  
- Estrutura inicial de auditoria  

> 🔍 O sistema roda localmente com backend ativo, autenticação, isolamento por clínica e integração frontend → API.

---

## 🧩 Funcionalidades

- 📌 Cadastro de casos clínicos  
- 🔄 Atualização dinâmica via `fetch`  
- 📊 Listagem de casos (mais recentes primeiro)  
- 🔎 Consulta de casos por ID  
- ⚠️ Tratamento de erros no frontend  
- 🛡️ Trilha inicial de auditoria  
- 🌐 API REST  
- 🔐 Sessões autenticadas e perfis de acesso
- 🏥 Isolamento de dados por clínica
- 🧾 Auditoria persistente

---

## 🏗️ Estrutura do Projeto

Arquivos organizados na raiz:

```
index.html      # Interface web
style.css       # Estilos
app.js          # Lógica frontend

server.js       # API Express
database.js     # Banco SQLite

package.json    # Dependências
README.md       # Documentação
```

---

## ⚙️ Como rodar localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Iniciar servidor

```bash
npm start
```

### 3. Acessar no navegador

```
http://localhost:3000
```

A área autenticada está em `http://localhost:3000/app.html`. Na primeira abertura,
o sistema solicita a criação da clínica e do administrador inicial.

---

## 🔌 Endpoints da API

| Método | Endpoint            | Descrição              |
|--------|--------------------|-----------------------|
| POST   | /api/auth/login    | Iniciar sessão        |
| POST   | /api/auth/logout   | Revogar sessão        |
| GET    | /api/auth/me       | Consultar sessão      |
| POST   | /api/casos         | Criar caso clínico    |
| GET    | /api/casos         | Listar casos da clínica |
| GET    | /api/casos/:id     | Consultar por ID      |
| GET/POST | /api/usuarios    | Gerenciar equipe (admin) |
| GET    | /api/auditoria     | Trilha persistente da clínica |

As rotas protegidas usam `Authorization: Bearer <token>`. O contrato completo está em `openapi.yaml`.

---

## 🧠 Arquitetura

- Backend: Node.js + Express  
- Banco: SQLite (local)  
- Frontend: HTML + CSS + JavaScript  
- Comunicação: REST API (`fetch`)  

---

## ⚠️ Observações Técnicas

- Porta configurável via variável de ambiente:

```js
process.env.PORT || 3000
```

- Dados armazenados em SQLite local; use `DATABASE_PATH` para configurar o arquivo
- CORS fechado por padrão; use `CORS_ORIGIN` somente quando frontend e API estiverem em origens diferentes
- Não use dados reais de pacientes antes da avaliação de produção descrita em `SECURITY.md`

---

## 🔐 Segurança

O projeto pode conter dependências com vulnerabilidades conhecidas.

Para verificar e corrigir:

```bash
npm audit
npm audit fix
```

---

## 🧪 Status do Projeto

✅ MVP autenticado e testado
⚠️ Ainda requer controles operacionais, jurídicos e de infraestrutura para produção
⏳ Melhorias de segurança e persistência necessárias  

---

## 🔮 Próximos Passos

- Persistência em banco (PostgreSQL / MongoDB)  
- Logs estruturados de auditoria  
- Versionamento de decisões clínicas  
- Hardening operacional pós-deploy  

## Deploy (Railway / Render / Fly)

Use Node 20 (imagem na raiz). Mount volume at /data. DATABASE_PATH=/data/clinical.db. Health: /health.

### Plataformas
Configure volume em /data e DATABASE_PATH em cada provedor de hospedagem.

### Railway
Volume /data, DATABASE_PATH, health /health.

### Render
Disco /data, DATABASE_PATH, health /health.

### Fly.io
Volume em /data, DATABASE_PATH, deploy.

Sem volume persistente, o banco é perdido a cada redeploy. Veja SECURITY.md.
O CI roda testes e smoke em /health.

## ChatGPT Apps SDK / MCP

O app público fica em `mcp-app/` e usa Skybridge. Ele expõe `/mcp`, autenticação OAuth 2.1 e três ferramentas para conteúdo exclusivamente desidentificado:

- `search_cases`
- `prepare_case`
- `create_case`

```bash
cd mcp-app
cp .env.example .env
npm install
npm run dev
```

Use `npm run build` para validar o bundle de produção. A preparação para o diretório público está documentada em `SUBMISSION.md`.

---

## 💡 Evolução

Este projeto pode evoluir para:

- Plataforma de auditoria clínica  
- Sistema de compliance médico  
- Base para governança (integração com TCRIA)  

---

## 📄 Licença

MIT License
