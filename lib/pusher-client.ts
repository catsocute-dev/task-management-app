/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef } from "react";
import PusherClient, { Channel } from "pusher-js";

let clientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";

  if (!key) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = new PusherClient(key, {
      cluster,
      forceTLS: true,
    });
  }

  return clientInstance;
}

type EventCallback = (data: any) => void;

/**
 * React hook to subscribe to a Pusher channel and bind event handlers with auto cleanup.
 */
export function usePusherChannel(
  channelName: string | null | undefined,
  events: Record<string, EventCallback>,
) {
  const eventsRef = useRef(events);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    if (!channelName) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channel: Channel = pusher.subscribe(channelName);

    const handlers: Record<string, (data: any) => void> = {};

    Object.keys(eventsRef.current).forEach((eventName) => {
      handlers[eventName] = (data: any) => {
        if (eventsRef.current[eventName]) {
          eventsRef.current[eventName](data);
        }
      };
      channel.bind(eventName, handlers[eventName]);
    });

    return () => {
      Object.keys(handlers).forEach((eventName) => {
        channel.unbind(eventName, handlers[eventName]);
      });
      pusher.unsubscribe(channelName);
    };
  }, [channelName]);
}
