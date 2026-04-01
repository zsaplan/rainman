import fs from "node:fs";
import path from "node:path";
import type { QueryResponse } from "../types/api";
import type { Citation } from "../types/citations";
import { submitResultTool } from "../tools/submitResultTool";
import { listMarkdownFiles } from "../tools/shared/pathGuards";
import { splitIntoLines } from "../util/lines";
import { getKbVersion } from "../kb/kbVersion";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "what",
  "when",
  "where",
  "who",
  "why",
  "you",
]);

interface MatchCandidate {
  file: string;
  lineNumber: number;
  line: string;
  score: number;
  matchedTokenCount: number;
  exactPhrase: boolean;
}

function normalizePhrase(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value: string) {
  return [...new Set(normalizePhrase(value).split(/\s+/).filter((token) => token.length > 2 && !STOPWORDS.has(token)))];
}

function getWhoAmICandidate(question: string, kbRoot: string): MatchCandidate | undefined {
  const normalizedQuestion = normalizePhrase(question);
  if (!/(what|who) are you/.test(normalizedQuestion)) {
    return undefined;
  }

  const file = "_WHOAMI.md";
  if (!listMarkdownFiles(kbRoot).includes(file)) {
    return undefined;
  }

  const content = fs.readFileSync(path.join(kbRoot, file), "utf8");
  const lines = splitIntoLines(content);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    return {
      file,
      lineNumber: index + 1,
      line,
      score: 1_000,
      matchedTokenCount: 0,
      exactPhrase: true,
    };
  }

  return undefined;
}

function getCandidates(question: string, kbRoot: string): MatchCandidate[] {
  const normalizedQuestion = normalizePhrase(question);
  const queryTokens = tokenize(question);
  const whoAmICandidate = getWhoAmICandidate(question, kbRoot);
  const candidates: MatchCandidate[] = whoAmICandidate ? [whoAmICandidate] : [];

  for (const file of listMarkdownFiles(kbRoot)) {
    const content = fs.readFileSync(path.join(kbRoot, file), "utf8");
    const lines = splitIntoLines(content);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line) {
        continue;
      }

      const lineTokens = new Set(tokenize(line));
      const matchedTokenCount = queryTokens.filter((token) => lineTokens.has(token)).length;
      const exactPhrase = normalizedQuestion.length > 0 && normalizePhrase(line).includes(normalizedQuestion);
      const score = (exactPhrase ? 100 : 0) + matchedTokenCount;
      if (score === 0) {
        continue;
      }

      candidates.push({
        file,
        lineNumber: index + 1,
        line,
        score,
        matchedTokenCount,
        exactPhrase,
      });
    }
  }

  return candidates.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    if (right.matchedTokenCount !== left.matchedTokenCount) {
      return right.matchedTokenCount - left.matchedTokenCount;
    }
    return left.line.length - right.line.length;
  });
}

function toCitation(pathValue: string, candidate: MatchCandidate): Citation {
  return {
    path: pathValue,
    file: candidate.file,
    startLine: candidate.lineNumber,
    endLine: candidate.lineNumber,
    quote: candidate.line,
  };
}

function canAnswer(question: string, candidate: MatchCandidate) {
  const queryTokens = tokenize(question);
  if (candidate.exactPhrase) {
    return true;
  }
  if (queryTokens.length === 0) {
    return false;
  }
  if (queryTokens.length === 1) {
    return candidate.matchedTokenCount >= 1;
  }
  return candidate.matchedTokenCount === queryTokens.length;
}

export function deterministicFallback(
  question: string,
  context: { kbRoot: string; requestId: string; model: string },
): QueryResponse {
  const candidates = getCandidates(question, context.kbRoot);
  const fallbackWarning = "Returned via deterministic fallback after the agent failed to finalize through submit_result.";

  const draft: Omit<QueryResponse, "meta"> =
    candidates.length === 0 || !canAnswer(question, candidates[0])
      ? {
          status: "insufficient_evidence",
          data: {},
          citations: [],
          missingInformation: ["No sufficiently relevant markdown evidence matched the question."],
          warnings: [fallbackWarning],
        }
      : {
          status: "answered",
          data: { answer: candidates[0].line },
          citations: [toCitation("/data/answer", candidates[0])],
          missingInformation: [],
          warnings: [fallbackWarning],
        };

  return submitResultTool(draft, {
    kbRoot: context.kbRoot,
    requestId: context.requestId,
    model: context.model,
    kbVersion: getKbVersion(context.kbRoot),
  }).result;
}
