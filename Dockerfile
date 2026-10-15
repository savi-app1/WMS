# ---------------------------------------------------------------------------
# Image de production WMS (Next.js 15 + node:sqlite)
#
# Non testée dans l'environnement de développement (Docker indisponible) :
# validez-la sur votre serveur avant la mise en production.
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Les pages publiques sont pré-rendues à la compilation : une base vide suffit.
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    WMS_DATA_DIR=/app/data

# Utilisateur non privilégié
RUN useradd --system --create-home --uid 10001 wms \
    && mkdir -p /app/data/uploads \
    && chown -R wms:wms /app

COPY --from=build --chown=wms:wms /app/.next ./.next
COPY --from=build --chown=wms:wms /app/public ./public
COPY --from=build --chown=wms:wms /app/node_modules ./node_modules
COPY --from=build --chown=wms:wms /app/package.json ./package.json
COPY --from=build --chown=wms:wms /app/scripts ./scripts
COPY --from=build --chown=wms:wms /app/src ./src
COPY --from=build --chown=wms:wms /app/tsconfig.json ./tsconfig.json

USER wms
EXPOSE 3000

# Applique les migrations, installe les données de départ (idempotent : aucune
# donnée existante n'est écrasée, aucun prix n'est inventé) puis démarre le serveur.
CMD ["sh", "-c", "npx tsx scripts/migrate.ts && npx tsx scripts/seed.ts && npx next start -H 0.0.0.0 -p ${PORT}"]
