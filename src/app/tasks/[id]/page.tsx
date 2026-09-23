"use client";

import { useParams, useRouter } from "next/navigation";
import TaskDetailContent from "@/components/TaskDetailContent";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl">
      <TaskDetailContent taskId={params.id} onDeleted={() => router.push("/tasks")} />
    </div>
  );
}
