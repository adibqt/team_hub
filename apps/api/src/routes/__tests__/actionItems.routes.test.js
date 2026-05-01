jest.mock("../../config/prisma.js", () => ({
  prisma: {
    membership: { findUnique: jest.fn() },
    actionItem: { findMany: jest.fn(), count: jest.fn() },
  },
}));

import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { prisma } from "../../config/prisma.js";
import { signAccess } from "../../utils/tokens.js";
import { errorHandler } from "../../middleware/error.js";
import actionItemsRoutes from "../actionItems.routes.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", actionItemsRoutes);
  app.use(errorHandler);
  return app;
}

const accessCookie = (userId) => `access=${signAccess({ id: userId })}`;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/workspaces/:wsId/items", () => {
  it("returns items in a paginated list envelope", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "MEMBER" });
    prisma.actionItem.findMany.mockResolvedValue([{ id: "i1", title: "Ship docs" }]);
    prisma.actionItem.count.mockResolvedValue(23);

    const res = await request(buildApp())
      .get("/api/workspaces/ws1/items?page=3&take=5")
      .set("Cookie", accessCookie("u1"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [{ id: "i1", title: "Ship docs" }],
      total: 23,
      page: 3,
      take: 5,
    });
    expect(prisma.actionItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 })
    );
  });
});
