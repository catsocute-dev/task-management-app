import { NextRequest, NextResponse } from "next/server";
import { Role, NotificationType } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageMembers } from "@/lib/permissions";
import { triggerUserEvent } from "@/lib/pusher-server";

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

  const isOwner = team.ownerId === authUser.id;
  const actorMember = team.members.find((m) => m.userId === authUser.id);
  const actorRole: Role | null = isOwner
    ? "OWNER"
    : (actorMember?.role ?? null);

  if (!canManageMembers(actorRole)) {
    return NextResponse.json(
      {
        error: "Forbidden: Only Owners and Admins can add members to the team.",
      },
      { status: 403 },
    );
  }

  let body: { email?: string; role?: Role };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const userToAdd = await prisma.user.findUnique({ where: { email } });
  if (!userToAdd) {
    return NextResponse.json(
      { error: "No user with this email exists. Ask them to register first." },
      { status: 404 },
    );
  }

  const alreadyMember =
    team.ownerId === userToAdd.id ||
    team.members.some((m) => m.userId === userToAdd.id);

  if (alreadyMember) {
    return NextResponse.json(
      { error: "This user is already a member of the team." },
      { status: 400 },
    );
  }

  const assignedRole: Role =
    body.role === "ADMIN" && actorRole === "OWNER" ? "ADMIN" : "MEMBER";

  const member = await prisma.teamMember.create({
    data: {
      teamId,
      userId: userToAdd.id,
      role: assignedRole,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      teamId,
      userId: authUser.id,
      action: "ADDED_MEMBER",
      details: `Added ${userToAdd.name} (${userToAdd.email}) with role ${assignedRole}`,
    },
  });

  // Notify added user
  const notif = await prisma.notification.create({
    data: {
      userId: userToAdd.id,
      type: NotificationType.TEAM_ADDED,
      title: "Added to Team",
      message: `${authUser.name} added you to ${team.name} as a ${assignedRole}.`,
      link: `/teams/${teamId}`,
    },
  });
  await triggerUserEvent(userToAdd.id, "new-notification", notif);

  return NextResponse.json(member, { status: 201 });
}
