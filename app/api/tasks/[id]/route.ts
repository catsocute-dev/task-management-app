import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseTaskPayload } from "@/lib/task-payload";

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

  // If task belongs to a team, verify user is a member or owner of the team
  if (existingTask.team) {
    const isMember =
      existingTask.team.ownerId === authUser.id ||
      existingTask.team.members.some((m) => m.userId === authUser.id);

    if (!isMember) {
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
    const task = await prisma.task.update({
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
    return NextResponse.json(task);
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
        select: { ownerId: true },
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  // Authorization check: "Only the task creator, the assignee, or the team Owner can delete a task."
  const isCreator = task.creatorId === authUser.id;
  const isAssignee = task.assigneeId === authUser.id;
  const isTeamOwner = task.team?.ownerId === authUser.id;

  if (!isCreator && !isAssignee && !isTeamOwner) {
    return NextResponse.json(
      {
        error:
          "Forbidden: Only the task creator, the assignee, or the team Owner can delete this task.",
      },
      { status: 403 },
    );
  }

  try {
    await prisma.task.delete({ where: { id } });
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
