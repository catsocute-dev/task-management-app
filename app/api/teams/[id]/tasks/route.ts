import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTaskStatus, isPriority, parseTaskPayload } from "@/lib/task-payload";

type TeamIdContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: TeamIdContext) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: teamId } = await context.params;

  // Verify team membership
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

  // Parse filters from query params
  const { searchParams } = request.nextUrl;
  const statusParam = searchParams.get("status");
  const priorityParam = searchParams.get("priority");
  const assigneeId = searchParams.get("assigneeId");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(
    1,
    Math.min(100, parseInt(searchParams.get("limit") || "50", 10)),
  );
  const skip = (page - 1) * limit;

  const where: Prisma.TaskWhereInput = {
    teamId,
  };

  if (statusParam && isTaskStatus(statusParam)) {
    where.status = statusParam;
  }

  if (priorityParam && isPriority(priorityParam)) {
    where.priority = priorityParam;
  }

  if (assigneeId) {
    where.assigneeId = assigneeId;
  }

  if (search && search.trim() !== "") {
    const q = search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    tasks,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
}

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

  // Any member of the team can create tasks
  const isMember =
    team.ownerId === authUser.id ||
    team.members.some((m) => m.userId === authUser.id);

  if (!isMember) {
    return NextResponse.json(
      {
        error: "Forbidden: You must be a member of this team to create tasks.",
      },
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

  // If assigneeId is provided, check that the assignee belongs to the team
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
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate,
      assigneeId: parsed.data.assigneeId,
      teamId,
      creatorId: authUser.id,
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

  return NextResponse.json(task, { status: 201 });
}
