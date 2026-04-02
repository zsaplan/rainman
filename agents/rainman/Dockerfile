FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json tsconfig.base.json ./
COPY agents/rainman/package.json ./agents/rainman/package.json
COPY agents/rainmaker/package.json ./agents/rainmaker/package.json
COPY agents/rainguard/package.json ./agents/rainguard/package.json
RUN npm ci
COPY agents ./agents
RUN npm run build -w @rain/agent-rainman

FROM node:22-alpine AS runtime
WORKDIR /app
COPY package.json package-lock.json ./
COPY agents/rainman/package.json ./agents/rainman/package.json
COPY agents/rainmaker/package.json ./agents/rainmaker/package.json
COPY agents/rainguard/package.json ./agents/rainguard/package.json
RUN npm ci --omit=dev
COPY --from=build /workspace/agents/rainman/dist ./dist
COPY --from=build /workspace/agents/rainman/kb ./kb
COPY --from=build /workspace/agents/rainman/kb ./bootstrap-kb
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
