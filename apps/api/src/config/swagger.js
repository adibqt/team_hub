import swaggerJSDoc from "swagger-jsdoc";
import { env } from "./env.js";
import authRoutes from "../routes/auth.routes.js";
import usersRoutes from "../routes/users.routes.js";
import workspacesRoutes from "../routes/workspaces.routes.js";
import goalsRoutes from "../routes/goals.routes.js";
import milestonesRoutes from "../routes/milestones.routes.js";
import announcementsRoutes from "../routes/announcements.routes.js";
import actionItemsRoutes from "../routes/actionItems.routes.js";
import analyticsRoutes from "../routes/analytics.routes.js";
import auditRoutes from "../routes/audit.routes.js";
import notificationsRoutes from "../routes/notifications.routes.js";

const port = Number(env.PORT) || 8080;

function normalizeOpenApiPath(path) {
  if (!path) return "/";
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  return withLeadingSlash.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function joinPaths(basePath, routePath) {
  const base = basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath || "";
  const route = routePath?.startsWith("/") ? routePath : `/${routePath || ""}`;
  return normalizeOpenApiPath(`${base}${route}` || "/");
}

function toTagLabel(tag) {
  return tag === "auth" ? "Auth" : tag.charAt(0).toUpperCase() + tag.slice(1);
}

function buildOperation({ method, fullPath, tag }) {
  const operation = {
    tags: [toTagLabel(tag)],
    operationId: `${method}_${fullPath.replace(/[{}\/-]+/g, "_").replace(/^_+|_+$/g, "")}`,
    responses: {
      200: { description: "Successful response" },
      400: { description: "Bad request" },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden" },
      404: { description: "Not found" },
      500: { description: "Internal server error" },
    },
  };

  if (["post", "put", "patch"].includes(method)) {
    operation.requestBody = {
      required: false,
      content: {
        "application/json": {
          schema: { type: "object", additionalProperties: true },
        },
      },
    };
  }

  const isPublic =
    fullPath === "/api/auth/register" ||
    fullPath === "/api/auth/login" ||
    fullPath === "/api/auth/refresh" ||
    fullPath === "/api/auth/logout" ||
    fullPath === "/api/workspaces/invites/{token}";

  if (!isPublic) {
    operation.security = [{ bearerAuth: [] }];
  }

  return operation;
}

function collectRouterPaths(paths, router, mountPath, tag) {
  for (const layer of router.stack || []) {
    const route = layer.route;
    if (!route) continue;
    const routePath = Array.isArray(route.path) ? route.path[0] : route.path;
    if (typeof routePath !== "string") continue;
    const fullPath = joinPaths(mountPath, routePath);
    if (!paths[fullPath]) paths[fullPath] = {};

    const methods = Object.entries(route.methods || {})
      .filter(([, enabled]) => enabled)
      .map(([method]) => method.toLowerCase());

    for (const method of methods) {
      paths[fullPath][method] = buildOperation({ method, fullPath, tag });
    }
  }
}

function buildPaths() {
  const paths = {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          200: {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean", example: true } },
                },
              },
            },
          },
        },
      },
    },
  };

  collectRouterPaths(paths, authRoutes, "/api/auth", "auth");
  collectRouterPaths(paths, usersRoutes, "/api/users", "users");
  collectRouterPaths(paths, notificationsRoutes, "/api/notifications", "notifications");
  collectRouterPaths(paths, workspacesRoutes, "/api/workspaces", "workspaces");
  collectRouterPaths(paths, analyticsRoutes, "/api/workspaces", "analytics");
  collectRouterPaths(paths, auditRoutes, "/api/workspaces", "audit");
  collectRouterPaths(paths, goalsRoutes, "/api", "goals");
  collectRouterPaths(paths, milestonesRoutes, "/api", "milestones");
  collectRouterPaths(paths, announcementsRoutes, "/api", "announcements");
  collectRouterPaths(paths, actionItemsRoutes, "/api", "actionItems");

  return paths;
}

const definition = {
  openapi: "3.0.3",
  info: {
    title: "Team Hub API",
    version: "1.0.0",
    description: "REST API documentation for Team Hub.",
  },
  servers: [
    { url: `http://localhost:${port}`, description: "Local API" },
  ],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Users" },
    { name: "Notifications" },
    { name: "Workspaces" },
    { name: "Analytics" },
    { name: "Audit" },
    { name: "Goals" },
    { name: "Milestones" },
    { name: "Announcements" },
    { name: "ActionItems" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: buildPaths(),
};

const options = {
  definition,
  apis: [],
};

export const swaggerSpec = swaggerJSDoc(options);
