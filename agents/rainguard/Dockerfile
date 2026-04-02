FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json tsconfig.base.json ./
COPY agents/rainman/package.json ./agents/rainman/package.json
COPY agents/rainmaker/package.json ./agents/rainmaker/package.json
COPY agents/rainguard/package.json ./agents/rainguard/package.json
RUN npm ci
COPY agents ./agents
COPY docs ./docs
RUN npm run build -w @rain/agent-rainguard

FROM node:22-alpine AS runtime
WORKDIR /app
COPY package.json package-lock.json ./
COPY agents/rainman/package.json ./agents/rainman/package.json
COPY agents/rainmaker/package.json ./agents/rainmaker/package.json
COPY agents/rainguard/package.json ./agents/rainguard/package.json
RUN npm ci --omit=dev
COPY --from=build /workspace/agents/rainguard/dist ./dist
COPY --from=build /workspace/agents/rainguard/SYSTEM.md ./SYSTEM.md
COPY --from=build /workspace/docs/KBMDQA_V1_SPEC.md ./specs/KBMDQA_V1_SPEC.md
USER node
CMD ["node", "dist/index.js"]
