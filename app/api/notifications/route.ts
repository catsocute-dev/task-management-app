import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const notifications = await prisma.notification.findMany({
    where: {
      userId: authUser.id,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId: authUser.id,
      isRead: false,
    },
  });

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}

export async function PATCH(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { id?: string; all?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId: authUser.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({
      success: true,
      message: "All notifications marked as read.",
    });
  }

  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: authUser.id },
      data: { isRead: true },
    });
    return NextResponse.json({
      success: true,
      message: "Notification marked as read.",
    });
  }

  return NextResponse.json(
    { error: "Specify 'id' or 'all: true'" },
    { status: 400 },
  );
}
