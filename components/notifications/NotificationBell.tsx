"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  ClipboardList,
} from "lucide-react";
import { Notification } from "@/lib/task-types";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePusherChannel } from "@/lib/pusher-client";

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [browserPermission, setBrowserPermission] =
    useState<NotificationPermission>(() => {
      if (typeof window !== "undefined" && "Notification" in window) {
        return window.Notification.permission;
      }
      return "default";
    });

  const dropdownRef = useRef<HTMLDivElement>(null);

  const requestBrowserPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await window.Notification.requestPermission();
      setBrowserPermission(perm);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!user) return;

    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch notifications:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Real-time notification subscription via Pusher
  usePusherChannel(user ? `user-${user.id}-notifications` : null, {
    "new-notification": (data: unknown) => {
      const newNotif = data as Notification;
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((c) => c + 1);

      // Trigger browser desktop notification if granted
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        window.Notification.permission === "granted"
      ) {
        try {
          new window.Notification(newNotif.title, {
            body: newNotif.message,
            icon: "/favicon.ico",
          });
        } catch {}
      }
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-zinc-200 bg-white shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/70">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-zinc-900">Notifications</h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Browser Notification Banner if not granted */}
          {browserPermission === "default" && (
            <div className="px-4 py-2 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
              <span>Enable instant desktop alerts?</span>
              <button
                type="button"
                onClick={requestBrowserPermission}
                className="px-2 py-0.5 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700 text-[11px]"
              >
                Enable
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                <Bell className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                <p className="text-xs font-medium text-zinc-600">
                  No notifications yet
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  You&apos;ll be notified when assigned tasks or invited to
                  teams.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const timeAgo = formatTimeAgo(notif.createdAt);
                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 flex items-start gap-3 transition-colors ${
                      notif.isRead
                        ? "bg-white hover:bg-zinc-50"
                        : "bg-indigo-50/30 hover:bg-indigo-50/50"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p
                          className={`text-xs truncate ${
                            notif.isRead
                              ? "font-medium text-zinc-800"
                              : "font-bold text-zinc-950"
                          }`}
                        >
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-zinc-400 shrink-0">
                          {timeAgo}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        {notif.link ? (
                          <Link
                            href={notif.link}
                            onClick={() => {
                              if (!notif.isRead) handleMarkAsRead(notif.id);
                              setIsOpen(false);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            <span>Open</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span />
                        )}

                        {!notif.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="text-[11px] text-zinc-400 hover:text-indigo-600"
                            title="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5" />
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
      )}
    </div>
  );
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "TASK_ASSIGNED":
      return (
        <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
          <ClipboardList className="h-3.5 w-3.5" />
        </div>
      );
    case "TEAM_ADDED":
      return (
        <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <UserCheck className="h-3.5 w-3.5" />
        </div>
      );
    case "ROLE_CHANGED":
      return (
        <div className="h-7 w-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
          <ShieldAlert className="h-3.5 w-3.5" />
        </div>
      );
    default:
      return (
        <div className="h-7 w-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
          <Bell className="h-3.5 w-3.5" />
        </div>
      );
  }
}

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
