import { z } from "zod";

export const registerSchema = z.object({
  name:     z.string().min(1).max(100),
  email:    z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const workspaceSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const goalSchema = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  ownerId:     z.string().optional(),
  dueDate:     z.string().datetime().optional(),
  status:      z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]).optional(),
});

export const actionItemSchema = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  assigneeId:  z.string().optional(),
  priority:    z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status:      z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  dueDate:     z.string().datetime().optional(),
  goalId:      z.string().optional(),
});
