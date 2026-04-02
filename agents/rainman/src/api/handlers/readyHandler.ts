import type { Request, Response } from "express";
import { checkReadiness } from "../../config/env";

export function readyHandler(_request: Request, response: Response) {
  const readiness = checkReadiness();
  if (!readiness.ready) {
    response.status(503).json({ status: "not_ready", issues: readiness.issues });
    return;
  }

  response.status(200).json({ status: "ready" });
}
