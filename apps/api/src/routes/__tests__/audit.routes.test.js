jest.mock("../../config/prisma.js", () => ({
  prisma: {
    membership: { findUnique: jest.fn() },
    auditLog: { findMany: jest.fn() },
  },
}));

import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { prisma } from "../../config/prisma.js";
import { signAccess } from "../../utils/tokens.js";
import { errorHandler } from "../../middleware/error.js";
import auditRoutes from "../audit.routes.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/workspaces", auditRoutes);
  app.use(errorHandler);
  return app;
}

const accessCookie = (userId) => `access=${signAccess({ id: userId })}`;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/workspaces/:id/audit.csv", () => {
  it("escapes CSV cells containing commas, quotes and newlines", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });
    prisma.auditLog.findMany
      .mockResolvedValueOnce([
        {
          id: "a1",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          actor: { email: "a,b\"c@example.com" },
          action: "item\nupdate",
          entityType: "Action,Item",
          entityId: "id\"123",
        },
      ])
      .mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get("/api/workspaces/ws1/audit.csv")
      .set("Cookie", accessCookie("u1"));

    expect(res.status).toBe(200);
    expect(res.text).toContain("createdAt,actor,action,entityType,entityId");
    expect(res.text).toContain("\"a,b\"\"c@example.com\"");
    expect(res.text).toContain("\"item\nupdate\"");
    expect(res.text).toContain("\"Action,Item\"");
    expect(res.text).toContain("\"id\"\"123\"");
  });
});
