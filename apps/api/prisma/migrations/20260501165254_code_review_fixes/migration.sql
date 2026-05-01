-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_workspaceId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "workspaceName" TEXT,
ALTER COLUMN "workspaceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
