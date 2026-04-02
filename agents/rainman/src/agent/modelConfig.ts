import type { AppConfig } from "../config/env";

export interface ModelConfig {
  provider: "openrouter";
  model: string;
}

export function getModelConfig(config: AppConfig): ModelConfig {
  return {
    provider: "openrouter",
    model: config.MODEL_ID,
  };
}
