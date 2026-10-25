import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { triggerTeamEvent } from "@/lib/pusher-server";

type TeamIdContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: TeamIdContext) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: teamId } = await context.params;

  let body: { isTyping?: boolean };
  try {
    body = await request.json();
  } catch {
    body = { isTyping: true };
  }

  await triggerTeamEvent(teamId, "chat", "typing", {
    userId: authUser.id,
    userName: authUser.name,
    isTyping: Boolean(body.isTyping),
  });

  return NextResponse.json({ success: true });
}
