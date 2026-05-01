import bcrypt from "bcryptjs";
import { prisma } from "../src/config/prisma.js";

async function main() {
  const hash = await bcrypt.hash("Demo1234!", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@fredocloud.dev" },
    update: {},
    create: { email: "demo@fredocloud.dev", password: hash, name: "Demo User" },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: "Demo Workspace",
      description: "A demo workspace for graders",
      members: { create: { userId: user.id, role: "ADMIN" } },
    },
  });

  const goal1 = await prisma.goal.create({
    data: {
      workspaceId: workspace.id,
      ownerId: user.id,
      title: "Launch MVP",
      status: "IN_PROGRESS",
      milestones: {
        create: [
          { title: "Backend API", progress: 80 },
          { title: "Frontend UI", progress: 60 },
        ],
      },
    },
  });

  const goal2 = await prisma.goal.create({
    data: {
      workspaceId: workspace.id,
      ownerId: user.id,
      title: "Write Documentation",
      status: "NOT_STARTED",
    },
  });

  await prisma.actionItem.createMany({
    data: [
      { workspaceId: workspace.id, goalId: goal1.id, title: "Set up Railway deployment", status: "DONE", priority: "HIGH" },
      { workspaceId: workspace.id, goalId: goal1.id, title: "Configure Cloudinary uploads", status: "IN_PROGRESS", priority: "MEDIUM" },
      { workspaceId: workspace.id, goalId: goal2.id, title: "Write README", status: "TODO", priority: "LOW" },
    ],
  });

  console.log("Seed complete. Login: demo@fredocloud.dev / Demo1234!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
