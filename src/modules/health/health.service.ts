import { checkDatabaseConnection } from "../../config/database";
import { env } from "../../config/env";
import type { HealthStatus } from "./health.model";

export const getStatus = async (): Promise<{ data: HealthStatus; ok: boolean }> => {
  const dbOk = await checkDatabaseConnection();

  return {
    ok: dbOk,
    data: {
      status: "ok",
      service: "pawanji-api",
      environment: env.nodeEnv,
      database: dbOk ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    },
  };
};
