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
}

export interface Message {
  id: number;
  matchId: number;
  senderId: number;
  senderName: string;
  content: string;
  sentAt: string;
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
const envUrl = process.env.NEXT_PUBLIC_API_URL;
const API_BASE_URL =
  envUrl && !envUrl.includes("railway.app")
    ? envUrl
    : "https://devlynix-buildathon-2-0.onrender.com/api";

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
      { method: "PUT", body: JSON.stringify(payload) },
      token,
    );
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

  getMessages(token: string, matchId: number) {
    return request<Message[]>(`/chat/${matchId}/messages`, {}, token);
  },

  sendMessage(token: string, matchId: number, content: string) {
    return request<Message>(
      `/chat/${matchId}/messages`,
      { method: "POST", body: JSON.stringify({ matchId,content }) },
      token,
    );
  },
};
