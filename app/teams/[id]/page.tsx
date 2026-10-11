"use client";

import { use, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  CheckSquare,
  Plus,
  Kanban,
  Table as TableIcon,
  Search,
  Shield,
  Settings,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Team, Task, TaskStatus } from "@/lib/task-types";
import { useAuth } from "@/components/auth/AuthProvider";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskModal } from "@/components/tasks/TaskModal";
import { TeamMembersTab } from "@/components/teams/TeamMembersTab";
import { EditTeamModal } from "@/components/teams/EditTeamModal";

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: teamId } = use(params);
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state: "tasks" | "members"
  const [activeTab, setActiveTab] = useState<"tasks" | "members">("tasks");

  // View state: "kanban" | "table"
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");

  // Pagination for tasks
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);

  const isOwner = currentUser?.id === team?.ownerId;

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("You do not have permission to view this team.");
        }
        if (res.status === 404) {
          throw new Error("Team not found.");
        }
        throw new Error("Failed to load team workspace.");
      }
      const data = await res.json();
      setTeam(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    }
  }, [teamId]);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/teams/${teamId}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("You do not have permission to view this team.");
          }
          if (res.status === 404) {
            throw new Error("Team not found.");
          }
          throw new Error("Failed to load team workspace.");
        }
        return res.json() as Promise<Team>;
      })
      .then((data) => {
        if (!cancelled) {
          setTeam(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "An error occurred.");
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
  }, [teamId]);

  // Delete team (Owner only)
  const handleDeleteTeam = async () => {
    if (!team) return;
    if (
      !confirm(
        `Are you sure you want to delete the team "${team.name}"? All associated tasks and memberships will be deleted permanently.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete team.");
      }
      router.push("/teams");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete team.");
    }
  };

  // Quick status update for Kanban or Table
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!team) return;

    // Optimistic update
    setTeam((prev) => {
      if (!prev || !prev.tasks) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t,
        ),
      };
    });

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update task status.");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating task status.");
      fetchTeam(); // rollback
    }
  };

  // Delete task
  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete task.");
      }
      fetchTeam();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete task.");
    }
  };

  // Filter tasks
  const teamTasks = team?.tasks;
  const filteredTasks = useMemo(() => {
    if (!teamTasks) return [];
    return teamTasks.filter((task) => {
      // Search keyword filter
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc =
          task.description?.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesDesc) return false;
      }

      // Status filter
      if (statusFilter !== "ALL" && task.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) {
        return false;
      }

      // Assignee filter
      if (assigneeFilter === "UNASSIGNED") {
        if (task.assigneeId) return false;
      } else if (assigneeFilter !== "ALL") {
        if (task.assigneeId !== assigneeFilter) return false;
      }

      return true;
    });
  }, [teamTasks, searchQuery, statusFilter, priorityFilter, assigneeFilter]);

  // Paginated tasks
  const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-zinc-200 rounded" />
        <div className="h-32 bg-zinc-200 rounded-2xl" />
        <div className="h-96 bg-zinc-200 rounded-2xl" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-600 mb-2" />
        <h2 className="text-lg font-bold text-rose-900">Workspace Error</h2>
        <p className="mt-1 text-sm text-rose-700">
          {error || "Unable to display team."}
        </p>
        <div className="mt-4">
          <Link
            href="/teams"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Teams Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to All Teams</span>
        </Link>

        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditTeamModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-2xs transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-zinc-500" />
              <span>Edit Team</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteTeam}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 shadow-2xs transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
              <span>Delete Team</span>
            </button>
          </div>
        )}
      </div>

      {/* Team Header Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
                {team.name}
              </h1>
              {isOwner ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200/60">
                  <Shield className="h-3 w-3" />
                  Owner
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                  Member
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-600 max-w-2xl">
              {team.description || "No description provided for this team."}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-500 border-t md:border-t-0 md:border-l border-zinc-100 pt-3 md:pt-0 md:pl-6">
            <div>
              <span className="block font-semibold text-zinc-900 text-base">
                {team.members.length}
              </span>
              <span>Members</span>
            </div>
            <div className="h-8 w-px bg-zinc-200" />
            <div>
              <span className="block font-semibold text-zinc-900 text-base">
                {team.tasks?.length ?? 0}
              </span>
              <span>Tasks</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex border-b border-zinc-100 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "tasks"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span>Tasks ({team.tasks?.length ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "members"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Members ({team.members.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Tasks Content */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Filters, View Switcher & Create Task */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search tasks by title or details..."
                className="w-full rounded-lg border border-zinc-200 py-1.5 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-zinc-200 py-1.5 px-2.5 text-xs text-zinc-700 focus:outline-none focus:border-indigo-600"
              >
                <option value="ALL">All Statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-zinc-200 py-1.5 px-2.5 text-xs text-zinc-700 focus:outline-none focus:border-indigo-600"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>

              <select
                value={assigneeFilter}
                onChange={(e) => {
                  setAssigneeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-zinc-200 py-1.5 px-2.5 text-xs text-zinc-700 focus:outline-none focus:border-indigo-600"
              >
                <option value="ALL">All Assignees</option>
                <option value="UNASSIGNED">Unassigned</option>
                {team.members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Switcher & Create Task Button */}
            <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-100">
              <div className="flex items-center rounded-lg border border-zinc-200 p-0.5 bg-zinc-50">
                <button
                  type="button"
                  onClick={() => setViewMode("kanban")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    viewMode === "kanban"
                      ? "bg-white text-indigo-600 shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                  title="Kanban Board View"
                >
                  <Kanban className="h-3.5 w-3.5" />
                  <span>Kanban</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    viewMode === "table"
                      ? "bg-white text-indigo-600 shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                  title="Table View"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Table</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create Task</span>
              </button>
            </div>
          </div>

          {/* Tasks Display: Kanban or Table */}
          {viewMode === "kanban" ? (
            <TaskKanban
              tasks={paginatedTasks}
              teamOwnerId={team.ownerId}
              onEditTask={(task) => {
                setEditingTask(task);
                setIsTaskModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <TaskTable
              tasks={paginatedTasks}
              teamOwnerId={team.ownerId}
              onEditTask={(task) => {
                setEditingTask(task);
                setIsTaskModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onStatusChange={handleStatusChange}
            />
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-2xs text-xs text-zinc-600">
              <div>
                Showing{" "}
                <span className="font-semibold text-zinc-900">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-zinc-900">
                  {Math.min(currentPage * pageSize, filteredTasks.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-zinc-900">
                  {filteredTasks.length}
                </span>{" "}
                tasks
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
                <span className="px-2 font-semibold text-zinc-800">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Members Content */}
      {activeTab === "members" && (
        <TeamMembersTab team={team} onMembersUpdated={fetchTeam} />
      )}

      {/* Create / Edit Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        teamId={team.id}
        members={team.members}
        initialTask={editingTask}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSuccess={fetchTeam}
      />

      {/* Edit Team Modal */}
      <EditTeamModal
        isOpen={isEditTeamModalOpen}
        team={team}
        onClose={() => setIsEditTeamModalOpen(false)}
        onSuccess={(updated) =>
          setTeam((prev) => (prev ? { ...prev, ...updated } : prev))
        }
      />
    </div>
  );
}
