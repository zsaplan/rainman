import pino from "pino";
import { APP_NAME, DEFAULT_LOG_LEVEL } from "./constants";

export function createLogger(level = process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL) {
  return pino({
    name: APP_NAME,
    level,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export type Logger = ReturnType<typeof createLogger>;

export const logger = createLogger();
