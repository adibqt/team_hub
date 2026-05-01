// Mock the prisma client before the middleware imports it. Each model method
// is a jest.fn so individual tests can dictate what the DB "returns".
jest.mock("../../config/prisma.js", () => ({
  prisma: {
    membership: { findUnique: jest.fn() },
    goal: { findUnique: jest.fn() },
    milestone: { findUnique: jest.fn() },
  },
}));

import { signAccess } from "../../utils/tokens.js";
import { prisma } from "../../config/prisma.js";
import {
  requireAuth,
  requireMember,
  requireAdmin,
  requireGoalMember,
  requireMilestoneMember,
} from "../auth.js";

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("requireAuth", () => {
  it("attaches req.userId for a valid access token", () => {
    const token = signAccess({ id: "u1" });
    const req = { cookies: { access: token } };
    const res = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(req.userId).toBe("u1");
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 when the cookie is missing", () => {
    const req = { cookies: {} };
    const res = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "unauthenticated" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when the token is bogus", () => {
    const req = { cookies: { access: "not-a-jwt" } };
    const res = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireMember", () => {
  beforeEach(() => prisma.membership.findUnique.mockReset());

  it("400s when no workspace id can be resolved", async () => {
    const req = { params: {}, body: {}, userId: "u1" };
    const res = makeRes();
    const next = jest.fn();

    await requireMember(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "workspaceId required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("403s when the user is not a member", async () => {
    prisma.membership.findUnique.mockResolvedValue(null);
    const req = { params: { id: "ws1" }, body: {}, userId: "u1" };
    const res = makeRes();
    const next = jest.fn();

    await requireMember(req, res, next);

    expect(prisma.membership.findUnique).toHaveBeenCalledWith({
      where: { userId_workspaceId: { userId: "u1", workspaceId: "ws1" } },
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches the membership and calls next when a match exists", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "MEMBER" });
    const req = { params: { id: "ws1" }, body: {}, userId: "u1" };
    const res = makeRes();
    const next = jest.fn();

    await requireMember(req, res, next);

    expect(req.membership).toEqual({ id: "m1", role: "MEMBER" });
    expect(req.workspaceId).toBe("ws1");
    expect(next).toHaveBeenCalledWith();
  });

  it("falls back to req.params.wsId, then req.body.workspaceId", async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "MEMBER" });

    const req1 = { params: { wsId: "ws-from-params" }, body: {}, userId: "u" };
    await requireMember(req1, makeRes(), jest.fn());
    expect(req1.workspaceId).toBe("ws-from-params");

    const req2 = { params: {}, body: { workspaceId: "ws-from-body" }, userId: "u" };
    await requireMember(req2, makeRes(), jest.fn());
    expect(req2.workspaceId).toBe("ws-from-body");
  });

  it("forwards prisma errors to next()", async () => {
    const err = new Error("db down");
    prisma.membership.findUnique.mockRejectedValue(err);
    const next = jest.fn();
    await requireMember({ params: { id: "ws1" }, body: {}, userId: "u1" }, makeRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe("requireAdmin", () => {
  it("403s when membership role is not ADMIN", () => {
    const res = makeRes();
    const next = jest.fn();
    requireAdmin({ membership: { role: "MEMBER" } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() for ADMIN", () => {
    const res = makeRes();
    const next = jest.fn();
    requireAdmin({ membership: { role: "ADMIN" } }, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("403s when no membership is on the request", () => {
    const res = makeRes();
    const next = jest.fn();
    requireAdmin({}, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("requireGoalMember", () => {
  beforeEach(() => {
    prisma.goal.findUnique.mockReset();
    prisma.membership.findUnique.mockReset();
  });

  it("400s when no goal id is in the params", async () => {
    const req = { params: {}, userId: "u1" };
    const res = makeRes();
    await requireGoalMember(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404s when the goal does not exist", async () => {
    prisma.goal.findUnique.mockResolvedValue(null);
    const req = { params: { goalId: "g1" }, userId: "u1" };
    const res = makeRes();
    await requireGoalMember(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("403s when the user isn't a member of the goal's workspace", async () => {
    prisma.goal.findUnique.mockResolvedValue({ id: "g1", workspaceId: "ws1" });
    prisma.membership.findUnique.mockResolvedValue(null);
    const req = { params: { goalId: "g1" }, userId: "u1" };
    const res = makeRes();
    await requireGoalMember(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("attaches goal/workspaceId/membership and calls next on success", async () => {
    const goal = { id: "g1", workspaceId: "ws1" };
    const membership = { id: "m1", role: "ADMIN" };
    prisma.goal.findUnique.mockResolvedValue(goal);
    prisma.membership.findUnique.mockResolvedValue(membership);

    const req = { params: { goalId: "g1" }, userId: "u1" };
    const res = makeRes();
    const next = jest.fn();
    await requireGoalMember(req, res, next);

    expect(req.goal).toBe(goal);
    expect(req.workspaceId).toBe("ws1");
    expect(req.membership).toBe(membership);
    expect(next).toHaveBeenCalledWith();
  });
});

describe("requireMilestoneMember", () => {
  beforeEach(() => {
    prisma.milestone.findUnique.mockReset();
    prisma.membership.findUnique.mockReset();
  });

  it("404s when the milestone is missing", async () => {
    prisma.milestone.findUnique.mockResolvedValue(null);
    const req = { params: { id: "ms1" }, userId: "u1" };
    const res = makeRes();
    await requireMilestoneMember(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("404s when the milestone has no goal relation", async () => {
    prisma.milestone.findUnique.mockResolvedValue({ id: "ms1", goal: null });
    const req = { params: { id: "ms1" }, userId: "u1" };
    const res = makeRes();
    await requireMilestoneMember(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("403s when the user isn't a member of the parent goal's workspace", async () => {
    prisma.milestone.findUnique.mockResolvedValue({
      id: "ms1",
      goal: { id: "g1", workspaceId: "ws1" },
    });
    prisma.membership.findUnique.mockResolvedValue(null);
    const req = { params: { id: "ms1" }, userId: "u1" };
    const res = makeRes();
    await requireMilestoneMember(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("attaches milestone/goal/workspaceId/membership and calls next on success", async () => {
    const goal = { id: "g1", workspaceId: "ws1" };
    const milestone = { id: "ms1", goal };
    prisma.milestone.findUnique.mockResolvedValue(milestone);
    prisma.membership.findUnique.mockResolvedValue({ id: "m1", role: "MEMBER" });

    const req = { params: { id: "ms1" }, userId: "u1" };
    const res = makeRes();
    const next = jest.fn();
    await requireMilestoneMember(req, res, next);

    expect(req.milestone).toBe(milestone);
    expect(req.goal).toBe(goal);
    expect(req.workspaceId).toBe("ws1");
    expect(next).toHaveBeenCalledWith();
  });
});
