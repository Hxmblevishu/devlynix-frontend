import { clearSession, getSession, updateSessionTokens } from "@/lib/session";

export interface Profile {
  id: number;
  name: string;
  email: string;
  githubUrl: string | null;
  bio: string | null;
  lookingFor: string | null;
  location: string | null;
  projectPitch?: string | null;
  skills: string[];
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: Profile;
}

export interface SessionDevice {
  id: number;
  deviceInfo: string;
  ipAddress: string;
  lastActive: string;
  createdAt: string;
  current: boolean;
}

export interface DiscoverResult {
  profile: Profile;
  sharedSkillCount: number;
  sharedSkills: string[];
  synergyScore?: number;
}

export interface Match {
  id: number | null;
  user: Profile;
  matchedAt: string | null;
  matched: boolean;
  unreadCount?: number;
}

export interface Message {
  id: number;
  matchId: number;
  senderId: number;
  senderName: string;
  content: string;
  sentAt: string;
  isRead?: boolean;
  readAt?: string | null;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  githubUrl?: string;
  projectPitch?: string;
  skills: string[];
}

export interface UpdateProfilePayload {
  name?: string;
  githubUrl?: string;
  bio?: string;
  lookingFor?: string;
  location?: string;
  projectPitch?: string;
  skills?: string[];
}

export type SwipeDirection = "LIKE" | "PASS";

interface ApiErrorBody {
  message?: string;
  error?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://devlynix-buildathon-2-0.onrender.com/api"
    : "http://localhost:8080/api");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Concurrency-safe promise for rotating token when multiple calls receive 401 simultaneously
let refreshPromise: Promise<string | null> | null = null;

async function executeSilentRefresh(): Promise<string | null> {
  const session = getSession();
  const currentRefreshToken = session?.refreshToken;
  if (!currentRefreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Refresh-Token": currentRefreshToken,
          },
          body: JSON.stringify({ refreshToken: currentRefreshToken }),
        });

        if (!response.ok) {
          clearSession();
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.startsWith("/login") &&
            !window.location.pathname.startsWith("/register")
          ) {
            window.location.href = "/login";
          }
          return null;
        }

        const data = (await response.json()) as AuthResponse;
        updateSessionTokens(data.token, data.refreshToken);
        return data.token;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
  refreshTokenHeader?: string,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Intercept 401 Unauthorized for automatic token rotation & silent retry
  const isAuthRoute =
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/register") ||
    path.startsWith("/auth/refresh") ||
    path.startsWith("/auth/logout") ||
    path.startsWith("/auth/logout-all");

  const session = getSession();
  const effectiveToken = session?.token || token;
  if (effectiveToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${effectiveToken}`);
  }
  if (refreshTokenHeader && !headers.has("X-Refresh-Token")) {
    headers.set("X-Refresh-Token", refreshTokenHeader);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      "Backend is unreachable. Start Spring Boot on port 8080 and try again.",
      0,
    );
  }

  if (response.status === 401 && !isAuthRoute) {
    const newToken = await executeSilentRefresh();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      try {
        response = await fetch(`${API_BASE_URL}${path}`, {
          ...options,
          headers,
        });
      } catch {
        throw new ApiError("Failed to re-issue request after token refresh", 0);
      }
    }
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      body?.message ?? body?.error ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getGithubUsername(url?: string | null): string | null {
  if (!url) return null;
  const cleaned = url.trim().replace(/\/+$/, "");
  const match = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]+$/.test(cleaned) && !cleaned.includes(".")) return cleaned;
  return null;
}

export function getAvatarUrl(url?: string | null): string | null {
  const username = getGithubUsername(url);
  return username ? `https://github.com/${username}.png?size=120` : null;
}

export const api = {
  register(payload: RegisterPayload) {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  login(email: string, password: string) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  refreshToken(refreshToken: string) {
    return request<AuthResponse>(
      "/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      },
      undefined,
      refreshToken,
    );
  },

  logout(refreshToken?: string) {
    const session = getSession();
    const tokenToDrop = refreshToken ?? session?.refreshToken;
    return request<void>(
      "/auth/logout",
      {
        method: "POST",
        body: tokenToDrop ? JSON.stringify({ refreshToken: tokenToDrop }) : undefined,
      },
      session?.token,
      tokenToDrop,
    ).finally(() => {
      clearSession();
    });
  },

  getSessions(token: string, currentRefreshToken?: string) {
    return request<SessionDevice[]>(
      "/auth/sessions",
      {},
      token,
      currentRefreshToken ?? getSession()?.refreshToken,
    );
  },

  terminateSession(token: string, sessionId: number) {
    return request<void>(
      `/auth/sessions/${sessionId}`,
      { method: "DELETE" },
      token,
    );
  },

  terminateOtherSessions(token: string, currentRefreshToken?: string) {
    const refreshToken = currentRefreshToken ?? getSession()?.refreshToken;
    return request<void>(
      "/auth/sessions/terminate-others",
      {
        method: "POST",
        body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
      },
      token,
      refreshToken,
    );
  },

  logoutAll(token?: string) {
    const session = getSession();
    const bearer = token ?? session?.token;
    return request<void>(
      "/auth/logout-all",
      { method: "POST" },
      bearer,
    ).finally(() => {
      clearSession();
    });
  },

  getProfile(token: string) {
    return request<Profile>("/profile/me", {}, token);
  },

  updateProfile(token: string, payload: UpdateProfilePayload) {
    return request<Profile>(
      "/profile/me",
      { method: "PATCH", body: JSON.stringify(payload) },
      token,
    ).catch(async (err) => {
      if (err instanceof ApiError && (err.status === 405 || err.status === 400)) {
        return request<Profile>(
          "/profile/me",
          { method: "PUT", body: JSON.stringify(payload) },
          token,
        );
      }
      throw err;
    });
  },

  discover(token: string, skill?: string, page: number = 0, size: number = 50) {
    const params = new URLSearchParams();
    if (skill) params.set("skill", skill);
    if (page > 0) params.set("page", page.toString());
    if (size !== 50) params.set("size", size.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<DiscoverResult[]>(`/discover${query}`, {}, token);
  },

  swipe(token: string, targetUserId: number, direction: SwipeDirection) {
    return request<Match>(
      "/discover/swipe",
      {
        method: "POST",
        body: JSON.stringify({ targetUserId, direction }),
      },
      token,
    );
  },

  getMatches(token: string) {
    return request<Match[]>("/matches", {}, token);
  },

  getIncomingRequests(token: string) {
    return request<Profile[]>("/matches/requests", {}, token).catch(() => []);
  },

  getMessages(token: string, matchId: number, afterId?: number, limit: number = 100) {
    const params = new URLSearchParams();
    if (afterId) params.set("after", afterId.toString());
    if (limit !== 100) params.set("limit", limit.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<Message[]>(`/chat/${matchId}/messages${query}`, {}, token);
  },

  sendMessage(token: string, matchId: number, content: string) {
    return request<Message>(
      `/chat/${matchId}/messages`,
      { method: "POST", body: JSON.stringify({ matchId, content }) },
      token,
    );
  },

  resetPasses(token: string) {
    return request<void>(
      "/discover/reset-passes",
      { method: "DELETE" },
      token,
    );
  },

  unmatch(token: string, matchId: number) {
    return request<void>(
      `/matches/${matchId}`,
      { method: "DELETE" },
      token,
    );
  },

  clearChat(token: string, matchId: number) {
    return request<void>(
      `/chat/${matchId}/messages`,
      { method: "DELETE" },
      token,
    );
  },

  markChatAsRead(token: string, matchId: number) {
    return request<void>(
      `/chat/${matchId}/read`,
      { method: "PUT" },
      token,
    ).catch(() => undefined);
  },

  getPresence() {
    return request<{ onlineUsers: string[]; count: number }>("/presence").catch(() => ({
      onlineUsers: [],
      count: 0,
    }));
  },

  cleanupTokens() {
    return request<{ status: string; purgedCount: number; timestamp: string }>("/auth/cleanup", {
      method: "POST",
    });
  },
};
