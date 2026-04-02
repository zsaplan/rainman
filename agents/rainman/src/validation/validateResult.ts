import type { QueryResponse } from "../types/api";
import type { SubmitResultInput } from "../types/tools";
import { queryResponseDraftSchema } from "../api/schemas/queryResponse";
import { validateCitations } from "./validateCitations";
import { validateFieldCoverage } from "./fieldCoverage";
import { ResultValidationError } from "./errors";

export interface ValidationContext {
  kbRoot: string;
  requestId: string;
  model: string;
  kbVersion: string;
}

export function validateResult(input: SubmitResultInput, context: ValidationContext): QueryResponse {
  const parsed = queryResponseDraftSchema.safeParse(input);
  if (!parsed.success) {
    throw new ResultValidationError("INVALID_SCHEMA", "Result payload failed schema validation", {
      issues: parsed.error.issues,
    });
  }

  const payload = parsed.data;
  const normalized: QueryResponse = {
    ...payload,
    meta: {
      ...payload.meta,
      requestId: context.requestId,
      model: context.model,
      kbVersion: context.kbVersion,
    },
  };

  if (!["answered", "insufficient_evidence", "conflict"].includes(normalized.status)) {
    throw new ResultValidationError("INVALID_STATUS", "Unsupported response status", {
      status: normalized.status,
    });
  }

  validateCitations(context.kbRoot, normalized.citations);
  validateFieldCoverage(normalized.data, normalized.citations);

  return normalized;
}
