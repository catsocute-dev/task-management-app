export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type Role = "OWNER" | "ADMIN" | "MEMBER";

export type NotificationType =
  "TASK_ASSIGNED" | "TEAM_ADDED" | "ROLE_CHANGED" | "TASK_UPDATED";

export type UserBasic = {
  id: string;
  name: string;
  email: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  teamId: string | null;
  assigneeId: string | null;
  creatorId?: string | null;
  createdAt: string;
  assignee?: UserBasic | null;
  creator?: UserBasic | null;
};

export type TeamMember = {
  id: string;
  teamId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user: UserBasic;
};

export type Message = {
  id: string;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  teamId: string;
  senderId: string;
  createdAt: string;
  sender: UserBasic;
};

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  teamId: string;
  userId: string;
  action: string;
  details?: string | null;
  createdAt: string;
  user: UserBasic;
};

export type Team = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  owner: UserBasic;
  members: TeamMember[];
  tasks?: Task[];
  _count?: {
    members: number;
    tasks: number;
  };
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export const ROLE_COLORS: Record<
  Role,
  { bg: string; text: string; border: string; badge: string }
> = {
  OWNER: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
  },
  ADMIN: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
  },
  MEMBER: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export const STATUS_COLORS: Record<
  TaskStatus,
  { bg: string; text: string; border: string; dot: string }
> = {
  TODO: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  IN_PROGRESS: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  DONE: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
};

export const PRIORITY_COLORS: Record<
  Priority,
  { bg: string; text: string; border: string }
> = {
  LOW: {
    bg: "bg-zinc-100",
    text: "text-zinc-600",
    border: "border-zinc-200",
  },
  MEDIUM: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  HIGH: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
};
