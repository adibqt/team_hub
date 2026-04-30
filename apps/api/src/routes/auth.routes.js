import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { signAccess, signRefresh, verifyRefresh, cookieOpts } from "../utils/tokens.js";

const r = Router();

r.post("/register", async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hash, name } });
    const access = signAccess(user), refresh = signRefresh(user);
    res
      .cookie("access",  access,  { ...cookieOpts, maxAge: 15 * 60 * 1000 })
      .cookie("refresh", refresh, { ...cookieOpts, maxAge: 7 * 24 * 3600 * 1000 })
      .json({ id: user.id, email: user.email, name: user.name });
  } catch (e) { next(e); }
});

r.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: "Invalid credentials" });
    const access = signAccess(user), refresh = signRefresh(user);
    res
      .cookie("access",  access,  { ...cookieOpts, maxAge: 15 * 60 * 1000 })
      .cookie("refresh", refresh, { ...cookieOpts, maxAge: 7 * 24 * 3600 * 1000 })
      .json({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl });
  } catch (e) { next(e); }
});

r.post("/refresh", (req, res, next) => {
  try {
    const { sub } = verifyRefresh(req.cookies.refresh);
    const access = signAccess({ id: sub });
    res.cookie("access", access, { ...cookieOpts, maxAge: 15 * 60 * 1000 }).json({ ok: true });
  } catch (e) { next(e); }
});

r.post("/logout", (_, res) =>
  res.clearCookie("access", cookieOpts).clearCookie("refresh", cookieOpts).json({ ok: true })
);

export default r;
