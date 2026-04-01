import fs from "node:fs";
import path from "node:path";
import { REQUIRED_KB_INDEX } from "../config/constants";

export function getKbVersion(kbRoot: string) {
  const kbIndexPath = path.join(kbRoot, REQUIRED_KB_INDEX);
  const stats = fs.statSync(kbIndexPath);
  return `mtime-${stats.mtimeMs.toFixed(0)}`;
}
