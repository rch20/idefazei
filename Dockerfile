# syntax=docker/dockerfile:1.7
#
# Imagem do Ide Fazei (usada na homologação; serve também para produção).
# Build em dois estágios: compila no primeiro e leva só o necessário para o segundo.

ARG NODE_VERSION=22

# ─── 1) Build ────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app

# pnpm na versão fixada em package.json ("packageManager")
RUN corepack enable

# Só os arquivos de dependência primeiro, para aproveitar o cache de camadas
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

COPY . .

# Variáveis lidas pelo Vite em tempo de build (ficam embutidas no front-end)
ARG VITE_APP_ID=""
ARG VITE_APP_TITLE="Ide Fazei (homologação)"
ENV VITE_APP_ID=${VITE_APP_ID} VITE_APP_TITLE=${VITE_APP_TITLE}

RUN pnpm build

# ─── 2) Dependências de produção ─────────────────────────────────────────────
# O servidor é empacotado com --packages=external, então precisa de node_modules em runtime.
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile --prod

# ─── 3) Runtime ──────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Arquivos .sql e o ledger de migrações, usados pelo script de criação do banco
COPY drizzle ./drizzle
COPY scripts ./scripts

# Roda sem privilégios de root
USER node
EXPOSE 3000

CMD ["node", "dist/index.js"]
