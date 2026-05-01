jest.mock("../../config/prisma.js", () => ({
  prisma: { auditLog: { create: jest.fn() } },
}));

import { prisma } from "../../config/prisma.js";
import { logAudit } from "../audit.js";

describe("logAudit", () => {
  beforeEach(() => prisma.auditLog.create.mockReset());

  it("creates an audit row with entity flattened to entityType/entityId", async () => {
    prisma.auditLog.create.mockResolvedValue({ id: "a1" });

    await logAudit({
      workspaceId: "ws1",
      actorId: "u1",
      action: "workspace.update",
      entity: { type: "Workspace", id: "ws1" },
      before: { name: "Old" },
      after: { name: "New" },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws1",
        actorId: "u1",
        action: "workspace.update",
        entityType: "Workspace",
        entityId: "ws1",
        diff: { before: { name: "Old" }, after: { name: "New" } },
      },
    });
  });

  it("stores diff as null when neither before nor after is provided", async () => {
    prisma.auditLog.create.mockResolvedValue({ id: "a2" });

    await logAudit({
      workspaceId: "ws1",
      actorId: "u1",
      action: "workspace.delete",
      entity: { type: "Workspace", id: "ws1" },
    });

    const arg = prisma.auditLog.create.mock.calls[0][0];
    expect(arg.data.diff).toBeNull();
  });

  it("includes diff when only `after` is provided", async () => {
    prisma.auditLog.create.mockResolvedValue({ id: "a3" });

    await logAudit({
      workspaceId: "ws1",
      actorId: "u1",
      action: "workspace.create",
      entity: { type: "Workspace", id: "ws1" },
      after: { name: "Brand new" },
    });

    const arg = prisma.auditLog.create.mock.calls[0][0];
    expect(arg.data.diff).toEqual({ before: undefined, after: { name: "Brand new" } });
  });

  it("propagates prisma errors so callers can wire them into express next()", async () => {
    prisma.auditLog.create.mockRejectedValue(new Error("db down"));
    await expect(
      logAudit({
        workspaceId: "ws1",
        actorId: "u1",
        action: "x",
        entity: { type: "X", id: "1" },
      }),
    ).rejects.toThrow("db down");
  });
});
