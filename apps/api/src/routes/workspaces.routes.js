import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import crypto from "crypto";

const r = Router();

r.post("/", requireAuth, async (req, res, next) => {
  try {
    const { name, description, accentColor } = req.body;
    const workspace = await prisma.workspace.create({
      data: {
        name, description, accentColor,
        members: { create: { userId: req.userId, role: "ADMIN" } },
      },
      include: { members: true },
    });
    res.status(201).json(workspace);
  } catch (e) { next(e); }
});

r.get("/", requireAuth, async (req, res, next) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.userId },
      include: { workspace: true },
    });
    res.json(memberships.map((m) => ({ ...m.workspace, role: m.role })));
  } catch (e) { next(e); }
});

r.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: { members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } } },
    });
    if (!workspace) return res.status(404).json({ error: "Not found" });
    res.json(workspace);
  } catch (e) { next(e); }
});

r.post("/:id/invites", requireAuth, async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const token = crypto.randomUUID();
    const invite = await prisma.invite.create({
      data: { email, workspaceId: req.params.id, role, token },
    });
    res.status(201).json({ ...invite, inviteUrl: `${process.env.CLIENT_URL}/invite/${token}` });
  } catch (e) { next(e); }
});

r.post("/invites/:token/accept", requireAuth, async (req, res, next) => {
  try {
    const invite = await prisma.invite.findUnique({ where: { token: req.params.token } });
    if (!invite || invite.acceptedAt) return res.status(400).json({ error: "Invalid or used invite" });
    const membership = await prisma.membership.create({
      data: { userId: req.userId, workspaceId: invite.workspaceId, role: invite.role },
    });
    await prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    res.json(membership);
  } catch (e) { next(e); }
});

export default r;
