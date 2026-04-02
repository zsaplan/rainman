import fs from "node:fs";
import path from "node:path";
import type { GrepHit, GrepInput } from "../types/tools";
import { splitIntoLines } from "../util/lines";
import { listMarkdownFiles } from "./shared/pathGuards";

export function grepTool(kbRoot: string, input: GrepInput): GrepHit[] {
  const pattern = input.pattern.trim().toLowerCase();
  const limit = input.limit ?? 20;
  if (!pattern) {
    return [];
  }

  const hits: GrepHit[] = [];
  for (const file of listMarkdownFiles(kbRoot)) {
    const content = fs.readFileSync(path.join(kbRoot, file), "utf8");
    const lines = splitIntoLines(content);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line.toLowerCase().includes(pattern)) {
        continue;
      }

      hits.push({
        file,
        lineNumber: index + 1,
        line,
      });

      if (hits.length >= limit) {
        return hits;
      }
    }
  }

  return hits;
}
