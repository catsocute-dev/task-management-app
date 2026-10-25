import { Role } from "./task-types";

/**
 * 3-Tier Role Permission Rules (Assignment 3 & 4)
 * - OWNER: Full control: manage members, roles, delete team, delete any task
 * - ADMIN: Can manage members and all tasks, but cannot delete the team
 * - MEMBER: Can create and manage their own tasks, and view everything else
 */

export function canDeleteTeam(role?: Role | null): boolean {
  return role === "OWNER";
}

export function canEditTeam(role?: Role | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageMembers(role?: Role | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canChangeMemberRole(
  actorRole: Role,
  targetCurrentRole: Role,
  targetNewRole: Role,
): boolean {
  // Only OWNER can promote to ADMIN or demote from ADMIN
  if (targetCurrentRole === "ADMIN" || targetNewRole === "ADMIN") {
    return actorRole === "OWNER";
  }
  // Nobody can change OWNER's role
  if (targetCurrentRole === "OWNER") {
    return false;
  }
  return actorRole === "OWNER" || actorRole === "ADMIN";
}

export function canRemoveMember(
  actorRole: Role,
  targetRole: Role,
  isSelf: boolean,
): boolean {
  // Members can leave themselves (except owner cannot leave without deleting team)
  if (isSelf) {
    return targetRole !== "OWNER";
  }
  // Nobody can remove OWNER
  if (targetRole === "OWNER") {
    return false;
  }
  // OWNER can remove ADMIN or MEMBER
  if (actorRole === "OWNER") {
    return true;
  }
  // ADMIN can only remove regular MEMBERS
  if (actorRole === "ADMIN" && targetRole === "MEMBER") {
    return true;
  }
  return false;
}

export function canCreateTask(role?: Role | null): boolean {
  return Boolean(role); // Any valid team member (OWNER, ADMIN, MEMBER)
}

export function canEditTask(
  role: Role,
  isCreator: boolean,
  isAssignee: boolean,
): boolean {
  if (role === "OWNER" || role === "ADMIN") return true;
  // Members can edit tasks they created or tasks assigned to them
  return isCreator || isAssignee;
}

export function canDeleteTask(role: Role, isCreator: boolean): boolean {
  if (role === "OWNER" || role === "ADMIN") return true;
  // Regular members can only delete tasks they personally created
  return isCreator;
}
