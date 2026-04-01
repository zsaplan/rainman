import type { Citation } from "../types/citations";
import { collectLeafPointers, getValueAtPointer } from "../util/jsonPointer";
import { ResultValidationError } from "./errors";

export function validateFieldCoverage(data: Record<string, unknown>, citations: Citation[]) {
  const requiredPointers = collectLeafPointers(data, ["data"]);
  const citedPointers = new Set(citations.map((citation) => citation.path));

  for (const pointer of requiredPointers) {
    if (!pointer || !pointer.startsWith("/data")) {
      continue;
    }

    if (getValueAtPointer({ data }, pointer) === undefined) {
      throw new ResultValidationError("INVALID_CITATION_PATH", "Citation path does not target a populated response field", {
        path: pointer,
      });
    }

    if (!citedPointers.has(pointer)) {
      throw new ResultValidationError("UNCITED_FIELD", "Populated field is missing citation coverage", {
        path: pointer,
      });
    }
  }

  for (const citation of citations) {
    if (getValueAtPointer({ data }, citation.path) === undefined) {
      throw new ResultValidationError("INVALID_CITATION_PATH", "Citation path does not resolve to a populated response field", {
        path: citation.path,
      });
    }
  }
}
