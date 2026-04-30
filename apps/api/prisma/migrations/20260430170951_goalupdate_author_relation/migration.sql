-- CreateIndex
CREATE INDEX "GoalUpdate_goalId_createdAt_idx" ON "GoalUpdate"("goalId", "createdAt");

-- AddForeignKey
ALTER TABLE "GoalUpdate" ADD CONSTRAINT "GoalUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
