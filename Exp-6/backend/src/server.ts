import { createServer } from "node:http";

import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { bootstrapRoleWallets } from "./roles/role-bootstrap.service.js";

const server = createServer(app);

async function startServer(): Promise<void> {
  const roleBootstrap = await bootstrapRoleWallets();

  logger.info("Role bootstrap completed", {
    upserted: roleBootstrap.upserted,
    skipped: roleBootstrap.skipped
  });

  server.listen(env.PORT, () => {
    logger.info("Backend server started", {
      port: env.PORT,
      env: env.NODE_ENV,
      apiBasePath: env.API_BASE_PATH
    });
  });
}

function shutdown(signal: NodeJS.Signals): void {
  logger.warn("Shutdown signal received", { signal });
  server.close((error) => {
    if (error) {
      logger.error("Server shutdown failed", { message: error.message });
      process.exit(1);
      return;
    }

    logger.info("Server shutdown complete");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer().catch((error) => {
  logger.error("Startup failed", {
    message: error instanceof Error ? error.message : "Unknown error"
  });
  process.exit(1);
});
