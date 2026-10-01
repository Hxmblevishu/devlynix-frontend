"use client";

import { Navbar } from "@/components/theme/Navbar";
import { RetroButton } from "@/components/theme/RetroButton";
import { RetroInput } from "@/components/theme/RetroInput";
import { TechnicalFrame } from "@/components/theme/TechnicalFrame";
import { api, ApiError, type Match, type Message } from "@/lib/api";
import { clearSession, getSession } from "@/lib/session";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

export default function MatchesPage() {
  const router = useRouter();
  const [token] = useState(() => getSession()?.token ?? "");
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
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

  // Real-time message synchronization & polling
  useEffect(() => {
    if (!token || selectedMatchId === null) {
      return;
    }

    // 1. Initial fetch
    api
      .getMessages(token, selectedMatchId)
      .then(setMessages)
      .catch((requestError) => handleRequestError(requestError));

    // 2. Auto-poll every 2 seconds for incoming messages from teammate
    const pollInterval = setInterval(() => {
      api
        .getMessages(token, selectedMatchId)
        .then((latest) => {
          setMessages((current) => {
            if (latest.length !== current.length) {
              return latest;
            }
            if (
              latest.length > 0 &&
              current.length > 0 &&
              latest[latest.length - 1].id !== current[current.length - 1].id
            ) {
              return latest;
            }
            return current;
          });
        })
        .catch(() => {});
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [handleRequestError, selectedMatchId, token]);

  // Smooth auto-scroll when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function logout() {
    clearSession();
    router.push("/");
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = message.trim();
    if (!content || !token || selectedMatchId === null) return;

    setSending(true);
    setError("");
    try {
      const sent = await api.sendMessage(token, selectedMatchId, content);
      setMessages((current) => [...current, sent]);
      setMessage("");
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      setSending(false);
    }
  }

  const selectedMatch = matches.find((match) => match.id === selectedMatchId);

  return (
    <main className="relative min-h-screen">
      <Navbar variant="dashboard" onLogout={logout} />

      <TechnicalFrame className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-8">
          <p className="font-mono text-[10px] tracking-widest text-text-secondary">COLLABORATION CHANNELS</p>
          <h1 className="font-display text-5xl text-accent md:text-7xl">MATCHES_AND_CHAT</h1>
        </div>

        {error && (
          <p className="mb-6 border border-accent/40 bg-accent/10 p-4 font-mono text-xs text-accent" role="alert">
            ! {error}
          </p>
        )}

        {loading ? (
          <p className="font-mono text-sm text-accent">SCANNING_MATCHES...</p>
        ) : matches.length === 0 ? (
          <div className="border border-dashed border-border p-10 text-center">
            <p className="font-mono text-xs text-text-secondary">NO_CONFIRMED_MATCHES_YET</p>
            <RetroButton href="/dashboard" className="mt-6">OPEN_DISCOVERY</RetroButton>
          </div>
        ) : (
          <div className="grid min-h-[560px] overflow-hidden border-2 border-accent lg:grid-cols-[320px_1fr]">
            <aside className="border-b border-accent bg-olive-light/15 p-4 lg:border-r lg:border-b-0">
              <p className="mb-4 font-mono text-[9px] text-text-secondary">ACTIVE_CHANNELS::{matches.length}</p>
              <div className="space-y-3">
                {matches.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => {
                      setMessages([]);
                      setSelectedMatchId(match.id);
                    }}
                    className={`w-full border p-4 text-left transition-colors ${
                      selectedMatchId === match.id
                        ? "border-accent bg-accent text-olive"
                        : "border-border text-text-primary hover:border-accent"
                    }`}
                  >
                    <span className="block font-heading text-lg font-bold">{match.user.name}</span>
                    <span className="mt-1 block font-mono text-[9px] opacity-70">
                      {match.user.skills.slice(0, 3).join(" / ") || "SKILLS_PENDING"}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="flex min-h-[560px] flex-col bg-olive/30">
              <div className="border-b border-border p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                    </span>
                    <p className="font-mono text-[9px] text-text-secondary">LIVE CHANNEL :: REAL-TIME AUTO-SYNC</p>
                  </div>
                  <h2 className="font-display text-3xl text-accent">
                    {selectedMatch?.user.name ?? "SELECT_A_MATCH"}
                  </h2>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5 max-h-[460px]">
                {messages.length === 0 ? (
                  <p className="font-mono text-[10px] text-text-secondary">
                    CHANNEL_EMPTY. TRANSMIT THE FIRST MESSAGE.
                  </p>
                ) : (
                  messages.map((chatMessage) => (
                    <article key={chatMessage.id} className="border-l-2 border-accent bg-olive-light/15 p-4">
                      <div className="flex justify-between gap-4 font-mono text-[9px] text-text-secondary">
                        <span className="font-bold">{chatMessage.senderName}</span>
                        <time>{new Date(chatMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                      </div>
                      <p className="mt-2 font-body text-sm text-text-primary whitespace-pre-wrap">{chatMessage.content}</p>
                    </article>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="grid gap-3 border-t border-border p-5 md:grid-cols-[1fr_auto] md:items-end">
                <RetroInput
                  label="Message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Pitch an idea or share a repository..."
                  maxLength={2000}
                  disabled={selectedMatchId === null || sending}
                />
                <RetroButton type="submit" disabled={!message.trim() || selectedMatchId === null || sending}>
                  {sending ? "TRANSMITTING..." : "TRANSMIT"}
                </RetroButton>
              </form>
            </section>
          </div>
        )}
      </TechnicalFrame>
    </main>
  );
}
