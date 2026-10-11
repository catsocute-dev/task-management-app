"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Users,
  CheckSquare,
  Shield,
  ArrowRight,
  FolderKanban,
} from "lucide-react";
import { Team } from "@/lib/task-types";
import { useAuth } from "@/components/auth/AuthProvider";
import { CreateTeamModal } from "@/components/teams/CreateTeamModal";

export default function TeamsPage() {
  const { user: currentUser } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/teams");
      if (!res.ok) {
        throw new Error("Failed to load your teams.");
      }
      const data = await res.json();
      setTeams(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/teams")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load your teams.");
        return res.json() as Promise<Team[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setTeams(data);
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
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            Teams Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage your project squads, team members, and shared task workflows
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Team</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl border border-zinc-200 bg-white p-6 animate-pulse"
            />
          ))}
        </div>
      ) : teams.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-zinc-900">
            No teams found
          </h3>
          <p className="mt-1 text-sm text-zinc-500 max-w-sm mx-auto">
            You don&apos;t belong to any teams yet. Create a new team or ask an
            existing team owner to invite you.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Your First Team</span>
            </button>
          </div>
        </div>
      ) : (
        /* Teams Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => {
            const isOwner = currentUser?.id === team.ownerId;

            return (
              <div
                key={team.id}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all"
              >
                <div>
                  {/* Top Bar with Role Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <FolderKanban className="h-5 w-5" />
                    </div>

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

                  {/* Title & Description */}
                  <h3 className="mt-4 text-lg font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors">
                    {team.name}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-2 min-h-[32px]">
                    {team.description || "No description provided."}
                  </p>
                </div>

                {/* Team Metrics & CTA */}
                <div className="mt-6 pt-4 border-t border-zinc-100">
                  <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-zinc-400" />
                      <span>
                        {team._count?.members ?? team.members.length} members
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckSquare className="h-3.5 w-3.5 text-zinc-400" />
                      <span>{team._count?.tasks ?? 0} tasks</span>
                    </div>
                  </div>

                  <Link
                    href={`/teams/${team.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-600 transition-colors"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchTeams}
      />
    </div>
  );
}
