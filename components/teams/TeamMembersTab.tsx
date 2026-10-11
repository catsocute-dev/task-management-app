"use client";

import { useState } from "react";
import {
  UserPlus,
  Trash2,
  Shield,
  User,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Team, TeamMember } from "@/lib/task-types";
import { useAuth } from "@/components/auth/AuthProvider";

interface TeamMembersTabProps {
  team: Team;
  onMembersUpdated: () => void;
}

export function TeamMembersTab({
  team,
  onMembersUpdated,
}: TeamMembersTabProps) {
  const { user: currentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isOwner = currentUser?.id === team.ownerId;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/teams/${team.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add member.");
      }

      setSuccess(`Added "${data.user.name}" (${data.user.email}) to the team.`);
      setEmail("");
      onMembersUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (
      !confirm(
        `Are you sure you want to remove "${member.user.name}" from this team?`,
      )
    ) {
      return;
    }

    setError(null);
    setSuccess(null);
    setRemoveLoadingId(member.userId);

    try {
      const res = await fetch(
        `/api/teams/${team.id}/members/${member.userId}`,
        {
          method: "DELETE",
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove member.");
      }

      setSuccess(`Removed "${member.user.name}" from the team.`);
      onMembersUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setRemoveLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Member Form (Owner only) */}
      {isOwner && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-zinc-900">Add Team Member</h3>
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            Invite a registered user to join this team by entering their email
            address.
          </p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          <form
            onSubmit={handleAddMember}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{loading ? "Adding..." : "Add Member"}</span>
            </button>
          </form>
        </div>
      )}

      {/* Members List */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-zinc-100 bg-zinc-50/50 px-5 py-3.5">
          <h3 className="text-sm font-bold text-zinc-900">
            Team Members ({team.members.length})
          </h3>
        </div>

        <ul className="divide-y divide-zinc-100">
          {team.members.map((member) => {
            const isMemberOwner =
              member.role === "OWNER" || member.userId === team.ownerId;
            const isSelf = currentUser?.id === member.userId;

            return (
              <li
                key={member.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 font-semibold text-xs border border-zinc-200">
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900">
                        {member.user.name}
                      </span>
                      {isSelf && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {member.user.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isMemberOwner ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 border border-indigo-200/60">
                      <Shield className="h-3 w-3" />
                      Owner
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 border border-zinc-200">
                      <User className="h-3 w-3" />
                      Member
                    </span>
                  )}

                  {/* Remove button for owner, except cannot remove self */}
                  {isOwner && !isMemberOwner && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member)}
                      disabled={removeLoadingId === member.userId}
                      className="rounded p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
