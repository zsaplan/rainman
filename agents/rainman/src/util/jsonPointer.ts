function escapeSegment(segment: string | number) {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

export function buildPointer(segments: Array<string | number>) {
  if (segments.length === 0) {
    return "";
  }

  return `/${segments.map(escapeSegment).join("/")}`;
}

export function getValueAtPointer(target: unknown, pointer: string): unknown {
  if (pointer === "") {
    return target;
  }

  if (!pointer.startsWith("/")) {
    return undefined;
  }

  const segments = pointer
    .split("/")
    .slice(1)
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));

  let current: unknown = target;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }

    if (current === null || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export function collectLeafPointers(value: unknown, baseSegments: Array<string | number> = []): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectLeafPointers(entry, [...baseSegments, index]));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return [];
    }

    return entries.flatMap(([key, entryValue]) => collectLeafPointers(entryValue, [...baseSegments, key]));
  }

  return [buildPointer(baseSegments)];
}
