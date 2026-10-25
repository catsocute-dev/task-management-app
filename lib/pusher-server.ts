import Pusher from "pusher";

// Optional Pusher environment configuration with safe graceful fallback
const appId = process.env.PUSHER_APP_ID || "";
const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY || "";
const secret = process.env.PUSHER_SECRET || "";
const cluster =
  process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";

let pusherServerInstance: Pusher | null = null;

if (appId && key && secret) {
  pusherServerInstance = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
}

export const pusherServer = pusherServerInstance;

/**
 * Broadcast an event to a team-specific channel
 */
export async function triggerTeamEvent(
  teamId: string,
  channelType: "chat" | "tasks",
  eventName: string,
  data: unknown,
): Promise<void> {
  if (!pusherServer) {
    // If Pusher credentials are not yet configured in .env, log in development
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[Pusher Mock] team-${teamId}-${channelType} -> ${eventName}`,
        data,
      );
    }
    return;
  }

  try {
    const channelName = `team-${teamId}-${channelType}`;
    await pusherServer.trigger(channelName, eventName, data);
  } catch (error) {
    console.error("[Pusher Trigger Error]:", error);
  }
}

/**
 * Broadcast an event to a specific user's private channel
 */
export async function triggerUserEvent(
  userId: string,
  eventName: string,
  data: unknown,
): Promise<void> {
  if (!pusherServer) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[Pusher Mock] user-${userId}-notifications -> ${eventName}`,
        data,
      );
    }
    return;
  }

  try {
    const channelName = `user-${userId}-notifications`;
    await pusherServer.trigger(channelName, eventName, data);
  } catch (error) {
    console.error("[Pusher Trigger Error]:", error);
  }
}
