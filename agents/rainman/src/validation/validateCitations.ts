import type { Citation } from "../types/citations";
import type { CitationValidationResult } from "../types/tools";
import { ensureMarkdownRelativePath, ensureWithinKbRoot } from "../tools/shared/pathGuards";
import { readCitationLines } from "./lineReader";
import { quoteMatches } from "./quoteMatcher";
import { ResultValidationError } from "./errors";

export function validateCitations(kbRoot: string, citations: Citation[]): CitationValidationResult[] {
  return citations.map((citation) => {
    if (!citation.path.startsWith("/data")) {
      throw new ResultValidationError("INVALID_CITATION_PATH", "Citation path must target /data", {
        path: citation.path,
      });
    }

    ensureMarkdownRelativePath(citation.file);
    ensureWithinKbRoot(kbRoot, citation.file);

    if (citation.endLine < citation.startLine) {
      throw new ResultValidationError("INVALID_CITATION", "Citation endLine must be greater than or equal to startLine", {
        citation,
      });
    }

    const actualQuote = readCitationLines(kbRoot, citation.file, citation.startLine, citation.endLine);
    if (!quoteMatches(actualQuote, citation.quote)) {
      throw new ResultValidationError("QUOTE_MISMATCH", "Citation quote does not match file contents", {
        citation,
        actualQuote,
      });
    }

    return {
      citation,
      actualQuote,
    };
  });
}
