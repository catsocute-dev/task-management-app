import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Only Owner can add members
  if (team.ownerId !== authUser.id) {
    return NextResponse.json(
      { error: "Forbidden: Only the team owner can add members." },
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

  const { email } = body as Record<string, unknown>;

  if (typeof email !== "string" || email.trim() === "") {
    return NextResponse.json(
      { error: "User email is required." },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const userToAdd = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, email: true },
  });

  if (!userToAdd) {
    return NextResponse.json(
      {
        error: `User with email "${normalizedEmail}" not found. They must register an account first.`,
      },
      { status: 404 },
    );
  }

  // Check if user is already a member
  const alreadyMember = team.members.some((m) => m.userId === userToAdd.id);
  if (alreadyMember) {
    return NextResponse.json(
      { error: "User is already a member of this team." },
      { status: 409 },
    );
  }

  const newMember = await prisma.teamMember.create({
    data: {
      teamId,
      userId: userToAdd.id,
      role: "MEMBER",
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json(newMember, { status: 201 });
}
