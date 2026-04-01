import fs from "node:fs";
import type { ReadInput, ReadOutput } from "../types/tools";
import { splitIntoLines } from "../util/lines";
import { ensureMarkdownRelativePath, ensureWithinKbRoot, toKbRelativePath } from "./shared/pathGuards";
import { ToolInputError } from "./shared/toolErrors";

const DEFAULT_LIMIT = 200;

export function readTool(kbRoot: string, input: ReadInput): ReadOutput {
  const offset = input.offset ?? 1;
  const limit = input.limit ?? DEFAULT_LIMIT;

  if (offset < 1 || !Number.isInteger(offset)) {
    throw new ToolInputError("INVALID_OFFSET", "offset must be a positive integer", { offset });
  }

  if (limit < 1 || !Number.isInteger(limit)) {
    throw new ToolInputError("INVALID_LIMIT", "limit must be a positive integer", { limit });
  }

  ensureMarkdownRelativePath(input.filePath);
  const absolutePath = ensureWithinKbRoot(kbRoot, input.filePath);
  const content = fs.readFileSync(absolutePath, "utf8");
  const lines = splitIntoLines(content);
  const startIndex = Math.min(offset - 1, lines.length);
  const selectedLines = lines.slice(startIndex, startIndex + limit);
  const startLine = selectedLines.length > 0 ? startIndex + 1 : offset;
  const endLine = selectedLines.length > 0 ? startIndex + selectedLines.length : startIndex;

  return {
    filePath: toKbRelativePath(kbRoot, absolutePath),
    startLine,
    endLine,
    totalLines: lines.length,
    content: selectedLines.map((line, index) => `${startIndex + index + 1} | ${line}`).join("\n"),
  };
}
