export function normalizeNewlines(value: string) {
  return value.replace(/\r\n/g, "\n");
}

export function splitIntoLines(value: string) {
  const normalized = normalizeNewlines(value);
  const lines = normalized.split("\n");
  if (normalized.endsWith("\n")) {
    lines.pop();
  }
  return lines;
}
