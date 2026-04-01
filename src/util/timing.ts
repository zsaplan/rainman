export function nowMs() {
  return Date.now();
}

export function elapsedMs(startMs: number) {
  return Date.now() - startMs;
}
