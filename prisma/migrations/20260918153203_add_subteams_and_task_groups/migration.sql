-- CreateTable
CREATE TABLE "UserSubteam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    CONSTRAINT "UserSubteam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    CONSTRAINT "TaskGroup_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Preserve existing single-department tasks as a one-row TaskGroup each.
-- Tasks whose department was "DIGITAL_MARKETING" are skipped: department
-- alone can't tell us which of the 4 new sub-teams they belonged to, so
-- they become unclassified (admin-only) until an admin re-tags them.
INSERT INTO "TaskGroup" ("id", "taskId", "group")
SELECT lower(hex(randomblob(16))), "id", "department"
FROM "Task"
WHERE "department" IS NOT NULL AND "department" != 'DIGITAL_MARKETING';

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "assigneeId" TEXT,
    "managerId" TEXT,
    CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("assigneeId", "createdAt", "createdById", "description", "dueDate", "id", "managerId", "priority", "status", "title", "updatedAt") SELECT "assigneeId", "createdAt", "createdById", "description", "dueDate", "id", "managerId", "priority", "status", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");
CREATE INDEX "Task_managerId_idx" ON "Task"("managerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "UserSubteam_userId_team_key" ON "UserSubteam"("userId", "team");

-- CreateIndex
CREATE INDEX "TaskGroup_group_idx" ON "TaskGroup"("group");

-- CreateIndex
CREATE UNIQUE INDEX "TaskGroup_taskId_group_key" ON "TaskGroup"("taskId", "group");
