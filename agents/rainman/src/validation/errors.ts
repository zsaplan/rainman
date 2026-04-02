export type ValidationErrorCode =
  | "INVALID_SCHEMA"
  | "INVALID_STATUS"
  | "INVALID_CITATION"
  | "UNCITED_FIELD"
  | "INVALID_CITATION_PATH"
  | "PATH_ESCAPE"
  | "NON_MARKDOWN_FILE"
  | "LINE_RANGE_OUT_OF_BOUNDS"
  | "QUOTE_MISMATCH";

export class ResultValidationError extends Error {
  constructor(
    public readonly code: ValidationErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ResultValidationError";
  }
}
