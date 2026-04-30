import { Router } from "express";
import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import workspacesRoutes from "./workspaces.routes.js";
import goalsRoutes from "./goals.routes.js";
import milestonesRoutes from "./milestones.routes.js";
import announcementsRoutes from "./announcements.routes.js";
import actionItemsRoutes from "./actionItems.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import auditRoutes from "./audit.routes.js";

const r = Router();

r.use("/auth", authRoutes);
r.use("/users", usersRoutes);
r.use("/workspaces", workspacesRoutes);
r.use("/goals", goalsRoutes);
r.use("/milestones", milestonesRoutes);
r.use("/announcements", announcementsRoutes);
r.use("/items", actionItemsRoutes);
r.use("/workspaces", analyticsRoutes);
r.use("/workspaces", auditRoutes);

export default r;
