import { PrismaClient, Role, TaskStatus, Priority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database for Assignment 2...");

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash("password123", saltRounds);

  // 1. Create or update Test User (Owner)
  const testUser = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: { passwordHash, name: "Test Owner" },
    create: {
      name: "Test Owner",
      email: "test@example.com",
      passwordHash,
    },
  });

  // 2. Create or update Sample Member
  const memberUser = await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: { passwordHash, name: "Jane Member" },
    create: {
      name: "Jane Member",
      email: "member@example.com",
      passwordHash,
    },
  });

  console.log(`Users seeded: ${testUser.email}, ${memberUser.email}`);

  // 3. Create or find sample team
  let team = await prisma.team.findFirst({
    where: {
      name: "Engineering Core",
      ownerId: testUser.id,
    },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: "Engineering Core",
        description: "Core platform and application development squad",
        ownerId: testUser.id,
      },
    });
  }

  // Ensure memberships
  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: testUser.id,
      },
    },
    update: { role: Role.OWNER },
    create: {
      teamId: team.id,
      userId: testUser.id,
      role: Role.OWNER,
    },
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: memberUser.id,
      },
    },
    update: { role: Role.MEMBER },
    create: {
      teamId: team.id,
      userId: memberUser.id,
      role: Role.MEMBER,
    },
  });

  // 4. Create sample tasks if none exist for this team
  const taskCount = await prisma.task.count({ where: { teamId: team.id } });
  if (taskCount === 0) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    await prisma.task.createMany({
      data: [
        {
          title: "Implement JWT Authentication & Session Handling",
          description:
            "Register, login, and secure team APIs using JWT cookies and Bearer tokens.",
          status: TaskStatus.DONE,
          priority: Priority.HIGH,
          dueDate: new Date(),
          teamId: team.id,
          assigneeId: testUser.id,
          creatorId: testUser.id,
        },
        {
          title: "Design Interactive Kanban Board & Task Filters",
          description:
            "Allow drag & drop task progression, search keyword, and filter by status/priority.",
          status: TaskStatus.IN_PROGRESS,
          priority: Priority.MEDIUM,
          dueDate: nextWeek,
          teamId: team.id,
          assigneeId: memberUser.id,
          creatorId: testUser.id,
        },
        {
          title: "Prepare Submission Checklist and Test Coverage",
          description:
            "Verify all endpoints, permissions, self-registration, and test accounts.",
          status: TaskStatus.TODO,
          priority: Priority.LOW,
          dueDate: nextWeek,
          teamId: team.id,
          assigneeId: memberUser.id,
          creatorId: memberUser.id,
        },
      ],
    });
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
