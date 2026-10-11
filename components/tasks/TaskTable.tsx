"use client";

import { Calendar, User, Pencil, Trash2 } from "lucide-react";
import {
  Task,
  TaskStatus,
  STATUS_COLORS,
  PRIORITY_LABEL,
  PRIORITY_COLORS,
} from "@/lib/task-types";
import { useAuth } from "@/components/auth/AuthProvider";

interface TaskTableProps {
  tasks: Task[];
  teamOwnerId: string;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export function TaskTable({
  tasks,
  teamOwnerId,
  onEditTask,
  onDeleteTask,
  onStatusChange,
}: TaskTableProps) {
  const { user: currentUser } = useAuth();

  const canDelete = (task: Task) => {
    if (!currentUser) return false;
    return (
      currentUser.id === task.creatorId ||
      currentUser.id === task.assigneeId ||
      currentUser.id === teamOwnerId
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
        No tasks found matching your filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-600">
          <thead className="border-b border-zinc-200 bg-zinc-50/70 text-xs font-semibold text-zinc-900 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-3">
                Task
              </th>
              <th scope="col" className="px-5 py-3">
                Status
              </th>
              <th scope="col" className="px-5 py-3">
                Priority
              </th>
              <th scope="col" className="px-5 py-3">
                Assignee
              </th>
              <th scope="col" className="px-5 py-3">
                Due Date
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {tasks.map((task) => {
              const statusStyle = STATUS_COLORS[task.status];
              const priorityStyle = PRIORITY_COLORS[task.priority];

              return (
                <tr
                  key={task.id}
                  className="hover:bg-zinc-50/60 transition-colors"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-zinc-900">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap">
                    <select
                      value={task.status}
                      onChange={(e) =>
                        onStatusChange(task.id, e.target.value as TaskStatus)
                      }
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} focus:outline-none`}
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="DONE">Done</option>
                    </select>
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
                    >
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap text-xs">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="font-medium text-zinc-800">
                        {task.assignee ? task.assignee.name : "Unassigned"}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap text-xs text-zinc-500">
                    {task.dueDate ? (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        <span>
                          {new Date(task.dueDate).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="px-5 py-4 text-right whitespace-nowrap text-xs">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-indigo-600 transition-colors"
                        title="Edit task"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {canDelete(task) && (
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task)}
                          className="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
