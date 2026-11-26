# syntax=docker/dockerfile:1

# ---------- build ----------
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app

# Se instalan también las devDependencies (vite, typescript...) para compilar.
COPY package.json package-lock.json* ./
RUN npm ci --include=dev --no-audit --no-fund

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN NODE_ENV=production npm run build

# ---------- runtime ----------
FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
# Modo prueba por defecto: SQLite en /data (monta un volumen para conservarla).
# En modo real define DATABASE_URL con tu PostgreSQL (ver docs/DEPLOYMENT.md).
ENV DATABASE_URL="file:/data/app.sqlite"
ENV APP_MODE=test
ENV BILLING_TEST_MODE=true
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3000

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY prisma ./prisma
COPY scripts ./scripts
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY shopify.app.toml shopify.web.toml ./

# Aplica las migraciones y arranca el servidor (ver scripts de package.json)
CMD ["npm", "run", "docker-start"]
