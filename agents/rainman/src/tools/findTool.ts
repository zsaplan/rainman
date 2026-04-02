import type { FindInput } from "../types/tools";
import { listMarkdownFiles } from "./shared/pathGuards";

export function findTool(kbRoot: string, input: FindInput) {
  const query = input.query.trim().toLowerCase();
  const limit = input.limit ?? 20;

  return listMarkdownFiles(kbRoot)
    .filter((file) => file.toLowerCase().includes(query))
    .slice(0, limit);
}
