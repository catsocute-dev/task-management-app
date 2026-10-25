# TaskHub - Real-time Collaborative Task & Team Management Platform (Assignment 3 & 4)

A modern, real-time collaborative workspace built with **Next.js App Router**, **Prisma ORM**, **PostgreSQL (Supabase)**, and **Pusher Channels**. TaskHub delivers live chat communication, instantaneous multi-user Kanban board updates, in-app notifications, and an advanced 3-tier role & permission system.

---

## Submission Information (Required Grading Checklist)

Student ID: QE190011
Full Name: Le Nhat
GitHub Repository URL: https://github.com/catsocute-dev/task-management-app
Deployed Website URL (Vercel): https://task-management-app-ten-navy.vercel.app
Separate Backend URL (NestJS on Render) — write N/A if not used: N/A
Real-time mechanism used (Supabase Realtime / Socket.io / Pusher / Ably): Pusher
Test Account 1 Email: test@example.com
Test Account 1 Password: password123
Test Account 2 Email (must be on the SAME team as Account 1, to test real-time between two sessions): member@example.com
Test Account 2 Password: password123
Both test accounts are already email-verified / ready to log in immediately, with no confirmation link needed (Yes / No): Yes
Demo video link (YouTube/Drive/Loom, 2–3 minutes, showing live chat and live task updates across two sessions): https://youtu.be/demo-video-link

---

## Key Features (Assignment 3 & 4)

### 1. Real-time Team Chat

- **Dedicated Chat Room Per Team**: Located under the **"Live Chat"** tab on each team's page.
- **Message Persistence**: All messages are stored in PostgreSQL with sender relation, message text, optional file attachment URL, and creation timestamp.
- **Instant Live Delivery**: Messages sent by one member appear immediately for all other online team members via Pusher WebSockets without refreshing.
- **Typing Indicator**: Real-time broadcast showing _"Jane Member is typing..."_ when teammates are actively typing.
- **Attachment Support**: Send image/document URLs with in-line image preview and download links.

### 2. Live Task Board Updates (Multi-User Synchronization)

- **Live Kanban & Table Synchronization**: Changes made by one user (creating a task, dragging a card between _To Do / In Progress / Done_, updating details, or deleting a task) broadcast instantly across all open browser sessions viewing the same team.
- **Optimistic UI Updates**: Status changes update smoothly on the sender's screen while triggering a Pusher event to sync remote teammates' screens.

### 3. In-App Notification Center

- **Header Notification Bell**: Displays an animated unread badge counter in the top navigation bar.
- **Real-time Push Alerts**: When assigned a task or added to a team, users receive an instant in-app notification without reloading the page.
- **Notification Dropdown**:
  - View recent notifications with time-ago badges.
  - One-click navigation link to open the relevant team workspace.
  - Individual "Mark as Read" or "Mark all read" controls.
- **Browser Desktop Notifications**: Users can opt in to receive native OS desktop alerts via the Web Notifications API.

### 4. Advanced 3-Tier Role & Permission System

Enforced strictly both in **Server-side Route Handlers** (HTTP 403 Forbidden checks) and in the **Client UI** (disabled/hidden buttons and permission summaries):

| Capability / Action                            |          OWNER          |         ADMIN         |          MEMBER          |
| :--------------------------------------------- | :---------------------: | :-------------------: | :----------------------: |
| **Delete Team**                                |         ✅ Yes          |         ❌ No         |          ❌ No           |
| **Edit Team Details** (Name, Description)      |         ✅ Yes          |        ✅ Yes         |          ❌ No           |
| **Manage Members** (Add member, remove member) |         ✅ Yes          | ✅ Yes (Members only) |          ❌ No           |
| **Change Member Roles**                        | ✅ Yes (Admin ↔ Member) |         ❌ No         |          ❌ No           |
| **Demote / Remove Owner**                      |          ❌ No          |         ❌ No         |          ❌ No           |
| **Delete Any Task** in Team                    |         ✅ Yes          |        ✅ Yes         | ❌ No (Own created only) |
| **Create & Update Tasks**                      |         ✅ Yes          |        ✅ Yes         |          ✅ Yes          |
| **Move Status of Assigned Task**               |         ✅ Yes          |        ✅ Yes         |          ✅ Yes          |
| **Live Team Chat & View Board**                |         ✅ Yes          |        ✅ Yes         |          ✅ Yes          |

### 5. Bonus Features

- **Team Audit Trail / Activity Log**: An **"Activity Log"** tab displays chronological team event logs (task creation, status moves, member joins, and role updates).
- **Online Channel Indicator**: Visual live badges confirming active real-time channel connection.
- **Role Badges**: Color-coded badges (_Purple Owner, Blue Admin, Slate Member_) displayed in the team header and member list.

---

## Tech Stack & Architecture

- **Frontend**: Next.js 16 (App Router, Server Route Handlers, React 19, TypeScript)
- **Database**: PostgreSQL on Supabase (Pooler & Direct connections)
- **ORM**: Prisma 6 (Models: `User`, `Team`, `TeamMember`, `Task`, `Message`, `Notification`, `ActivityLog`)
- **Real-time Engine**: Pusher Channels (`pusher` server SDK + `pusher-js` client SDK)
- **Authentication**: JWT via `jose` and `bcryptjs` (HTTP-only secure cookies + Bearer token support)
- **Styling**: Tailwind CSS + Lucide React Icons
- **Deployment**: Vercel (Production continuous deployment)

---

## Step-by-Step External System Setup Guide

### 1. Supabase (Database Setup)

1. Log in to [Supabase](https://supabase.com).
2. Go to **Project Settings** -> **Database**:
   - Copy the **Connection string (URI)** with **Transaction pooler** (port `6543`) into `DATABASE_URL`.
   - Copy the **Direct connection URI** (port `5432`) into `DIRECT_URL`.
3. Run database migrations and seed test data:
   ```bash
   npx prisma db push
   npm run db:seed
   ```

### 2. Pusher Channels (Real-Time WebSocket Setup)

1. Sign up for a free account at [pusher.com](https://pusher.com) (free sandbox: 200,000 messages/day, 100 concurrent connections).
2. Click **Create app**:
   - App Name: `taskhub`
   - Cluster: `ap1` (or your preferred region)
   - Frontend: `React`
   - Backend: `Node.js`
3. Go to **App Keys** tab and copy your credentials into `.env` (and Vercel Environment Variables):
   ```env
   PUSHER_APP_ID="your_app_id"
   PUSHER_KEY="your_key"
   PUSHER_SECRET="your_secret"
   PUSHER_CLUSTER="ap1"
   NEXT_PUBLIC_PUSHER_KEY="your_key"
   NEXT_PUBLIC_PUSHER_CLUSTER="ap1"
   ```

### 3. Vercel (Deployment)

1. In your Vercel Dashboard project, navigate to **Settings** -> **Environment Variables**.
2. Add all 9 environment variables:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `JWT_SECRET`
   - `PUSHER_APP_ID`
   - `PUSHER_KEY`
   - `PUSHER_SECRET`
   - `PUSHER_CLUSTER`
   - `NEXT_PUBLIC_PUSHER_KEY`
   - `NEXT_PUBLIC_PUSHER_CLUSTER`
3. Push changes to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete Assignment 3 & 4 real-time collaboration and role permissions"
   git push origin main
   ```

---

## Two-Session Verification & Demo Video Recording Guide (2–3 Minutes)

To record your demonstration video (required for submission):

1. **Open Two Browser Windows Side by Side**:
   - **Window 1 (Chrome Regular)**: Log in as `test@example.com` / `password123` (**Owner**).
   - **Window 2 (Chrome Incognito or Edge)**: Log in as `member@example.com` / `password123` (**Member**).
2. **Navigate Both Windows to Team "Engineering Core"**:
   - Click on the team _"Engineering Core"_.
3. **Demonstrate Real-Time Team Chat**:
   - In Window 2, switch to the **"Live Chat"** tab and type a message.
   - Point out that Window 1 shows the typing indicator (_"Jane Member is typing..."_).
   - Click Send in Window 2: Window 1 instantly displays the new chat bubble without refreshing!
4. **Demonstrate Live Task Board Synchronization**:
   - In both windows, click the **"Tasks"** tab (Kanban view).
   - In Window 1, drag a task from **"To Do"** to **"In Progress"**.
   - Show that Window 2's board moves the task card live without any page reload!
5. **Demonstrate In-App Notifications**:
   - In Window 1, create a task and assign it to _Jane Member_ (`member@example.com`).
   - Show Window 2's notification bell ringing with an unread badge `(1)`.
   - In Window 2, open the notification bell and click "Mark as read".
6. **Demonstrate 3-Tier Permissions**:
   - In Window 2 (Member), show that Delete buttons on tasks created by others are disabled/inaccessible.
   - In Window 1 (Owner), switch to **"Members & Roles"** tab and promote Jane Member to **Admin**.
   - Refresh or switch tabs in Window 2: Jane Member now has Admin privileges and can manage tasks and members.
