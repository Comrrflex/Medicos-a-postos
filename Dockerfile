FROM node:20-bookworm-slim

WORKDIR /app

# Dependencias nativas do sqlite3
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/clinical.db

EXPOSE 3000

# Healthcheck implicito via /health (Railway/Render/Fly)
CMD ["node", "server.js"]
