import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prisma } from "../config/prisma.js";
import { signAccess, signRefresh, verifyRefresh, cookieOpts } from "../utils/tokens.js";

const r = Router();

// Conservative caps. Auth endpoints are common targets for credential
// stuffing and brute force; throttle them at the route level.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
    message: "Password must contain a letter and a number",
  });

const registerSchema = z.object({
  email: z.string().email("Invalid email").max(254),
  password: passwordSchema,
  name: z.string().trim().min(1, "Name is required").max(120),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email").max(254),
  password: z.string().min(1, "Password is required").max(200),
});

function firstZodMessage(err) {
  return err.errors?.[0]?.message || "Invalid input";
}

function setAuthCookies(res, access, refresh) {
  res
    .cookie("access",  access,  { ...cookieOpts, maxAge: 15 * 60 * 1000 })
    .cookie("refresh", refresh, { ...cookieOpts, maxAge: 7 * 24 * 3600 * 1000 });
}

r.post("/register", registerLimiter, async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: firstZodMessage(parsed.error) });
    }
    const { email, password, name } = parsed.data;
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), password: hash, name: name.trim() },
    });
    setAuthCookies(res, signAccess(user), signRefresh(user));
    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (e) {
    if (e?.code === "P2002") return res.status(409).json({ error: "Email already in use" });
    next(e);
  }
});

r.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: firstZodMessage(parsed.error) });
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: "Invalid credentials" });
    setAuthCookies(res, signAccess(user), signRefresh(user));
    res.json({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl });
  } catch (e) { next(e); }
});

r.post("/refresh", refreshLimiter, async (req, res) => {
  try {
    const token = req.cookies?.refresh;
    if (!token) return res.status(401).json({ error: "unauthenticated" });

    let payload;
    try {
      payload = verifyRefresh(token);
    } catch {
      return res.status(401).json({ error: "unauthenticated" });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || (user.tokenVersion ?? 0) !== (payload.ver ?? 0)) {
      return res.status(401).json({ error: "unauthenticated" });
    }

    // Rotate the refresh token on every use so a stolen token is only
    // valid for a single round-trip after exfiltration.
    setAuthCookies(res, signAccess(user), signRefresh(user));
    res.json({ ok: true });
  } catch {
    return res.status(401).json({ error: "unauthenticated" });
  }
});

r.post("/logout", (_, res) =>
  res.clearCookie("access", cookieOpts).clearCookie("refresh", cookieOpts).json({ ok: true })
);

export default r;
