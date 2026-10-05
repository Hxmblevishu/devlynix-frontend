"use client";

import { Navbar } from "@/components/theme/Navbar";
import { RetroButton } from "@/components/theme/RetroButton";
import { RetroInput } from "@/components/theme/RetroInput";
import { TechnicalFrame } from "@/components/theme/TechnicalFrame";
import { TeammateIntelPanel } from "@/components/theme/TeammateIntelPanel";
import {
  api,
  ApiError,
  getAvatarUrl,
  getGithubUsername,
  type Match,
  type Message,
} from "@/lib/api";
import { soundFx } from "@/lib/sound";
import { clearSession, getSession } from "@/lib/session";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

interface ExtendedMessage extends Message {
  isOptimistic?: boolean;
}

export default function MatchesPage() {
  const router = useRouter();
  const [token] = useState(() => getSession()?.token ?? "");
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [isIntelOpen, setIsIntelOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleRequestError = useCallback(
    (requestError: unknown) => {
      if (requestError instanceof ApiError && requestError.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Unable to load match data.",
      );
    },
    [router],
  );

  // Fetch all matches on mount
  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    api
      .getMatches(token)
      .then((results) => {
        setMatches(results);
        const firstMatchId = results.find((match) => match.id !== null)?.id ?? null;
        setSelectedMatchId(firstMatchId);
      })
      .catch((requestError) => handleRequestError(requestError))
      .finally(() => setLoading(false));
  }, [handleRequestError, router, token]);

  // Real-time message synchronization with Tab Inactivity Backoff & Delta Sync
  useEffect(() => {
    if (!token || selectedMatchId === null) {
      return;
    }

    let isMounted = true;

    // 1. Mark as read and fetch full conversation
    api.markChatAsRead(token, selectedMatchId);
    setMatches((current) =>
      current.map((m) => (m.id === selectedMatchId ? { ...m, unreadCount: 0 } : m)),
    );

    api
      .getMessages(token, selectedMatchId)
      .then((initialMessages) => {
        if (isMounted) setMessages(initialMessages);
      })
      .catch((requestError) => handleRequestError(requestError));

    // 2. Adaptive Delta Polling (2s when tab active, 30s when backgrounded)
    let pollTimer: NodeJS.Timeout;

    function fetchLatestMessages() {
      if (!isMounted || selectedMatchId === null) return;

      setMessages((current) => {
        const lastRealMsg = current.filter((m) => !m.isOptimistic).slice(-1)[0];
        const afterId = lastRealMsg ? lastRealMsg.id : undefined;

        api
          .getMessages(token, selectedMatchId!, afterId)
          .then((newMessages) => {
            if (!isMounted || newMessages.length === 0) return;
            soundFx.playMessageReceived();
            setMessages((prev) => {
              const optimistic = prev.filter((m) => m.isOptimistic);
              const existingIds = new Set(prev.map((m) => m.id));
              const fresh = newMessages.filter((m) => !existingIds.has(m.id));
              if (fresh.length === 0) return prev;
              return [...prev.filter((m) => !m.isOptimistic), ...fresh, ...optimistic];
            });
            api.markChatAsRead(token, selectedMatchId!);
          })
          .catch(() => {});
        return current;
      });
    }

    function setupPolling() {
      clearInterval(pollTimer);
      const isVisible = typeof document !== "undefined" && document.visibilityState === "visible";
      const intervalMs = isVisible ? 2000 : 30000;
      pollTimer = setInterval(fetchLatestMessages, intervalMs);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchLatestMessages(); // Instant refresh on tab focus
      }
      setupPolling();
    }

    setupPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleRequestError, selectedMatchId, token]);

  // Smooth auto-scroll when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function logout() {
    clearSession();
    router.push("/");
  }

  // Optimistic message sending
  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = message.trim();
    if (!content || !token || selectedMatchId === null) return;

    const currentMatch = matches.find((m) => m.id === selectedMatchId);
    const session = getSession();
    const tempId = -Date.now();

    // Create optimistic message
    const optimisticMessage: ExtendedMessage = {
      id: tempId,
      matchId: selectedMatchId,
      senderId: session?.user.id ?? 0,
      senderName: session?.user.name ?? "You",
      content,
      sentAt: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages((current) => [...current, optimisticMessage]);
    setMessage("");
    setSending(true);
    setError("");
    soundFx.playMessageSent();

    try {
      const sent = await api.sendMessage(token, selectedMatchId, content);
      // Replace optimistic message with confirmed server message
      setMessages((current) =>
        current.map((m) => (m.id === tempId ? sent : m)),
      );
    } catch (requestError) {
      // Remove failed optimistic message and restore input
      setMessages((current) => current.filter((m) => m.id !== tempId));
      setMessage(content);
      handleRequestError(requestError);
    } finally {
      setSending(false);
    }
  }

  async function handleUnmatch() {
    if (!token || selectedMatchId === null) return;
    const confirmUnmatch = window.confirm(
      "CONFIRMATION REQUIRED // Terminate connection and permanently erase chat with this developer?",
    );
    if (!confirmUnmatch) return;

    try {
      await api.unmatch(token, selectedMatchId);
      soundFx.playSwipePass();
      const matchIdToDrop = selectedMatchId;
      setMatches((current) => current.filter((m) => m.id !== matchIdToDrop));
      setMessages([]);
      setIsIntelOpen(false);
      const remaining = matches.filter((m) => m.id !== matchIdToDrop);
      setSelectedMatchId(remaining.length > 0 ? (remaining[0].id ?? null) : null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to unmatch.");
    }
  }

  const selectedMatch = matches.find((match) => match.id === selectedMatchId);
  const teammateAvatar = getAvatarUrl(selectedMatch?.user.githubUrl);
  const teammateGithub = getGithubUsername(selectedMatch?.user.githubUrl);

  return (
    <main className="relative min-h-screen">
      <Navbar variant="dashboard" onLogout={logout} />

      <TechnicalFrame className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-text-secondary">
              COLLABORATION CHANNELS
            </p>
            <h1 className="font-display text-5xl text-accent md:text-7xl">MATCHES_AND_CHAT</h1>
          </div>
          {matches.length > 0 && (
            <span className="font-mono text-[10px] text-text-secondary">
              ACTIVE_COMMUNICATIONS::{matches.length}
            </span>
          )}
        </div>

        {error && (
          <p className="mb-6 border border-accent/40 bg-accent/10 p-4 font-mono text-xs text-accent" role="alert">
            ! {error}
          </p>
        )}

        {loading ? (
          <p className="font-mono text-sm text-accent animate-pulse">SCANNING_MATCHES...</p>
        ) : matches.length === 0 ? (
          <div className="border border-dashed border-border p-10 text-center">
            <p className="font-mono text-xs text-text-secondary">NO_CONFIRMED_MATCHES_YET</p>
            <RetroButton href="/dashboard" className="mt-6">OPEN_DISCOVERY</RetroButton>
          </div>
        ) : (
          <div className="grid min-h-[600px] overflow-hidden border-2 border-accent lg:grid-cols-[300px_1fr]">
            {/* Matches Sidebar */}
            <aside className="border-b border-accent bg-olive-light/15 p-4 lg:border-r lg:border-b-0">
              <p className="mb-4 font-mono text-[9px] text-text-secondary">
                ACTIVE_CHANNELS::{matches.length}
              </p>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {matches.map((match) => {
                  const isSelected = selectedMatchId === match.id;
                  const avatar = getAvatarUrl(match.user.githubUrl);

                  return (
                    <button
                      key={match.id}
                      type="button"
                      onClick={() => {
                        setMessages([]);
                        setSelectedMatchId(match.id);
                      }}
                      className={`w-full border p-3 text-left transition-all ${
                        isSelected
                          ? "border-accent bg-accent text-olive shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                          : "border-border text-text-primary hover:border-accent bg-olive-light/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatar}
                            alt={match.user.name}
                            className={`h-10 w-10 border object-cover ${
                              isSelected ? "border-olive" : "border-accent"
                            }`}
                          />
                        ) : (
                          <div
                            className={`flex h-10 w-10 items-center justify-center border font-display text-lg ${
                              isSelected
                                ? "border-olive bg-olive text-accent"
                                : "border-accent bg-olive text-accent"
                            }`}
                          >
                            {match.user.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="block font-heading text-base font-bold truncate">
                              {match.user.name}
                            </span>
                            {Boolean(match.unreadCount && match.unreadCount > 0) && (
                              <span className="border border-accent bg-accent px-1.5 py-0.5 font-mono text-[8px] font-bold text-olive uppercase shrink-0">
                                {match.unreadCount} NEW
                              </span>
                            )}
                          </div>
                          <span
                            className={`mt-0.5 block font-mono text-[9px] truncate ${
                              isSelected ? "text-olive/80" : "text-text-secondary"
                            }`}
                          >
                            {match.user.skills.slice(0, 3).join(" / ") || "SKILLS_PENDING"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Chat Conversation View with Teammate Intel Drawer */}
            <div className="flex flex-col lg:flex-row flex-1 min-h-[600px] bg-olive/30 overflow-hidden">
              <section className="flex flex-col flex-1 min-h-[500px]">
                {/* Chat Header */}
                <div className="border-b border-border p-4 flex flex-wrap items-center justify-between gap-4 bg-olive-light/10">
                  <div className="flex items-center gap-3">
                    {teammateAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={teammateAvatar}
                        alt={selectedMatch?.user.name ?? ""}
                        className="h-10 w-10 border border-accent object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center border border-accent bg-olive font-display text-lg text-accent">
                        {selectedMatch?.user.name.slice(0, 2).toUpperCase() ?? "??"}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                        </span>
                        <p className="font-mono text-[9px] text-text-secondary">
                          LIVE CHANNEL :: AUTO-SYNC
                        </p>
                      </div>
                      <h2 className="font-display text-2xl text-accent">
                        {selectedMatch?.user.name ?? "SELECT_A_MATCH"}
                      </h2>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {teammateGithub && (
                      <a
                        href={`https://github.com/${teammateGithub}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] text-accent hover:bg-accent hover:text-olive transition-colors"
                      >
                        GITHUB: @{teammateGithub} ↗
                      </a>
                    )}
                    {selectedMatch && (
                      <button
                        type="button"
                        onClick={() => setIsIntelOpen((prev) => !prev)}
                        className={`border px-3 py-1 font-heading text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          isIntelOpen
                            ? "border-accent bg-accent text-olive"
                            : "border-accent text-accent hover:bg-accent/20"
                        }`}
                      >
                        {isIntelOpen ? "[HIDE_INTEL]" : "[TEAMMATE_INTEL]"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 space-y-4 overflow-y-auto p-5 max-h-[460px]">
                  {messages.length === 0 ? (
                    <div className="border border-dashed border-border p-8 text-center">
                      <p className="font-mono text-xs text-text-secondary">
                        CHANNEL_EMPTY. TRANSMIT THE FIRST COLLABORATION MESSAGE.
                      </p>
                    </div>
                  ) : (
                    messages.map((chatMessage) => {
                      const isMe =
                        chatMessage.senderName === "You" ||
                        chatMessage.senderId === getSession()?.user.id;

                      return (
                        <article
                          key={chatMessage.id}
                          className={`p-4 border-l-2 ${
                            chatMessage.isOptimistic
                              ? "border-accent/40 bg-accent/5 opacity-80"
                              : isMe
                              ? "border-accent bg-olive-light/25 ml-6"
                              : "border-border bg-olive-light/15 mr-6"
                          }`}
                        >
                          <div className="flex justify-between gap-4 font-mono text-[9px] text-text-secondary">
                            <span className={`font-bold ${isMe ? "text-accent" : "text-text-primary"}`}>
                              {chatMessage.senderName}
                            </span>
                            <div className="flex items-center gap-2">
                              {chatMessage.isOptimistic && (
                                <span className="text-[8px] text-accent font-mono animate-pulse">
                                  [TRANSMITTING...]
                                </span>
                              )}
                              <time>
                                {new Date(chatMessage.sentAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </time>
                            </div>
                          </div>
                          <p className="mt-2 font-body text-sm text-text-primary whitespace-pre-wrap">
                            {chatMessage.content}
                          </p>
                        </article>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Form */}
                <form
                  onSubmit={handleSend}
                  className="grid gap-3 border-t border-border p-4 md:grid-cols-[1fr_auto] md:items-end bg-olive-light/10"
                >
                  <RetroInput
                    label="Transmit Message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Pitch a repository, define a role, or plan hackathon architecture..."
                    maxLength={2000}
                    disabled={selectedMatchId === null || sending}
                  />
                  <RetroButton
                    type="submit"
                    disabled={!message.trim() || selectedMatchId === null || sending}
                    className="py-2.5 px-6"
                  >
                    {sending ? "TRANSMITTING..." : "TRANSMIT"}
                  </RetroButton>
                </form>
              </section>

              {/* Collapsible Teammate Intel Panel */}
              {isIntelOpen && selectedMatch && (
                <TeammateIntelPanel
                  user={selectedMatch.user}
                  onClose={() => setIsIntelOpen(false)}
                  onUnmatch={handleUnmatch}
                />
              )}
            </div>
          </div>
        )}
      </TechnicalFrame>
    </main>
  );
}
