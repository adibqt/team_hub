// Tests run in isolation from the real environment — give them a deterministic
// secret pair and a stable NODE_ENV so token signing/verification works.
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.CLIENT_URL = "http://localhost:3000";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test?schema=public";
