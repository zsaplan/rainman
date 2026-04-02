import fs from "node:fs";
import path from "node:path";
import { ToolInputError } from "./toolErrors";

export function ensureMarkdownRelativePath(filePath: string) {
  if (!filePath.endsWith(".md")) {
    throw new ToolInputError("NON_MARKDOWN_FILE", "Only markdown files are allowed", { filePath });
  }

  if (path.isAbsolute(filePath)) {
    throw new ToolInputError("PATH_ESCAPE", "Absolute paths are not allowed", { filePath });
  }
}

export function ensureWithinKbRoot(kbRoot: string, relativePath: string) {
  const realKbRoot = fs.realpathSync.native(kbRoot);
  const candidatePath = path.resolve(realKbRoot, relativePath);
  const actualPath = fs.existsSync(candidatePath) ? fs.realpathSync.native(candidatePath) : candidatePath;
  const relative = path.relative(realKbRoot, actualPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ToolInputError("PATH_ESCAPE", "Path escapes KB root", {
      kbRoot: realKbRoot,
      relativePath,
    });
  }

  return actualPath;
}

export function toKbRelativePath(kbRoot: string, absolutePath: string) {
  const realKbRoot = fs.realpathSync.native(kbRoot);
  const actualPath = fs.existsSync(absolutePath) ? fs.realpathSync.native(absolutePath) : absolutePath;
  const relative = path.relative(realKbRoot, actualPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ToolInputError("PATH_ESCAPE", "Resolved path escapes KB root", { absolutePath });
  }
  return relative.split(path.sep).join("/");
}

export function listMarkdownFiles(kbRoot: string): string[] {
  const entries: string[] = [];

  function walk(currentDir: string) {
    const directoryEntries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of directoryEntries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }

      entries.push(toKbRelativePath(kbRoot, fullPath));
    }
  }

  walk(kbRoot);
  return entries.sort();
}
