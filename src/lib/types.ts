export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

export type TaskSummary = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: UserSummary;
  assignee: UserSummary | null;
  manager: UserSummary | null;
  _count: { comments: number; attachments: number };
};

export type CommentItem = {
  id: string;
  body: string;
  createdAt: string;
  author: UserSummary;
};

export type AttachmentItem = {
  id: string;
  filename: string;
  filepath: string;
  size: number;
  createdAt: string;
  uploadedBy: UserSummary;
};

export type TaskDetail = TaskSummary & {
  comments: CommentItem[];
  attachments: AttachmentItem[];
};
