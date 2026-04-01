FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src ./src
COPY kb ./kb
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/kb ./kb
COPY --from=build /app/kb ./bootstrap-kb
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
