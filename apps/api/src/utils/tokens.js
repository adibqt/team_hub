import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const signAccess  = (u) => jwt.sign({ sub: u.id }, env.JWT_ACCESS_SECRET,  { expiresIn: "15m" });
export const signRefresh = (u) => jwt.sign({ sub: u.id }, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
export const verifyAccess  = (t) => jwt.verify(t, env.JWT_ACCESS_SECRET);
export const verifyRefresh = (t) => jwt.verify(t, env.JWT_REFRESH_SECRET);

export const cookieOpts = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
};
