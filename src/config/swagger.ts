import path from "path";
import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Pawanji API",
      version: "1.0.0",
      description:
        "Backend API for the Pawanji website and admin panel. Path-based mounting under `/api`.",
      contact: {
        name: "Pawanji Team",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.port}${env.apiPrefix}`,
        description: "Local development",
      },
      {
        url: env.apiPrefix,
        description: "Production (same origin via nginx)",
      },
    ],
    tags: [
      { name: "Health", description: "Service health checks" },
      { name: "News", description: "News articles (example resource)" },
    ],
    components: {
      schemas: {
        ApiSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: {},
          },
        },
        ApiError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            errors: {},
          },
        },
        News: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            title: { type: "string", example: "Constituency visit in Ghorasahan" },
            slug: { type: "string", example: "constituency-visit-ghorasahan" },
            summary: { type: "string", nullable: true },
            content: { type: "string" },
            cover_image: { type: "string", nullable: true },
            is_published: { type: "integer", example: 1 },
            published_at: { type: "string", format: "date-time", nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        CreateNewsInput: {
          type: "object",
          required: ["title", "slug", "content"],
          properties: {
            title: { type: "string", minLength: 3, maxLength: 200 },
            slug: {
              type: "string",
              pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
              example: "constituency-visit-ghorasahan",
            },
            summary: { type: "string", maxLength: 500 },
            content: { type: "string", minLength: 10 },
            coverImage: { type: "string", format: "uri" },
            isPublished: { type: "boolean", default: false },
          },
        },
      },
    },
  },
  apis: [
    path.join(__dirname, "../modules/**/*.route.{ts,js}"),
    path.join(__dirname, "../docs/*.{ts,js}"),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
