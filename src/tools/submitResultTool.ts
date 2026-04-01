import type { QueryResponse } from "../types/api";
import type { SubmitResultInput, SubmitResultOutput } from "../types/tools";
import { validateResult, type ValidationContext } from "../validation/validateResult";

export function submitResultTool(input: SubmitResultInput, context: ValidationContext): SubmitResultOutput {
  const result: QueryResponse = validateResult(input, context);
  return {
    ok: true,
    result,
  };
}
