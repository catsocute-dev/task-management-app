"use client";

import { useState } from "react";
import { X, CheckSquare, AlertCircle } from "lucide-react";
import { Task, TaskStatus, Priority, TeamMember } from "@/lib/task-types";

interface TaskModalProps {
  isOpen: boolean;
  teamId: string;
  members: TeamMember[];
  initialTask?: Task | null;
  onClose: () => void;
  onSuccess: () => void;
}

function TaskForm({
  teamId,
  members,
  initialTask,
  onClose,
  onSuccess,
}: Omit<TaskModalProps, "isOpen">) {
  const [title, setTitle] = useState(initialTask?.title || "");
  const [description, setDescription] = useState(
    initialTask?.description || "",
  );
  const [status, setStatus] = useState<TaskStatus>(
    initialTask?.status || "TODO",
  );
  const [priority, setPriority] = useState<Priority>(
    initialTask?.priority || "MEDIUM",
  );
  const [dueDate, setDueDate] = useState(
    initialTask?.dueDate
      ? new Date(initialTask.dueDate).toISOString().split("T")[0]
      : "",
  );
  const [assigneeId, setAssigneeId] = useState(initialTask?.assigneeId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      title,
      description: description.trim() === "" ? null : description,
      status,
      priority,
      dueDate: dueDate.trim() === "" ? null : new Date(dueDate).toISOString(),
      assigneeId: assigneeId.trim() === "" ? null : assigneeId,
    };

    try {
      let res: Response;
      if (initialTask) {
        res = await fetch(`/api/tasks/${initialTask.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/teams/${teamId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save task.");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-zinc-200">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <CheckSquare className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">
            {initialTask ? "Edit Task" : "Create New Task"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="task-title"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
          >
            Task Title *
          </label>
          <input
            id="task-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement user registration flow"
            className="mt-1.5 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <div>
          <label
            htmlFor="task-description"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
          >
            Description (optional)
          </label>
          <textarea
            id="task-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details or acceptance criteria..."
            className="mt-1.5 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="task-status"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
            >
              Status
            </label>
            <select
              id="task-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="mt-1.5 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="task-priority"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
            >
              Priority
            </label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="mt-1.5 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="task-assignee"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
            >
              Assignee
            </label>
            <select
              id="task-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name} ({m.user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="task-due-date"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
            >
              Due Date
            </label>
            <input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors shadow-sm"
          >
            {loading
              ? "Saving..."
              : initialTask
                ? "Update Task"
                : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function TaskModal({
  isOpen,
  teamId,
  members,
  initialTask,
  onClose,
  onSuccess,
}: TaskModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <TaskForm
        key={initialTask?.id || "create-new-task"}
        teamId={teamId}
        members={members}
        initialTask={initialTask}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
}
