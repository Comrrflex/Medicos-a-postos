# Medicos-a-postos
# Clinical Trace System (MVP)

MVP web para rastreabilidade clínica com:

- cadastro de caso clínico
- histórico de decisões
- API REST básica
- trilha inicial de auditoria

## Estrutura

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

## Como rodar

1. Acesse a pasta do backend:

```bash
cd backend
```

2. Instale dependências:

```bash
npm install
```

3. Suba o servidor:

```bash
npm start
```

4. Abra no navegador:

`http://localhost:3000`

## Endpoints disponíveis

- `POST /api/casos` cria caso clínico
- `GET /api/casos` lista casos (mais recentes primeiro)
- `GET /api/casos/:id` consulta caso por ID
- `GET /api/auditoria` lista trilha de auditoria
