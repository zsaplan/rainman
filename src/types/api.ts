import type { Citation } from "./citations";
import type { QueryStatus } from "./status";

export interface QueryRequest {
  question: string;
}

export interface QueryResponse {
  status: QueryStatus;
  data: Record<string, unknown>;
  citations: Citation[];
  missingInformation: string[];
  warnings: string[];
  meta: {
    requestId: string;
    model: string;
    kbVersion: string;
  };
}

export interface QueryContext {
  requestId: string;
}
