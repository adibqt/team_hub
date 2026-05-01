import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__teamHubPrisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__teamHubPrisma = prisma;
}

let shutdownHookRegistered = false;
function registerShutdownHooks() {
  if (shutdownHookRegistered) return;
  shutdownHookRegistered = true;

  const shutdown = async () => {
    try {
      await prisma.$disconnect();
    } finally {
      process.exit(0);
    }
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

registerShutdownHooks();
