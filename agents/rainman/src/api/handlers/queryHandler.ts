import type { Request, Response } from "express";
import { queryRequestSchema } from "../schemas/queryRequest";
import { loadConfig } from "../../config/env";
import { logger } from "../../config/logger";
import { createRequestId } from "../../util/ids";
import { nowMs, elapsedMs } from "../../util/timing";
import { executeQuery } from "../../agent/executeQuery";
import { ResultValidationError } from "../../validation/errors";
import { ToolInputError } from "../../tools/shared/toolErrors";

export async function queryHandler(request: Request, response: Response) {
  const startedAt = nowMs();
  const requestId = createRequestId();
  const requestLogger = logger.child({ requestId });
  requestLogger.info({ event: "request.started" });

  const parsed = queryRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    requestLogger.warn({ event: "request.failed", errorCode: "INVALID_REQUEST", issues: parsed.error.issues });
    response.status(400).json({
      error: "Invalid request body",
      issues: parsed.error.issues,
      meta: { requestId },
    });
    return;
  }

  try {
    const config = loadConfig();
    const result = await executeQuery(parsed.data, { requestId }, config);
    requestLogger.info({
      event: "request.completed",
      status: result.status,
      latencyMs: elapsedMs(startedAt),
      model: result.meta.model,
    });
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof ResultValidationError || error instanceof ToolInputError) {
      requestLogger.warn({
        event: "request.failed",
        latencyMs: elapsedMs(startedAt),
        errorCode: error.code,
        errorMessage: error.message,
        details: error.details,
      });
      response.status(500).json({
        error: error.message,
        code: error.code,
        details: error.details,
        meta: { requestId },
      });
      return;
    }

    requestLogger.error({
      event: "request.failed",
      latencyMs: elapsedMs(startedAt),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    response.status(500).json({
      error: "Internal server error",
      meta: { requestId },
    });
  }
}
