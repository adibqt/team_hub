import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../config/cloudinary.js";

const r = Router();

r.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  } catch (e) { next(e); }
});

r.post("/me/avatar", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl: req.file.path },
      select: { id: true, avatarUrl: true },
    });
    res.json(user);
  } catch (e) { next(e); }
});

export default r;
