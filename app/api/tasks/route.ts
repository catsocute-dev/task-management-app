import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTaskStatus, parseTaskPayload } from "@/lib/task-payload";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");

  if (status && !isTaskStatus(status)) {
    return NextResponse.json(
      { error: "Status must be TODO, IN_PROGRESS, or DONE." },
      { status: 400 },
    );
  }

  const tasks = await prisma.task.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
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

  const task = await prisma.task.create({
    data: parsed.data,
  });

  return NextResponse.json(task, { status: 201 });
}
