import {
  PrismaClient,
  Role,
  TaskStatus,
  Priority,
  NotificationType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database for Assignment 3 & 4...");

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash("password123", saltRounds);

  // 1. Create or update Test Owner (test@example.com)
  const testUser = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: { passwordHash, name: "Test Owner" },
    create: {
      name: "Test Owner",
      email: "test@example.com",
      passwordHash,
    },
  });

  // 2. Create or update Test Admin (admin@example.com)
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { passwordHash, name: "Alex Admin" },
    create: {
      name: "Alex Admin",
      email: "admin@example.com",
      passwordHash,
    },
  });

  // 3. Create or update Test Member (member@example.com)
  const memberUser = await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: { passwordHash, name: "Jane Member" },
    create: {
      name: "Jane Member",
      email: "member@example.com",
      passwordHash,
    },
  });

  console.log(
    `Users seeded: ${testUser.email} (Owner), ${adminUser.email} (Admin), ${memberUser.email} (Member)`,
  );

  // 4. Create or find sample team
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

  // Ensure memberships with the 3 distinct roles
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
        userId: adminUser.id,
      },
    },
    update: { role: Role.ADMIN },
    create: {
      teamId: team.id,
      userId: adminUser.id,
      role: Role.ADMIN,
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

  // 5. Ensure sample tasks exist
  const taskCount = await prisma.task.count({ where: { teamId: team.id } });
  if (taskCount === 0) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    await prisma.task.createMany({
      data: [
        {
          title: "Implement Real-time Pusher WebSockets & Notifications",
          description:
            "Integrate Pusher Channels for bi-directional live updates across chat, task board, and notifications.",
          status: TaskStatus.DONE,
          priority: Priority.HIGH,
          dueDate: new Date(),
          teamId: team.id,
          assigneeId: testUser.id,
          creatorId: testUser.id,
        },
        {
          title: "Build Live Team Chat Panel with Message Persistence",
          description:
            "Provide real-time message broadcasting, typing indicators, and message history.",
          status: TaskStatus.IN_PROGRESS,
          priority: Priority.HIGH,
          dueDate: nextWeek,
          teamId: team.id,
          assigneeId: memberUser.id,
          creatorId: testUser.id,
        },
        {
          title: "Enforce 3-Tier Role Permissions (Owner, Admin, Member)",
          description:
            "Add role hierarchy and server-side authorization checks on all member and task APIs.",
          status: TaskStatus.TODO,
          priority: Priority.MEDIUM,
          dueDate: nextWeek,
          teamId: team.id,
          assigneeId: adminUser.id,
          creatorId: testUser.id,
        },
      ],
    });
  }

  // 6. Ensure sample chat messages
  const messageCount = await prisma.message.count({
    where: { teamId: team.id },
  });
  if (messageCount === 0) {
    await prisma.message.createMany({
      data: [
        {
          teamId: team.id,
          senderId: testUser.id,
          content:
            "Welcome team! Let's kick off Assignment 3 & 4 real-time collaboration sprint.",
          createdAt: new Date(Date.now() - 3600000),
        },
        {
          teamId: team.id,
          senderId: adminUser.id,
          content:
            "Awesome! I've reviewed the 3-tier role permissions and task board sync requirements.",
          createdAt: new Date(Date.now() - 1800000),
        },
        {
          teamId: team.id,
          senderId: memberUser.id,
          content:
            "Ready! Testing real-time message delivery across both sessions.",
          createdAt: new Date(Date.now() - 600000),
        },
      ],
    });
  }

  // 7. Ensure sample notifications for Jane Member
  const notifCount = await prisma.notification.count({
    where: { userId: memberUser.id },
  });
  if (notifCount === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: memberUser.id,
          type: NotificationType.TEAM_ADDED,
          title: "Welcome to Engineering Core",
          message:
            "Test Owner added you to the team Engineering Core as a Member.",
          link: `/teams/${team.id}`,
          isRead: false,
          createdAt: new Date(Date.now() - 3600000),
        },
        {
          userId: memberUser.id,
          type: NotificationType.TASK_ASSIGNED,
          title: "New Task Assigned",
          message:
            "You were assigned to 'Build Live Team Chat Panel with Message Persistence'.",
          link: `/teams/${team.id}`,
          isRead: false,
          createdAt: new Date(Date.now() - 1800000),
        },
      ],
    });
  }

  // 8. Ensure initial activity logs
  const activityCount = await prisma.activityLog.count({
    where: { teamId: team.id },
  });
  if (activityCount === 0) {
    await prisma.activityLog.createMany({
      data: [
        {
          teamId: team.id,
          userId: testUser.id,
          action: "CREATED_TEAM",
          details: "Created team 'Engineering Core'",
          createdAt: new Date(Date.now() - 7200000),
        },
        {
          teamId: team.id,
          userId: testUser.id,
          action: "INVITED_MEMBER",
          details: "Added member Jane Member with role MEMBER",
          createdAt: new Date(Date.now() - 3600000),
        },
        {
          teamId: team.id,
          userId: testUser.id,
          action: "ASSIGNED_TASK",
          details: "Assigned task 'Build Live Team Chat Panel' to Jane Member",
          createdAt: new Date(Date.now() - 1800000),
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
