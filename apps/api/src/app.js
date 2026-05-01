import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { swaggerSpec } from "./config/swagger.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.js";

const app = express();
app.use(helmet());

const normalizeOrigin = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
};

const allowedOrigins = new Set(
  String(env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((v) => normalizeOrigin(v))
    .filter(Boolean)
);

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // Allow same-origin/non-browser requests (no Origin header).
      if (!origin) return callback(null, true);
      const normalizedOrigin = normalizeOrigin(origin);
      if (allowedOrigins.has(normalizedOrigin)) return callback(null, true);
      const err = new Error("CORS origin not allowed");
      err.status = 403;
      return callback(err);
    },
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/health", (_, res) => res.json({ ok: true }));
app.get("/api/docs.json", (_, res) => res.json(swaggerSpec));
// Swagger UI needs inline scripts/styles; disable CSP on this route only.
app.use("/api/docs", helmet({ contentSecurityPolicy: false }));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", routes);
app.use(errorHandler);

export default app;
