"use client";

import { useState } from "react";
import { Calendar, Pencil, Trash2 } from "lucide-react";
import {
  Task,
  TaskStatus,
  Role,
  STATUS_COLORS,
  PRIORITY_LABEL,
  PRIORITY_COLORS,
} from "@/lib/task-types";
import { useAuth } from "@/components/auth/AuthProvider";

interface TaskKanbanProps {
  tasks: Task[];
  teamOwnerId: string;
  currentUserRole?: Role;
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
  currentUserRole,
  onEditTask,
  onDeleteTask,
  onStatusChange,
}: TaskKanbanProps) {
  const { user: currentUser } = useAuth();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // 3-Tier Permission Check for Delete:
  // - OWNER: Can delete any task
  // - ADMIN: Can delete any task
  // - MEMBER: Can only delete tasks they personally created
  const canDelete = (task: Task) => {
    if (!currentUser) return false;
    if (currentUserRole === "OWNER" || currentUserRole === "ADMIN") return true;
    if (currentUser.id === teamOwnerId) return true;
    return currentUser.id === task.creatorId;
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
        const colTasks = tasks.filter((t) => t.status === col.status);
        const colStyles = STATUS_COLORS[col.status];

        return (
          <div
            key={col.status}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.status)}
            className="flex flex-col rounded-2xl bg-zinc-50/70 border border-zinc-200/80 p-4 min-h-[500px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${colStyles.dot}`} />
                <h3 className="font-bold text-sm text-zinc-900">{col.label}</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-zinc-200 text-zinc-600">
                {colTasks.length}
              </span>
            </div>

            {/* Task Card Stack */}
            <div className="space-y-3 flex-1">
              {colTasks.length === 0 ? (
                <div className="h-32 flex items-center justify-center rounded-xl border border-dashed border-zinc-200 text-xs text-zinc-400">
                  Drop tasks here
                </div>
              ) : (
                colTasks.map((task) => {
                  const prioStyle = PRIORITY_COLORS[task.priority];
                  const isDraggable = true;
                  const userCanDelete = canDelete(task);

                  return (
                    <div
                      key={task.id}
                      draggable={isDraggable}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="group relative rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing hover:border-zinc-300"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md border ${prioStyle.bg} ${prioStyle.text} ${prioStyle.border}`}
                        >
                          {PRIORITY_LABEL[task.priority]}
                        </span>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => onEditTask(task)}
                            className="p-1 text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 rounded transition-colors"
                            title="Edit task"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {userCanDelete ? (
                            <button
                              type="button"
                              onClick={() => onDeleteTask(task)}
                              className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span
                              className="p-1 text-zinc-200 cursor-not-allowed"
                              title="Only creator or Owner/Admin can delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-zinc-900 leading-snug">
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                        {task.assignee ? (
                          <div
                            className="flex items-center gap-1.5"
                            title={task.assignee.email}
                          >
                            <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                              {task.assignee.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[100px] font-medium text-zinc-700">
                              {task.assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-[11px] italic">
                            Unassigned
                          </span>
                        )}

                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(task.dueDate).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        )}
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
