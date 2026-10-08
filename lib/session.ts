import type { AuthResponse, Profile } from "@/lib/api";

const SESSION_KEY = "devlynix.session";

export interface AuthSession {
  token: string;
  refreshToken?: string;
  user: Profile;
}

export function saveSession(response: AuthResponse): AuthSession {
  const session: AuthSession = {
    token: response.token,
    refreshToken: response.refreshToken,
    user: response.user,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function updateSessionTokens(token: string, refreshToken?: string) {
  const session = getSession();
  if (session) {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        ...session,
        token,
        refreshToken: refreshToken ?? session.refreshToken,
      }),
    );
  }
}

export function updateStoredUser(user: Profile) {
  const session = getSession();
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, user }));
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
