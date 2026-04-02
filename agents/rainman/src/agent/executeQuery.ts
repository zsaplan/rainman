import type { QueryRequest, QueryResponse, QueryContext } from "../types/api";
import type { AppConfig } from "../config/env";
import { logger } from "../config/logger";
import { createSession } from "./createSession";
import { deterministicFallback } from "./deterministicFallback";
import { MAX_AGENT_EXECUTION_MS, MAX_RESULT_REPAIR_ATTEMPTS } from "./retryPolicy";

function buildPrompt(question: string) {
  return [
    "Answer the question using only markdown evidence from the KB.",
    "Use grep and find only for navigation.",
    "Use read to gather exact evidence.",
    "Prefer the smallest valid data payload.",
    "For a normal direct answer, use data.answer and cite /data/answer.",
    "Do not send meta unless required. The server fills it.",
    "When you are ready, call submit_result.",
    "After submit_result succeeds, stop immediately.",
    "Question:",
    question,
  ].join("\n\n");
}

function buildRepairPrompt(question: string, attempt: number) {
  return [
    `Repair attempt ${attempt}.`,
    "Your previous turn ended without a valid submit_result.",
    "You must continue from the current context and call submit_result.",
    "Do not answer in plain text.",
    "If evidence is insufficient, submit status insufficient_evidence.",
    "Question:",
    question,
  ].join("\n\n");
}

async function promptWithTimeout(
  operation: Promise<void>,
  session: Awaited<ReturnType<typeof createSession>>,
  timeoutMs: number,
) {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(async () => {
      try {
        await session.session.abort();
      } catch {
        // ignore abort failure
      }
      reject(new Error(`Agent execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function executeQuery(
  request: QueryRequest,
  context: QueryContext,
  config: AppConfig,
): Promise<QueryResponse> {
  const session = await createSession(context.requestId, config);
  logger.info({ event: "agent.session.created", requestId: context.requestId, model: session.model });

  const unsubscribe = session.session.subscribe((event) => {
    if (event.type === "tool_execution_start") {
      logger.info({
        event: "tool.called",
        requestId: context.requestId,
        toolName: event.toolName,
      });
    }

    if (event.type === "tool_execution_end") {
      logger.info({
        event: event.isError ? "tool.failed" : "tool.completed",
        requestId: context.requestId,
        toolName: event.toolName,
      });
    }
  });

  try {
    const maxAttempts = MAX_RESULT_REPAIR_ATTEMPTS + 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const prompt = attempt === 1 ? buildPrompt(request.question) : buildRepairPrompt(request.question, attempt - 1);
      await promptWithTimeout(session.session.prompt(prompt), session, MAX_AGENT_EXECUTION_MS);

      const submittedResult = session.getSubmittedResult();
      if (submittedResult) {
        return submittedResult;
      }
    }

    logger.warn({
      event: "agent.fallback.used",
      requestId: context.requestId,
      model: session.model,
      reason: "submit_result_not_received",
    });
    return deterministicFallback(request.question, {
      kbRoot: config.KB_ROOT,
      requestId: context.requestId,
      model: session.model,
    });
  } catch (error) {
    logger.warn({
      event: "agent.fallback.used",
      requestId: context.requestId,
      model: session.model,
      reason: error instanceof Error ? error.message : String(error),
    });
    return deterministicFallback(request.question, {
      kbRoot: config.KB_ROOT,
      requestId: context.requestId,
      model: session.model,
    });
  } finally {
    unsubscribe();
    session.dispose();
  }
}
