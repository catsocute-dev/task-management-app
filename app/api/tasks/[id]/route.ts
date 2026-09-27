import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseTaskPayload } from "@/lib/task-payload";

type TaskIdContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: TaskIdContext) {
  const { id } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseTaskPayload(body, { partial: true });
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const data: Prisma.TaskUpdateInput = {};
  if (parsed.data.title !== undefined && parsed.data.title !== "") {
    data.title = parsed.data.title;
  }
  if ("description" in parsed.data) {
    data.description = parsed.data.description;
  }
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
  }
  if (parsed.data.priority !== undefined) {
    data.priority = parsed.data.priority;
  }
  if ("dueDate" in parsed.data) {
    data.dueDate = parsed.data.dueDate;
  }

  try {
    const task = await prisma.task.update({
      where: { id },
      data,
    });
    return NextResponse.json(task);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, context: TaskIdContext) {
  const { id } = await context.params;

  try {
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    throw error;
  }
}
