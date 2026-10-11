import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors(env.corsOrigins.length ? { origin: env.corsOrigins } : undefined));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

  app.get(env.apiPrefix, (_req, res) => {
    res.json({
      success: true,
      message: "Pawanji API",
      data: {
        docs: `${env.apiPrefix}/docs`,
        health: `${env.apiPrefix}/health`,
        news: `${env.apiPrefix}/news`,
      },
    });
  });

  app.use(
    `${env.apiPrefix}/uploads`,
    express.static(env.upload.dir, { index: false, dotfiles: "deny", maxAge: "7d" }),
  );

  app.use(
    `${env.apiPrefix}/docs`,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: "Pawanji API Docs",
    }),
  );

  app.get(`${env.apiPrefix}/docs.json`, (_req, res) => {
    res.json(swaggerSpec);
  });

  app.use(env.apiPrefix, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
