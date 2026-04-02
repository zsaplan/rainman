import type { Citation } from "./citations";
import type { QueryResponse } from "./api";

export interface ReadInput {
  filePath: string;
  offset?: number;
  limit?: number;
}

export interface ReadOutput {
  filePath: string;
  startLine: number;
  endLine: number;
  totalLines: number;
  content: string;
}

export interface FindInput {
  query: string;
  limit?: number;
}

export interface GrepInput {
  pattern: string;
  limit?: number;
}

export interface GrepHit {
  file: string;
  lineNumber: number;
  line: string;
}

export interface SubmitResultInput extends Omit<QueryResponse, "meta"> {
  meta?: QueryResponse["meta"];
}

export interface SubmitResultOutput {
  ok: true;
  result: QueryResponse;
}

export interface CitationValidationResult {
  citation: Citation;
  actualQuote: string;
}
