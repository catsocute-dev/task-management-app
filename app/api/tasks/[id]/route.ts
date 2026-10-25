import { NextRequest, NextResponse } from "next/server";
import { Prisma, NotificationType } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseTaskPayload } from "@/lib/task-payload";
import { triggerTeamEvent, triggerUserEvent } from "@/lib/pusher-server";

type TaskIdContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: TaskIdContext) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const existingTask = await prisma.task.findUnique({
    where: { id },
    include: {
      team: {
        include: { members: true },
      },
    },
  });

  if (!existingTask) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  // Determine user role in the team
  let userRole = null;
  if (existingTask.team) {
    if (existingTask.team.ownerId === authUser.id) {
      userRole = "OWNER";
    } else {
      const membership = existingTask.team.members.find(
        (m) => m.userId === authUser.id,
      );
      if (membership) {
        userRole = membership.role;
      }
    }

    if (!userRole) {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this task's team." },
        { status: 403 },
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseTaskPayload(body, { partial: true });
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // If assigneeId is provided and task has a team, verify assignee is in the team
  if (parsed.data.assigneeId && existingTask.team) {
    const assigneeIsMember =
      existingTask.team.ownerId === parsed.data.assigneeId ||
      existingTask.team.members.some(
        (m) => m.userId === parsed.data.assigneeId,
      );

    if (!assigneeIsMember) {
      return NextResponse.json(
        { error: "The assigned user is not a member of this team." },
        { status: 400 },
      );
    }
  }

  const data: Prisma.TaskUpdateInput = {};
  if (parsed.data.title !== undefined && parsed.data.title !== "") {
    data.title = parsed.data.title;
  }
  if ("description" in parsed.data) {
    data.description = parsed.data.description;
  }
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
  }
  if (parsed.data.priority !== undefined) {
    data.priority = parsed.data.priority;
  }
  if ("dueDate" in parsed.data) {
    data.dueDate = parsed.data.dueDate;
  }
  if ("assigneeId" in parsed.data) {
    if (parsed.data.assigneeId === null) {
      data.assignee = { disconnect: true };
    } else {
      data.assignee = { connect: { id: parsed.data.assigneeId } };
    }
  }

  try {
    const updatedTask = await prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Broadcast real-time task update to the team
    if (existingTask.teamId) {
      await triggerTeamEvent(
        existingTask.teamId,
        "tasks",
        "task-updated",
        updatedTask,
      );

      // Log activity
      await prisma.activityLog.create({
        data: {
          teamId: existingTask.teamId,
          userId: authUser.id,
          action: "UPDATED_TASK",
          details: `Updated task '${updatedTask.title}' (Status: ${updatedTask.status})`,
        },
      });

      // If new assignee and differs from actor, notify assignee
      if (
        parsed.data.assigneeId &&
        parsed.data.assigneeId !== existingTask.assigneeId &&
        parsed.data.assigneeId !== authUser.id
      ) {
        const notif = await prisma.notification.create({
          data: {
            userId: parsed.data.assigneeId,
            type: NotificationType.TASK_ASSIGNED,
            title: "Task Assigned to You",
            message: `${authUser.name} assigned you to '${updatedTask.title}' in ${existingTask.team?.name || "the team"}.`,
            link: `/teams/${existingTask.teamId}`,
          },
        });
        await triggerUserEvent(
          parsed.data.assigneeId,
          "new-notification",
          notif,
        );
      }
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(request: NextRequest, context: TaskIdContext) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      team: {
        include: { members: true },
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  // 3-Tier Role-Based Authorization Check:
  // - OWNER: can delete any task
  // - ADMIN: can delete any task
  // - MEMBER: can delete ONLY tasks they created (or unassigned tasks they created)
  const isCreator = task.creatorId === authUser.id;
  const isTeamOwner = task.team?.ownerId === authUser.id;
  const memberRecord = task.team?.members.find((m) => m.userId === authUser.id);
  const isTeamAdmin = memberRecord?.role === "ADMIN";

  if (!isTeamOwner && !isTeamAdmin && !isCreator) {
    return NextResponse.json(
      {
        error:
          "Forbidden: Regular members can only delete tasks they personally created. Team Owners and Admins can delete any task.",
      },
      { status: 403 },
    );
  }

  try {
    await prisma.task.delete({ where: { id } });

    // Broadcast real-time task deletion
    if (task.teamId) {
      await triggerTeamEvent(task.teamId, "tasks", "task-deleted", { id });

      // Log activity
      await prisma.activityLog.create({
        data: {
          teamId: task.teamId,
          userId: authUser.id,
          action: "DELETED_TASK",
          details: `Deleted task '${task.title}'`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully.",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    throw error;
  }
}
