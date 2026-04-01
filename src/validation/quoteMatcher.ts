import { normalizeNewlines } from "../util/lines";

export function quoteMatches(actual: string, quoted: string) {
  return normalizeNewlines(actual) === normalizeNewlines(quoted);
}
