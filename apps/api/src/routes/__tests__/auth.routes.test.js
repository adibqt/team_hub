// Integration tests for /api/auth — Supertest hits a real Express stack but
// the database and password hashing layers are mocked so these stay hermetic.

jest.mock("../../config/prisma.js", () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
  hash: jest.fn(),
  compare: jest.fn(),
}));

import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma.js";
import { verifyAccess, verifyRefresh } from "../../utils/tokens.js";
import { errorHandler } from "../../middleware/error.js";
import authRoutes from "../auth.routes.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", authRoutes);
  app.use(errorHandler);
  return app;
}

// Pulls the access/refresh tokens out of the Set-Cookie header so we can
// assert the server actually issues a valid signed pair.
function parseCookies(setCookie = []) {
  const out = {};
  for (const raw of setCookie) {
    const [pair] = raw.split(";");
    const [k, v] = pair.split("=");
    out[k] = decodeURIComponent(v);
  }
  return out;
}

describe("POST /api/auth/register", () => {
  let app;
  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it("creates the user, hashes the password, and returns access/refresh cookies", async () => {
    bcrypt.hash.mockResolvedValue("hashed-pw");
    prisma.user.create.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      name: "Alice",
      tokenVersion: 0,
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@b.com", password: "Secret123", name: "Alice" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "u1", email: "a@b.com", name: "Alice" });

    expect(bcrypt.hash).toHaveBeenCalledWith("Secret123", 10);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: "a@b.com", password: "hashed-pw", name: "Alice" },
    });

    const cookies = parseCookies(res.headers["set-cookie"]);
    expect(cookies.access).toBeTruthy();
    expect(cookies.refresh).toBeTruthy();
    expect(verifyAccess(cookies.access).sub).toBe("u1");
    expect(verifyRefresh(cookies.refresh).sub).toBe("u1");
  });

  it("returns 400 when the password fails server-side validation", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@b.com", password: "x", name: "Alice" });

    expect(res.status).toBe(400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the email is already taken (Prisma P2002)", async () => {
    bcrypt.hash.mockResolvedValue("hashed-pw");
    const dupErr = Object.assign(new Error("dup"), { code: "P2002" });
    prisma.user.create.mockRejectedValue(dupErr);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@b.com", password: "Secret123", name: "Alice" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "Email already in use" });
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("returns a generic 500 message for unexpected DB failures", async () => {
    bcrypt.hash.mockResolvedValue("hashed-pw");
    prisma.user.create.mockRejectedValue(new Error("connection lost"));

    // Silence the errorHandler's console.error.
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@b.com", password: "Secret123", name: "Alice" });
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

describe("POST /api/auth/login", () => {
  let app;
  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it("returns the user + cookies on a valid email/password", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      password: "hashed-pw",
      name: "Alice",
      avatarUrl: null,
      tokenVersion: 0,
    });
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com", password: "secret123" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: "u1", email: "a@b.com", name: "Alice" });

    const cookies = parseCookies(res.headers["set-cookie"]);
    expect(verifyAccess(cookies.access).sub).toBe("u1");
    expect(verifyRefresh(cookies.refresh).sub).toBe("u1");

    expect(bcrypt.compare).toHaveBeenCalledWith("secret123", "hashed-pw");
  });

  it("returns 401 if no user matches the email (no bcrypt comparison performed)", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@nowhere.io", password: "secret" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid credentials" });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("returns 401 when the password is wrong", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      password: "hashed",
      name: "Alice",
    });
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
});

describe("POST /api/auth/refresh", () => {
  let app;
  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it("issues a rotated access+refresh pair when given a valid refresh cookie", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      name: "Alice",
      tokenVersion: 0,
    });
    const refresh = (await import("../../utils/tokens.js")).signRefresh({
      id: "u1",
      tokenVersion: 0,
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh=${refresh}`]);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const cookies = parseCookies(res.headers["set-cookie"]);
    expect(verifyAccess(cookies.access).sub).toBe("u1");
    expect(verifyRefresh(cookies.refresh).sub).toBe("u1");
  });

  it("returns 401 when the cookie is missing/invalid", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "unauthenticated" });
  });

  it("returns 401 when the user's tokenVersion has been bumped", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      tokenVersion: 5,
    });
    const refresh = (await import("../../utils/tokens.js")).signRefresh({
      id: "u1",
      tokenVersion: 0,
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh=${refresh}`]);

    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears both auth cookies and acks", async () => {
    const app = buildApp();
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // Two Set-Cookie headers, each with Max-Age=0/Expires in the past.
    const cookies = res.headers["set-cookie"].join(";");
    expect(cookies).toMatch(/access=;/);
    expect(cookies).toMatch(/refresh=;/);
  });
});
