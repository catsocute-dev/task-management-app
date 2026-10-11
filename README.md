# TaskHub — Task & Team Management App (Assignment 2)

A collaborative Task & Team Management application built with **Next.js App Router**, **Prisma ORM**, and **PostgreSQL (Supabase)**, featuring JWT authentication, role-based authorization, team management, task assignment, and an interactive Kanban board.

## Submission Information (Grading Reference)

- **Test Account Email:** `test@example.com`
- **Test Account Password:** `password123`
- **Secondary Member Account:** `member@example.com` / `password123`
- **Email-verified / Ready to log in immediately:** Yes (using self-contained JWT authentication; no inbox confirmation blockers)
- **Self-registration works:** Yes (the grader can register any new account on `/register` and immediately access the app)

---

## Features (Assignment 2)

### 1. Authentication & Security

- **Register**: Create an account with name, email, and password (`POST /api/auth/register`).
- **Login**: Authenticate and receive a JWT session (`POST /api/auth/login`), stored in an HTTP-only secure cookie and returned as a Bearer token in the JSON response.
- **Logout**: Invalidate session cookie (`POST /api/auth/logout`).
- **Me Endpoint**: Get current authenticated user profile (`GET /api/auth/me`).
- **Route Protection**: Middleware ensures unauthenticated users can only view the homepage (`/`), login (`/login`), and register (`/register`). All team and task features require login.
- **Grading Convenience**: The `/login` page features a one-click test credentials autofill button.

### 2. Team Management

- **Create Team**: Logged-in users can create teams and automatically become the team `OWNER` (`POST /api/teams`).
- **List Teams**: View all teams the current user owns or belongs to (`GET /api/teams`).
- **Team Workspace**: View team details, members, and task lists (`GET /api/teams/:id`).
- **Edit / Delete Team**: Team Owner can update name/description or delete the team (`PUT /api/teams/:id`, `DELETE /api/teams/:id`).
- **Member Management**: Owner can add members by email (`POST /api/teams/:id/members`) and remove members (`DELETE /api/teams/:id/members/:userId`).

### 3. Task Management & Relational Modeling

- **Create Task**: Any member of a team can create tasks within that team (`POST /api/teams/:id/tasks`).
- **Assign Task**: Tasks can be assigned to specific team members.
- **Update Task**: Members can update title, description, status, priority, due date, and assignee (`PUT /api/tasks/:id`).
- **Role-Based Delete**: **Only the task creator, the assignee, or the team Owner can delete a task** (`DELETE /api/tasks/:id`). Other team members receive a `403 Forbidden` response.

### 4. Interactive UI & Bonus Features

- **Kanban Board**: Drag-and-drop tasks between _To Do_, _In Progress_, and _Done_ columns with optimistic status updates and quick-move buttons.
- **Table View Toggle**: Switch effortlessly between visual Kanban columns and a structured data table.
- **Search & Multi-Filter**: Search by keywords; filter by status, priority, or assignee.
- **Task Pagination**: Client-side and server-side pagination for teams with large task volumes.
- **Status & Priority Badges**: Rich, color-coded badges for visual clarity.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Route Handlers, React 19)
- **Database**: PostgreSQL on Supabase
- **ORM**: Prisma 6
- **Auth**: JWT via `jose` and `bcryptjs` (HTTP-only cookies + Authorization header support)
- **Styling**: Tailwind CSS + Lucide Icons
- **Deployment**: Vercel

---

## Environment Variables

Copy `.env.example` to `.env`:

```env
# Supabase PostgreSQL Connection Strings
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require"

# JWT Secret for Token Signing
JWT_SECRET="your-secure-jwt-secret-key-32-chars-or-more"
```

---

## Step-by-Step External System Setup Guide

### 1. Supabase Setup (Database & Migrations)

1. Log in to [Supabase](https://supabase.com) and open your project.
2. In **Project Settings** → **Database**:
   - Copy the **Connection string (URI)** with **Transaction pooler** (port `6543`) into `DATABASE_URL` (ensure `?pgbouncer=true&sslmode=require` is present).
   - Copy the **Direct connection URI** (port `5432`) into `DIRECT_URL`.
3. Synchronize database schema:
   ```bash
   npx prisma db push
   # or
   npx prisma migrate deploy
   ```
4. Seed test accounts and initial team tasks:
   ```bash
   npm run db:seed
   ```
5. In Supabase **Table Editor**, confirm that `User`, `Team`, `TeamMember`, and `Task` tables contain initial rows.

### 2. Vercel Setup (Deployment & Configuration)

1. Open your project on [Vercel Dashboard](https://vercel.com).
2. Go to **Settings** → **Environment Variables** and add:
   - `DATABASE_URL`: Your Supabase transaction pooler URI.
   - `DIRECT_URL`: Your Supabase direct connection URI.
   - `JWT_SECRET`: A secure random secret string.
3. In **Settings** → **Build & Development Settings**:
   - Build Command: `prisma generate && next build` (defined in `package.json`).
4. Trigger a deployment by pushing to `main` branch on GitHub:
   ```bash
   git push origin main
   ```
5. Verify that the production deployment succeeds and all pages (`/`, `/login`, `/register`, `/teams`, `/teams/:id`) are functional.

---

## RESTful API Endpoints Summary

| Method   | Path                             | Description                            | Access Control                                            |
| -------- | -------------------------------- | -------------------------------------- | --------------------------------------------------------- |
| `POST`   | `/api/auth/register`             | Register new user                      | Public                                                    |
| `POST`   | `/api/auth/login`                | Login and receive token                | Public                                                    |
| `POST`   | `/api/auth/logout`               | Logout (clear cookie)                  | Public                                                    |
| `GET`    | `/api/auth/me`                   | Current user profile                   | Authenticated user                                        |
| `GET`    | `/api/teams`                     | List current user's teams              | Authenticated user                                        |
| `POST`   | `/api/teams`                     | Create a new team                      | Authenticated user (becomes Owner)                        |
| `GET`    | `/api/teams/:id`                 | Get team details, members, tasks       | Team members & owner                                      |
| `PUT`    | `/api/teams/:id`                 | Update team name & description         | **Team Owner only** (403 otherwise)                       |
| `DELETE` | `/api/teams/:id`                 | Delete team and cascade tasks          | **Team Owner only** (403 otherwise)                       |
| `POST`   | `/api/teams/:id/members`         | Add member by email                    | **Team Owner only**                                       |
| `DELETE` | `/api/teams/:id/members/:userId` | Remove member from team                | **Team Owner only** (cannot remove self)                  |
| `GET`    | `/api/teams/:id/tasks`           | List tasks (supports search & filters) | Team members & owner                                      |
| `POST`   | `/api/teams/:id/tasks`           | Create task within team                | Any team member                                           |
| `PUT`    | `/api/tasks/:id`                 | Update task details / status           | Any team member                                           |
| `DELETE` | `/api/tasks/:id`                 | Delete a task                          | **Creator, assignee, or team Owner only** (403 otherwise) |

---

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
  User ||--o{ Team : "owns (ownerId)"
  User ||--o{ TeamMember : "joins (userId)"
  Team ||--o{ TeamMember : "has members (teamId)"
  Team ||--o{ Task : "contains (teamId)"
  User ||--o{ Task : "assigned to (assigneeId)"
  User ||--o{ Task : "created by (creatorId)"

  User {
    string id PK
    string name
    string email
    string passwordHash
    datetime createdAt
  }
  Team {
    string id PK
    string name
    string description
    string ownerId FK
    datetime createdAt
  }
  TeamMember {
    string id PK
    string teamId FK
    string userId FK
    enum role "OWNER | MEMBER"
    datetime joinedAt
  }
  Task {
    string id PK
    string title
    string description
    enum status "TODO | IN_PROGRESS | DONE"
    enum priority "LOW | MEDIUM | HIGH"
    datetime dueDate
    string teamId FK
    string assigneeId FK
    string creatorId FK
    datetime createdAt
  }
```

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Seed test account and data
npm run db:seed

# 4. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.
