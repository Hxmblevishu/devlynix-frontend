import type { AuthResponse, Profile } from "@/lib/api";

const SESSION_KEY = "devlynix.session";
const SESSION_EVENT = "devlynix:session-change";

export interface AuthSession {
  token: string;
  refreshToken?: string;
  user: Profile;
}

function notifySessionChange(session: AuthSession | null) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: session }));
  }
}

export function saveSession(response: AuthResponse): AuthSession {
  const session: AuthSession = {
    token: response.token,
    refreshToken: response.refreshToken,
    user: response.user,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  notifySessionChange(session);
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
  if (session && typeof window !== "undefined") {
    const updated: AuthSession = {
      ...session,
      token,
      refreshToken: refreshToken ?? session.refreshToken,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    notifySessionChange(updated);
  }
}

export function updateStoredUser(user: Profile) {
  const session = getSession();
  if (session && typeof window !== "undefined") {
    const updated: AuthSession = { ...session, user };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    notifySessionChange(updated);
  }
}

export function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
  notifySessionChange(null);
}

export function subscribeSession(callback: (session: AuthSession | null) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleCustom = (e: Event) => {
    const custom = e as CustomEvent<AuthSession | null>;
    callback(custom.detail);
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === SESSION_KEY) {
      callback(getSession());
    }
  };

  window.addEventListener(SESSION_EVENT, handleCustom);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(SESSION_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}
