import { Priority, TaskStatus } from "@prisma/client";

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
export const TASK_PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH"];

export function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" && TASK_STATUSES.includes(value as TaskStatus)
  );
}

export function isPriority(value: unknown): value is Priority {
  return (
    typeof value === "string" && TASK_PRIORITIES.includes(value as Priority)
  );
}

export type TaskWriteInput = {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: Date | null;
};

export function parseTaskPayload(
  body: unknown,
  { partial }: { partial: boolean },
): { data: TaskWriteInput } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object." };
  }

  const record = body as Record<string, unknown>;
  const data: TaskWriteInput = { title: "" };

  if (!partial || "title" in record) {
    if (typeof record.title !== "string" || record.title.trim() === "") {
      return { error: "Title is required." };
    }
    data.title = record.title.trim();
  }

  if ("description" in record) {
    if (record.description === null || record.description === "") {
      data.description = null;
    } else if (typeof record.description === "string") {
      data.description = record.description;
    } else {
      return { error: "Description must be a string." };
    }
  }

  if ("status" in record) {
    if (!isTaskStatus(record.status)) {
      return { error: "Status must be TODO, IN_PROGRESS, or DONE." };
    }
    data.status = record.status;
  }

  if ("priority" in record) {
    if (!isPriority(record.priority)) {
      return { error: "Priority must be LOW, MEDIUM, or HIGH." };
    }
    data.priority = record.priority;
  }

  if ("dueDate" in record) {
    if (record.dueDate === null || record.dueDate === "") {
      data.dueDate = null;
    } else if (typeof record.dueDate === "string") {
      const parsed = new Date(record.dueDate);
      if (Number.isNaN(parsed.getTime())) {
        return { error: "dueDate must be a valid date." };
      }
      data.dueDate = parsed;
    } else {
      return { error: "dueDate must be a string or null." };
    }
  }

  if (partial && !("title" in record)) {
    const rest = { ...data };
    delete (rest as { title?: string }).title;
    return { data: rest as TaskWriteInput };
  }

  return { data };
}
