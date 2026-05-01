// Integration tests for /api/workspaces — auth + membership middleware are
// exercised end-to-end against Supertest, while the database, audit log,
// and mailer are stubbed so the suite stays hermetic and deterministic.

jest.mock("../../config/prisma.js", () => ({
  prisma: {
    workspace: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    membership: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    invite: {
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock("../../services/audit.js", () => ({
  logAudit: jest.fn().mockResolvedValue(null),
}));

jest.mock("../../services/mailer.js", () => ({
  sendInviteEmail: jest.fn().mockResolvedValue({ sent: true }),
}));

import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { prisma } from "../../config/prisma.js";
import { signAccess } from "../../utils/tokens.js";
import { errorHandler } from "../../middleware/error.js";
import { logAudit } from "../../services/audit.js";
import workspacesRoutes from "../workspaces.routes.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/workspaces", workspacesRoutes);
  app.use(errorHandler);
  return app;
}

const accessCookie = (userId) => `access=${signAccess({ id: userId })}`;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/workspaces (create)", () => {
  it("rejects requests with no auth cookie (401)", async () => {
    const res = await request(buildApp())
      .post("/api/workspaces")
      .send({ name: "Engineering" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "unauthenticated" });
  });

  it("400s when name is missing or not a string", async () => {
    const app = buildApp();
    const r1 = await request(app)
      .post("/api/workspaces")
      .set("Cookie", accessCookie("u1"))
      .send({});
    expect(r1.status).toBe(400);

    const r2 = await request(app)
      .post("/api/workspaces")
      .set("Cookie", accessCookie("u1"))
      .send({ name: 42 });
    expect(r2.status).toBe(400);

    expect(prisma.workspace.create).not.toHaveBeenCalled();
  });

  it("creates the workspace, stamps the creator as ADMIN, and writes audit", async () => {
    const created = {
      id: "ws1",
      name: "Engineering",
      description: null,
      accentColor: "#2563EB",
      members: [{ user: { id: "u1", name: "Alice" }, role: "ADMIN" }],
    };
    prisma.workspace.create.mockResolvedValue(created);

    const res = await request(buildApp())
      .post("/api/workspaces")
      .set("Cookie", accessCookie("u1"))
      .send({ name: "  Engineering  " });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(created);

    const arg = prisma.workspace.create.mock.calls[0][0];
    expect(arg.data.name).toBe("Engineering"); // trimmed
    expect(arg.data.members.create).toEqual({ userId: "u1", role: "ADMIN" });

    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: "ws1",
      actorId: "u1",
      action: "workspace.create",
    }));
  });
});

describe("GET /api/workspaces (list)", () => {
  it("returns each workspace flattened with the caller's role", async () => {
    prisma.membership.findMany.mockResolvedValue([
      {
        role: "ADMIN",
        workspace: { id: "ws1", name: "Eng", _count: { members: 3, goals: 2 } },
      },
      {
        role: "MEMBER",
        workspace: { id: "ws2", name: "Design", _count: { members: 5, goals: 1 } },
      },
    ]);

    const res = await request(buildApp())
      .get("/api/workspaces")
      .set("Cookie", accessCookie("u1"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: "ws1", name: "Eng", _count: { members: 3, goals: 2 }, role: "ADMIN" },
      { id: "ws2", name: "Design", _count: { members: 5, goals: 1 }, role: "MEMBER" },
    ]);
  });
});

describe("GET /api/workspaces/:id (read)", () => {
  it("403s when the user isn't a member of the workspace", async () => {
    prisma.membership.findUnique.mockResolvedValue(null);

    const res = await request(buildApp())
      .get("/api/workspaces/ws1")
      .set("Cookie", accessCookie("u1"));

    expect(res.status).toBe(403);
    expect(prisma.workspace.findUnique).not.toHaveBeenCalled();
  });

  it("returns the workspace with viewerRole when the caller is a member", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "MEMBER" });
    prisma.workspace.findUnique.mockResolvedValue({
      id: "ws1",
      name: "Eng",
      members: [],
      _count: { goals: 0, actionItems: 0, announcements: 0 },
    });

    const res = await request(buildApp())
      .get("/api/workspaces/ws1")
      .set("Cookie", accessCookie("u1"));

    expect(res.status).toBe(200);
    expect(res.body.viewerRole).toBe("MEMBER");
    expect(res.body.id).toBe("ws1");
  });
});

describe("PATCH /api/workspaces/:id (admin only)", () => {
  it("403s for non-admin members", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "MEMBER" });

    const res = await request(buildApp())
      .patch("/api/workspaces/ws1")
      .set("Cookie", accessCookie("u1"))
      .send({ name: "Renamed" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Admin role required" });
    expect(prisma.workspace.update).not.toHaveBeenCalled();
  });

  it("updates only well-formed fields and silently drops bogus accentColor", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });
    prisma.workspace.findUnique.mockResolvedValue({
      id: "ws1",
      name: "Eng",
      description: null,
      accentColor: "#000000",
    });
    prisma.workspace.update.mockResolvedValue({
      id: "ws1",
      name: "Engineering",
      description: "elite squad",
      accentColor: "#000000",
    });

    const res = await request(buildApp())
      .patch("/api/workspaces/ws1")
      .set("Cookie", accessCookie("u1"))
      .send({
        name: "  Engineering  ",
        description: "  elite squad  ",
        accentColor: "not-a-color",
      });

    expect(res.status).toBe(200);
    const arg = prisma.workspace.update.mock.calls[0][0];
    expect(arg.data).toEqual({ name: "Engineering", description: "elite squad" });
    // `accentColor: "not-a-color"` is invalid → not included in the update payload.
    expect(arg.data.accentColor).toBeUndefined();
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "workspace.update" }));
  });

  it("accepts a well-formed accentColor", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });
    prisma.workspace.findUnique.mockResolvedValue({
      id: "ws1",
      name: "Eng",
      description: null,
      accentColor: "#000000",
    });
    prisma.workspace.update.mockResolvedValue({ id: "ws1", accentColor: "#FF8800" });

    const res = await request(buildApp())
      .patch("/api/workspaces/ws1")
      .set("Cookie", accessCookie("u1"))
      .send({ accentColor: "#FF8800" });

    expect(res.status).toBe(200);
    const arg = prisma.workspace.update.mock.calls[0][0];
    expect(arg.data.accentColor).toBe("#FF8800");
  });
});

describe("PATCH /api/workspaces/:id/members/:userId (role change)", () => {
  it("rejects an invalid role with 400", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });

    const res = await request(buildApp())
      .patch("/api/workspaces/ws1/members/u2")
      .set("Cookie", accessCookie("u1"))
      .send({ role: "OWNER" });

    expect(res.status).toBe(400);
    expect(prisma.membership.update).not.toHaveBeenCalled();
  });

  it("blocks the last admin from demoting themselves", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });
    prisma.membership.count.mockResolvedValue(1);

    const res = await request(buildApp())
      .patch("/api/workspaces/ws1/members/u1") // self
      .set("Cookie", accessCookie("u1"))
      .send({ role: "MEMBER" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Workspace must keep at least one admin" });
    expect(prisma.membership.update).not.toHaveBeenCalled();
  });

  it("allows self-demotion when other admins remain", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });
    prisma.membership.count.mockResolvedValue(2);
    prisma.membership.update.mockResolvedValue({
      id: "m1",
      role: "MEMBER",
      userId: "u1",
      user: { id: "u1", name: "Alice" },
    });

    const res = await request(buildApp())
      .patch("/api/workspaces/ws1/members/u1")
      .set("Cookie", accessCookie("u1"))
      .send({ role: "MEMBER" });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("MEMBER");
  });
});

describe("DELETE /api/workspaces/:id/members/:userId (remove / leave)", () => {
  it("forbids removing other members when the caller isn't an admin", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "MEMBER" });

    const res = await request(buildApp())
      .delete("/api/workspaces/ws1/members/u2")
      .set("Cookie", accessCookie("u1"));

    expect(res.status).toBe(403);
    expect(prisma.membership.delete).not.toHaveBeenCalled();
  });

  it("lets a regular member leave (remove self) without admin rights", async () => {
    prisma.membership.findUnique
      // 1) requireMember
      .mockResolvedValueOnce({ id: "m1", role: "MEMBER" })
      // 2) target lookup inside the handler
      .mockResolvedValueOnce({ id: "m1", role: "MEMBER", userId: "u1" });

    prisma.membership.delete.mockResolvedValue({});

    const res = await request(buildApp())
      .delete("/api/workspaces/ws1/members/u1")
      .set("Cookie", accessCookie("u1"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "member.leave" }));
  });

  it("blocks removing the last admin", async () => {
    prisma.membership.findUnique
      .mockResolvedValueOnce({ id: "m_admin", role: "ADMIN" })
      .mockResolvedValueOnce({ id: "m_admin", role: "ADMIN", userId: "u1" });
    prisma.membership.count.mockResolvedValue(1);

    const res = await request(buildApp())
      .delete("/api/workspaces/ws1/members/u1")
      .set("Cookie", accessCookie("u1"));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Workspace must keep at least one admin" });
    expect(prisma.membership.delete).not.toHaveBeenCalled();
  });

  it("404s when the target membership doesn't exist", async () => {
    prisma.membership.findUnique
      .mockResolvedValueOnce({ id: "m1", role: "ADMIN" }) // requireMember
      .mockResolvedValueOnce(null); // target

    const res = await request(buildApp())
      .delete("/api/workspaces/ws1/members/uX")
      .set("Cookie", accessCookie("u1"));

    expect(res.status).toBe(404);
  });
});

describe("POST /api/workspaces/:id/invites (admin only)", () => {
  it("rejects an invalid email", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });

    const res = await request(buildApp())
      .post("/api/workspaces/ws1/invites")
      .set("Cookie", accessCookie("u1"))
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(prisma.invite.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the invitee is already a member", async () => {
    prisma.membership.findUnique
      .mockResolvedValueOnce({ id: "m1", role: "ADMIN" }) // requireMember (caller)
      .mockResolvedValueOnce({ id: "m2", role: "MEMBER" }); // existing membership for invitee
    prisma.user.findUnique.mockResolvedValue({ id: "u2", email: "b@b.com" });

    const res = await request(buildApp())
      .post("/api/workspaces/ws1/invites")
      .set("Cookie", accessCookie("u1"))
      .send({ email: "b@b.com" });

    expect(res.status).toBe(409);
    expect(prisma.invite.create).not.toHaveBeenCalled();
  });

  it("creates an invite, returns the link, and reports email status", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "ADMIN" });
    prisma.user.findUnique
      .mockResolvedValueOnce(null) // no existing user with that email
      .mockResolvedValueOnce({ name: "Alice", email: "alice@x.com" }); // inviter
    prisma.workspace.findUnique.mockResolvedValue({ name: "Eng", accentColor: "#2563EB" });
    prisma.invite.create.mockResolvedValue({
      id: "inv1",
      email: "b@b.com",
      role: "MEMBER",
      token: "fixed-token",
      workspaceId: "ws1",
    });

    const res = await request(buildApp())
      .post("/api/workspaces/ws1/invites")
      .set("Cookie", accessCookie("u1"))
      .send({ email: "B@B.com", role: "MEMBER" });

    expect(res.status).toBe(201);
    // The route mints its own UUID and passes it to prisma — the mock just
    // echoes whatever token came in, so we read it back from the call args.
    const passedToken = prisma.invite.create.mock.calls[0][0].data.token;
    expect(typeof passedToken).toBe("string");
    expect(passedToken.length).toBeGreaterThan(10);
    expect(res.body.inviteUrl).toBe(`http://localhost:3000/invite/${passedToken}`);
    expect(res.body.emailSent).toBe(true);

    const arg = prisma.invite.create.mock.calls[0][0];
    expect(arg.data.email).toBe("b@b.com"); // lowercased
    expect(arg.data.workspaceId).toBe("ws1");
    expect(arg.data.role).toBe("MEMBER");

    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "invite.create" }));
  });
});

describe("POST /api/workspaces/invites/:token/accept", () => {
  it("404s for an unknown token", async () => {
    prisma.invite.findUnique.mockResolvedValue(null);

    const res = await request(buildApp())
      .post("/api/workspaces/invites/some-token/accept")
      .set("Cookie", accessCookie("u1"));

    expect(res.status).toBe(404);
  });

  it("400s for an invite that's already been used", async () => {
    prisma.invite.findUnique.mockResolvedValue({
      id: "inv1",
      acceptedAt: new Date(),
      workspaceId: "ws1",
      role: "MEMBER",
    });

    const res = await request(buildApp())
      .post("/api/workspaces/invites/used/accept")
      .set("Cookie", accessCookie("u1"));

    expect(res.status).toBe(400);
  });

  it("creates the membership and marks the invite accepted on first use", async () => {
    prisma.invite.findUnique.mockResolvedValue({
      id: "inv1",
      acceptedAt: null,
      workspaceId: "ws1",
      role: "MEMBER",
    });
    // requireAuth passes; the handler then checks for an existing membership.
    prisma.membership.findUnique.mockResolvedValue(null);
    prisma.membership.create.mockResolvedValue({ id: "m_new", userId: "u1", role: "MEMBER" });
    prisma.invite.update.mockResolvedValue({});

    const res = await request(buildApp())
      .post("/api/workspaces/invites/fresh/accept")
      .set("Cookie", accessCookie("u1"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ workspaceId: "ws1", alreadyMember: false });
    expect(prisma.membership.create).toHaveBeenCalled();
    expect(prisma.invite.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { acceptedAt: expect.any(Date) },
    }));
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "invite.accept" }));
  });

  it("flags alreadyMember=true and skips the create when the user is already in", async () => {
    prisma.invite.findUnique.mockResolvedValue({
      id: "inv1",
      acceptedAt: null,
      workspaceId: "ws1",
      role: "MEMBER",
    });
    prisma.membership.findUnique.mockResolvedValue({ id: "m_existing", role: "MEMBER" });
    prisma.invite.update.mockResolvedValue({});

    const res = await request(buildApp())
      .post("/api/workspaces/invites/fresh/accept")
      .set("Cookie", accessCookie("u1"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ workspaceId: "ws1", alreadyMember: true });
    expect(prisma.membership.create).not.toHaveBeenCalled();
  });
});
