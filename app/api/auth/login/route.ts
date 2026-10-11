import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createJwtToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
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

  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== "string" || email.trim() === "") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (typeof password !== "string" || password === "") {
    return NextResponse.json(
      { error: "Password is required." },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const token = await createJwtToken({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  const response = NextResponse.json({
    message: "Login successful.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    token,
  });

  setAuthCookie(response, token);
  return response;
}
