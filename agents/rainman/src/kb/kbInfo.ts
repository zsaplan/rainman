import fs from "node:fs";
import path from "node:path";
import { REQUIRED_KB_INDEX } from "../config/constants";
import { listMarkdownFiles } from "../tools/shared/pathGuards";

export function getKbInfo(kbRoot: string) {
  return {
    kbRoot,
    hasIndex: fs.existsSync(path.join(kbRoot, REQUIRED_KB_INDEX)),
    fileCount: listMarkdownFiles(kbRoot).length,
  };
}
