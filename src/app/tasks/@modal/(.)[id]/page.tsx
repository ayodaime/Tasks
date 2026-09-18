"use client";

import { useParams, useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import TaskDetailContent from "@/components/TaskDetailContent";

export default function TaskDetailModal() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <Modal>
      <TaskDetailContent taskId={params.id} onDeleted={() => router.push("/tasks")} />
    </Modal>
  );
}
