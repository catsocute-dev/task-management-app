import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type MemberRouteContext = {
  params: Promise<{ id: string; userId: string }>;
};

export async function DELETE(
  request: NextRequest,
  context: MemberRouteContext,
) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: teamId, userId } = await context.params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  // Only Owner can remove members
  if (team.ownerId !== authUser.id) {
    return NextResponse.json(
      { error: "Forbidden: Only the team owner can remove members." },
      { status: 403 },
    );
  }

  // Owner cannot remove themselves
  if (userId === team.ownerId) {
    return NextResponse.json(
      {
        error:
          "The team owner cannot be removed. You can delete the team instead.",
      },
      { status: 400 },
    );
  }

  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Member not found in this team." },
      { status: 404 },
    );
  }

  await prisma.teamMember.delete({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
  });

  return NextResponse.json({
    success: true,
    message: "Member removed successfully.",
  });
}
