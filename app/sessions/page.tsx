"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/theme/Navbar";
import { RetroButton } from "@/components/theme/RetroButton";
import { TechnicalFrame } from "@/components/theme/TechnicalFrame";
import { api, type SessionDevice } from "@/lib/api";
import { parseDevice } from "@/lib/device";
import { clearSession, getSession, subscribeSession } from "@/lib/session";
import { soundFx } from "@/lib/sound";

export default function SessionsPage() {
  const router = useRouter();
  const [token, setToken] = useState(() => getSession()?.token ?? "");
  const [sessions, setSessions] = useState<SessionDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Termination loading states
  const [terminatingId, setTerminatingId] = useState<number | null>(null);
  const [terminatingOthers, setTerminatingOthers] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  useEffect(() => {
    return subscribeSession((newSession) => {
      if (newSession?.token) {
        setToken(newSession.token);
      }
    });
  }, []);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchSessions();
  }, [token, router]);

  async function fetchSessions() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSessions(token);
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load active sessions");
    } finally {
      setLoading(false);
    }
  }

  function handleSound() {
    soundFx.playSwipePass();
  }

  // 1. Logout of THIS device only
  async function handleLogoutThisDevice() {
    handleSound();
    try {
      await api.logout();
    } catch {
      clearSession();
    }
    router.push("/");
  }

  // 2. Terminate a single remote device session
  async function handleTerminateSession(sessionId: number) {
    handleSound();
    setTerminatingId(sessionId);
    setActionMessage(null);
    setError(null);
    try {
      await api.terminateSession(token, sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setActionMessage("Remote device session revoked successfully.");
      soundFx.playSwipeLike();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to terminate remote session.");
    } finally {
      setTerminatingId(null);
    }
  }

  // 3. Disconnect all other devices (keep current active)
  async function handleTerminateOtherSessions() {
    const confirm = window.confirm(
      "Are you sure you want to disconnect all other active devices? You will remain signed in on this device."
    );
    if (!confirm) return;

    handleSound();
    setTerminatingOthers(true);
    setActionMessage(null);
    setError(null);
    try {
      await api.terminateOtherSessions(token);
      setSessions((prev) => prev.filter((s) => s.current));
      setActionMessage("All remote sessions terminated. Only this device remains authenticated.");
      soundFx.playSwipeLike();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to terminate other sessions.");
    } finally {
      setTerminatingOthers(false);
    }
  }

  // 4. Logout of ALL devices (nuclear logout everywhere)
  async function handleLogoutAll() {
    const confirm = window.confirm(
      "WARNING: This will immediately revoke ALL active sessions across every device and browser, logging you out completely. Continue?"
    );
    if (!confirm) return;

    handleSound();
    setLoggingOutAll(true);
    try {
      await api.logoutAll(token);
    } catch {
      clearSession();
    }
    router.push("/login");
  }

  // 5. Purge expired and revoked tokens from Neon DB directly
  const [purging, setPurging] = useState(false);
  async function handlePurgeDatabase() {
    handleSound();
    setPurging(true);
    setActionMessage(null);
    setError(null);
    try {
      const res = await api.cleanupTokens();
      setActionMessage(
        `Database cleanup executed: ${res.purgedCount} stale/revoked refresh tokens purged from Neon DB.`
      );
      soundFx.playSwipeLike();
      fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run database cleanup.");
    } finally {
      setPurging(false);
    }
  }

  const currentSession = sessions.find((s) => s.current);
  const otherSessions = sessions.filter((s) => !s.current);

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="min-h-screen bg-olive text-text-primary selection:bg-accent selection:text-olive">
      <Navbar variant="dashboard" onLogout={handleLogoutThisDevice} />

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        {/* Header telemetry frame */}
        <TechnicalFrame className="mb-8 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(205,255,0,0.6)]" />
                <h1 className="font-display text-2xl uppercase tracking-tighter text-accent md:text-3xl">
                  ACTIVE SESSIONS & DEVICE SECURITY
                </h1>
              </div>
              <p className="mt-2 font-mono text-xs text-text-secondary leading-relaxed max-w-2xl">
                Refresh Token Rotation (RTR) is actively protecting your account. Each device operates in an
                isolated token family lineage. Revoking a session invalidates that lineage and triggers theft
                defense if compromised tokens are reused.
              </p>
            </div>

            {/* Quick action controls */}
            <div className="flex flex-wrap items-center gap-3">
              <RetroButton
                variant="outline"
                onClick={handlePurgeDatabase}
                disabled={purging}
                className="text-xs px-4 py-2 border-accent/60 text-accent hover:bg-accent/10"
              >
                {purging ? "PURGING..." : "PURGE NEON DB TOKENS"}
              </RetroButton>

              <RetroButton
                variant="outline"
                onClick={handleLogoutThisDevice}
                className="text-xs px-4 py-2 border-border/80 hover:border-accent"
              >
                LOGOUT THIS DEVICE
              </RetroButton>

              <RetroButton
                variant="secondary"
                onClick={handleLogoutAll}
                disabled={loggingOutAll}
                className="text-xs px-4 py-2 border-red-500/60 text-red-400 hover:bg-red-500 hover:text-black"
              >
                {loggingOutAll ? "REVOKING ALL..." : "LOGOUT EVERYWHERE"}
              </RetroButton>
            </div>
          </div>
        </TechnicalFrame>

        {/* Status Alerts */}
        {actionMessage && (
          <div className="mb-6 border border-accent bg-accent/10 px-4 py-3 font-mono text-xs text-accent flex items-center justify-between">
            <span>[SYS_ALERT] {actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-text-secondary hover:text-accent font-bold"
            >
              [X]
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 border border-red-500/50 bg-red-950/20 px-4 py-3 font-mono text-xs text-red-400 flex items-center justify-between">
            <span>[ERR] {error}</span>
            <button
              onClick={() => setError(null)}
              className="text-text-secondary hover:text-red-400 font-bold"
            >
              [X]
            </button>
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin border-2 border-accent border-t-transparent" />
            <span className="mt-4 font-mono text-xs uppercase tracking-widest text-accent">
              SCANNING CONNECTED DEVICES...
            </span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. CURRENT ACTIVE DEVICE */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-accent">
                    THIS DEVICE (CURRENT SESSION)
                  </span>
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 font-mono text-[9px] font-bold text-accent">
                    PRIMARY
                  </span>
                </div>
              </div>

              {currentSession ? (
                (() => {
                  const dev = parseDevice(currentSession.deviceInfo);
                  return (
                    <div className="border-2 border-accent bg-olive-light/60 p-5 shadow-[4px_4px_0_0_rgba(205,255,0,0.2)]">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-2xl" role="img" aria-label={dev.badge}>
                              {dev.icon}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-display text-lg tracking-wide text-text-primary">
                                  {dev.title}
                                </span>
                                <span className="rounded border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[9px] font-bold text-accent">
                                  {dev.badge}
                                </span>
                              </div>
                              <span className="font-mono text-xs text-text-secondary">
                                {dev.platform}
                              </span>
                            </div>
                            <span className="flex items-center gap-1.5 font-mono text-[10px] text-accent ml-2">
                              <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
                              ONLINE NOW
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-text-secondary pt-1">
                            <div>
                              <span className="text-text-secondary/50">IP ADDRESS: </span>
                              <span className="text-accent/90">{currentSession.ipAddress || "127.0.0.1"}</span>
                            </div>
                            <div>
                              <span className="text-text-secondary/50">LAST ACTIVE: </span>
                              <span>{formatDate(currentSession.lastActive)}</span>
                            </div>
                            <div>
                              <span className="text-text-secondary/50">SESSION STARTED: </span>
                              <span>{formatDate(currentSession.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <RetroButton
                            variant="outline"
                            onClick={handleLogoutThisDevice}
                            className="text-xs px-4 py-2 border-border hover:border-accent"
                          >
                            DISCONNECT THIS DEVICE
                          </RetroButton>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="border border-border/50 bg-olive-light/20 p-4 font-mono text-xs text-text-secondary">
                  Current session telemetry unavailable.
                </div>
              )}
            </div>

            {/* 2. OTHER ACTIVE REMOTE DEVICES */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-text-primary">
                    OTHER CONNECTED DEVICES ({otherSessions.length})
                  </span>
                </div>

                {otherSessions.length > 0 && (
                  <button
                    onClick={handleTerminateOtherSessions}
                    disabled={terminatingOthers}
                    className="font-mono text-xs font-bold uppercase text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    {terminatingOthers ? "[TERMINATING...]" : "[DISCONNECT ALL OTHER DEVICES]"}
                  </button>
                )}
              </div>

              {otherSessions.length === 0 ? (
                <div className="border border-border/40 bg-olive-light/20 p-8 text-center">
                  <span className="font-mono text-xs text-text-secondary">
                    No other active sessions detected. Your account is only signed in on this device.
                  </span>
                </div>
              ) : (
                <div className="grid gap-4">
                  {otherSessions.map((session) => {
                    const dev = parseDevice(session.deviceInfo);
                    return (
                      <div
                        key={session.id}
                        className="border border-border/70 bg-olive-light/30 p-5 transition-colors hover:border-border"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-2xl" role="img" aria-label={dev.badge}>
                                {dev.icon}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-heading text-sm font-bold tracking-wide text-text-primary">
                                    {dev.title}
                                  </span>
                                  <span className="rounded bg-border/40 px-2 py-0.5 font-mono text-[9px] uppercase text-text-secondary">
                                    {dev.badge}
                                  </span>
                                </div>
                                <span className="font-mono text-xs text-text-secondary">
                                  {dev.platform}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-text-secondary pt-1">
                              <div>
                                <span className="text-text-secondary/50">IP ADDRESS: </span>
                                <span>{session.ipAddress || "Unknown"}</span>
                              </div>
                              <div>
                                <span className="text-text-secondary/50">LAST ACTIVITY: </span>
                                <span>{formatDate(session.lastActive)}</span>
                              </div>
                              <div>
                                <span className="text-text-secondary/50">AUTHENTICATED: </span>
                                <span>{formatDate(session.createdAt)}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => handleTerminateSession(session.id)}
                              disabled={terminatingId === session.id}
                              className="font-mono text-xs font-bold uppercase tracking-wider text-red-400 hover:text-red-300 border border-red-500/40 px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 transition-colors disabled:opacity-50"
                            >
                              {terminatingId === session.id ? "REVOKING..." : "REVOKE ACCESS"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Architecture Details Footer Frame */}
            <div className="border border-border/40 bg-olive-light/10 p-4 font-mono text-[11px] text-text-secondary/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-accent rounded-full" />
                <span>RTR TOKEN LIFETIME: 10m ACCESS // 7d REFRESH</span>
              </div>
              <div className="flex items-center gap-4">
                <span>REPLAY DETECTION WINDOW: 24h</span>
                <span>RATE LIMIT: 60 REQ/MIN</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
