import { buildApp } from "./api/app";
import { loadConfig } from "./config/env";
import { logger } from "./config/logger";

async function main() {
  const config = loadConfig();
  const app = buildApp();
  app.listen(config.PORT, () => {
    logger.info({
      event: "startup.config.valid",
      port: config.PORT,
      model: config.MODEL_ID,
      kbRoot: config.KB_ROOT,
    });
  });
}

main().catch((error) => {
  logger.error({
    event: "startup.config.invalid",
    errorMessage: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
