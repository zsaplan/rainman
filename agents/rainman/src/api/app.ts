import express from "express";
import { logger } from "../config/logger";
import { registerRoutes } from "./routes";

export function buildApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.use((request, _response, next) => {
    logger.debug({ event: "http.request", method: request.method, path: request.path });
    next();
  });

  registerRoutes(app);

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    logger.error({
      event: "http.unhandled_error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    response.status(500).json({ error: "Unhandled server error" });
  });

  return app;
}
