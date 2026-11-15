# ProEd server + PWA. Build from the repository root:
#   docker build -t proed .
#   docker run -p 8787:8787 --env-file server/.env -v proed-data:/data proed

FROM node:22-bookworm-slim AS build
WORKDIR /app
# Optional: pin the access-token public key into the PWA build (see README).
ARG VITE_ACCESS_PUBLIC_KEY=""
ENV VITE_ACCESS_PUBLIC_KEY=$VITE_ACCESS_PUBLIC_KEY
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY proed-app/package.json proed-app/
COPY proed-admin/package.json proed-admin/
COPY server/package.json server/
RUN npm ci --ignore-scripts && npm rebuild better-sqlite3
COPY shared shared
COPY proed-app proed-app
COPY server server
RUN npm run build -w shared && npm run build -w proed-app && npm run build -w proed-server \
  && npm prune --omit=dev --ignore-scripts

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787 \
    DATA_DIR=/data \
    PWA_DIR=/app/proed-app/dist
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/shared/package.json shared/package.json
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/package.json server/package.json
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/proed-app/dist proed-app/dist
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN mkdir -p /data && chown -R node:node /data
VOLUME ["/data"]
EXPOSE 8787
# Starts as root only to fix the volume owner, then runs the server as "node".
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server/dist/index.js"]
