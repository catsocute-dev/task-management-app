"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  type Task,
} from "@/lib/task-types";

const emptyForm = {
  title: "",
  description: "",
  status: "TODO" as Task["status"],
  priority: "MEDIUM" as Task["priority"],
  dueDate: "",
};

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"ALL" | Task["status"]>("ALL");
  const [form, setForm] = useState(emptyForm);
  const [titleError, setTitleError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadTasks() {
    const response = await fetch("/api/tasks");
    if (!response.ok) {
      setMessage("Could not load tasks.");
      return;
    }
    const data = (await response.json()) as Task[];
    setTasks(data);
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/tasks")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load tasks.");
        }
        return response.json() as Promise<Task[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setTasks(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessage("Could not load tasks.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function startEdit(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
    });
    setTitleError("");
    setMessage(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setTitleError("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.title.trim() === "") {
      setTitleError("Title is required.");
      return;
    }
    setTitleError("");
    setSaving(true);
    setMessage(null);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() === "" ? null : form.description,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate === "" ? null : form.dueDate,
    };

    const url = editingId ? `/api/tasks/${editingId}` : "/api/tasks";
    const method = editingId ? "PUT" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setMessage(errorBody?.error ?? "Could not save the task.");
      return;
    }

    resetForm();
    await loadTasks();
  }

  async function onDelete(id: string) {
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) {
      return;
    }
    const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage("Could not delete the task.");
      return;
    }
    if (editingId === id) {
      resetForm();
    }
    await loadTasks();
  }

  const visibleTasks =
    filter === "ALL" ? tasks : tasks.filter((task) => task.status === filter);

  return (
    <section className="space-y-8">
      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
        noValidate
      >
        <h2 className="text-lg font-semibold text-zinc-900">
          {editingId ? "Edit task" : "Create task"}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Title</span>
            <input
              value={form.title}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }));
                if (titleError && event.target.value.trim() !== "") {
                  setTitleError("");
                }
              }}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              placeholder="Write a short task title"
            />
            {titleError ? (
              <span className="text-sm text-red-600">{titleError}</span>
            ) : null}
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-sm font-medium text-zinc-700">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={3}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              placeholder="Optional details"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as Task["status"],
                }))
              }
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">Priority</span>
            <select
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value as Task["priority"],
                }))
              }
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">Due date</span>
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  dueDate: event.target.value,
                }))
              }
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Save changes"
                : "Create task"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
          ) : null}
        </div>
        {message ? (
          <p className="mt-3 text-sm text-red-600">{message}</p>
        ) : null}
      </form>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Tasks</h2>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            Status filter
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as "ALL" | Task["status"])
              }
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            >
              <option value="ALL">All</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </label>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading tasks...</p>
        ) : visibleTasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
            No tasks yet. Create one above.
          </p>
        ) : (
          <ul className="space-y-3">
            {visibleTasks.map((task) => (
              <li
                key={task.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-medium text-zinc-900">{task.title}</h3>
                    {task.description ? (
                      <p className="mt-1 text-sm text-zinc-600">
                        {task.description}
                      </p>
                    ) : null}
                    <p className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                      <span className="rounded-full bg-zinc-100 px-2 py-1">
                        {STATUS_LABEL[task.status]}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-1">
                        {PRIORITY_LABEL[task.priority]}
                      </span>
                      {task.dueDate ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-1">
                          Due {task.dueDate.slice(0, 10)}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(task)}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(task.id)}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
