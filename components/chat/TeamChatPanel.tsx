"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  Paperclip,
  Users,
  MessageSquare,
  Sparkles,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";
import { Message, UserBasic } from "@/lib/task-types";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePusherChannel } from "@/lib/pusher-client";

interface TeamChatPanelProps {
  teamId: string;
  teamName: string;
  members: Array<{ user: UserBasic; role: string }>;
}

export function TeamChatPanel({
  teamId,
  teamName,
  members,
}: TeamChatPanelProps) {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  };

  // Fetch initial chat history
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/teams/${teamId}/chat`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch((err) => console.error("Failed to load team messages:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  useEffect(() => {
    if (!loading) {
      scrollToBottom(false);
    }
  }, [loading]);

  // Subscribe to real-time Pusher channel for this team's chat
  usePusherChannel(`team-${teamId}-chat`, {
    "new-message": (newMsg: Message) => {
      setMessages((prev) => {
        // Prevent duplicate messages if already optimistically added
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      // Clear typing indicator for this sender
      setTypingUsers((prev) => {
        const copy = { ...prev };
        delete copy[newMsg.senderId];
        return copy;
      });
      setTimeout(() => scrollToBottom(true), 50);
    },
    typing: (data: { userId: string; userName: string; isTyping: boolean }) => {
      if (data.userId === currentUser?.id) return;

      setTypingUsers((prev) => {
        const copy = { ...prev };
        if (data.isTyping) {
          copy[data.userId] = data.userName;
        } else {
          delete copy[data.userId];
        }
        return copy;
      });

      // Auto-clear after 4 seconds of inactivity
      if (data.isTyping) {
        setTimeout(() => {
          setTypingUsers((prev) => {
            const copy = { ...prev };
            delete copy[data.userId];
            return copy;
          });
        }, 4000);
      }
    },
  });

  // Broadcast typing status to teammates
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      fetch(`/api/teams/${teamId}/chat/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping: true }),
      }).catch(() => {});
    }

    typingTimeoutRef.current = setTimeout(() => {
      fetch(`/api/teams/${teamId}/chat/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping: false }),
      }).catch(() => {});
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text && !fileUrl) return;

    const payload = {
      content: text,
      fileUrl: fileUrl.trim() || undefined,
      fileName: fileUrl ? "Attachment" : undefined,
    };

    setInputText("");
    setFileUrl("");
    setShowAttachModal(false);
    setSending(true);

    try {
      const res = await fetch(`/api/teams/${teamId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const createdMsg = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === createdMsg.id)) return prev;
          return [...prev, createdMsg];
        });
        setTimeout(() => scrollToBottom(true), 50);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const typingNames = Object.values(typingUsers);

  return (
    <div className="flex flex-col h-[650px] bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      {/* Chat Room Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 bg-zinc-50/80">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <span>#{teamName.toLowerCase().replace(/\s+/g, "-")}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Chat
              </span>
            </h3>
            <p className="text-xs text-zinc-500">
              {members.length} team members with access
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Users className="h-3.5 w-3.5 text-zinc-400" />
          <span>Real-time channel:</span>
          <code className="bg-zinc-200/70 px-1.5 py-0.5 rounded text-[11px] font-mono text-zinc-700">
            team-{teamId.slice(0, 6)}...
          </code>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-zinc-50/40 to-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-400">
            <div className="h-7 w-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">
              Connecting to live chat...
            </span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
              <Sparkles className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-800">
              Welcome to the #{teamName} chat!
            </h4>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">
              Say hello to your teammates. Messages are delivered in real time
              and persisted in the database.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${
                  isMe ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Sender Avatar */}
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs ${
                    isMe
                      ? "bg-indigo-600"
                      : "bg-gradient-to-br from-emerald-500 to-teal-600"
                  }`}
                  title={msg.sender?.name || "Member"}
                >
                  {(msg.sender?.name || "M").charAt(0).toUpperCase()}
                </div>

                {/* Message Bubble Container */}
                <div
                  className={`flex flex-col max-w-[75%] sm:max-w-[65%] ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-zinc-700">
                      {isMe ? "You" : msg.sender?.name || "Teammate"}
                    </span>
                    <span className="text-[10px] text-zinc-400">{timeStr}</span>
                  </div>

                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-tr-xs"
                        : "bg-zinc-100 text-zinc-800 border border-zinc-200/80 rounded-tl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>

                    {/* Attachment preview if any */}
                    {msg.fileUrl && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        {msg.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg overflow-hidden border border-black/10 hover:opacity-90 transition-opacity"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={msg.fileUrl}
                              alt="Attached image"
                              className="max-h-48 object-cover rounded"
                            />
                          </a>
                        ) : (
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 text-xs underline font-medium ${
                              isMe
                                ? "text-indigo-100 hover:text-white"
                                : "text-indigo-600 hover:text-indigo-800"
                            }`}
                          >
                            <Paperclip className="h-3 w-3" />
                            <span>{msg.fileName || "View Attachment"}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator Bar */}
      {typingNames.length > 0 && (
        <div className="px-5 py-1.5 bg-zinc-50 border-t border-zinc-100 flex items-center gap-2 text-xs text-indigo-600 font-medium animate-pulse">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" />
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
          </div>
          <span>
            {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"}{" "}
            typing...
          </span>
        </div>
      )}

      {/* Attachment Modal Input */}
      {showAttachModal && (
        <div className="p-3 bg-zinc-100/90 border-t border-zinc-200 flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-zinc-500 shrink-0" />
          <input
            type="url"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="Paste image URL (https://example.com/image.png)..."
            className="flex-1 px-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowAttachModal(false)}
            className="px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-200 rounded"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Message Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-zinc-200 bg-white flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setShowAttachModal(!showAttachModal)}
          className={`p-2 rounded-lg border transition-colors ${
            showAttachModal || fileUrl
              ? "bg-indigo-50 border-indigo-200 text-indigo-600"
              : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
          }`}
          title="Attach image link"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder={`Message #${teamName.toLowerCase().replace(/\s+/g, "-")}...`}
          className="flex-1 px-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-zinc-400"
        />

        <button
          type="submit"
          disabled={sending || (!inputText.trim() && !fileUrl)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
        >
          <span>Send</span>
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
