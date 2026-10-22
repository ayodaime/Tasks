-- CreateTable
CREATE TABLE "DailyNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    CONSTRAINT "DailyNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DailyNote_authorId_createdAt_idx" ON "DailyNote"("authorId", "createdAt");
