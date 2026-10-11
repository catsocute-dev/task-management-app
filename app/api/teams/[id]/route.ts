import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TeamIdContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: TeamIdContext) {
  const authUser = await getAuthUser(_request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      tasks: {
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { members: true, tasks: true },
      },
    },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  // Authorization check: User must be owner or member of this team
  const isMember =
    team.ownerId === authUser.id ||
    team.members.some((m) => m.userId === authUser.id);

  if (!isMember) {
    return NextResponse.json(
      { error: "Forbidden: You are not a member of this team." },
      { status: 403 },
    );
  }

  return NextResponse.json(team);
}

export async function PUT(request: NextRequest, context: TeamIdContext) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const team = await prisma.team.findUnique({
    where: { id },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  // Only Owner can update team
  if (team.ownerId !== authUser.id) {
    return NextResponse.json(
      { error: "Forbidden: Only the team owner can update team details." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be an object." },
      { status: 400 },
    );
  }

  const { name, description } = body as Record<string, unknown>;

  const updateData: { name?: string; description?: string | null } = {};

  if (typeof name === "string") {
    if (name.trim() === "") {
      return NextResponse.json(
        { error: "Team name cannot be empty." },
        { status: 400 },
      );
    }
    updateData.name = name.trim();
  }

  if (description !== undefined) {
    updateData.description =
      typeof description === "string" && description.trim() !== ""
        ? description.trim()
        : null;
  }

  const updatedTeam = await prisma.team.update({
    where: { id },
    data: updateData,
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  return NextResponse.json(updatedTeam);
}

export async function DELETE(request: NextRequest, context: TeamIdContext) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const team = await prisma.team.findUnique({
    where: { id },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  // Only Owner can delete team
  if (team.ownerId !== authUser.id) {
    return NextResponse.json(
      { error: "Forbidden: Only the team owner can delete this team." },
      { status: 403 },
    );
  }

  await prisma.team.delete({
    where: { id },
  });

  return NextResponse.json({
    success: true,
    message: "Team deleted successfully.",
  });
}
