# 🩺 Medicos a Postos  
**Clinical Trace System (MVP funcional)**

Sistema web para **registro e rastreabilidade de decisões clínicas**, com frontend dinâmico e API REST integrada.

---

## 🚀 Visão Geral

O **Medicos a Postos** é um MVP funcional que implementa um fluxo completo:

- Entrada de dados clínicos via interface web  
- Processamento e armazenamento via API REST  
- Visualização dinâmica de histórico  
- Estrutura inicial de auditoria  

> 🔍 O sistema já roda localmente com backend ativo e integração completa frontend → API.

---

## 🧩 Funcionalidades

- 📌 Cadastro de casos clínicos  
- 🔄 Atualização dinâmica via `fetch`  
- 📊 Listagem de casos (mais recentes primeiro)  
- 🔎 Consulta de casos por ID  
- ⚠️ Tratamento de erros no frontend  
- 🛡️ Trilha inicial de auditoria  
- 🌐 API REST  

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

---

## 🔌 Endpoints da API

| Método | Endpoint            | Descrição              |
|--------|--------------------|-----------------------|
| POST   | /api/casos         | Criar caso clínico    |
| GET    | /api/casos         | Listar casos          |
| GET    | /api/casos/:id     | Consultar por ID      |
| GET    | /api/auditoria     | Trilhas de auditoria  |

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

- Dados armazenados localmente (não persistente em produção)  
- CORS liberado (ajustar para produção)  

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

✅ MVP funcional rodando  
⚠️ Ainda não preparado para produção  
⏳ Melhorias de segurança e persistência necessárias  

---

## 🔮 Próximos Passos

- Persistência em banco (PostgreSQL / MongoDB)  
- Autenticação de usuários  
- Logs estruturados de auditoria  
- Versionamento de decisões clínicas  
- Deploy em nuvem (Azure / SaaS)  

---

## 💡 Evolução

Este projeto pode evoluir para:

- Plataforma de auditoria clínica  
- Sistema de compliance médico  
- Base para governança (integração com TCRIA)  

---

## 📄 Licença

MIT License
