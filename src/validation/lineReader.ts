import fs from "node:fs";
import { ensureMarkdownRelativePath, ensureWithinKbRoot } from "../tools/shared/pathGuards";
import { ResultValidationError } from "./errors";
import { splitIntoLines } from "../util/lines";

export function readCitationLines(kbRoot: string, relativeFilePath: string, startLine: number, endLine: number) {
  ensureMarkdownRelativePath(relativeFilePath);
  const absolutePath = ensureWithinKbRoot(kbRoot, relativeFilePath);
  const content = fs.readFileSync(absolutePath, "utf8");
  const lines = splitIntoLines(content);

  if (startLine < 1 || endLine < startLine || endLine > lines.length) {
    throw new ResultValidationError("LINE_RANGE_OUT_OF_BOUNDS", "Citation line range is out of bounds", {
      file: relativeFilePath,
      startLine,
      endLine,
      totalLines: lines.length,
    });
  }

  return lines.slice(startLine - 1, endLine).join("\n");
}

export function getFileLength(kbRoot: string, relativeFilePath: string) {
  const absolutePath = ensureWithinKbRoot(kbRoot, relativeFilePath);
  const content = fs.readFileSync(absolutePath, "utf8");
  return splitIntoLines(content).length;
}
