# 🩺 Medicos a Postos
# 🩺 Medicos a Postos

**Clinical Trace System (MVP funcional)**

Sistema web para **registro e rastreabilidade de decisões clínicas**, com frontend dinâmico e API REST.

---

## 🚀 Visão Geral

O **Medicos a Postos** é um MVP funcional que implementa um fluxo completo:

* Entrada de dados clínicos (frontend)
* Processamento via API REST (backend)
* Visualização dinâmica de histórico
* Estrutura inicial de auditoria

> 🔍 O sistema já roda localmente com backend ativo e integração frontend → API.

---

## 🧩 Funcionalidades

* 📌 Cadastro de casos clínicos
* 🔄 Atualização dinâmica via `fetch`
* 📊 Listagem de casos (ordem recente)
* ⚠️ Tratamento de erros no frontend
* 🛡️ Trilha inicial de auditoria
* 🌐 API REST

---

## 🏗️ Arquitetura

```bash
clinical-trace-system/
  frontend/
    index.html
    style.css
    app.js
  backend/
    server.js
    database.js
    package.json
```

---

## ⚙️ Como rodar localmente

### 1. Backend

```bash
cd backend
npm install
npm start
```

Servidor será iniciado em:

```
http://localhost:3000
```

---

## 🔌 Endpoints da API

| Método | Endpoint       | Descrição            |
| ------ | -------------- | -------------------- |
| POST   | /api/casos     | Criar caso clínico   |
| GET    | /api/casos     | Listar casos         |
| GET    | /api/casos/:id | Consultar por ID     |
| GET    | /api/auditoria | Trilhas de auditoria |

---

## ⚠️ Observações Técnicas

* Frontend consome API via `fetch`
* Backend em Node.js (Express)
* Dados armazenados localmente (sem persistência robusta)
* Porta padrão: `3000`

---

## ⚠️ Segurança e Dependências

Atualmente o projeto possui:

* Dependências desatualizadas (deprecated)
* Vulnerabilidades identificadas via `npm audit`

Para correção:

```bash
npm audit fix
```

ou (com cuidado):

```bash
npm audit fix --force
```

---

## 🧪 Status do Projeto

✅ MVP funcional rodando
⚠️ Ainda não preparado para produção
⏳ Melhorias de segurança e persistência necessárias

---

## 🔮 Próximos Passos

* Banco de dados (PostgreSQL / MongoDB)
* Variável de ambiente para porta (`process.env.PORT`)
* Autenticação de usuários
* Logs estruturados
* Hardening de segurança

---

## 💡 Evolução Possível

Este projeto pode evoluir para:

* Plataforma de auditoria clínica
* Sistema de compliance médico
* Base para governança (integração com TCRIA)

---

## 📄 Licença

MIT License

**Clinical Trace System (MVP)**

Sistema web para **rastreabilidade de decisões clínicas**, com foco em auditoria, transparência e governança.

---

## 🚀 Visão Geral

O **Medicos a Postos** é um MVP de um sistema de rastreabilidade clínica que permite:

* Registrar casos clínicos
* Acompanhar decisões médicas ao longo do tempo
* Criar trilhas de auditoria
* Expor dados via API REST

> 🔍 Ideal para evolução futura em sistemas de compliance médico, auditoria hospitalar e governança em saúde.

---

## 🧩 Funcionalidades

* 📌 Cadastro de casos clínicos
* 🧠 Registro de histórico de decisões
* 🔎 Consulta de casos por ID
* 📊 Listagem de casos (ordem recente)
* 🛡️ Trilha básica de auditoria
* 🌐 API REST simples

---

## 🏗️ Arquitetura

```
clinical-trace-system/
  frontend/
    index.html
    style.css
    app.js
  backend/
    server.js
    database.js
    package.json
```

### Tecnologias utilizadas

* Backend: Node.js + Express
* Frontend: HTML + CSS + JavaScript
* Banco: Estrutura simples (in-memory / local)

---

## ⚙️ Como rodar localmente

### 1. Acesse o backend

```bash
cd backend
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Inicie o servidor

```bash
npm start
```

### 4. Acesse no navegador

```
http://localhost:3000
```

---

## 🔌 Endpoints da API

### ➕ Criar caso clínico

```
POST /api/casos
```

### 📄 Listar casos

```
GET /api/casos
```

### 🔍 Consultar caso por ID

```
GET /api/casos/:id
```

### 🛡️ Auditoria

```
GET /api/auditoria
```

---

## 🧪 Status do Projeto

🚧 MVP em desenvolvimento
Foco atual: validação de conceito e estrutura de rastreabilidade

---

## 🔮 Próximos Passos

* Persistência em banco de dados (PostgreSQL / MongoDB)
* Autenticação de usuários
* Logs avançados de auditoria
* Versionamento de decisões clínicas
* Integração com sistemas hospitalares

---

## 💡 Possível Evolução (SaaS)

Este projeto pode evoluir para:

* Plataforma de auditoria clínica
* Sistema de compliance médico
* Ferramenta de suporte à decisão com rastreabilidade

---

## 📄 Licença

MIT License
