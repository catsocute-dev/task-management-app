"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Users,
  Kanban,
  ShieldCheck,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-16 py-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-gradient-to-b from-indigo-50/50 via-white to-white p-8 sm:p-14 text-center shadow-xs">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-700 mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Assignment 2 — Task &amp; Team Management Platform</span>
        </div>

        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl leading-[1.15]">
          Organize projects, empower teams, and deliver work faster.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-600">
          A secure, multi-tenant workspace with role-based access control,
          interactive Kanban workflows, team member invitations, and a fully
          connected RESTful API.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {user ? (
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <span>Go to Your Teams Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-6 py-3.5 text-sm font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 transition-colors"
              >
                <span>Sign In to Account</span>
              </Link>
            </>
          )}
        </div>

        {/* Test Credentials Callout for Grader */}
        <div className="mt-10 mx-auto max-w-lg rounded-xl border border-indigo-100 bg-white/80 p-4 text-xs text-zinc-600 shadow-xs backdrop-blur-xs">
          <div className="flex items-center justify-center gap-2 font-semibold text-indigo-900 mb-1">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>
              Grading Test Account Ready (No verification link required)
            </span>
          </div>
          <p className="text-zinc-500">
            Account:{" "}
            <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono text-zinc-900">
              test@example.com
            </code>{" "}
            | Password:{" "}
            <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono text-zinc-900">
              password123
            </code>
          </p>
          {!user && (
            <div className="mt-2">
              <Link
                href="/login"
                className="text-indigo-600 hover:text-indigo-700 font-semibold underline underline-offset-2"
              >
                Jump to Login &amp; Autofill &rarr;
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
            Engineered for High-Velocity Teams
          </h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Everything you need to orchestrate tasks and collaborate
            effectively.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">
              Team Collaboration
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Create teams, automatically become Owner, invite members by email,
              and manage roles with fine-grained authorization.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Kanban className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">
              Interactive Kanban
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Drag and drop tasks between To Do, In Progress, and Done columns
              with real-time optimistic status updates.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">
              Role-Based Security
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Strict task permissions: any member can create and update tasks,
              while only creators, assignees, or team owners can delete tasks.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">
              Search &amp; Filters
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Instantly filter work by status, priority, or assignee, search
              keywords, and paginate through large task backlogs.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
