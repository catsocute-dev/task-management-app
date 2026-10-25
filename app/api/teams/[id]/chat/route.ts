import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { triggerTeamEvent } from "@/lib/pusher-server";

type TeamIdContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: TeamIdContext) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: teamId } = await context.params;

  // Verify membership
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
      { error: "Forbidden: Not a member of this team." },
      { status: 403 },
    );
  }

  const messages = await prisma.message.findMany({
    where: { teamId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: { id: true, name: true, email: true },
      },
    },
    take: 100,
  });

  return NextResponse.json(messages);
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

  const isMember =
    team.ownerId === authUser.id ||
    team.members.some((m) => m.userId === authUser.id);

  if (!isMember) {
    return NextResponse.json(
      { error: "Forbidden: Not a member of this team." },
      { status: 403 },
    );
  }

  let body: { content?: string; fileUrl?: string; fileName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const content = (body.content || "").trim();
  if (!content && !body.fileUrl) {
    return NextResponse.json(
      { error: "Message content or file attachment is required." },
      { status: 400 },
    );
  }

  const message = await prisma.message.create({
    data: {
      teamId,
      senderId: authUser.id,
      content: content || "Attached a file",
      fileUrl: body.fileUrl || null,
      fileName: body.fileName || null,
    },
    include: {
      sender: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Broadcast real-time message via Pusher
  await triggerTeamEvent(teamId, "chat", "new-message", message);

  return NextResponse.json(message, { status: 201 });
}
