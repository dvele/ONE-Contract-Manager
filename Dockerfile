# syntax=docker/dockerfile:1

# ---- Builder: install deps, build the API-only server bundle ----
# This image is the BACKEND only. The React SPA is built and hosted separately
# (Amplify), so there are no VITE_* build args and no client build here.
FROM node:20-bookworm AS builder
WORKDIR /app

# We use the system Chromium at runtime, so never download Puppeteer's bundled
# Chromium during npm install (in either stage).
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./
RUN npm ci

COPY . .
# Server-only build → dist/index.cjs
RUN npm run build

# ---- Runtime: system Chromium + production deps + built bundle ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Chromium for Puppeteer PDF generation. apt resolves the bulk of Chromium's
# shared-lib dependencies automatically; fonts-liberation avoids blank glyphs.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        fonts-liberation \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Production dependencies only. The server bundle keeps most packages external
# (puppeteer, mammoth, docxtemplater, pg, etc.), so they must be present here.
COPY package*.json ./
RUN npm ci --omit=dev

# Built artifacts from the builder stage.
COPY --from=builder /app/dist ./dist

# Schema source + drizzle config + entrypoint, so the container can apply the DB
# schema (drizzle-kit push) on startup before launching the server.
COPY shared ./shared
COPY drizzle.config.ts ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Run unprivileged. Chromium launches with --no-sandbox (set in the app), so the
# non-root node user is fine.
RUN chown -R node:node /app
USER node

# server/index.ts listens on $PORT (default 5000). The platform sets PORT.
EXPOSE 5000
# Entrypoint runs `drizzle-kit push` then execs CMD.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/index.cjs"]
