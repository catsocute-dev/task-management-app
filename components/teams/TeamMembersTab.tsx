"use client";

import { useState } from "react";
import {
  UserPlus,
  Trash2,
  Shield,
  User,
  AlertCircle,
  CheckCircle2,
  Info,
  ShieldCheck,
} from "lucide-react";
import {
  Team,
  TeamMember,
  Role,
  ROLE_LABELS,
  ROLE_COLORS,
} from "@/lib/task-types";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  canManageMembers,
  canChangeMemberRole,
  canRemoveMember,
} from "@/lib/permissions";

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
  const [selectedRole, setSelectedRole] = useState<Role>("MEMBER");
  const [loading, setLoading] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Determine current user's role in this team
  const isOwner = currentUser?.id === team.ownerId;
  const currentMember = team.members.find((m) => m.userId === currentUser?.id);
  const myRole: Role = isOwner ? "OWNER" : currentMember?.role || "MEMBER";

  const canManage = canManageMembers(myRole);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/teams/${team.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: selectedRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add member.");
      }

      setSuccess(
        `Added "${data.user.name}" (${data.user.email}) as ${data.role}.`,
      );
      setEmail("");
      setSelectedRole("MEMBER");
      onMembersUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (member: TeamMember, newRole: Role) => {
    setError(null);
    setSuccess(null);
    setUpdatingRoleId(member.id);

    try {
      const res = await fetch(
        `/api/teams/${team.id}/members/${member.userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update member role.");
      }

      setSuccess(`Updated ${member.user.name}'s role to ${newRole}.`);
      onMembersUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change role.");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    const isSelf = member.userId === currentUser?.id;
    const confirmMsg = isSelf
      ? "Are you sure you want to leave this team?"
      : `Are you sure you want to remove "${member.user.name}" from this team?`;

    if (!confirm(confirmMsg)) return;

    setError(null);
    setSuccess(null);
    setRemoveLoadingId(member.id);

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

      setSuccess(
        isSelf
          ? "You have left the team."
          : `Removed ${member.user.name} from the team.`,
      );
      onMembersUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setRemoveLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 3-Tier Role Permissions Legend */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-white p-4 text-xs text-zinc-700 shadow-xs">
        <div className="flex items-center gap-2 mb-2 font-bold text-indigo-950">
          <Info className="h-4 w-4 text-indigo-600" />
          <span>3-Tier Role Permission System</span>
          <span className="ml-auto font-medium text-[11px] bg-white border border-indigo-200 px-2 py-0.5 rounded-full text-indigo-700">
            Your Role:{" "}
            <strong className="font-bold">{ROLE_LABELS[myRole]}</strong>
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-zinc-600">
          <div className="bg-white/80 p-2.5 rounded-lg border border-purple-100">
            <span className="inline-block px-1.5 py-0.5 rounded font-bold text-[10px] bg-purple-100 text-purple-800 mb-1">
              OWNER
            </span>
            <p className="text-[11px] leading-relaxed">
              Full team control: manage members & roles, delete team, delete any
              task, update team settings.
            </p>
          </div>
          <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100">
            <span className="inline-block px-1.5 py-0.5 rounded font-bold text-[10px] bg-blue-100 text-blue-800 mb-1">
              ADMIN
            </span>
            <p className="text-[11px] leading-relaxed">
              Manage members and all tasks (create, edit, delete any task).
              Cannot delete team or remove Owner.
            </p>
          </div>
          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-100">
            <span className="inline-block px-1.5 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700 mb-1">
              MEMBER
            </span>
            <p className="text-[11px] leading-relaxed">
              Create tasks, manage own created tasks, move assigned tasks, view
              all tasks and live chat.
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Add Member Form (Owners & Admins only) */}
      {canManage && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-900 mb-1 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-indigo-600" />
            <span>Invite Team Member</span>
          </h3>
          <p className="text-xs text-zinc-500 mb-4">
            Add a registered user to this team by their registered email
            address.
          </p>

          <form
            onSubmit={handleAddMember}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              className="flex-1 rounded-lg border border-zinc-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />

            {/* Owner can choose role between ADMIN and MEMBER */}
            {isOwner && (
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm bg-white font-medium text-zinc-700 focus:border-indigo-600 focus:outline-none"
              >
                <option value="MEMBER">Role: Member</option>
                <option value="ADMIN">Role: Admin</option>
              </select>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Add Member</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Member Roster List */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/70 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              Team Roster ({team.members.length}{" "}
              {team.members.length === 1 ? "member" : "members"})
            </h3>
            <p className="text-xs text-zinc-500">
              Manage team members, roles, and collaboration permissions.
            </p>
          </div>
        </div>

        <div className="divide-y divide-zinc-200">
          {team.members.map((member) => {
            const isThisMemberOwner =
              member.userId === team.ownerId || member.role === "OWNER";
            const isMe = member.userId === currentUser?.id;
            const canChangeThisRole = canChangeMemberRole(
              myRole,
              member.role,
              "ADMIN",
            );
            const canRemoveThis = canRemoveMember(myRole, member.role, isMe);

            return (
              <div
                key={member.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-xs">
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900">
                        {member.user.name}
                      </span>
                      {isMe && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 border border-zinc-200">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {member.user.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {/* Role Selector or Badge */}
                  {isThisMemberOwner ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                      <Shield className="h-3 w-3" />
                      <span>Owner</span>
                    </span>
                  ) : canChangeThisRole ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={member.role}
                        disabled={updatingRoleId === member.id}
                        onChange={(e) =>
                          handleChangeRole(member, e.target.value as Role)
                        }
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          ROLE_COLORS[member.role].badge
                        }`}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      {updatingRoleId === member.id && (
                        <div className="h-3 w-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        ROLE_COLORS[member.role].badge
                      }`}
                    >
                      {member.role === "ADMIN" ? (
                        <ShieldCheck className="h-3 w-3" />
                      ) : (
                        <User className="h-3 w-3" />
                      )}
                      <span>{ROLE_LABELS[member.role]}</span>
                    </span>
                  )}

                  {/* Remove or Leave Button */}
                  {canRemoveThis && (
                    <button
                      type="button"
                      disabled={removeLoadingId === member.id}
                      onClick={() => handleRemoveMember(member)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title={isMe ? "Leave team" : "Remove from team"}
                    >
                      {removeLoadingId === member.id ? (
                        <div className="h-4 w-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
