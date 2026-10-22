-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'LOG',
    "forDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    CONSTRAINT "DailyNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DailyNote" ("authorId", "body", "createdAt", "id") SELECT "authorId", "body", "createdAt", "id" FROM "DailyNote";
DROP TABLE "DailyNote";
ALTER TABLE "new_DailyNote" RENAME TO "DailyNote";
CREATE INDEX "DailyNote_authorId_createdAt_idx" ON "DailyNote"("authorId", "createdAt");
CREATE INDEX "DailyNote_authorId_forDate_idx" ON "DailyNote"("authorId", "forDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
