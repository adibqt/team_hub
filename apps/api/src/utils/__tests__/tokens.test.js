import jwt from "jsonwebtoken";
import {
  signAccess,
  signRefresh,
  verifyAccess,
  verifyRefresh,
  cookieOpts,
} from "../tokens.js";

describe("token utilities", () => {
  const user = { id: "user_123" };

  describe("signAccess", () => {
    it("issues a JWT whose subject is the user id", () => {
      const token = signAccess(user);
      const decoded = jwt.decode(token);
      expect(decoded.sub).toBe(user.id);
    });

    it("uses the access secret (verifyAccess accepts it, verifyRefresh rejects it)", () => {
      const token = signAccess(user);
      expect(() => verifyAccess(token)).not.toThrow();
      expect(() => verifyRefresh(token)).toThrow();
    });

    it("expires within ~15 minutes", () => {
      const token = signAccess(user);
      const { exp, iat } = jwt.decode(token);
      // Expect 15m ± a small slack.
      expect(exp - iat).toBe(15 * 60);
    });
  });

  describe("signRefresh", () => {
    it("issues a JWT whose subject is the user id", () => {
      const token = signRefresh(user);
      const decoded = jwt.decode(token);
      expect(decoded.sub).toBe(user.id);
    });

    it("uses the refresh secret (verifyRefresh accepts it, verifyAccess rejects it)", () => {
      const token = signRefresh(user);
      expect(() => verifyRefresh(token)).not.toThrow();
      expect(() => verifyAccess(token)).toThrow();
    });

    it("expires within ~7 days", () => {
      const token = signRefresh(user);
      const { exp, iat } = jwt.decode(token);
      expect(exp - iat).toBe(7 * 24 * 60 * 60);
    });
  });

  describe("verifyAccess / verifyRefresh", () => {
    it("rejects malformed tokens", () => {
      expect(() => verifyAccess("not-a-jwt")).toThrow();
      expect(() => verifyRefresh("not-a-jwt")).toThrow();
    });

    it("rejects tokens signed with the wrong secret", () => {
      const fake = jwt.sign({ sub: "x" }, "some-other-secret");
      expect(() => verifyAccess(fake)).toThrow();
      expect(() => verifyRefresh(fake)).toThrow();
    });
  });

  describe("cookieOpts", () => {
    it("is httpOnly and rooted at /", () => {
      expect(cookieOpts.httpOnly).toBe(true);
      expect(cookieOpts.path).toBe("/");
    });

    it("uses lax / non-secure in non-production (test env)", () => {
      // setup.env.cjs forces NODE_ENV=test
      expect(cookieOpts.secure).toBe(false);
      expect(cookieOpts.sameSite).toBe("lax");
    });
  });
});
