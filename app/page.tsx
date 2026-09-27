import { TaskBoard } from "@/components/tasks/TaskBoard";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Task &amp; Team Management
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          TaskHub
        </h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-600">
          A shared workspace to create tasks, track status, and prepare for
          team collaboration. This first version is public — anyone can add,
          edit, or delete tasks. Teams and login arrive in later assignments.
        </p>
      </section>
      <TaskBoard />
    </div>
  );
}
