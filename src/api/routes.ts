import type { Express } from "express";
import { healthHandler } from "./handlers/healthHandler";
import { readyHandler } from "./handlers/readyHandler";
import { queryHandler } from "./handlers/queryHandler";

export function registerRoutes(app: Express) {
  app.get("/healthz", healthHandler);
  app.get("/readyz", readyHandler);
  app.post("/v1/query", queryHandler);
}
