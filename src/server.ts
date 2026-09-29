import { createApp } from "./app";
import { env } from "./config/env";
import { checkDatabaseConnection } from "./config/database";
import { runMigrations } from "./config/migrate";

async function bootstrap() {
  const app = createApp();

  const dbOk = await checkDatabaseConnection();

  if (dbOk) {
    try {
      await runMigrations();
    } catch (error) {
      console.error("[api] migrations failed", error);
    }
  }

  app.listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}${env.apiPrefix}`);
    console.log(`[api] swagger  http://localhost:${env.port}${env.apiPrefix}/docs`);
    console.log(`[api] database ${dbOk ? "connected" : "NOT connected (check .env / MySQL)"}`);
  });
}

bootstrap().catch((error) => {
  console.error("[api] failed to start", error);
  process.exit(1);
});
