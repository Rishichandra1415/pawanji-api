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
      { name: "Auth", description: "Admin login" },
      { name: "Departments", description: "Department master (grievance routing + emails)" },
      { name: "Grievances", description: "Citizen grievances from the website form" },
      { name: "News", description: "News articles (example resource)" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
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
            coverImage: { type: "string", nullable: true },
            isPublished: { type: "integer", example: 1 },
            publishedAt: { type: "string", format: "date-time", nullable: true },
            isActive: { type: "integer", example: 1 },
            isDeleted: { type: "integer", example: 0 },
            createdBy: { type: "integer", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedBy: { type: "integer", nullable: true },
            updatedAt: { type: "string", format: "date-time", nullable: true },
            deletedBy: { type: "integer", nullable: true },
            deletedAt: { type: "string", format: "date-time", nullable: true },
            deletedRemarks: { type: "string", nullable: true },
          },
        },
        LoginInput: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
        },
        DeleteInput: {
          type: "object",
          required: ["deletedRemarks"],
          properties: { deletedRemarks: { type: "string", minLength: 3, maxLength: 500 } },
        },
        DepartmentInput: {
          type: "object",
          required: ["code", "nameEn", "nameHi"],
          properties: {
            code: { type: "string", example: "electricity" },
            nameEn: { type: "string", example: "Electricity / Light (बिजली)" },
            nameHi: { type: "string", example: "बिजली / लाइट" },
            email: { type: "string", format: "email", nullable: true },
            ccEmails: { type: "string", description: "Comma separated", nullable: true },
            contactPerson: { type: "string", nullable: true },
            phone: { type: "string", nullable: true },
            sortOrder: { type: "integer", default: 0 },
            isActive: { type: "boolean", default: true },
          },
        },
        GrievanceInput: {
          type: "object",
          required: ["name", "mobile", "address", "description", "departmentId"],
          properties: {
            name: { type: "string" },
            mobile: { type: "string", example: "9876543210" },
            village: { type: "string" },
            address: { type: "string" },
            description: { type: "string" },
            departmentId: { type: "integer" },
            language: { type: "string", enum: ["hi", "en"] },
            photo: { type: "string", format: "binary" },
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
    path.join(__dirname, "../modules/**/*.routes.{ts,js}"),
    path.join(__dirname, "../docs/*.{ts,js}"),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
