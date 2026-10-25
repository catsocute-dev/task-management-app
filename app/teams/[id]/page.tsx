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
  ShieldCheck,
  Settings,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Clock,
} from "lucide-react";
import {
  Team,
  Task,
  TaskStatus,
  Role,
  ROLE_LABELS,
  ROLE_COLORS,
} from "@/lib/task-types";
import { useAuth } from "@/components/auth/AuthProvider";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskModal } from "@/components/tasks/TaskModal";
import { TeamMembersTab } from "@/components/teams/TeamMembersTab";
import { EditTeamModal } from "@/components/teams/EditTeamModal";
import { TeamChatPanel } from "@/components/chat/TeamChatPanel";
import { TeamActivityTab } from "@/components/teams/TeamActivityTab";
import { usePusherChannel } from "@/lib/pusher-client";

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

  // Tab state: "tasks" | "chat" | "members" | "activity"
  const [activeTab, setActiveTab] = useState<
    "tasks" | "chat" | "members" | "activity"
  >("tasks");

  // View state for tasks: "kanban" | "table"
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

  // Determine current user's role in this team
  const isOwner = currentUser?.id === team?.ownerId;
  const currentMember = team?.members.find((m) => m.userId === currentUser?.id);
  const myRole: Role = isOwner ? "OWNER" : currentMember?.role || "MEMBER";
  const canEditTeamSettings = isOwner || myRole === "ADMIN";

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

  // Real-time synchronization of task board across all online members
  usePusherChannel(`team-${teamId}-tasks`, {
    "task-created": (createdTask: Task) => {
      setTeam((prev) => {
        if (!prev) return prev;
        const currentTasks = prev.tasks || [];
        if (currentTasks.some((t) => t.id === createdTask.id)) return prev;
        return {
          ...prev,
          tasks: [createdTask, ...currentTasks],
        };
      });
    },
    "task-updated": (updatedTask: Task) => {
      setTeam((prev) => {
        if (!prev) return prev;
        const currentTasks = prev.tasks || [];
        return {
          ...prev,
          tasks: currentTasks.map((t) =>
            t.id === updatedTask.id ? updatedTask : t,
          ),
        };
      });
    },
    "task-deleted": (data: { id: string }) => {
      setTeam((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: (prev.tasks || []).filter((t) => t.id !== data.id),
        };
      });
    },
  });

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

  // Optimistic status change
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
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
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc =
          task.description?.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesDesc) return false;
      }

      if (statusFilter !== "ALL" && task.status !== statusFilter) {
        return false;
      }

      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) {
        return false;
      }

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

        <div className="flex items-center gap-2">
          {canEditTeamSettings && (
            <button
              type="button"
              onClick={() => setIsEditTeamModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-2xs transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-zinc-500" />
              <span>Edit Team</span>
            </button>
          )}

          {isOwner && (
            <button
              type="button"
              onClick={handleDeleteTeam}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 shadow-2xs transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
              <span>Delete Team</span>
            </button>
          )}
        </div>
      </div>

      {/* Team Header Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
                {team.name}
              </h1>

              {/* Current User Active Role Badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${ROLE_COLORS[myRole].badge}`}
                title={`Your active role: ${ROLE_LABELS[myRole]}`}
              >
                {myRole === "OWNER" ? (
                  <Shield className="h-3 w-3" />
                ) : myRole === "ADMIN" ? (
                  <ShieldCheck className="h-3 w-3" />
                ) : (
                  <Users className="h-3 w-3" />
                )}
                <span>Your Role: {ROLE_LABELS[myRole]}</span>
              </span>
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
        <div className="mt-6 flex border-b border-zinc-100 gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "tasks"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span>Tasks</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
              {team.tasks?.length ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "chat"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Live Chat</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Realtime
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "members"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Members & Roles</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
              {team.members.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "activity"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Activity Log</span>
          </button>
        </div>
      </div>

      {/* Tab Content: Tasks */}
      {activeTab === "tasks" && (
        <div className="space-y-6">
          {/* Controls: Search, Filters, View Toggle, Create Task */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks by title or description..."
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs sm:text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 focus:border-indigo-600 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 focus:border-indigo-600 focus:outline-none"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>

              {/* Assignee Filter */}
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 focus:border-indigo-600 focus:outline-none"
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

            <div className="flex items-center gap-3 self-end lg:self-auto">
              {/* View Toggle */}
              <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("kanban")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    viewMode === "kanban"
                      ? "bg-zinc-100 text-zinc-900 shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  <Kanban className="h-3.5 w-3.5" />
                  <span>Kanban</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    viewMode === "table"
                      ? "bg-zinc-100 text-zinc-900 shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Table</span>
                </button>
              </div>

              {/* Create Task Button */}
              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>New Task</span>
              </button>
            </div>
          </div>

          {/* Kanban / Table Display */}
          {viewMode === "kanban" ? (
            <TaskKanban
              tasks={paginatedTasks}
              teamOwnerId={team.ownerId}
              currentUserRole={myRole}
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
              currentUserRole={myRole}
              onEditTask={(task) => {
                setEditingTask(task);
                setIsTaskModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onStatusChange={handleStatusChange}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
              <span className="text-xs text-zinc-500">
                Showing {paginatedTasks.length} of {filteredTasks.length} tasks
                (Page {currentPage} of {totalPages})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Live Chat */}
      {activeTab === "chat" && (
        <TeamChatPanel
          teamId={team.id}
          teamName={team.name}
          members={team.members}
        />
      )}

      {/* Tab Content: Members & Roles */}
      {activeTab === "members" && (
        <TeamMembersTab team={team} onMembersUpdated={fetchTeam} />
      )}

      {/* Tab Content: Activity Log */}
      {activeTab === "activity" && <TeamActivityTab teamId={team.id} />}

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        teamId={team.id}
        members={team.members}
        initialTask={editingTask}
        onSuccess={fetchTeam}
      />

      <EditTeamModal
        isOpen={isEditTeamModalOpen}
        onClose={() => setIsEditTeamModalOpen(false)}
        team={team}
        onSuccess={(updated) => {
          setTeam(updated);
          setIsEditTeamModalOpen(false);
        }}
      />
    </div>
  );
}
