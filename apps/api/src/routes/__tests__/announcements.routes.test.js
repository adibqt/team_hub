jest.mock("../../config/prisma.js", () => ({
  prisma: {
    membership: { findUnique: jest.fn() },
    announcement: { create: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

jest.mock("../../services/audit.js", () => ({
  logAudit: jest.fn().mockResolvedValue(null),
}));

jest.mock("../../services/mailer.js", () => ({
  sendMentionEmail: jest.fn().mockResolvedValue({ sent: true }),
}));

import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { prisma } from "../../config/prisma.js";
import { signAccess } from "../../utils/tokens.js";
import { errorHandler } from "../../middleware/error.js";
import announcementsRoutes from "../announcements.routes.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.set("io", { to: jest.fn(() => ({ emit: jest.fn() })) });
  app.use("/api", announcementsRoutes);
  app.use(errorHandler);
  return app;
}

const accessCookie = (userId) => `access=${signAccess({ id: userId })}`;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/workspaces/:wsId/announcements", () => {
  it("rejects bodyHtml that becomes empty after sanitization", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });

    const res = await request(buildApp())
      .post("/api/workspaces/ws1/announcements")
      .set("Cookie", accessCookie("u1"))
      .send({ title: "Update", bodyHtml: "<script>alert(1)</script>" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Body can't be empty" });
    expect(prisma.announcement.create).not.toHaveBeenCalled();
  });

  it("sanitizes unsafe markup before persisting", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });
    prisma.announcement.create.mockResolvedValue({
      id: "a1",
      workspaceId: "ws1",
      authorId: "u1",
      title: "Update",
      bodyHtml: "<p>Hello <a href=\"https://x.dev\">x</a></p>",
      pinned: false,
    });
    prisma.user.findUnique.mockResolvedValue({ id: "u1", name: "Alice", avatarUrl: null });

    const res = await request(buildApp())
      .post("/api/workspaces/ws1/announcements")
      .set("Cookie", accessCookie("u1"))
      .send({
        title: "Update",
        bodyHtml:
          "<p>Hello<script>alert(1)</script> <a href='javascript:alert(1)'>x</a> <a href='https://x.dev'>safe</a></p>",
      });

    expect(res.status).toBe(201);
    const payload = prisma.announcement.create.mock.calls[0][0].data.bodyHtml;
    expect(payload).not.toMatch(/<script/i);
    expect(payload).not.toMatch(/javascript:/i);
    expect(payload).toMatch(/href="https:\/\/x\.dev"/);
  });
});
