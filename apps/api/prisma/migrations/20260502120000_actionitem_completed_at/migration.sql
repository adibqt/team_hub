-- Add completedAt to ActionItem so analytics can aggregate by completion
-- timestamp instead of (incorrectly) by createdAt.
ALTER TABLE "ActionItem" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill: any item already in DONE gets stamped with createdAt as a
-- best-effort completion time (we have no better signal for historical
-- rows). New transitions stamp the real moment.
UPDATE "ActionItem" SET "completedAt" = "createdAt" WHERE "status" = 'DONE';

CREATE INDEX "ActionItem_workspaceId_completedAt_idx" ON "ActionItem"("workspaceId", "completedAt");
