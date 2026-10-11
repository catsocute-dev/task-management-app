"use client";

import { useState } from "react";
import { Calendar, User, Pencil, Trash2 } from "lucide-react";
import {
  Task,
  TaskStatus,
  STATUS_COLORS,
  PRIORITY_LABEL,
  PRIORITY_COLORS,
} from "@/lib/task-types";
import { useAuth } from "@/components/auth/AuthProvider";

interface TaskKanbanProps {
  tasks: Task[];
  teamOwnerId: string;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "TODO", label: "To Do" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "DONE", label: "Done" },
];

export function TaskKanban({
  tasks,
  teamOwnerId,
  onEditTask,
  onDeleteTask,
  onStatusChange,
}: TaskKanbanProps) {
  const { user: currentUser } = useAuth();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const canDelete = (task: Task) => {
    if (!currentUser) return false;
    return (
      currentUser.id === task.creatorId ||
      currentUser.id === task.assigneeId ||
      currentUser.id === teamOwnerId
    );
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (taskId) {
      onStatusChange(taskId, targetStatus);
    }
    setDraggedTaskId(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.status);
        const colStyle = STATUS_COLORS[col.status];

        return (
          <div
            key={col.status}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.status)}
            className="flex flex-col rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 min-h-[480px] transition-colors"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60 mb-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${colStyle.dot}`} />
                <h3 className="text-sm font-bold text-zinc-900">{col.label}</h3>
              </div>
              <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                {columnTasks.length}
              </span>
            </div>

            {/* Task Cards Container */}
            <div className="flex-1 space-y-3 overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
                  Drop tasks here
                </div>
              ) : (
                columnTasks.map((task) => {
                  const priorityStyle = PRIORITY_COLORS[task.priority];

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="group cursor-grab active:cursor-grabbing rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs hover:shadow-sm hover:border-indigo-300 transition-all space-y-3"
                    >
                      {/* Priority & Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
                        >
                          {PRIORITY_LABEL[task.priority]}
                        </span>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => onEditTask(task)}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-indigo-600 transition-colors"
                            title="Edit task"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {canDelete(task) && (
                            <button
                              type="button"
                              onClick={() => onDeleteTask(task)}
                              className="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Delete task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900 leading-snug line-clamp-2">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="mt-1 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Assignee & Due Date */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-100 text-[11px] text-zinc-500">
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="font-medium text-zinc-700 truncate max-w-[120px]">
                            {task.assignee ? task.assignee.name : "Unassigned"}
                          </span>
                        </div>

                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-zinc-500">
                            <Calendar className="h-3 w-3 text-zinc-400" />
                            <span>
                              {new Date(task.dueDate).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quick Move Status Pills */}
                      <div className="flex items-center justify-between pt-1 border-t border-dashed border-zinc-100 text-[10px]">
                        <span className="text-zinc-400">Move to:</span>
                        <div className="flex gap-1">
                          {col.status !== "TODO" && (
                            <button
                              type="button"
                              onClick={() => onStatusChange(task.id, "TODO")}
                              className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                            >
                              To Do
                            </button>
                          )}
                          {col.status !== "IN_PROGRESS" && (
                            <button
                              type="button"
                              onClick={() =>
                                onStatusChange(task.id, "IN_PROGRESS")
                              }
                              className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600 hover:bg-blue-100 hover:text-blue-900"
                            >
                              In Prog
                            </button>
                          )}
                          {col.status !== "DONE" && (
                            <button
                              type="button"
                              onClick={() => onStatusChange(task.id, "DONE")}
                              className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-900"
                            >
                              Done
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
