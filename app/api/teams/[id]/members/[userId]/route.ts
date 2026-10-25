import { NextRequest, NextResponse } from "next/server";
import { Role, NotificationType } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canChangeMemberRole, canRemoveMember } from "@/lib/permissions";
import { triggerUserEvent } from "@/lib/pusher-server";

type MemberRouteContext = {
  params: Promise<{ id: string; userId: string }>;
};

/**
 * PATCH /api/teams/[id]/members/[userId]
 * Change a team member's role (OWNER can change to ADMIN or MEMBER; ADMIN cannot change OWNER or promote ADMIN)
 */
export async function PATCH(request: NextRequest, context: MemberRouteContext) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: teamId, userId: targetUserId } = await context.params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: true },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  // Determine actor role
  const isOwner = team.ownerId === authUser.id;
  const actorMember = team.members.find((m) => m.userId === authUser.id);
  const actorRole: Role | null = isOwner
    ? "OWNER"
    : (actorMember?.role ?? null);

  if (!actorRole || (actorRole !== "OWNER" && actorRole !== "ADMIN")) {
    return NextResponse.json(
      { error: "Forbidden: Only Owners and Admins can manage member roles." },
      { status: 403 },
    );
  }

  let body: { role?: Role };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.role || !["ADMIN", "MEMBER"].includes(body.role)) {
    return NextResponse.json(
      { error: "Role must be 'ADMIN' or 'MEMBER'." },
      { status: 400 },
    );
  }

  const targetMember = team.members.find((m) => m.userId === targetUserId);
  if (!targetMember) {
    return NextResponse.json(
      { error: "Target member not found in team." },
      { status: 404 },
    );
  }

  if (!canChangeMemberRole(actorRole, targetMember.role, body.role)) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to modify this role." },
      { status: 403 },
    );
  }

  const updatedMember = await prisma.teamMember.update({
    where: {
      teamId_userId: {
        teamId,
        userId: targetUserId,
      },
    },
    data: { role: body.role },
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
      action: "ROLE_CHANGED",
      details: `Changed role of ${updatedMember.user.name} to ${body.role}`,
    },
  });

  // Notify target user
  const notif = await prisma.notification.create({
    data: {
      userId: targetUserId,
      type: NotificationType.ROLE_CHANGED,
      title: "Team Role Updated",
      message: `Your role in ${team.name} was updated to ${body.role} by ${authUser.name}.`,
      link: `/teams/${teamId}`,
    },
  });
  await triggerUserEvent(targetUserId, "new-notification", notif);

  return NextResponse.json(updatedMember);
}

/**
 * DELETE /api/teams/[id]/members/[userId]
 * Remove member or leave team
 */
export async function DELETE(
  request: NextRequest,
  context: MemberRouteContext,
) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: teamId, userId: targetUserId } = await context.params;

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

  const targetMember = team.members.find((m) => m.userId === targetUserId);
  if (!targetMember) {
    return NextResponse.json(
      { error: "Member not found in team." },
      { status: 404 },
    );
  }

  const isSelf = authUser.id === targetUserId;

  if (!actorRole || !canRemoveMember(actorRole, targetMember.role, isSelf)) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to remove this member." },
      { status: 403 },
    );
  }

  await prisma.teamMember.delete({
    where: {
      teamId_userId: {
        teamId,
        userId: targetUserId,
      },
    },
  });

  // Unassign tasks in this team assigned to this user
  await prisma.task.updateMany({
    where: { teamId, assigneeId: targetUserId },
    data: { assigneeId: null },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      teamId,
      userId: authUser.id,
      action: isSelf ? "LEFT_TEAM" : "REMOVED_MEMBER",
      details: isSelf ? `Left the team` : `Removed member from team`,
    },
  });

  return NextResponse.json({
    success: true,
    message: isSelf
      ? "You have left the team."
      : "Member removed successfully.",
  });
}
