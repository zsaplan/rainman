import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { DEFAULT_LOG_LEVEL, DEFAULT_PORT, REQUIRED_KB_INDEX } from "./constants";

const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  MODEL_ID: z.string().min(1, "MODEL_ID is required"),
  KB_ROOT: z.string().min(1, "KB_ROOT is required"),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  LOG_LEVEL: z.string().min(1).default(DEFAULT_LOG_LEVEL),
});

export type AppConfig = z.infer<typeof envSchema>;

export class ConfigValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid configuration: ${issues.join("; ")}`);
    this.name = "ConfigValidationError";
  }
}

let cachedConfig: AppConfig | undefined;

function validateKb(config: AppConfig): string[] {
  const issues: string[] = [];
  if (!fs.existsSync(config.KB_ROOT)) {
    issues.push(`KB_ROOT does not exist: ${config.KB_ROOT}`);
    return issues;
  }

  const kbIndexPath = path.join(config.KB_ROOT, REQUIRED_KB_INDEX);
  if (!fs.existsSync(kbIndexPath)) {
    issues.push(`Missing ${REQUIRED_KB_INDEX} under KB root`);
  }

  try {
    fs.accessSync(config.KB_ROOT, fs.constants.R_OK);
  } catch {
    issues.push(`KB_ROOT is not readable: ${config.KB_ROOT}`);
  }

  return issues;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigValidationError(parsed.error.issues.map((issue) => issue.message));
  }

  const kbIssues = validateKb(parsed.data);
  if (kbIssues.length > 0) {
    throw new ConfigValidationError(kbIssues);
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}

export function checkReadiness(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    return {
      ready: false as const,
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const issues = validateKb(parsed.data);
  if (issues.length > 0) {
    return {
      ready: false as const,
      issues,
    };
  }

  return {
    ready: true as const,
    issues: [] as string[],
    config: parsed.data,
  };
}
