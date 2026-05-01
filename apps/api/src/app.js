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
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/health", (_, res) => res.json({ ok: true }));
app.get("/api/docs.json", (_, res) => res.json(swaggerSpec));
app.use("/api/docs", (req, res, next) => {
  // Swagger UI uses inline assets, so remove CSP only for this route.
  res.removeHeader("Content-Security-Policy");
  next();
});
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", routes);
app.use(errorHandler);

export default app;
