export type HealthStatus = {
  status: "ok";
  service: string;
  environment: string;
  database: "connected" | "disconnected";
  timestamp: string;
};
