export interface Profile {
  id: number;
  name: string;
  email: string;
  githubUrl: string | null;
  bio: string | null;
  lookingFor: string | null;
  location: string | null;
  skills: string[];
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: Profile;
}

export interface DiscoverResult {
  profile: Profile;
  sharedSkillCount: number;
  sharedSkills: string[];
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
  skills: string[];
}

export interface UpdateProfilePayload {
  name?: string;
  githubUrl?: string;
  bio?: string;
  lookingFor?: string;
  location?: string;
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

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
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

  discover(token: string, skill?: string) {
    const query = skill ? `?skill=${encodeURIComponent(skill)}` : "";
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

  getMessages(token: string, matchId: number, afterId?: number) {
    const query = afterId ? `?after=${afterId}` : "";
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

  markChatAsRead(token: string, matchId: number) {
    return request<void>(
      `/chat/${matchId}/read`,
      { method: "PUT" },
      token,
    ).catch(() => undefined);
  },
};
