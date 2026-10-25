"use client";

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

interface TaskTableProps {
  tasks: Task[];
  teamOwnerId: string;
  currentUserRole?: Role;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export function TaskTable({
  tasks,
  teamOwnerId,
  currentUserRole,
  onEditTask,
  onDeleteTask,
  onStatusChange,
}: TaskTableProps) {
  const { user: currentUser } = useAuth();

  const canDelete = (task: Task) => {
    if (!currentUser) return false;
    if (currentUserRole === "OWNER" || currentUserRole === "ADMIN") return true;
    if (currentUser.id === teamOwnerId) return true;
    return currentUser.id === task.creatorId;
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
          <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-700 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5">Task Title</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Priority</th>
              <th className="px-6 py-3.5">Assignee</th>
              <th className="px-6 py-3.5">Due Date</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {tasks.map((task) => {
              const statusStyle = STATUS_COLORS[task.status];
              const prioStyle = PRIORITY_COLORS[task.priority];
              const userCanDelete = canDelete(task);

              return (
                <tr
                  key={task.id}
                  className="hover:bg-zinc-50/60 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold text-zinc-900">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <select
                      value={task.status}
                      onChange={(e) =>
                        onStatusChange(task.id, e.target.value as TaskStatus)
                      }
                      className={`text-xs font-semibold rounded-lg px-2.5 py-1 border focus:outline-none ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="DONE">Done</option>
                    </select>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md border ${prioStyle.bg} ${prioStyle.text} ${prioStyle.border}`}
                    >
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {task.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                          {task.assignee.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-zinc-800 text-xs font-medium">
                          {task.assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-400 text-xs italic">
                        Unassigned
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-xs text-zinc-500">
                    {task.dueDate ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        <span>
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-300">-</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 rounded transition-colors"
                        title="Edit task"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      {userCanDelete ? (
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <span
                          className="p-1.5 text-zinc-200 cursor-not-allowed"
                          title="Only creator or Owner/Admin can delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </span>
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
