jest.mock("../../config/prisma.js", () => ({
  prisma: {
    membership: { findUnique: jest.fn() },
    goal: { findMany: jest.fn(), count: jest.fn() },
  },
}));

import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { prisma } from "../../config/prisma.js";
import { signAccess } from "../../utils/tokens.js";
import { errorHandler } from "../../middleware/error.js";
import goalsRoutes from "../goals.routes.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", goalsRoutes);
  app.use(errorHandler);
  return app;
}

const accessCookie = (userId) => `access=${signAccess({ id: userId })}`;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/workspaces/:wsId/goals", () => {
  it("returns paginated envelope with total/page/take", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "MEMBER" });
    prisma.goal.findMany.mockResolvedValue([{ id: "g1", title: "Goal 1" }]);
    prisma.goal.count.mockResolvedValue(1);

    const res = await request(buildApp())
      .get("/api/workspaces/ws1/goals?page=2&take=10")
      .set("Cookie", accessCookie("u1"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [{ id: "g1", title: "Goal 1" }],
      total: 1,
      page: 2,
      take: 10,
    });
    expect(prisma.goal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });
});
