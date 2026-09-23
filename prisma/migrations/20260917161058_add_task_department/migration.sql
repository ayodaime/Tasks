-- AlterTable
ALTER TABLE "Task" ADD COLUMN "department" TEXT;

-- CreateIndex
CREATE INDEX "Task_department_idx" ON "Task"("department");
