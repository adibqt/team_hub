import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireMember, requireAdmin } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";
import { sendInviteEmail } from "../services/mailer.js";

const r = Router();

/* ─────────────────────────────────────────────
   CREATE / LIST / READ
   ───────────────────────────────────────────── */

r.post("/", requireAuth, async (req, res, next) => {
  try {
    const { name, description, accentColor } = req.body || {};
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Workspace name is required" });
    }
    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        accentColor: accentColor || undefined,
        members: { create: { userId: req.userId, role: "ADMIN" } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });
    await logAudit({
      workspaceId: workspace.id,
      actorId: req.userId,
      action: "workspace.create",
      entity: { type: "Workspace", id: workspace.id },
      after: { name: workspace.name, description: workspace.description, accentColor: workspace.accentColor },
    });
    res.status(201).json(workspace);
  } catch (e) {
    next(e);
  }
});

r.get("/", requireAuth, async (req, res, next) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.userId },
      include: {
        workspace: { include: { _count: { select: { members: true, goals: true } } } },
      },
      orderBy: { joinedAt: "asc" },
    });
    res.json(memberships.map((m) => ({ ...m.workspace, role: m.role })));
  } catch (e) {
    next(e);
  }
});

r.get("/:id", requireAuth, requireMember, async (req, res, next) => {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        },
        _count: { select: { goals: true, actionItems: true, announcements: true } },
      },
    });
    if (!workspace) return res.status(404).json({ error: "Not found" });
    res.json({ ...workspace, viewerRole: req.membership.role });
  } catch (e) {
    next(e);
  }
});

/* ─────────────────────────────────────────────
   UPDATE / DELETE — admin only
   ───────────────────────────────────────────── */

r.patch("/:id", requireAuth, requireMember, requireAdmin, async (req, res, next) => {
  try {
    const before = await prisma.workspace.findUnique({ where: { id: req.params.id } });
    const { name, description, accentColor } = req.body || {};

    const data = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof description === "string") data.description = description.trim() || null;
    if (typeof accentColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
      data.accentColor = accentColor;
    }

    const workspace = await prisma.workspace.update({
      where: { id: req.params.id },
      data,
    });
    await logAudit({
      workspaceId: workspace.id,
      actorId: req.userId,
      action: "workspace.update",
      entity: { type: "Workspace", id: workspace.id },
      before: { name: before.name, description: before.description, accentColor: before.accentColor },
      after: { name: workspace.name, description: workspace.description, accentColor: workspace.accentColor },
    });
    res.json(workspace);
  } catch (e) {
    next(e);
  }
});

r.delete("/:id", requireAuth, requireMember, requireAdmin, async (req, res, next) => {
  try {
    const ws = await prisma.workspace.findUnique({ where: { id: req.params.id } });
    if (!ws) return res.status(404).json({ error: "Not found" });

    // Record the destructive action *before* the cascade. Once deleted,
    // related audit rows will SetNull their workspaceId — we keep
    // `workspaceName` snapshot so historical entries remain attributable.
    await logAudit({
      workspaceId: ws.id,
      workspaceName: ws.name,
      actorId: req.userId,
      action: "workspace.delete",
      entity: { type: "Workspace", id: ws.id },
      before: { name: ws.name, description: ws.description, accentColor: ws.accentColor },
    });
    await prisma.workspace.delete({ where: { id: ws.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ─────────────────────────────────────────────
   MEMBERS — list (member), update role / remove (admin)
   ───────────────────────────────────────────── */

r.get("/:id/members", requireAuth, requireMember, async (req, res, next) => {
  try {
    const members = await prisma.membership.findMany({
      where: { workspaceId: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });
    res.json(members);
  } catch (e) {
    next(e);
  }
});

r.patch("/:id/members/:userId", requireAuth, requireMember, requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.body || {};
    if (!["ADMIN", "MEMBER"].includes(role)) {
      return res.status(400).json({ error: "role must be ADMIN or MEMBER" });
    }
    if (role === "MEMBER" && req.params.userId === req.userId) {
      const adminCount = await prisma.membership.count({
        where: { workspaceId: req.params.id, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return res.status(400).json({ error: "Workspace must keep at least one admin" });
      }
    }
    const membership = await prisma.membership.update({
      where: {
        userId_workspaceId: { userId: req.params.userId, workspaceId: req.params.id },
      },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
    await logAudit({
      workspaceId: req.params.id,
      actorId: req.userId,
      action: "member.role.update",
      entity: { type: "Membership", id: membership.id },
      after: { userId: membership.userId, role: membership.role },
    });
    res.json(membership);
  } catch (e) {
    next(e);
  }
});

r.delete("/:id/members/:userId", requireAuth, requireMember, async (req, res, next) => {
  try {
    const removingSelf = req.params.userId === req.userId;
    if (!removingSelf && req.membership.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin role required" });
    }

    const target = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: { userId: req.params.userId, workspaceId: req.params.id },
      },
    });
    if (!target) return res.status(404).json({ error: "Member not found" });

    if (target.role === "ADMIN") {
      const adminCount = await prisma.membership.count({
        where: { workspaceId: req.params.id, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return res.status(400).json({ error: "Workspace must keep at least one admin" });
      }
    }

    await prisma.membership.delete({ where: { id: target.id } });
    await logAudit({
      workspaceId: req.params.id,
      actorId: req.userId,
      action: removingSelf ? "member.leave" : "member.remove",
      entity: { type: "Membership", id: target.id },
      before: { userId: target.userId, role: target.role },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ─────────────────────────────────────────────
   INVITES — admin only to create / list / revoke
   ───────────────────────────────────────────── */

r.post("/:id/invites", requireAuth, requireMember, requireAdmin, async (req, res, next) => {
  try {
    const { email, role = "MEMBER" } = req.body || {};
    if (!email || typeof email !== "string" || !/.+@.+\..+/.test(email)) {
      return res.status(400).json({ error: "Valid email required" });
    }
    if (!["ADMIN", "MEMBER"].includes(role)) {
      return res.status(400).json({ error: "role must be ADMIN or MEMBER" });
    }

    // If they're already a member, surface that early.
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      const already = await prisma.membership.findUnique({
        where: {
          userId_workspaceId: { userId: existingUser.id, workspaceId: req.params.id },
        },
      });
      if (already) {
        return res.status(409).json({ error: "That person is already a member" });
      }
    }

    const token = crypto.randomUUID();
    const invite = await prisma.invite.create({
      data: {
        email: email.toLowerCase(),
        workspaceId: req.params.id,
        role,
        token,
      },
    });
    await logAudit({
      workspaceId: req.params.id,
      actorId: req.userId,
      action: "invite.create",
      entity: { type: "Invite", id: invite.id },
      after: { email: invite.email, role: invite.role },
    });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const inviteUrl = `${clientUrl}/invite/${token}`;

    // Fire the email in the background — never let SMTP failures block invite creation.
    // The link is always returned so admins can copy/share it manually as a fallback.
    const [inviter, workspace] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.userId },
        select: { name: true, email: true },
      }),
      prisma.workspace.findUnique({
        where: { id: req.params.id },
        select: { name: true, accentColor: true },
      }),
    ]);

    let emailStatus = { sent: false };
    try {
      emailStatus = await sendInviteEmail({
        to: invite.email,
        inviterName: inviter?.name,
        inviterEmail: inviter?.email,
        workspaceName: workspace?.name,
        workspaceAccent: workspace?.accentColor,
        role: invite.role,
        inviteUrl,
      });
    } catch (mailErr) {
      console.error("[invite] mailer threw:", mailErr);
      emailStatus = { sent: false, error: mailErr.message };
    }

    res.status(201).json({
      ...invite,
      inviteUrl,
      emailSent: emailStatus.sent,
      emailSkipped: emailStatus.skipped || null,
    });
  } catch (e) {
    next(e);
  }
});

r.get("/:id/invites", requireAuth, requireMember, requireAdmin, async (req, res, next) => {
  try {
    const invites = await prisma.invite.findMany({
      where: { workspaceId: req.params.id, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    });
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    res.json(invites.map((i) => ({ ...i, inviteUrl: `${clientUrl}/invite/${i.token}` })));
  } catch (e) {
    next(e);
  }
});

r.delete("/:id/invites/:inviteId", requireAuth, requireMember, requireAdmin, async (req, res, next) => {
  try {
    const invite = await prisma.invite.findUnique({ where: { id: req.params.inviteId } });
    if (!invite || invite.workspaceId !== req.params.id) {
      return res.status(404).json({ error: "Invite not found" });
    }
    if (invite.acceptedAt) {
      return res.status(400).json({ error: "Invite already accepted; cannot revoke" });
    }
    await prisma.invite.delete({ where: { id: invite.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ─────────────────────────────────────────────
   INVITE PREVIEW + ACCEPTANCE (token-keyed)
   ───────────────────────────────────────────── */

// Public preview — no auth required so the recipient can see what they're joining
// before signing up / signing in.
r.get("/invites/:token", async (req, res, next) => {
  try {
    const invite = await prisma.invite.findUnique({
      where: { token: req.params.token },
      include: {
        workspace: { select: { id: true, name: true, description: true, accentColor: true } },
      },
    });
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    res.json({
      email: invite.email,
      role: invite.role,
      acceptedAt: invite.acceptedAt,
      workspace: invite.workspace,
    });
  } catch (e) {
    next(e);
  }
});

r.post("/invites/:token/accept", requireAuth, async (req, res, next) => {
  try {
    const invite = await prisma.invite.findUnique({ where: { token: req.params.token } });
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.acceptedAt) return res.status(400).json({ error: "Invite already used" });

    const existing = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: { userId: req.userId, workspaceId: invite.workspaceId },
      },
    });
    if (existing) {
      await prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
      return res.json({ workspaceId: invite.workspaceId, alreadyMember: true });
    }

    const membership = await prisma.membership.create({
      data: {
        userId: req.userId,
        workspaceId: invite.workspaceId,
        role: invite.role,
      },
    });
    await prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    await logAudit({
      workspaceId: invite.workspaceId,
      actorId: req.userId,
      action: "invite.accept",
      entity: { type: "Membership", id: membership.id },
      after: { userId: membership.userId, role: membership.role },
    });
    res.json({ workspaceId: invite.workspaceId, alreadyMember: false });
  } catch (e) {
    next(e);
  }
});

export default r;
