"use client";

import { useEffect, useState } from "react";
import { ActivityLog } from "@/lib/task-types";
import {
  Clock,
  PlusCircle,
  Edit3,
  Trash2,
  ShieldCheck,
  UserPlus,
  CheckCircle2,
} from "lucide-react";

interface TeamActivityTabProps {
  teamId: string;
}

export function TeamActivityTab({ teamId }: TeamActivityTabProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teams/${teamId}/activity`)
      .then((res) => res.json())
      .then((data) => setActivities(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load activity logs:", err))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-zinc-400">
        Loading activity trail...
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
        <Clock className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
        <h4 className="text-sm font-semibold text-zinc-800">No activity yet</h4>
        <p className="text-xs text-zinc-500 mt-1">
          Actions such as task creation, role promotions, and member invitations
          will be tracked here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-indigo-600" />
        <span>Team Audit Trail & Activity Log</span>
      </h3>

      <div className="space-y-4">
        {activities.map((act) => {
          const dateStr = new Date(act.createdAt).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div key={act.id} className="flex items-start gap-3 text-xs">
              <div className="mt-0.5 p-1.5 rounded-full bg-zinc-100 text-zinc-600 shrink-0">
                {getActivityIcon(act.action)}
              </div>

              <div className="flex-1">
                <p className="text-zinc-800">
                  <span className="font-bold text-zinc-950">
                    {act.user?.name || "System"}
                  </span>{" "}
                  <span className="text-zinc-600 font-normal">
                    {act.details}
                  </span>
                </p>
                <span className="text-[10px] text-zinc-400">{dateStr}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getActivityIcon(action: string) {
  switch (action) {
    case "CREATED_TASK":
      return <PlusCircle className="h-3.5 w-3.5 text-indigo-600" />;
    case "UPDATED_TASK":
      return <Edit3 className="h-3.5 w-3.5 text-blue-600" />;
    case "DELETED_TASK":
      return <Trash2 className="h-3.5 w-3.5 text-rose-600" />;
    case "ROLE_CHANGED":
      return <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />;
    case "ADDED_MEMBER":
      return <UserPlus className="h-3.5 w-3.5 text-emerald-600" />;
    default:
      return <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500" />;
  }
}
