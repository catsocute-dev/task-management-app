import { NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseTaskPayload } from "@/lib/task-payload";
import { triggerTeamEvent, triggerUserEvent } from "@/lib/pusher-server";

type TeamIdContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: TeamIdContext) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: teamId } = await context.params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: true },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  const isMember =
    team.ownerId === authUser.id ||
    team.members.some((m) => m.userId === authUser.id);

  if (!isMember) {
    return NextResponse.json(
      { error: "Forbidden: You are not a member of this team." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseTaskPayload(body, { partial: false });
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (parsed.data.assigneeId) {
    const assigneeIsMember =
      team.ownerId === parsed.data.assigneeId ||
      team.members.some((m) => m.userId === parsed.data.assigneeId);

    if (!assigneeIsMember) {
      return NextResponse.json(
        { error: "The assigned user is not a member of this team." },
        { status: 400 },
      );
    }
  }

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status ?? "TODO",
      priority: parsed.data.priority ?? "MEDIUM",
      dueDate: parsed.data.dueDate ?? null,
      team: { connect: { id: teamId } },
      creator: { connect: { id: authUser.id } },
      ...(parsed.data.assigneeId
        ? { assignee: { connect: { id: parsed.data.assigneeId } } }
        : {}),
    },
    include: {
      assignee: {
        select: { id: true, name: true, email: true },
      },
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Broadcast real-time task creation to team
  await triggerTeamEvent(teamId, "tasks", "task-created", task);

  // Log activity
  await prisma.activityLog.create({
    data: {
      teamId,
      userId: authUser.id,
      action: "CREATED_TASK",
      details: `Created task '${task.title}'`,
    },
  });

  // Notify assignee if not the creator
  if (parsed.data.assigneeId && parsed.data.assigneeId !== authUser.id) {
    const notif = await prisma.notification.create({
      data: {
        userId: parsed.data.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: "New Task Assigned",
        message: `${authUser.name} assigned you to '${task.title}' in ${team.name}.`,
        link: `/teams/${teamId}`,
      },
    });
    await triggerUserEvent(parsed.data.assigneeId, "new-notification", notif);
  }

  return NextResponse.json(task, { status: 201 });
}
