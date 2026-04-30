import { verifyAccess } from "../utils/tokens.js";

export function requireAuth(req, res, next) {
  try {
    const { sub } = verifyAccess(req.cookies.access);
    req.userId = sub;
    next();
  } catch {
    res.status(401).json({ error: "unauthenticated" });
  }
}
